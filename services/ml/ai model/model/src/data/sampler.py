"""
Class-balanced sampling for NER-SHIELD.

Provides a ``WeightedRandomSampler``-based approach that oversamples
minority classes according to inverse frequency, ensuring each batch
contains a more balanced distribution of disaster types.
"""

from __future__ import annotations

from collections import Counter
from typing import Dict, Iterator, List, Optional

import torch
from torch.utils.data import Sampler, WeightedRandomSampler

from src.utils.logger import get_logger

logger = get_logger(__name__)


class ClassBalancedSampler(Sampler[int]):
    """Weighted random sampler that balances class frequencies.

    Each sample is assigned a weight inversely proportional to its
    class frequency, optionally scaled by a user-supplied weight map.

    Args:
        labels: Integer label for every sample in the dataset.
        class_weights: Optional per-class weight multiplier.
            Keys are integer class indices; values are scaling factors.
            If *None*, pure inverse-frequency balancing is used.
        num_samples: Number of samples to draw per epoch.
            Defaults to the dataset length (one full pass).
        replacement: Sample with replacement (required for oversampling).
    """

    def __init__(
        self,
        labels: List[int],
        class_weights: Optional[Dict[int, float]] = None,
        num_samples: Optional[int] = None,
        replacement: bool = True,
    ) -> None:
        self.labels = labels
        self.replacement = replacement
        self.num_samples = num_samples if num_samples is not None else len(labels)

        # Compute per-class counts
        counter = Counter(labels)
        total = len(labels)
        num_classes = len(counter)

        # Inverse-frequency weight for each class
        inv_freq: Dict[int, float] = {}
        for cls_idx, count in counter.items():
            inv_freq[cls_idx] = total / (num_classes * count)

        # Apply user-supplied per-class scaling
        if class_weights is not None:
            for cls_idx, w in class_weights.items():
                if cls_idx in inv_freq:
                    inv_freq[cls_idx] *= w

        # Per-sample weight
        sample_weights = [inv_freq[label] for label in labels]
        self._weights = torch.tensor(sample_weights, dtype=torch.float64)

        logger.info(
            "ClassBalancedSampler: %d samples, %d classes, replacement=%s",
            self.num_samples,
            num_classes,
            replacement,
        )
        for cls_idx in sorted(counter):
            logger.info(
                "  class %d: %d samples, weight %.4f",
                cls_idx,
                counter[cls_idx],
                inv_freq[cls_idx],
            )

    def __iter__(self) -> Iterator[int]:
        indices = torch.multinomial(
            self._weights,
            num_samples=self.num_samples,
            replacement=self.replacement,
        )
        return iter(indices.tolist())

    def __len__(self) -> int:
        return self.num_samples


def create_weighted_sampler(
    labels: List[int],
    class_weight_map: Optional[Dict[str, float]] = None,
    class_names: Optional[List[str]] = None,
    num_samples: Optional[int] = None,
) -> ClassBalancedSampler:
    """Convenience factory that accepts string-keyed weight maps.

    Args:
        labels: Integer label per sample.
        class_weight_map: String-keyed weight map (e.g.
            ``{"landslide": 2.5, ...}``).
        class_names: Ordered list of class names mapping index -> name.
        num_samples: Samples per epoch.

    Returns:
        A :class:`ClassBalancedSampler`.
    """
    int_weights: Optional[Dict[int, float]] = None
    if class_weight_map is not None and class_names is not None:
        int_weights = {}
        name_to_idx = {n: i for i, n in enumerate(class_names)}
        for name, w in class_weight_map.items():
            if name in name_to_idx:
                int_weights[name_to_idx[name]] = w
    return ClassBalancedSampler(
        labels=labels,
        class_weights=int_weights,
        num_samples=num_samples,
    )
