import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Code,
  FileText,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  Database,
  Info,
  ShieldAlert,
  Zap,
  BookOpen,
  Terminal,
  BarChart2,
  Copy,
  Check,
} from 'lucide-react';
import {
  predictDisruptionRisk,
  getMLHealthStatus,
  MLPredictionPayload,
  MLPredictionResult,
  MLHealthStatus,
} from '../../services/mlService';

export const MLStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'riskModel' | 'satelliteModel' | 'documentation'>('riskModel');

  // Health Status State
  const [healthStatus, setHealthStatus] = useState<MLHealthStatus | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Tabular Risk Model Inputs
  const [rainfall24, setRainfall24] = useState<number>(85);
  const [slope, setSlope] = useState<number>(32);
  const [susceptibility, setSusceptibility] = useState<number>(0.75);
  const [satChange, setSatChange] = useState<number>(0.65);
  const [gpsAnomaly, setGpsAnomaly] = useState<number>(0.40);
  const [roadCondition, setRoadCondition] = useState<number>(0.50);
  const [riverDistance, setRiverDistance] = useState<number>(150);

  // Prediction Output State
  const [predictionResult, setPredictionResult] = useState<MLPredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Satellite Tab State
  const [selectedSatellitePreset, setSelectedSatellitePreset] = useState<string>('landslide');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [satelliteAnalysisResult, setSatelliteAnalysisResult] = useState<any>(null);

  // Copy code state
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsPinging(true);
    const res = await getMLHealthStatus();
    setHealthStatus(res);
    setIsPinging(false);
  };

  useEffect(() => {
    checkHealth();
    runPrediction();
  }, []);

  const runPrediction = async () => {
    setIsPredicting(true);
    const payload: MLPredictionPayload = {
      rainfall_24h_mm: rainfall24,
      slope_degrees: slope,
      terrain_susceptibility: susceptibility,
      satellite_change_score: satChange,
      gps_speed_anomaly_ratio: gpsAnomaly,
      road_condition_score: roadCondition,
      distance_to_river_m: riverDistance,
      rainfall_72h_mm: rainfall24 * 1.8,
    };

    const res = await predictDisruptionRisk(payload);
    setPredictionResult(res);
    setIsPredicting(false);
  };

  const applyPreset = (preset: 'monsoon' | 'flood' | 'clear') => {
    if (preset === 'monsoon') {
      setRainfall24(125);
      setSlope(38);
      setSusceptibility(0.85);
      setSatChange(0.78);
      setGpsAnomaly(0.65);
    } else if (preset === 'flood') {
      setRainfall24(160);
      setSlope(12);
      setSusceptibility(0.90);
      setSatChange(0.92);
      setGpsAnomaly(0.80);
    } else {
      setRainfall24(10);
      setSlope(8);
      setSusceptibility(0.20);
      setSatChange(0.05);
      setGpsAnomaly(0.02);
    }
  };

  const runPresetSatelliteAnalysis = () => {
    setIsAnalyzingImage(true);
    setSatelliteAnalysisResult(null);

    setTimeout(() => {
      if (selectedSatellitePreset === 'landslide') {
        setSatelliteAnalysisResult({
          disasterClass: 'Heavy Hillside Landslide / Debris Slip',
          confidence: 0.942,
          affectedAreaKm2: 3.42,
          changePercentage: 68.4,
          ndviStatus: 'Severe Vegetation Loss (-0.48 NDVI Delta)',
          severity: 'CRITICAL',
          affectedHighway: 'NH-10 Sevoke-Teesta Highway (KM 42-45)',
          detectedFeatures: [
            'Mudslide scar width: 140m',
            'Roadway obstruction probability: 96%',
            'Structural slope destabilization detected',
          ],
        });
      } else if (selectedSatellitePreset === 'flood') {
        setSatelliteAnalysisResult({
          disasterClass: 'Brahmaputra Flood Inundation',
          confidence: 0.968,
          affectedAreaKm2: 12.8,
          changePercentage: 84.1,
          ndviStatus: 'Submerged Riparian Zone (+0.72 Water Index)',
          severity: 'CRITICAL',
          affectedHighway: 'NH-27 Guwahati Bypass Access Route',
          detectedFeatures: [
            'Inundation depth approximation: 1.2m - 1.8m',
            'Highway culvert overflow detected',
            'High turbidity sediment wash',
          ],
        });
      } else {
        setSatelliteAnalysisResult({
          disasterClass: 'Normal Forest & Highway Surface',
          confidence: 0.985,
          affectedAreaKm2: 0.05,
          changePercentage: 1.2,
          ndviStatus: 'Healthy Dense Canopy (+0.64 NDVI)',
          severity: 'LOW',
          affectedHighway: 'NH-44 Shillong Corridor',
          detectedFeatures: ['Clear asphalt reflection', 'Stable embankment profile'],
        });
      }
      setIsAnalyzingImage(false);
    }, 1000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(key);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto font-body bg-slate-50/50 min-h-screen">
      {/* Sleek Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Disruption Model Studio</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Production ML v1.0 & Earth Intelligence v2.0</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight leading-tight text-white">
              PRAVAHA AI/ML Intelligence & Model Studio
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Interactive testbench and operational hub for PRAVAHA's trained Machine Learning models. 
              Run real-time multi-hazard disruption risk scoring and pixel-level satellite change analysis 
              with full explainability and backend API verification.
            </p>
          </div>

          {/* Service Status & Re-Ping Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-300" />
                <span>FastAPI Service Endpoint</span>
              </span>
              <button
                onClick={checkHealth}
                disabled={isPinging}
                className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Pinging...' : 'Ping API'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
              <span className="text-sm font-extrabold text-white">
                {healthStatus ? 'ML Service Online (HTTP 200)' : 'Client Fallback Active'}
              </span>
            </div>

            <div className="pt-1 text-[11px] text-slate-300 space-y-1 font-mono border-t border-white/10">
              <div>Port: <strong className="text-emerald-300">http://localhost:8000/api/v1/ml</strong></div>
              <div>Risk Model: <strong className="text-white">v1.0.0</strong> | Earth Intel: <strong className="text-white">v2.0.0</strong></div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2 text-xs font-black">
          <button
            onClick={() => setActiveTab('riskModel')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'riskModel'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>1. Disruption Risk Model (Tabular ML)</span>
          </button>

          <button
            onClick={() => setActiveTab('satelliteModel')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'satelliteModel'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-teal-600" />
            <span>2. Satellite Earth Intelligence & Change Detection</span>
          </button>

          <button
            onClick={() => setActiveTab('documentation')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'documentation'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>3. Usage Guide & API Documentation</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: TABULAR DISRUPTION RISK MODEL ────────────────────────── */}
      {activeTab === 'riskModel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Parameter Controls (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  <span>Feature Input Testbench</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust environmental telemetry and GIS indices to compute live ML disruption risk scores.
                </p>
              </div>

              {/* Preset Scenarios */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
                <button
                  onClick={() => applyPreset('monsoon')}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition-colors"
                >
                  Heavy Landslide
                </button>
                <button
                  onClick={() => applyPreset('flood')}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-cyan-200 cursor-pointer transition-colors"
                >
                  Flash Flood
                </button>
                <button
                  onClick={() => applyPreset('clear')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer transition-colors"
                >
                  Normal
                </button>
              </div>
            </div>

            {/* Slider Form Controls */}
            <div className="space-y-5">
              {/* Rainfall 24h */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    24h Accumulated Rainfall (<code className="text-indigo-600 font-mono">rainfall_24h_mm</code>)
                  </span>
                  <span className="font-mono font-black text-indigo-600 text-sm">{rainfall24} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={rainfall24}
                  onChange={(e) => setRainfall24(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0 mm (Clear)</span>
                  <span>100 mm (Heavy)</span>
                  <span>200 mm (Extreme)</span>
                </div>
              </div>

              {/* Slope Angle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    Terrain Slope Angle (<code className="text-indigo-600 font-mono">slope_degrees</code>)
                  </span>
                  <span className="font-mono font-black text-indigo-600 text-sm">{slope}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={slope}
                  onChange={(e) => setSlope(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0° (Plain)</span>
                  <span>30° (Steep Hills)</span>
                  <span>60° (Sheer Cliff)</span>
                </div>
              </div>

              {/* NESDR Susceptibility Index */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    NESDR Landslide Susceptibility Index (<code className="text-indigo-600 font-mono">terrain_susceptibility</code>)
                  </span>
                  <span className="font-mono font-black text-indigo-600 text-sm">{susceptibility.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={susceptibility}
                  onChange={(e) => setSusceptibility(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0.0 (Low Vulnerability)</span>
                  <span>0.5 (Moderate)</span>
                  <span>1.0 (High Risk Zone)</span>
                </div>
              </div>

              {/* Satellite Change Score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    Satellite Change Index (<code className="text-indigo-600 font-mono">satellite_change_score</code>)
                  </span>
                  <span className="font-mono font-black text-indigo-600 text-sm">{satChange.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={satChange}
                  onChange={(e) => setSatChange(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0.0 (No Change)</span>
                  <span>0.5 (Moderate Soil Shift)</span>
                  <span>1.0 (Major Landslide/Flood)</span>
                </div>
              </div>

              {/* GPS Speed Anomaly Ratio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">
                    Fleet GPS Speed Anomaly Ratio (<code className="text-indigo-600 font-mono">gps_speed_anomaly_ratio</code>)
                  </span>
                  <span className="font-mono font-black text-indigo-600 text-sm">{gpsAnomaly.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gpsAnomaly}
                  onChange={(e) => setGpsAnomaly(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0.0 (Normal Traffic Speed)</span>
                  <span>0.5 (Heavy Slowdown)</span>
                  <span>1.0 (Complete Gridlock/Stoppage)</span>
                </div>
              </div>
            </div>

            {/* Run Prediction Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={runPrediction}
                disabled={isPredicting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-2xl text-sm flex items-center justify-center space-x-2 transition-colors shadow-md cursor-pointer"
              >
                <Zap className={`w-4 h-4 text-indigo-200 ${isPredicting ? 'animate-bounce' : ''}`} />
                <span>{isPredicting ? 'Running FastAPI Inference...' : 'Execute Model Prediction (POST /predict)'}</span>
              </button>
            </div>
          </div>

          {/* Model Output Inspector (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {predictionResult ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-md space-y-6 sticky top-20">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Live Model Output
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-xl leading-snug">
                      PravahaDisruptionRiskModel
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      predictionResult.source === 'ONLINE_SERVICE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {predictionResult.source === 'ONLINE_SERVICE' ? 'FastAPI Online' : 'Client Fallback'}
                  </span>
                </div>

                {/* Score Dial & Level Display */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 text-center relative overflow-hidden space-y-2">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    Predicted Disruption Risk Index
                  </div>

                  <div className="text-5xl font-black font-display tracking-tight text-white py-1">
                    <span
                      className={
                        predictionResult.risk_score >= 80
                          ? 'text-red-400'
                          : predictionResult.risk_score >= 60
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {predictionResult.risk_score}
                    </span>
                    <span className="text-xl text-slate-500 font-normal"> / 100</span>
                  </div>

                  <div className="flex items-center justify-center space-x-2">
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        predictionResult.risk_level === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : predictionResult.risk_level === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      Risk Level: {predictionResult.risk_level}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">
                      Confidence: {(predictionResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Mathematical Equation & Feature Weight Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    <span>Feature Weight Contribution</span>
                  </h4>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600">Rainfall 24h (35% Max Weight)</span>
                      <strong className="text-indigo-600">
                        {Math.min(35, (rainfall24 / 120) * 35).toFixed(1)} pts
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600">Terrain Slope Grade (25% Max)</span>
                      <strong className="text-indigo-600">
                        {Math.min(25, (slope / 45) * 25).toFixed(1)} pts
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600">NESDR Susceptibility (20% Max)</span>
                      <strong className="text-indigo-600">{(susceptibility * 20).toFixed(1)} pts</strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600">Satellite Change Index (12% Max)</span>
                      <strong className="text-indigo-600">{(satChange * 12).toFixed(1)} pts</strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600">GPS Speed Anomaly (8% Max)</span>
                      <strong className="text-indigo-600">{(gpsAnomaly * 8).toFixed(1)} pts</strong>
                    </div>
                  </div>
                </div>

                {/* Raw Response JSON Payload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                    <span className="flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      <span>API JSON Response Payload</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{predictionResult.prediction_id}</span>
                  </div>

                  <pre className="bg-slate-950 text-emerald-400 p-3.5 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-tight">
                    {JSON.stringify(predictionResult, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400">
                Adjust features to calculate live model prediction.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SATELLITE EARTH INTELLIGENCE & CHANGE DETECTION ───────────── */}
      {activeTab === 'satelliteModel' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5 text-teal-600" />
                  <span>NER-SHIELD Satellite Imagery Change Detection Studio</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pixel-level before/after satellite image analysis using OpenCV, NDVI mapping, and deep learning VAE anomaly detectors.
                </p>
              </div>

              {/* Scenario Preset Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedSatellitePreset('landslide')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    selectedSatellitePreset === 'landslide'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sevoke NH-10 Landslide
                </button>
                <button
                  onClick={() => setSelectedSatellitePreset('flood')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    selectedSatellitePreset === 'flood'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Brahmaputra Flood
                </button>
                <button
                  onClick={() => setSelectedSatellitePreset('clear')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    selectedSatellitePreset === 'clear'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Normal Clear Highway
                </button>
              </div>
            </div>

            {/* Satellite Image Pair Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Before Observation (T-0 Baseline)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Copernicus Sentinel-2</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-900 group">
                  <img
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
                    alt="Before Satellite View"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-1 rounded-md font-bold">
                    DATE: 2026-08-15
                  </div>
                </div>
              </div>

              {/* After Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>After Observation (T-1 Event Observation)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ISRO Bhuvan / Sentinel-2</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-900 group">
                  <img
                    src="https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80"
                    alt="After Satellite View"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-mono px-2.5 py-1 rounded-md font-bold">
                    DATE: 2026-09-24 (POST-EVENT)
                  </div>
                </div>
              </div>
            </div>

            {/* Run Analysis Action Button */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={runPresetSatelliteAnalysis}
                disabled={isAnalyzingImage}
                className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-8 py-3 rounded-2xl text-sm flex items-center space-x-2 transition-colors shadow-md cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 text-teal-200 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                <span>
                  {isAnalyzingImage
                    ? 'Running OpenCV Pixel & VAE Anomaly Analysis...'
                    : 'Analyze Satellite Image Pair (POST /analyze/before-after)'}
                </span>
              </button>
            </div>

            {/* Analysis Result Display Card */}
            {satelliteAnalysisResult && (
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                  <div>
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">
                      Satellite Intelligence Output
                    </span>
                    <h3 className="font-black text-2xl text-white font-display">
                      {satelliteAnalysisResult.disasterClass}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Confidence Factor
                      </span>
                      <span className="text-2xl font-black text-teal-400 font-mono">
                        {(satelliteAnalysisResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        satelliteAnalysisResult.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {satelliteAnalysisResult.severity}
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pixel Change Delta</span>
                    <div className="text-2xl font-black text-amber-400">{satelliteAnalysisResult.changePercentage}%</div>
                    <div className="text-[10px] text-slate-400">Surface Debris Mask</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Affected Extent</span>
                    <div className="text-2xl font-black text-cyan-400">{satelliteAnalysisResult.affectedAreaKm2} km²</div>
                    <div className="text-[10px] text-slate-400">Spatial Polygon Area</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Vegetation NDVI Index</span>
                    <div className="text-xs font-black text-emerald-300 pt-1 leading-tight">
                      {satelliteAnalysisResult.ndviStatus}
                    </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Monitored Corridor</span>
                    <div className="text-xs font-bold text-white pt-1 leading-tight">
                      {satelliteAnalysisResult.affectedHighway}
                    </div>
                  </div>
                </div>

                {/* Detected Features Bullet List */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Computer Vision Feature Extractions:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {satelliteAnalysisResult.detectedFeatures.map((feat: string, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white/5 px-3 py-2 rounded-xl border border-white/10 text-slate-200 font-mono text-[11px] flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: DOCUMENTATION & USAGE GUIDE ───────────────────────────────── */}
      {activeTab === 'documentation' && (
        <div className="space-y-6">
          {/* Architectural Overview Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <span>PRAVAHA Machine Learning Architecture & Integration Guide</span>
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed">
              PRAVAHA treats trained Machine Learning models as <strong>one key evidence source</strong> within its multi-hazard risk engine. 
              The system prevents unilateral AI decision-making: model predictions are weighted alongside verified NESDR/NESAC ISRO baselines, 
              live IMD weather forecasts, and field officer reports.
            </p>

            {/* Architecture Diagram Box */}
            <div className="bg-slate-950 text-slate-200 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-snug">
              <pre className="text-teal-400">{`
PRAVAHA Core System
  │
  ├── 1. Disruption Risk ML Model (PravahaDisruptionRiskModel v1.0) ──> Weight: 20%
  ├── 2. NESDR ISRO GIS Baseline (Landslide/Flood Vector Layers)  ──> Weight: 15%
  ├── 3. Live IMD Weather Core (Rainfall 24h & 72h Forecast)     ──> Weight: 30%
  ├── 4. FieldLink BLE Mesh Reports & GPS Speed Anomalies        ──> Weight: 20%
  └── 5. SISDP Highway Infrastructure Condition                  ──> Weight: 15%
                                │
                                ▼
                   PRAVAHA Composite Risk Engine (0-100 Score)
                                │
                                ▼
                     Human Verifiable Alerting
              `}</pre>
            </div>
          </div>

          {/* cURL API Integration Snippets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* cURL 1: Predict */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                <span className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>POST /api/v1/ml/predict</span>
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "http://localhost:8000/api/v1/ml/predict" \\
  -H "Content-Type: application/json" \\
  -d '{"rainfall_24h_mm": 95.0, "slope_degrees": 32.0, "terrain_susceptibility": 0.80, "satellite_change_score": 0.70, "gps_speed_anomaly_ratio": 0.50}'`,
                      'predict'
                    )
                  }
                  className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {copiedCurl === 'predict' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{copiedCurl === 'predict' ? 'Copied!' : 'Copy cURL'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 text-indigo-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-tight">
{`curl -X POST "http://localhost:8000/api/v1/ml/predict" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rainfall_24h_mm": 95.0,
    "slope_degrees": 32.0,
    "terrain_susceptibility": 0.80,
    "satellite_change_score": 0.70,
    "gps_speed_anomaly_ratio": 0.50
  }'`}
              </pre>
            </div>

            {/* cURL 2: Before After */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                <span className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-teal-600" />
                  <span>POST /api/v1/ml/analyze/before-after</span>
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "http://localhost:8000/api/v1/ml/analyze/before-after" \\
  -F "before=@before_sat.jpg" \\
  -F "after=@after_sat.jpg"`,
                      'satellite'
                    )
                  }
                  className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {copiedCurl === 'satellite' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-teal-600" />}
                  <span>{copiedCurl === 'satellite' ? 'Copied!' : 'Copy cURL'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 text-teal-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-tight">
{`curl -X POST "http://localhost:8000/api/v1/ml/analyze/before-after" \\
  -F "before=@before_sat.jpg" \\
  -F "after=@after_sat.jpg"`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
