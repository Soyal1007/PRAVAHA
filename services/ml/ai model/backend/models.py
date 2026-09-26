"""Pydantic response models for the NER-SHIELD API."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal


class ClassProbability(BaseModel):
    class_name: str = Field(alias="className")
    probability: float
    color: str

    model_config = {"populate_by_name": True}


class ClassificationResult(BaseModel):
    predicted_class: str = Field(alias="predictedClass")
    confidence: float
    probabilities: list[ClassProbability]

    model_config = {"populate_by_name": True}


class SegmentationClass(BaseModel):
    name: str
    percentage: float
    color: str
    pixel_count: int = Field(alias="pixelCount")

    model_config = {"populate_by_name": True}


class SegmentationResult(BaseModel):
    classes: list[SegmentationClass]
    mask_url: str | None = Field(None, alias="maskUrl")

    model_config = {"populate_by_name": True}


class AnomalyRegion(BaseModel):
    id: str
    x: int
    y: int
    width: int
    height: int
    score: float
    label: str


class AnomalyResult(BaseModel):
    score: int
    heatmap_url: str | None = Field(None, alias="heatmapUrl")
    regions: list[AnomalyRegion]
    is_anomalous: bool = Field(alias="isAnomalous")

    model_config = {"populate_by_name": True}


class SeverityAssessment(BaseModel):
    level: Literal["low", "medium", "high", "critical"]
    score: int
    recommendations: list[str]
    risk_factors: list[str] = Field(alias="riskFactors")

    model_config = {"populate_by_name": True}


class GeoCoordinates(BaseModel):
    lat: float
    lng: float
    region: str | None = None
    state: str | None = None


class AnalysisResponse(BaseModel):
    id: str
    filename: str
    timestamp: str
    demo_mode: bool = Field(alias="demoMode")
    classification: ClassificationResult
    segmentation: SegmentationResult
    anomaly: AnomalyResult
    severity: SeverityAssessment
    coordinates: GeoCoordinates | None = None

    model_config = {"populate_by_name": True}


class ChangeRegion(BaseModel):
    id: str
    type: str
    area: float
    severity: Literal["low", "medium", "high", "critical"]
    coordinates: dict[str, int]
    description: str


class ChangeDetectionResponse(BaseModel):
    id: str
    before_image: str = Field(alias="beforeImage")
    after_image: str = Field(alias="afterImage")
    change_map: str | None = Field(None, alias="changeMap")
    total_changed_area: float = Field(alias="totalChangedArea")
    change_percentage: float = Field(alias="changePercentage")
    regions: list[ChangeRegion]
    timestamp: str

    model_config = {"populate_by_name": True}


class ModelMetricsResponse(BaseModel):
    f1_score: float = Field(alias="f1Score")
    m_iou: float = Field(alias="mIoU")
    change_detection_f1: float = Field(alias="changeDetectionF1")
    auc_roc: float = Field(alias="aucROC")
    precision: float
    recall: float
    accuracy: float

    model_config = {"populate_by_name": True}


class DatasetClassCount(BaseModel):
    name: str
    count: int
    color: str


class DatasetSourceDist(BaseModel):
    source: str
    count: int


class DatasetStateDist(BaseModel):
    state: str
    count: int


class DatasetSplitDist(BaseModel):
    split: str
    count: int


class DatasetStatsResponse(BaseModel):
    total_images: int = Field(alias="totalImages")
    total_annotations: int = Field(alias="totalAnnotations")
    class_counts: list[DatasetClassCount] = Field(alias="classCounts")
    source_distribution: list[DatasetSourceDist] = Field(alias="sourceDistribution")
    state_distribution: list[DatasetStateDist] = Field(alias="stateDistribution")
    split_distribution: list[DatasetSplitDist] = Field(alias="splitDistribution")

    model_config = {"populate_by_name": True}


class PredictionHistoryEntry(BaseModel):
    id: str
    filename: str
    timestamp: str
    predicted_class: str = Field(alias="predictedClass")
    confidence: float
    severity: Literal["low", "medium", "high", "critical"]
    anomaly_score: int = Field(alias="anomalyScore")
    state: str | None = None

    model_config = {"populate_by_name": True}


class HealthResponse(BaseModel):
    status: str
    demo_mode: bool
    version: str
    model_loaded: bool
    uptime_seconds: float
