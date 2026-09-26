"""
Training callbacks for NER-SHIELD.

Provides early stopping, model checkpointing, and a linear warmup
scheduler that integrates with PyTorch's learning-rate schedulers.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Dict, Optional

import torch
import torch.nn as nn
from torch.optim.lr_scheduler import _LRScheduler
from torch.optim import Optimizer

from src.utils.logger import get_logger

logger = get_logger(__name__)


class EarlyStopping:
    """Stop training when a monitored metric stops improving.

    Args:
        patience: Number of epochs without improvement before stopping.
        metric: Name of the metric to monitor.
        mode: ``"min"`` or ``"max"`` — whether lower or higher is better.
        min_delta: Minimum change to qualify as an improvement.
    """

    def __init__(
        self,
        patience: int = 15,
        metric: str = "val_f1_weighted",
        mode: str = "max",
        min_delta: float = 0.001,
    ) -> None:
        self.patience = patience
        self.metric = metric
        self.mode = mode
        self.min_delta = min_delta

        self.best_value: Optional[float] = None
        self.counter = 0
        self.should_stop = False

        self._compare = (lambda a, b: a > b + min_delta) if mode == "max" else (
            lambda a, b: a < b - min_delta
        )

    def __call__(self, metrics: Dict[str, float]) -> bool:
        """Check whether training should stop.

        Args:
            metrics: Dictionary of metric name to value from the current
                validation epoch.

        Returns:
            *True* if training should be stopped.
        """
        current = metrics.get(self.metric)
        if current is None:
            logger.warning(
                "EarlyStopping: metric '%s' not found in %s",
                self.metric,
                list(metrics.keys()),
            )
            return False

        if self.best_value is None or self._compare(current, self.best_value):
            self.best_value = current
            self.counter = 0
            logger.info(
                "EarlyStopping: %s improved to %.5f", self.metric, current
            )
        else:
            self.counter += 1
            logger.info(
                "EarlyStopping: no improvement for %d/%d epochs (best=%.5f, current=%.5f)",
                self.counter,
                self.patience,
                self.best_value,
                current,
            )

        if self.counter >= self.patience:
            self.should_stop = True
            logger.info("EarlyStopping: patience exhausted — stopping training")
            return True
        return False

    def reset(self) -> None:
        """Reset the internal state."""
        self.best_value = None
        self.counter = 0
        self.should_stop = False


class ModelCheckpoint:
    """Save model weights when a monitored metric improves.

    Args:
        save_dir: Directory to write checkpoint files.
        metric: Metric name to monitor.
        mode: ``"min"`` or ``"max"``.
        save_best: Save a ``best.pth`` checkpoint on improvement.
        save_last: Save a ``last.pth`` checkpoint every epoch.
        save_every_n_epochs: Additionally save every *n* epochs.
        filename_prefix: Prefix for checkpoint filenames.
    """

    def __init__(
        self,
        save_dir: str = "checkpoints",
        metric: str = "val_f1_weighted",
        mode: str = "max",
        save_best: bool = True,
        save_last: bool = True,
        save_every_n_epochs: int = 10,
        filename_prefix: str = "model",
    ) -> None:
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)
        self.metric = metric
        self.mode = mode
        self.save_best = save_best
        self.save_last = save_last
        self.save_every_n_epochs = save_every_n_epochs
        self.filename_prefix = filename_prefix

        self.best_value: Optional[float] = None
        self._compare = (lambda a, b: a > b) if mode == "max" else (lambda a, b: a < b)

    def _save(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        epoch: int,
        metrics: Dict[str, float],
        filename: str,
    ) -> str:
        path = self.save_dir / filename
        state = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "metrics": metrics,
        }
        torch.save(state, str(path))
        return str(path)

    def __call__(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        epoch: int,
        metrics: Dict[str, float],
    ) -> Optional[str]:
        """Potentially save a checkpoint.

        Args:
            model: The model to checkpoint.
            optimizer: Current optimizer (saved for resuming).
            epoch: Current epoch number.
            metrics: Validation metrics dictionary.

        Returns:
            Path to the saved best checkpoint, or *None*.
        """
        best_path: Optional[str] = None
        current = metrics.get(self.metric)

        # Save best
        if self.save_best and current is not None:
            if self.best_value is None or self._compare(current, self.best_value):
                self.best_value = current
                best_path = self._save(
                    model,
                    optimizer,
                    epoch,
                    metrics,
                    f"{self.filename_prefix}_best.pth",
                )
                logger.info(
                    "Checkpoint: saved best model (%.5f) to %s",
                    current,
                    best_path,
                )

        # Save last
        if self.save_last:
            self._save(
                model,
                optimizer,
                epoch,
                metrics,
                f"{self.filename_prefix}_last.pth",
            )

        # Save periodic
        if self.save_every_n_epochs > 0 and (epoch + 1) % self.save_every_n_epochs == 0:
            self._save(
                model,
                optimizer,
                epoch,
                metrics,
                f"{self.filename_prefix}_epoch{epoch + 1}.pth",
            )

        return best_path


class WarmupScheduler(_LRScheduler):
    """Linear warmup wrapper around another LR scheduler.

    Linearly increases the learning rate from ``start_lr`` to the
    optimizer's base LR over ``warmup_epochs`` epochs, then delegates
    to the wrapped ``after_scheduler``.

    Args:
        optimizer: PyTorch optimizer.
        warmup_epochs: Number of warmup epochs.
        start_lr: Initial learning rate at epoch 0.
        after_scheduler: Scheduler to use after warmup.
        last_epoch: For resuming.
    """

    def __init__(
        self,
        optimizer: Optimizer,
        warmup_epochs: int = 5,
        start_lr: float = 1e-6,
        after_scheduler: Optional[_LRScheduler] = None,
        last_epoch: int = -1,
    ) -> None:
        self.warmup_epochs = warmup_epochs
        self.start_lr = start_lr
        self.after_scheduler = after_scheduler
        self._target_lrs = [pg["lr"] for pg in optimizer.param_groups]
        super().__init__(optimizer, last_epoch)

    def get_lr(self) -> list[float]:
        """Compute learning rates for the current epoch."""
        if self.last_epoch < self.warmup_epochs:
            alpha = self.last_epoch / max(1, self.warmup_epochs)
            return [
                self.start_lr + (target - self.start_lr) * alpha
                for target in self._target_lrs
            ]
        if self.after_scheduler is not None:
            # Delegate to the after_scheduler
            return self.after_scheduler.get_last_lr()
        return self._target_lrs

    def step(self, epoch: Optional[int] = None) -> None:
        """Advance the scheduler by one step.

        Args:
            epoch: Optional explicit epoch number.
        """
        if self.last_epoch >= self.warmup_epochs and self.after_scheduler is not None:
            self.after_scheduler.step()
        super().step(epoch)


class LRSchedulerFactory:
    """Factory for creating the full LR schedule (warmup + cosine)."""

    @staticmethod
    def create(
        optimizer: Optimizer,
        warmup_epochs: int = 5,
        warmup_start_lr: float = 1e-6,
        T_0: int = 10,
        T_mult: int = 2,
        eta_min: float = 1e-6,
    ) -> WarmupScheduler:
        """Create a warmup + CosineAnnealingWarmRestarts schedule.

        Args:
            optimizer: PyTorch optimizer.
            warmup_epochs: Number of linear warmup epochs.
            warmup_start_lr: LR at epoch 0.
            T_0: Period of the first cosine cycle.
            T_mult: Multiplicative factor for subsequent cycles.
            eta_min: Minimum LR.

        Returns:
            A :class:`WarmupScheduler` instance.
        """
        cosine = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
            optimizer, T_0=T_0, T_mult=T_mult, eta_min=eta_min
        )
        return WarmupScheduler(
            optimizer,
            warmup_epochs=warmup_epochs,
            start_lr=warmup_start_lr,
            after_scheduler=cosine,
        )
