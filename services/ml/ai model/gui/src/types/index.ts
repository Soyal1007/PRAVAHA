// ── Event Classification ────────────────────────────────────────
export interface EventClassification {
  type: string;
  icon: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  evidence: string[];
}

// ── NDVI Vegetation Health ──────────────────────────────────────
export interface NdviResult {
  ndviMap: string;        // data URL
  vegetationPct: number;  // healthy vegetation %
  stressedPct: number;    // stressed/bare %
  healthScore: number;    // 0-100 overall health
}

// ── RGB Histogram ───────────────────────────────────────────────
export interface HistogramData {
  r: number[];  // 64 bins
  g: number[];
  b: number[];
}

// ── Land Cover Class ────────────────────────────────────────────
export interface LandCoverClass {
  name: string;
  percentage: number;
  color: string;
}

// ── Analysis Metadata ───────────────────────────────────────────
export interface AnalysisMetadata {
  imageWidth: number;
  imageHeight: number;
  totalPixels: number;
  analysisTimeMs: number;
  engine: string;
  version: string;
}

// ── Main Result ─────────────────────────────────────────────────
export interface ChangeDetectionResult {
  id: string;
  beforeImage: string;
  afterImage: string;
  changeMap?: string;
  totalChangedArea: number;
  changePercentage: number;
  regions: ChangeRegion[];
  event: EventClassification;
  timestamp: string;
  // Realism features
  ndviBefore: NdviResult;
  ndviAfter: NdviResult;
  riskHeatmap: string;
  histogramBefore: HistogramData;
  histogramAfter: HistogramData;
  landCoverBefore: LandCoverClass[];
  landCoverAfter: LandCoverClass[];
  metadata: AnalysisMetadata;
}

export interface ChangeRegion {
  id: string;
  type: string;
  area: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  coordinates: { x: number; y: number; width: number; height: number };
  description: string;
}
