"""
Variational Autoencoder (VAE) anomaly detector for NER-SHIELD.

Trained exclusively on *normal* satellite images.  At inference time,
high reconstruction error signals an anomalous region (disaster damage).

Architecture:
  - Encoder: cascading Conv2d blocks -> flattened -> mu & log_var
  - Reparameterisation: z = mu + sigma * epsilon
  - Decoder: Linear -> reshape -> ConvTranspose2d blocks -> reconstructed image
  - Anomaly score: per-pixel MSE normalised to 0-100
  - Threshold: 95th percentile of reconstruction error on normal validation set
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

from src.utils.logger import get_logger

logger = get_logger(__name__)


class _ConvBlock(nn.Module):
    """Encoder building block: Conv -> BN -> LeakyReLU."""

    def __init__(self, in_ch: int, out_ch: int, stride: int = 2) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=4, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.LeakyReLU(0.2, inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class _DeconvBlock(nn.Module):
    """Decoder building block: ConvTranspose -> BN -> ReLU."""

    def __init__(self, in_ch: int, out_ch: int, stride: int = 2) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.ConvTranspose2d(
                in_ch, out_ch, kernel_size=4, stride=stride, padding=1, bias=False
            ),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class Encoder(nn.Module):
    """VAE encoder: image -> (mu, log_var).

    Args:
        in_channels: Number of image channels.
        channels: Channel widths for each convolutional stage.
        latent_dim: Dimensionality of the latent space.
        input_size: Spatial size of the input image (assumed square).
    """

    def __init__(
        self,
        in_channels: int = 3,
        channels: Tuple[int, ...] = (32, 64, 128, 256, 512),
        latent_dim: int = 256,
        input_size: int = 256,
    ) -> None:
        super().__init__()
        layers: List[nn.Module] = []
        prev_ch = in_channels
        for ch in channels:
            layers.append(_ConvBlock(prev_ch, ch))
            prev_ch = ch
        self.conv_layers = nn.Sequential(*layers)

        # Compute flattened size after all downsampling
        spatial = input_size
        for _ in channels:
            spatial = spatial // 2
        self._flat_size = prev_ch * spatial * spatial
        self._spatial = spatial
        self._last_ch = prev_ch

        self.fc_mu = nn.Linear(self._flat_size, latent_dim)
        self.fc_logvar = nn.Linear(self._flat_size, latent_dim)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode to mean and log-variance of the latent distribution.

        Args:
            x: Input image ``(B, C, H, W)``.

        Returns:
            ``(mu, log_var)`` each of shape ``(B, latent_dim)``.
        """
        h = self.conv_layers(x)
        h = h.view(h.size(0), -1)
        return self.fc_mu(h), self.fc_logvar(h)


class Decoder(nn.Module):
    """VAE decoder: z -> reconstructed image.

    Args:
        out_channels: Number of output image channels.
        channels: Channel widths for each deconvolution stage (reverse
            of encoder).
        latent_dim: Dimensionality of the latent vector.
        initial_spatial: Spatial size at the start of the decoder.
        initial_channels: Channel count at the start of the decoder.
    """

    def __init__(
        self,
        out_channels: int = 3,
        channels: Tuple[int, ...] = (512, 256, 128, 64, 32),
        latent_dim: int = 256,
        initial_spatial: int = 8,
        initial_channels: int = 512,
    ) -> None:
        super().__init__()
        self._initial_spatial = initial_spatial
        self._initial_channels = initial_channels
        flat_size = initial_channels * initial_spatial * initial_spatial

        self.fc = nn.Sequential(
            nn.Linear(latent_dim, flat_size),
            nn.ReLU(inplace=True),
        )

        layers: List[nn.Module] = []
        prev_ch = channels[0]
        for ch in channels[1:]:
            layers.append(_DeconvBlock(prev_ch, ch))
            prev_ch = ch

        # Final layer: no BN, use Sigmoid to map to [0, 1]
        layers.append(
            nn.Sequential(
                nn.ConvTranspose2d(
                    prev_ch, out_channels, kernel_size=4, stride=2, padding=1, bias=False
                ),
                nn.Sigmoid(),
            )
        )
        self.deconv_layers = nn.Sequential(*layers)

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        """Decode a latent vector to a reconstructed image.

        Args:
            z: Latent vector ``(B, latent_dim)``.

        Returns:
            Reconstructed image ``(B, C, H, W)`` with values in ``[0, 1]``.
        """
        h = self.fc(z)
        h = h.view(h.size(0), self._initial_channels, self._initial_spatial, self._initial_spatial)
        return self.deconv_layers(h)


class AnomalyDetectorVAE(nn.Module):
    """Variational Autoencoder for anomaly detection.

    Trained on *normal* satellite images only.  Anomalous inputs
    produce higher reconstruction error.

    Args:
        in_channels: Number of image channels.
        latent_dim: Latent-space dimensionality.
        encoder_channels: Channel progression for the encoder.
        decoder_channels: Channel progression for the decoder.
        input_size: Expected spatial input size (square).
        kl_weight: Weight of the KL divergence term in the loss.
        anomaly_threshold_percentile: Percentile of normal
            reconstruction error to use as the anomaly threshold.
    """

    def __init__(
        self,
        in_channels: int = 3,
        latent_dim: int = 256,
        encoder_channels: Tuple[int, ...] = (32, 64, 128, 256, 512),
        decoder_channels: Tuple[int, ...] = (512, 256, 128, 64, 32),
        input_size: int = 256,
        kl_weight: float = 0.0005,
        anomaly_threshold_percentile: float = 95.0,
    ) -> None:
        super().__init__()
        self.latent_dim = latent_dim
        self.kl_weight = kl_weight
        self.anomaly_threshold_percentile = anomaly_threshold_percentile
        self.input_size = input_size

        # Compute the spatial size after all encoder downsampling
        spatial = input_size
        for _ in encoder_channels:
            spatial = spatial // 2

        self.encoder = Encoder(
            in_channels=in_channels,
            channels=encoder_channels,
            latent_dim=latent_dim,
            input_size=input_size,
        )
        self.decoder = Decoder(
            out_channels=in_channels,
            channels=decoder_channels,
            latent_dim=latent_dim,
            initial_spatial=spatial,
            initial_channels=decoder_channels[0],
        )

        # Learnable anomaly threshold (set during calibration)
        self.register_buffer("anomaly_threshold", torch.tensor(50.0))

        total_params = sum(p.numel() for p in self.parameters())
        logger.info(
            "AnomalyDetectorVAE: %.2fM params, latent_dim=%d, input=%d",
            total_params / 1e6,
            latent_dim,
            input_size,
        )

    @staticmethod
    def reparameterise(mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        """Reparameterisation trick: z = mu + sigma * epsilon.

        Args:
            mu: Mean of the latent distribution ``(B, D)``.
            logvar: Log-variance ``(B, D)``.

        Returns:
            Sampled latent vector ``(B, D)``.
        """
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + std * eps

    def forward(
        self, x: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """Forward pass: encode -> reparameterise -> decode.

        Args:
            x: Input images ``(B, C, H, W)`` with values in ``[0, 1]``.

        Returns:
            Dictionary with ``reconstruction``, ``mu``, ``logvar``, ``z``.
        """
        mu, logvar = self.encoder(x)
        z = self.reparameterise(mu, logvar)
        recon = self.decoder(z)
        return {
            "reconstruction": recon,
            "mu": mu,
            "logvar": logvar,
            "z": z,
        }

    def compute_loss(
        self,
        x: torch.Tensor,
        outputs: Dict[str, torch.Tensor],
    ) -> Dict[str, torch.Tensor]:
        """Compute VAE loss = reconstruction MSE + KL divergence.

        Args:
            x: Original input images.
            outputs: Dictionary from :meth:`forward`.

        Returns:
            Dictionary with ``total_loss``, ``recon_loss``, ``kl_loss``.
        """
        recon = outputs["reconstruction"]
        mu = outputs["mu"]
        logvar = outputs["logvar"]

        recon_loss = F.mse_loss(recon, x, reduction="mean")
        kl_loss = -0.5 * torch.mean(1 + logvar - mu.pow(2) - logvar.exp())
        total_loss = recon_loss + self.kl_weight * kl_loss

        return {
            "total_loss": total_loss,
            "recon_loss": recon_loss,
            "kl_loss": kl_loss,
        }

    @torch.no_grad()
    def compute_anomaly_score(
        self, x: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """Compute per-pixel anomaly scores.

        Args:
            x: Input images ``(B, C, H, W)`` in ``[0, 1]``.

        Returns:
            Dictionary with:
            - ``score_map``: per-pixel scores ``(B, H, W)`` in ``[0, 100]``
            - ``overall_score``: scalar score per image ``(B,)`` in ``[0, 100]``
            - ``is_anomalous``: boolean ``(B,)``
            - ``reconstruction``: the decoder output
        """
        self.eval()
        outputs = self.forward(x)
        recon = outputs["reconstruction"]

        # Per-pixel MSE across channels
        per_pixel_mse = torch.mean((x - recon) ** 2, dim=1)  # (B, H, W)

        # Normalise to [0, 100]: use a fixed scale based on max possible MSE (1.0)
        # but also adaptively clip at the 99.9th percentile to avoid outlier domination
        b = per_pixel_mse.shape[0]
        score_maps = []
        for i in range(b):
            ppm = per_pixel_mse[i]
            p999 = torch.quantile(ppm, 0.999).clamp(min=1e-6)
            normalised = (ppm / p999).clamp(0, 1) * 100.0
            score_maps.append(normalised)
        score_map = torch.stack(score_maps)

        overall_score = score_map.view(b, -1).mean(dim=1)
        is_anomalous = overall_score > self.anomaly_threshold

        return {
            "score_map": score_map,
            "overall_score": overall_score,
            "is_anomalous": is_anomalous,
            "reconstruction": recon,
        }

    def calibrate_threshold(
        self, normal_scores: np.ndarray
    ) -> float:
        """Set the anomaly threshold from a set of normal-image scores.

        The threshold is the ``anomaly_threshold_percentile``-th percentile
        of the provided scores.

        Args:
            normal_scores: 1-D array of overall anomaly scores from the
                normal validation set.

        Returns:
            The computed threshold value.
        """
        threshold = float(np.percentile(normal_scores, self.anomaly_threshold_percentile))
        self.anomaly_threshold.fill_(threshold)
        logger.info(
            "Anomaly threshold calibrated to %.2f (%.1f-th percentile of %d samples)",
            threshold,
            self.anomaly_threshold_percentile,
            len(normal_scores),
        )
        return threshold

    def export_onnx(
        self,
        save_path: str,
        opset_version: int = 17,
    ) -> None:
        """Export to ONNX.

        Args:
            save_path: Destination ``.onnx`` file.
            opset_version: ONNX opset version.
        """
        self.eval()
        device = next(self.parameters()).device
        dummy = torch.randn(1, 3, self.input_size, self.input_size, device=device)

        class _Wrapper(nn.Module):
            def __init__(self, vae: "AnomalyDetectorVAE") -> None:
                super().__init__()
                self.vae = vae

            def forward(self, x: torch.Tensor) -> torch.Tensor:
                return self.vae(x)["reconstruction"]

        wrapper = _Wrapper(self)
        torch.onnx.export(
            wrapper,
            dummy,
            save_path,
            opset_version=opset_version,
            input_names=["input"],
            output_names=["reconstruction"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "reconstruction": {0: "batch_size"},
            },
        )
        logger.info("Exported anomaly detector to ONNX: %s", save_path)
