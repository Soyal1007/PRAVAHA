import React, { useState } from 'react';
import {
  ShieldAlert,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  CloudRain,
  Activity,
  Layers,
  Zap,
  Info,
  Sliders,
  Radio,
  FileCheck2,
  ShieldCheck,
  Ban,
  TrendingUp,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { evaluateRouteOption } from '../../services/routeEngine';
import { ROUTE_OPTIONS_MAP } from '../../data/seedData';
import { RouteOption } from '../../types';
import { InteractiveMap } from '../map/InteractiveMap';

interface CorridorSegmentAudit {
  id: string;
  name: string;
  lengthKm: number;
  demSlopeAngle: number;
  rainfallRateMmHr: number;
  verifiedIncidents: number;
  aiRiskScore: number;
  safetyFlag: 'SAFE' | 'CAUTION' | 'UNSAFE';
  aiRationale: string;
}

export const RouteGuardView: React.FC = () => {
  const { shipments, vehicles, roads, rerouteShipment } = useAppState();
  const { t } = useLanguage();

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('ship-2048');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-2048-rec');
  const [rerouteApplied, setRerouteApplied] = useState<boolean>(false);

  // Simulation Stress Test State
  const [simExtraRain, setSimExtraRain] = useState<boolean>(false);
  const [simLandslide, setSimLandslide] = useState<boolean>(false);
  const [simNightFog, setSimNightFog] = useState<boolean>(false);

  const shipment = shipments.find(s => s.id === selectedShipmentId) || shipments[0];
  const assignedVehicle = vehicles.find(v => v.id === shipment.vehicleId);

  const baseOptions: RouteOption[] = ROUTE_OPTIONS_MAP[shipment.id] || [
    evaluateRouteOption('Primary Corridor (NH-10)', 'Fastest', 472, 42, 60, true, true, true, 'siliguri-gangtok-nh10'),
    evaluateRouteOption('Bypass Alternate (NH-37)', 'Recommended', 495, 48, 24, false, false, false, 'guwahati-imphal-alternate'),
  ];

  // Dynamically re-evaluate route options based on AI Hazard Stress Simulator
  const availableOptions: RouteOption[] = baseOptions.map(opt => {
    let extraRisk = 0;
    let hasRain = opt.weatherExposure.includes('Rain') || simExtraRain;
    let isBlocked = opt.riskLevel === 'Critical' || simLandslide;

    if (simExtraRain) extraRisk += 25;
    if (simLandslide) extraRisk += 40;
    if (simNightFog) extraRisk += 15;

    const newRiskScore = Math.min(100, opt.riskScore + extraRisk);
    let newRiskLevel = opt.riskLevel;
    if (newRiskScore >= 65 || isBlocked) newRiskLevel = 'Critical';
    else if (newRiskScore >= 35) newRiskLevel = 'High';
    else newRiskLevel = 'Low';

    return {
      ...opt,
      riskScore: newRiskScore,
      riskLevel: newRiskLevel,
      weatherExposure: simExtraRain ? 'Torrential Downpour (55mm/hr)' : opt.weatherExposure,
      recommendationReason: isBlocked
        ? 'AI Flagged UNSAFE: Active road blockage or landslide hazard detected on primary corridor.'
        : opt.recommendationReason,
    };
  });

  const activeOption = availableOptions.find(o => o.id === selectedOptionId) || availableOptions[0];

  // Detailed Segment Breakdown Mock Data for the selected route
  const segmentAudits: CorridorSegmentAudit[] = [
    {
      id: 'seg-1',
      name: 'Siliguri Outer Expressway (Pass 1)',
      lengthKm: 45,
      demSlopeAngle: 12,
      rainfallRateMmHr: simExtraRain ? 52 : 14,
      verifiedIncidents: 0,
      aiRiskScore: Math.min(100, 15 + (simExtraRain ? 25 : 0)),
      safetyFlag: simExtraRain ? 'CAUTION' : 'SAFE',
      aiRationale: simExtraRain
        ? 'AI Flagged CAUTION: Rainfall rate > 50mm/hr increases hydroplaning risk. Speed capped at 40 km/h.'
        : 'AI Flagged SAFE: Low DEM gradient (12°), zero active incidents, clear surface telemetry.',
    },
    {
      id: 'seg-2',
      name: 'Sevoke Railway Bridge & River Bank (NH-10)',
      lengthKm: 68,
      demSlopeAngle: 28,
      rainfallRateMmHr: simExtraRain ? 65 : 28,
      verifiedIncidents: simLandslide ? 2 : 1,
      aiRiskScore: Math.min(100, 48 + (simExtraRain ? 20 : 0) + (simLandslide ? 35 : 0)),
      safetyFlag: simLandslide || simExtraRain ? 'UNSAFE' : 'CAUTION',
      aiRationale: simLandslide
        ? 'AI Flagged UNSAFE: ISRO DEM slope 28° + active verified landslide report from field officer. Mandatory bypass required.'
        : 'AI Flagged CAUTION: Single lane mountain pass with moderate rockfall risk.',
    },
    {
      id: 'seg-3',
      name: 'Teesta River Basin & High-Altitude Pass',
      lengthKm: 112,
      demSlopeAngle: 42,
      rainfallRateMmHr: simExtraRain ? 78 : 35,
      verifiedIncidents: simLandslide ? 3 : 0,
      aiRiskScore: Math.min(100, 32 + (simExtraRain ? 30 : 0) + (simLandslide ? 45 : 0)),
      safetyFlag: simLandslide ? 'UNSAFE' : simExtraRain ? 'CAUTION' : 'SAFE',
      aiRationale: simLandslide
        ? 'AI Flagged UNSAFE: River bank erosion score 88/100 + ground mudslide detected by IoT sensors.'
        : 'AI Flagged SAFE: Active monitoring node healthy, clear corridor telemetry.',
    },
    {
      id: 'seg-4',
      name: 'Singtam-Gangtok Valley Final Stretch',
      lengthKm: 85,
      demSlopeAngle: 18,
      rainfallRateMmHr: simExtraRain ? 40 : 10,
      verifiedIncidents: 0,
      aiRiskScore: Math.min(100, 18 + (simNightFog ? 15 : 0)),
      safetyFlag: 'SAFE',
      aiRationale: 'AI Flagged SAFE: Stable asphalt corridor with active road maintenance squad on standby.',
    },
  ];

  const handleApplyReroute = () => {
    rerouteShipment(shipment.id, activeOption.id);
    setRerouteApplied(true);
    setTimeout(() => setRerouteApplied(false), 4000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto font-body">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#087F8C] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
            <ShieldAlert className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="font-display font-black text-2xl tracking-tight text-white">
                RouteGuard AI Safety & Reroute Engine
              </h2>
              <span className="bg-teal-400/20 text-teal-200 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border border-teal-400/30">
                Explainable Risk AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-3xl">
              Deterministic spatial hazard evaluation, ISRO/NESDR polygon intersection, real-time IoT weather scoring, and automated safe bypass selection.
            </p>
          </div>
        </div>

        {/* Active Shipment Selector */}
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shrink-0 space-y-1">
          <div className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">Select Active Cargo Shipment</div>
          <select
            value={selectedShipmentId}
            onChange={e => {
              setSelectedShipmentId(e.target.value);
              setRerouteApplied(false);
            }}
            className="bg-slate-900 text-white text-xs font-extrabold rounded-xl px-3 py-2 outline-none border border-teal-500/40 cursor-pointer w-full"
          >
            {shipments.map(s => (
              <option key={s.id} value={s.id}>
                {s.trackingCode} - {s.title.substring(0, 32)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI SAFETY CLASSIFICATION PIPELINE EXPLANATION PANEL */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-[#087F8C]" />
              <h3 className="font-extrabold text-lg text-slate-900 font-display">
                AI Road Safety Classification Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              How PRAVAHA AI calculates safety risk indices and flags whether a mountain corridor is <b>SAFE</b>, <b>RESTRICTED</b>, or <b>UNSAFE</b>.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-teal-50 text-[#087F8C] px-3.5 py-2 rounded-2xl border border-teal-200 text-xs font-bold">
            <Zap className="w-4 h-4 text-[#087F8C]" />
            <span>Deterministic Scoring Model v3.4</span>
          </div>
        </div>

        {/* 4 Multi-Layer Evaluation Factors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>1. ISRO GIS Layer</span>
              </span>
              <span className="bg-teal-100 text-[#087F8C] font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                35% Weight
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Intersects route polyline with NESDR DEM slope gradient (&gt;35°), fault line buffers, and historical landslide polygons.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <CloudRain className="w-4 h-4 text-blue-600" />
                <span>2. Doppler Radar</span>
              </span>
              <span className="bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                25% Weight
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Real-time precipitation rate (mm/hr), ground saturation index, and fog density telemetry from CWC & IMD sensors.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                <span>3. Ground Audit</span>
              </span>
              <span className="bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                25% Weight
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Verified field officer mobile reports, n8n voice hotline call transcriptions, and IoT highway vibration alerts.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>4. Vehicle Load</span>
              </span>
              <span className="bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                15% Weight
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Assigned truck gross vehicle mass (GVM) vs bridge structural tonnage rating and steep inclines.
            </p>
          </div>
        </div>

        {/* Safety Classification Thresholds Bar */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>AI Road Safety Classification Thresholds</span>
            <span className="font-mono text-teal-300">Composite Risk Index Score (0 - 100)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-xl flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-emerald-300 flex items-center space-x-2">
                  <span>🟢 SAFE ROUTE</span>
                  <span className="text-[10px] font-mono bg-emerald-900 px-2 py-0.5 rounded">Risk 0 - 34</span>
                </div>
                <p className="text-[11px] text-emerald-100/80 mt-1">
                  Passed all hazard checks. Standard speeds allowed. No alternate bypass needed.
                </p>
              </div>
            </div>

            <div className="bg-amber-950/80 border border-amber-500/40 p-3 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-amber-300 flex items-center space-x-2">
                  <span>🟡 RESTRICTED</span>
                  <span className="text-[10px] font-mono bg-amber-900 px-2 py-0.5 rounded">Risk 35 - 64</span>
                </div>
                <p className="text-[11px] text-amber-100/80 mt-1">
                  Single-lane pass or rain hazard. Convoy speed limited to 25 km/h with driver alerts.
                </p>
              </div>
            </div>

            <div className="bg-red-950/80 border border-red-500/40 p-3 rounded-xl flex items-start space-x-3">
              <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-red-300 flex items-center space-x-2">
                  <span>🔴 UNSAFE / BLOCKED</span>
                  <span className="text-[10px] font-mono bg-red-900 px-2 py-0.5 rounded">Risk 65 - 100</span>
                </div>
                <p className="text-[11px] text-red-100/80 mt-1">
                  Active landslide or washout. AI flags route as UNVIABLE and triggers automated reroute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE AI HAZARD STRESS SIMULATOR */}
      <div className="bg-[#F7F9FA] p-5 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#087F8C]" />
            <h3 className="font-bold text-base text-slate-900">
              Interactive AI Hazard Stress Test Simulator
            </h3>
          </div>
          <span className="text-xs text-slate-500">Toggle live environmental hazards to see real-time AI re-classification</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setSimExtraRain(!simExtraRain)}
            className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
              simExtraRain
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <CloudRain className={`w-5 h-5 ${simExtraRain ? 'text-white' : 'text-blue-500'}`} />
              <span>Simulate Downpour (55mm/hr)</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${simExtraRain ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
              +25 Risk
            </span>
          </button>

          <button
            onClick={() => setSimLandslide(!simLandslide)}
            className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
              simLandslide
                ? 'bg-red-600 text-white border-red-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className={`w-5 h-5 ${simLandslide ? 'text-white' : 'text-red-500'}`} />
              <span>Simulate Landslide Blockage</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${simLandslide ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'}`}>
              +40 Risk (Block)
            </span>
          </button>

          <button
            onClick={() => setSimNightFog(!simNightFog)}
            className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
              simNightFog
                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Radio className={`w-5 h-5 ${simNightFog ? 'text-white' : 'text-purple-500'}`} />
              <span>Simulate Night Fog & Low Vis</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${simNightFog ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'}`}>
              +15 Risk
            </span>
          </button>
        </div>
      </div>

      {/* COMPARATIVE ROUTE OPTIONS WITH AI SCORING */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 font-display">
            Generated Route Options & AI Risk Scoring
          </h3>
          <span className="text-xs text-slate-500 font-medium">Click a card to inspect corridor safety</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableOptions.map(opt => {
            const isSelected = opt.id === selectedOptionId;
            const isCurrentlyActive = shipment.activeRouteId === opt.id;
            const isUnsafe = opt.riskLevel === 'Critical';

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 relative ${
                  isSelected
                    ? 'bg-white border-[#087F8C] ring-4 ring-[#087F8C]/15 shadow-xl'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase ${
                      opt.type === 'Recommended'
                        ? 'bg-teal-100 text-[#087F8C] border border-teal-200'
                        : opt.type === 'Fastest'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {opt.type}
                  </span>

                  {isCurrentlyActive && (
                    <span className="text-[10px] bg-slate-900 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Active Route
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-base text-slate-900">{opt.name}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{opt.recommendationReason}</p>
                </div>

                {/* Risk score gauge */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">AI Safety Score</span>
                    <span
                      className={`font-black text-sm ${
                        isUnsafe ? 'text-red-600' : opt.riskScore > 34 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {opt.riskScore} / 100 ({isUnsafe ? '🔴 UNSAFE' : opt.riskScore > 34 ? '🟡 CAUTION' : '🟢 SAFE'})
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isUnsafe ? 'bg-red-500' : opt.riskScore > 34 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${opt.riskScore}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#F7F9FA] p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Distance</span>
                    <span className="font-extrabold text-slate-800">{opt.distanceKm} km</span>
                  </div>

                  <div className="bg-[#F7F9FA] p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Duration</span>
                    <span className="font-extrabold text-[#087F8C]">{opt.estimatedDurationHours} hrs</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Select Route</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'bg-[#087F8C] border-[#087F8C] text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEGMENT-BY-SEGMENT CORRIDOR SAFETY BREAKDOWN TABLE */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 font-display">
              Corridor Segment Safety Breakdown & AI Rationale
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspecting individual highway stretches along <b>{activeOption.name}</b> to verify safety flags.
            </p>
          </div>

          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            {segmentAudits.length} Highway Segments Evaluated
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Segment Name</th>
                <th className="py-3.5 px-4">Length</th>
                <th className="py-3.5 px-4">DEM Slope</th>
                <th className="py-3.5 px-4">Rain Rate</th>
                <th className="py-3.5 px-4">Safety Flag</th>
                <th className="py-3.5 px-4">AI Explainable Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {segmentAudits.map(seg => (
                <tr key={seg.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900">{seg.name}</td>
                  <td className="py-4 px-4 text-slate-600 font-mono">{seg.lengthKm} km</td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-800">{seg.demSlopeAngle}°</td>
                  <td className="py-4 px-4 font-mono text-blue-700 font-bold">{seg.rainfallRateMmHr} mm/hr</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        seg.safetyFlag === 'SAFE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : seg.safetyFlag === 'CAUTION'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {seg.safetyFlag === 'SAFE' ? '🟢 SAFE' : seg.safetyFlag === 'CAUTION' ? '🟡 CAUTION' : '🔴 UNSAFE'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600 max-w-md text-xs leading-relaxed">
                    {seg.aiRationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GIS LIVE CORRIDOR MAP DISPLAY */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 font-display">Live GIS Corridor Safety Overlay</h3>
            <p className="text-xs text-slate-500">Visualizing primary vs alternate bypass safety polylines on the map.</p>
          </div>
          <span className="text-xs text-[#087F8C] font-bold">Northeast Mountain Corridors</span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <InteractiveMap
            layers={{
              showVehicles: true,
              showShipments: true,
              showIncidents: true,
              showBlockedRoads: true,
              showWarehouses: false,
              showHospitals: false,
              showWeatherRisk: true,
              showRoutePolylines: true,
            }}
            height="460px"
          />
        </div>
      </div>

      {/* REROUTE EXECUTION BAR */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="bg-teal-400/20 text-teal-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-teal-400/30">
              Selected Target Corridor
            </span>
            <span className="font-extrabold text-lg text-white font-display">{activeOption.name}</span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Applying this reroute updates truck GPS navigation telemetry, recalculates delivery ETAs, and broadcasts to Driver cab & Command Center.
          </p>
        </div>

        <button
          onClick={handleApplyReroute}
          className="bg-[#087F8C] hover:bg-teal-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center space-x-2 shrink-0 border border-teal-400/30"
        >
          <Navigation className="w-5 h-5 text-teal-200" />
          <span>EXECUTE & DISPATCH REROUTE</span>
        </button>
      </div>

      {rerouteApplied && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-extrabold flex items-center space-x-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Reroute successfully applied! Truck navigation telemetry updated and broadcasted across PRAVAHA fleet network.</span>
        </div>
      )}
    </div>
  );
};
