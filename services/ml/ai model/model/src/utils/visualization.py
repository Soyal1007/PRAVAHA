"""
Visualization utilities for NER-SHIELD.

Provides helpers for overlaying segmentation masks, drawing side-by-side
change-detection comparisons, displaying anomaly heatmaps, and formatting
classification probability bar charts.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

from src.utils.logger import get_logger

logger = get_logger(__name__)

# Default colour palette for segmentation classes (BGR for OpenCV, RGB for matplotlib)
SEG_COLORS_RGB: Dict[str, Tuple[int, int, int]] = {
    "background": (0, 0, 0),
    "landslide_scar": (178, 34, 34),
    "flood_water": (30, 144, 255),
    "damaged_road": (255, 165, 0),
    "damaged_structure": (255, 0, 255),
}

CLASS_COLORS_RGB: Dict[str, Tuple[int, int, int]] = {
    "landslide": (178, 34, 34),
    "flood": (30, 144, 255),
    "road_damage": (255, 165, 0),
    "infrastructure_damage": (255, 0, 255),
    "vegetation_loss": (34, 139, 34),
    "normal": (128, 128, 128),
}


class Visualizer:
    """Collection of static visualisation helpers."""

    # ------------------------------------------------------------------
    # Segmentation overlay
    # ------------------------------------------------------------------

    @staticmethod
    def overlay_segmentation(
        image: np.ndarray,
        mask: np.ndarray,
        class_names: List[str],
        alpha: float = 0.45,
        colors: Optional[Dict[str, Tuple[int, int, int]]] = None,
    ) -> np.ndarray:
        """Blend a segmentation mask on top of an image.

        Args:
            image: RGB image ``(H, W, 3)`` with values in ``[0, 255]``.
            mask: Integer class-index array ``(H, W)``.
            class_names: Ordered class names matching mask indices.
            alpha: Opacity of the overlay.
            colors: Optional per-class RGB colour map.

        Returns:
            Blended RGB image ``(H, W, 3)`` in ``uint8``.
        """
        if colors is None:
            colors = SEG_COLORS_RGB

        overlay = image.copy().astype(np.float32)
        color_mask = np.zeros_like(image, dtype=np.float32)

        for idx, name in enumerate(class_names):
            if name == "background":
                continue
            region = mask == idx
            if not region.any():
                continue
            rgb = colors.get(name, (255, 255, 255))
            color_mask[region] = rgb

        blended = np.where(
            color_mask.sum(axis=-1, keepdims=True) > 0,
            overlay * (1 - alpha) + color_mask * alpha,
            overlay,
        )
        return np.clip(blended, 0, 255).astype(np.uint8)

    # ------------------------------------------------------------------
    # Side-by-side change detection
    # ------------------------------------------------------------------

    @staticmethod
    def side_by_side(
        before: np.ndarray,
        after: np.ndarray,
        change_mask: Optional[np.ndarray] = None,
        title_before: str = "Before",
        title_after: str = "After",
        save_path: Optional[str] = None,
        figsize: Tuple[int, int] = (16, 6),
    ) -> np.ndarray:
        """Create a side-by-side comparison with optional change overlay.

        Args:
            before: RGB *before* image ``(H, W, 3)``.
            after: RGB *after* image ``(H, W, 3)``.
            change_mask: Optional binary change mask ``(H, W)``.
            title_before: Title for the left panel.
            title_after: Title for the right panel.
            save_path: If provided the figure is saved to this path.
            figsize: Matplotlib figure size.

        Returns:
            Rendered figure as an RGB ``uint8`` array.
        """
        ncols = 3 if change_mask is not None else 2
        fig, axes = plt.subplots(1, ncols, figsize=figsize)

        axes[0].imshow(before)
        axes[0].set_title(title_before, fontsize=14)
        axes[0].axis("off")

        axes[1].imshow(after)
        axes[1].set_title(title_after, fontsize=14)
        axes[1].axis("off")

        if change_mask is not None:
            change_overlay = after.copy().astype(np.float32)
            red = np.zeros_like(after, dtype=np.float32)
            red[..., 0] = 255
            region = change_mask > 0
            change_overlay[region] = change_overlay[region] * 0.5 + red[region] * 0.5
            axes[2].imshow(change_overlay.astype(np.uint8))
            axes[2].set_title("Detected Changes", fontsize=14)
            axes[2].axis("off")

        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(save_path, dpi=150, bbox_inches="tight")
            logger.info("Saved side-by-side figure to %s", save_path)

        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        w, h = fig.canvas.get_width_height()
        result = buf.reshape(h, w, 4)[..., :3].copy()
        plt.close(fig)
        return result

    # ------------------------------------------------------------------
    # Heatmap overlay
    # ------------------------------------------------------------------

    @staticmethod
    def overlay_heatmap(
        image: np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.4,
        colormap: int = cv2.COLORMAP_JET,
    ) -> np.ndarray:
        """Overlay a heatmap (e.g. Grad-CAM) on an image.

        Args:
            image: RGB image ``(H, W, 3)`` in ``[0, 255]``.
            heatmap: Single-channel map ``(H, W)`` in ``[0, 1]``.
            alpha: Opacity of the heatmap.
            colormap: OpenCV colourmap ID.

        Returns:
            Blended RGB image ``(H, W, 3)`` in ``uint8``.
        """
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, colormap)
        heatmap_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

        if heatmap_rgb.shape[:2] != image.shape[:2]:
            heatmap_rgb = cv2.resize(
                heatmap_rgb,
                (image.shape[1], image.shape[0]),
                interpolation=cv2.INTER_LINEAR,
            )

        blended = image.astype(np.float32) * (1 - alpha) + heatmap_rgb.astype(np.float32) * alpha
        return np.clip(blended, 0, 255).astype(np.uint8)

    # ------------------------------------------------------------------
    # Classification probabilities bar chart
    # ------------------------------------------------------------------

    @staticmethod
    def plot_classification_probs(
        probabilities: Dict[str, float],
        predicted_class: str,
        save_path: Optional[str] = None,
        figsize: Tuple[int, int] = (10, 5),
    ) -> np.ndarray:
        """Horizontal bar chart of classification probabilities.

        Args:
            probabilities: Mapping of class name to probability.
            predicted_class: The predicted class (highlighted in the chart).
            save_path: Optional file path to save the figure.
            figsize: Matplotlib figure size.

        Returns:
            Rendered chart as an RGB ``uint8`` array.
        """
        fig, ax = plt.subplots(figsize=figsize)

        names = list(probabilities.keys())
        probs = [probabilities[n] for n in names]
        bar_colors = []
        for n in names:
            if n == predicted_class:
                bar_colors.append("#e74c3c")
            else:
                bar_colors.append("#3498db")

        y_pos = np.arange(len(names))
        ax.barh(y_pos, probs, color=bar_colors, height=0.6)
        ax.set_yticks(y_pos)
        ax.set_yticklabels(names, fontsize=12)
        ax.set_xlim(0, 1.05)
        ax.set_xlabel("Probability", fontsize=12)
        ax.set_title("Classification Probabilities", fontsize=14)

        for i, (p, n) in enumerate(zip(probs, names)):
            ax.text(p + 0.01, i, f"{p:.3f}", va="center", fontsize=11)

        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(save_path, dpi=150, bbox_inches="tight")

        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        w, h = fig.canvas.get_width_height()
        result = buf.reshape(h, w, 4)[..., :3].copy()
        plt.close(fig)
        return result

    # ------------------------------------------------------------------
    # Anomaly score map
    # ------------------------------------------------------------------

    @staticmethod
    def plot_anomaly_score(
        image: np.ndarray,
        score_map: np.ndarray,
        overall_score: float,
        threshold: float = 65.0,
        save_path: Optional[str] = None,
    ) -> np.ndarray:
        """Visualise per-pixel anomaly scores alongside the source image.

        Args:
            image: RGB source image ``(H, W, 3)``.
            score_map: Per-pixel anomaly scores ``(H, W)`` in ``[0, 100]``.
            overall_score: Scalar overall anomaly score.
            threshold: Score above which a pixel is considered anomalous.
            save_path: Optional file path to save the figure.

        Returns:
            Rendered figure as an RGB ``uint8`` array.
        """
        fig, axes = plt.subplots(1, 3, figsize=(18, 6))

        axes[0].imshow(image)
        axes[0].set_title("Input Image", fontsize=13)
        axes[0].axis("off")

        im = axes[1].imshow(score_map, cmap="hot", vmin=0, vmax=100)
        axes[1].set_title(f"Anomaly Score Map (overall: {overall_score:.1f})", fontsize=13)
        axes[1].axis("off")
        plt.colorbar(im, ax=axes[1], fraction=0.046)

        binary = (score_map > threshold).astype(np.uint8)
        overlay = image.copy().astype(np.float32)
        red = np.zeros_like(image, dtype=np.float32)
        red[..., 0] = 255
        region = binary > 0
        overlay[region] = overlay[region] * 0.5 + red[region] * 0.5
        axes[2].imshow(overlay.astype(np.uint8))
        axes[2].set_title(f"Anomalous Regions (threshold={threshold})", fontsize=13)
        axes[2].axis("off")

        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(save_path, dpi=150, bbox_inches="tight")

        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        w, h = fig.canvas.get_width_height()
        result = buf.reshape(h, w, 4)[..., :3].copy()
        plt.close(fig)
        return result

    # ------------------------------------------------------------------
    # Legend creation helper
    # ------------------------------------------------------------------

    @staticmethod
    def create_legend_image(
        class_colors: Dict[str, Tuple[int, int, int]],
        save_path: Optional[str] = None,
    ) -> np.ndarray:
        """Create a standalone legend image for class colours.

        Args:
            class_colors: Mapping of class name to RGB colour.
            save_path: Optional save path.

        Returns:
            Rendered legend as an RGB ``uint8`` array.
        """
        fig, ax = plt.subplots(figsize=(4, len(class_colors) * 0.5 + 0.5))
        patches = []
        for name, rgb in class_colors.items():
            colour = tuple(c / 255.0 for c in rgb)
            patches.append(mpatches.Patch(color=colour, label=name))
        ax.legend(handles=patches, loc="center", fontsize=11, frameon=False)
        ax.axis("off")
        plt.tight_layout()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(save_path, dpi=150, bbox_inches="tight")

        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        w, h = fig.canvas.get_width_height()
        result = buf.reshape(h, w, 4)[..., :3].copy()
        plt.close(fig)
        return result
