"""
Training loop for NER-SHIELD.

Orchestrates the complete training workflow including mixed-precision,
gradient accumulation, logging, checkpointing, and early stopping.
Supports all four model tasks: classification, segmentation,
change detection, and anomaly detection.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.amp import GradScaler, autocast
from torch.optim import Optimizer
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
from tqdm import tqdm

from src.training.callbacks import EarlyStopping, ModelCheckpoint, LRSchedulerFactory
from src.training.metrics import MetricsCalculator
from src.utils.logger import get_logger

logger = get_logger(__name__)


class Trainer:
    """Generic training loop supporting classification, segmentation,
    change detection, and anomaly detection tasks.

    Args:
        model: The PyTorch model to train.
        optimizer: Optimizer instance.
        loss_fn: Loss function (or callable that returns a loss dict
            with a ``"total"`` key).
        device: Target device.
        task: One of ``"classification"``, ``"segmentation"``,
            ``"change_detection"``, ``"anomaly_detection"``.
        num_classes: Number of output classes (for metric computation).
        class_names: Ordered class name list.
        config: Full training config dictionary (for hyperparameters).
    """

    def __init__(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        loss_fn: Callable,
        device: torch.device,
        task: str = "classification",
        num_classes: int = 6,
        class_names: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.model = model.to(device)
        self.optimizer = optimizer
        self.loss_fn = loss_fn
        self.device = device
        self.task = task
        self.num_classes = num_classes
        self.config = config or {}

        # Training hyperparameters
        train_cfg = self.config.get("training", {})
        self.epochs = train_cfg.get("epochs", 100)
        self.accumulation_steps = train_cfg.get("accumulation_steps", 4)
        self.max_grad_norm = train_cfg.get("gradient_clipping", {}).get("max_norm", 1.0)
        self.use_amp = train_cfg.get("mixed_precision", {}).get("enabled", True)

        # Callbacks
        es_cfg = train_cfg.get("early_stopping", {})
        self.early_stopping = EarlyStopping(
            patience=es_cfg.get("patience", 15),
            metric=es_cfg.get("metric", "val_f1_weighted"),
            mode=es_cfg.get("mode", "max"),
            min_delta=es_cfg.get("min_delta", 0.001),
        )

        ckpt_cfg = train_cfg.get("checkpoint", {})
        self.checkpoint = ModelCheckpoint(
            save_dir=ckpt_cfg.get("dir", "checkpoints"),
            metric=ckpt_cfg.get("metric", "val_f1_weighted"),
            mode=ckpt_cfg.get("mode", "max"),
            save_best=ckpt_cfg.get("save_best", True),
            save_last=ckpt_cfg.get("save_last", True),
            save_every_n_epochs=ckpt_cfg.get("save_every_n_epochs", 10),
            filename_prefix=task,
        )

        # LR scheduler
        sched_cfg = train_cfg.get("scheduler", {})
        warmup_cfg = train_cfg.get("warmup", {})
        self.scheduler = LRSchedulerFactory.create(
            optimizer=self.optimizer,
            warmup_epochs=warmup_cfg.get("epochs", 5),
            warmup_start_lr=warmup_cfg.get("start_lr", 1e-6),
            T_0=sched_cfg.get("T_0", 10),
            T_mult=sched_cfg.get("T_mult", 2),
            eta_min=sched_cfg.get("eta_min", 1e-6),
        )

        # Mixed precision
        self.scaler = GradScaler(enabled=self.use_amp)

        # Metrics
        metric_task = "segmentation" if task == "segmentation" else "classification"
        self.metrics = MetricsCalculator(
            num_classes=num_classes,
            class_names=class_names,
            task=metric_task,
        )

        # Tensorboard
        log_cfg = train_cfg.get("logging", {})
        self.log_dir = log_cfg.get("log_dir", "logs")
        self.log_every = log_cfg.get("log_every_n_steps", 10)
        self.writer: Optional[SummaryWriter] = None

        self.global_step = 0
        self.best_metrics: Dict[str, float] = {}

    def _init_writer(self) -> None:
        if self.writer is None:
            self.writer = SummaryWriter(log_dir=self.log_dir)

    # -----------------------------------------------------------------
    # Training step per task
    # -----------------------------------------------------------------

    def _train_step_classification(
        self, batch: Dict[str, Any]
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        images = batch["image"].to(self.device)
        labels = batch["label"].to(self.device)
        logits = self.model(images)
        loss = self.loss_fn(logits, labels)
        preds = logits.argmax(dim=1).cpu().numpy()
        targets = labels.cpu().numpy()
        self.metrics.update(preds, targets)
        return loss, {"loss": loss.item()}

    def _train_step_segmentation(
        self, batch: Dict[str, Any]
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        images = batch["image"].to(self.device)
        masks = batch["mask"].to(self.device)
        outputs = self.model(images)
        mask_logits = outputs["mask_logits"]
        loss_dict = self.loss_fn(mask_logits, masks)
        loss = loss_dict["total"] if isinstance(loss_dict, dict) else loss_dict

        preds = mask_logits.argmax(dim=1).cpu().numpy()
        targets = masks.cpu().numpy()
        self.metrics.update(preds.flatten(), targets.flatten())

        info = {"loss": loss.item()}
        if isinstance(loss_dict, dict):
            for k, v in loss_dict.items():
                if k != "total":
                    info[k] = v.item()
        return loss, info

    def _train_step_change_detection(
        self, batch: Dict[str, Any]
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        before = batch["before"].to(self.device)
        after = batch["after"].to(self.device)
        outputs = self.model(before, after)
        targets = {
            "change_mask": batch["change_mask"].to(self.device),
            "change_type": batch["change_type"].to(self.device),
            "magnitude": batch["magnitude"].to(self.device),
        }
        loss_dict = self.loss_fn(outputs, targets)
        loss = loss_dict["total"]
        return loss, {k: v.item() for k, v in loss_dict.items()}

    def _train_step_anomaly(
        self, batch: Dict[str, Any]
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        images = batch["image"].to(self.device)
        outputs = self.model(images)
        loss_dict = self.model.compute_loss(images, outputs)
        loss = loss_dict["total_loss"]
        return loss, {k: v.item() for k, v in loss_dict.items()}

    def _get_train_step(self) -> Callable:
        dispatch = {
            "classification": self._train_step_classification,
            "segmentation": self._train_step_segmentation,
            "change_detection": self._train_step_change_detection,
            "anomaly_detection": self._train_step_anomaly,
        }
        step_fn = dispatch.get(self.task)
        if step_fn is None:
            raise ValueError(f"Unknown task: {self.task}")
        return step_fn

    # -----------------------------------------------------------------
    # Validation step per task
    # -----------------------------------------------------------------

    @torch.no_grad()
    def _val_step_classification(
        self, batch: Dict[str, Any]
    ) -> Dict[str, float]:
        images = batch["image"].to(self.device)
        labels = batch["label"].to(self.device)
        logits = self.model(images)
        loss = self.loss_fn(logits, labels)
        probs = torch.softmax(logits, dim=1).cpu().numpy()
        preds = logits.argmax(dim=1).cpu().numpy()
        targets = labels.cpu().numpy()
        self.metrics.update(preds, targets, probs)
        return {"val_loss": loss.item()}

    @torch.no_grad()
    def _val_step_segmentation(
        self, batch: Dict[str, Any]
    ) -> Dict[str, float]:
        images = batch["image"].to(self.device)
        masks = batch["mask"].to(self.device)
        outputs = self.model(images)
        mask_logits = outputs["mask_logits"]
        loss_dict = self.loss_fn(mask_logits, masks)
        loss = loss_dict["total"] if isinstance(loss_dict, dict) else loss_dict
        preds = mask_logits.argmax(dim=1).cpu().numpy()
        targets = masks.cpu().numpy()
        self.metrics.update(preds.flatten(), targets.flatten())
        return {"val_loss": loss.item()}

    @torch.no_grad()
    def _val_step_change_detection(
        self, batch: Dict[str, Any]
    ) -> Dict[str, float]:
        before = batch["before"].to(self.device)
        after = batch["after"].to(self.device)
        outputs = self.model(before, after)
        targets = {
            "change_mask": batch["change_mask"].to(self.device),
            "change_type": batch["change_type"].to(self.device),
            "magnitude": batch["magnitude"].to(self.device),
        }
        loss_dict = self.loss_fn(outputs, targets)
        return {f"val_{k}": v.item() for k, v in loss_dict.items()}

    @torch.no_grad()
    def _val_step_anomaly(
        self, batch: Dict[str, Any]
    ) -> Dict[str, float]:
        images = batch["image"].to(self.device)
        outputs = self.model(images)
        loss_dict = self.model.compute_loss(images, outputs)
        return {f"val_{k}": v.item() for k, v in loss_dict.items()}

    def _get_val_step(self) -> Callable:
        dispatch = {
            "classification": self._val_step_classification,
            "segmentation": self._val_step_segmentation,
            "change_detection": self._val_step_change_detection,
            "anomaly_detection": self._val_step_anomaly,
        }
        step_fn = dispatch.get(self.task)
        if step_fn is None:
            raise ValueError(f"Unknown task: {self.task}")
        return step_fn

    # -----------------------------------------------------------------
    # Epoch loops
    # -----------------------------------------------------------------

    def _train_epoch(
        self, dataloader: DataLoader, epoch: int
    ) -> Dict[str, float]:
        self.model.train()
        self.metrics.reset()
        self.optimizer.zero_grad()
        step_fn = self._get_train_step()
        epoch_losses: Dict[str, List[float]] = {}

        pbar = tqdm(
            dataloader, desc=f"Train Epoch {epoch + 1}/{self.epochs}", leave=False
        )

        for batch_idx, batch in enumerate(pbar):
            with autocast("cuda", enabled=self.use_amp):
                loss, info = step_fn(batch)
                loss = loss / self.accumulation_steps

            self.scaler.scale(loss).backward()

            if (batch_idx + 1) % self.accumulation_steps == 0:
                self.scaler.unscale_(self.optimizer)
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(), self.max_grad_norm
                )
                self.scaler.step(self.optimizer)
                self.scaler.update()
                self.optimizer.zero_grad()
                self.global_step += 1

            # Accumulate for logging
            for k, v in info.items():
                epoch_losses.setdefault(k, []).append(v)

            if (batch_idx + 1) % self.log_every == 0:
                pbar.set_postfix(
                    {k: f"{np.mean(v[-self.log_every:]):.4f}" for k, v in epoch_losses.items()}
                )

        avg = {k: float(np.mean(v)) for k, v in epoch_losses.items()}

        # Compute accumulated metrics
        if self.task in ("classification", "segmentation"):
            computed = self.metrics.compute_all()
            avg.update({f"train_{k}": v for k, v in computed.items()})

        return avg

    def _val_epoch(
        self, dataloader: DataLoader, epoch: int
    ) -> Dict[str, float]:
        self.model.eval()
        self.metrics.reset()
        step_fn = self._get_val_step()
        epoch_losses: Dict[str, List[float]] = {}

        pbar = tqdm(
            dataloader, desc=f"Val   Epoch {epoch + 1}/{self.epochs}", leave=False
        )

        for batch in pbar:
            with autocast("cuda", enabled=self.use_amp):
                info = step_fn(batch)
            for k, v in info.items():
                epoch_losses.setdefault(k, []).append(v)

        avg = {k: float(np.mean(v)) for k, v in epoch_losses.items()}

        if self.task in ("classification", "segmentation"):
            computed = self.metrics.compute_all()
            avg.update({f"val_{k}": v for k, v in computed.items()})

        return avg

    # -----------------------------------------------------------------
    # Full training
    # -----------------------------------------------------------------

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
    ) -> Dict[str, Any]:
        """Run the full training loop.

        Args:
            train_loader: DataLoader for training data.
            val_loader: DataLoader for validation data.

        Returns:
            Dictionary with training history and best metrics.
        """
        self._init_writer()
        history: Dict[str, List[float]] = {}
        start_time = time.time()

        logger.info(
            "Starting training: task=%s, epochs=%d, device=%s, AMP=%s",
            self.task,
            self.epochs,
            self.device,
            self.use_amp,
        )

        for epoch in range(self.epochs):
            epoch_start = time.time()

            # Train
            train_metrics = self._train_epoch(train_loader, epoch)

            # Validate
            val_metrics = self._val_epoch(val_loader, epoch)

            # LR scheduler step
            self.scheduler.step()
            current_lr = self.optimizer.param_groups[0]["lr"]

            # Merge metrics
            all_metrics = {**train_metrics, **val_metrics, "lr": current_lr}
            epoch_time = time.time() - epoch_start

            # Log to tensorboard
            if self.writer is not None:
                for k, v in all_metrics.items():
                    self.writer.add_scalar(f"{self.task}/{k}", v, epoch)
                self.writer.add_scalar(f"{self.task}/lr", current_lr, epoch)

            # Accumulate history
            for k, v in all_metrics.items():
                history.setdefault(k, []).append(v)

            # Console log
            logger.info(
                "Epoch %d/%d (%.1fs) | lr=%.2e | %s",
                epoch + 1,
                self.epochs,
                epoch_time,
                current_lr,
                " | ".join(f"{k}={v:.4f}" for k, v in sorted(all_metrics.items()) if k != "lr"),
            )

            # Checkpoint
            self.checkpoint(self.model, self.optimizer, epoch, val_metrics)

            # Early stopping
            if self.early_stopping(val_metrics):
                logger.info("Early stopping triggered at epoch %d", epoch + 1)
                break

        total_time = time.time() - start_time
        logger.info("Training complete in %.1f seconds (%.1f min)", total_time, total_time / 60)

        if self.writer is not None:
            self.writer.close()

        return {
            "history": history,
            "best_metric": self.checkpoint.best_value,
            "total_time_seconds": total_time,
            "epochs_trained": epoch + 1,
        }

    def load_checkpoint(self, path: str) -> Dict[str, Any]:
        """Load a saved checkpoint and restore model / optimizer state.

        Args:
            path: Path to the ``.pth`` checkpoint file.

        Returns:
            The saved metadata (epoch, metrics).
        """
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        logger.info(
            "Loaded checkpoint from %s (epoch %d)", path, checkpoint.get("epoch", -1)
        )
        return checkpoint
