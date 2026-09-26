import React, { useState } from 'react';
import {
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
  MapPin,
  Clock,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
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
  const { shipments, vehicles, rerouteShipment } = useAppState();

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('ship-2048');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-2048-rec');
  const [rerouteApplied, setRerouteApplied] = useState<boolean>(false);

  // Scenario Stress Test Modeling State
  const [simExtraRain, setSimExtraRain] = useState<boolean>(false);
  const [simLandslide, setSimLandslide] = useState<boolean>(false);
  const [simNightFog, setSimNightFog] = useState<boolean>(false);

  const shipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const assignedVehicle = vehicles.find((v) => v.id === shipment.vehicleId);

  const baseOptions: RouteOption[] = ROUTE_OPTIONS_MAP[shipment.id] || [
    evaluateRouteOption(
      'Primary Corridor (NH-10)',
      'Fastest',
      472,
      42,
      60,
      true,
      true,
      true,
      'siliguri-gangtok-nh10'
    ),
    evaluateRouteOption(
      'Bypass Alternate (NH-37)',
      'Recommended',
      495,
      48,
      24,
      false,
      false,
      false,
      'guwahati-imphal-alternate'
    ),
  ];

  // Evaluate route options based on active scenario parameters
  const availableOptions: RouteOption[] = baseOptions.map((opt) => {
    let extraRisk = 0;
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
        ? 'UNSAFE: Active road blockage or landslide hazard detected on primary corridor.'
        : opt.recommendationReason,
    };
  });

  const activeOption = availableOptions.find((o) => o.id === selectedOptionId) || availableOptions[0];

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
        ? 'CAUTION: Heavy rain rate > 50mm/hr increases hydroplaning risk. Speed advisory: 40 km/h.'
        : 'SAFE: Low DEM gradient (12°), zero active incidents, clear surface telemetry.',
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
        ? 'UNSAFE: Slope 28° + active verified landslide report from field officer. Bypass required.'
        : 'CAUTION: Single lane mountain pass with moderate rockfall risk.',
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
        ? 'UNSAFE: River bank erosion score 88/100 + ground mudslide reported.'
        : 'SAFE: Active monitoring node healthy, clear corridor telemetry.',
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
      aiRationale: 'SAFE: Stable asphalt corridor with active road maintenance squad on standby.',
    },
  ];

  const handleApplyReroute = () => {
    rerouteShipment(shipment.id, activeOption.id);
    setRerouteApplied(true);
    setTimeout(() => setRerouteApplied(false), 4000);
  };

  return (
    <div className="space-y-5 font-body">
      {/* Compact Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Route Intelligence & Reroute Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Multi-factor corridor safety assessment & dynamic bypass selection</span>
          </p>
        </div>

        {/* Cargo Shipment Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
          <Truck className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Active Cargo:</span>
          <select
            value={selectedShipmentId}
            onChange={(e) => {
              setSelectedShipmentId(e.target.value);
              setRerouteApplied(false);
            }}
            className="bg-white text-slate-900 text-xs font-bold rounded px-2.5 py-1 outline-none border border-slate-300 cursor-pointer"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.trackingCode} — {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Cargo Context Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Origin → Destination</span>
          <span className="font-bold text-slate-900">
            {shipment.origin.name} → {shipment.destination.name}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Assigned Vehicle</span>
          <span className="font-bold text-slate-900">
            {assignedVehicle ? `${assignedVehicle.registrationNumber} (${assignedVehicle.driver.name})` : 'Unassigned'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Commodity & Priority</span>
          <span className="font-bold text-slate-900">
            {shipment.category} ·{' '}
            <span className={shipment.priority === 'Critical' ? 'text-red-600 font-black' : 'text-slate-700'}>
              {shipment.priority} Priority
            </span>
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px] block">Current Status</span>
          <span className="font-bold text-teal-700">{shipment.status}</span>
        </div>
      </div>

      {/* Multi-Factor Safety Assessment Logic Overview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-teal-700" />
            <h3 className="font-bold text-sm text-slate-900">
              Corridor Safety Evaluation Weighting
            </h3>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded">
            Multi-Source Assessment Model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>1. ISRO GIS Layer</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                35%
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              NESDR DEM slope gradient (&gt;35°), fault line buffers, and historical landslide polygons.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                <span>2. IMD Weather</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                25%
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Precipitation rate (mm/hr), ground saturation index, and fog density telemetry.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1">
                <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Field Reports</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                25%
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Verified ground reports, voice hotline transcriptions, and localized blockage alerts.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>4. Vehicle Load</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                15%
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Assigned truck gross mass vs bridge structural rating and steep mountain incline caps.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Modeling / Stress Testing (Labeled clearly as simulation) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Scenario Modeling / Stress Testing Controls
            </h3>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
            Diagnostic Tool
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setSimExtraRain(!simExtraRain)}
            className={`p-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
              simExtraRain
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CloudRain className="w-4 h-4" />
              <span>Heavy Downpour (55mm/hr)</span>
            </div>
            <span className="text-[10px] font-mono font-bold opacity-80">+25 Risk</span>
          </button>

          <button
            onClick={() => setSimLandslide(!simLandslide)}
            className={`p-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
              simLandslide
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Corridor Blockage</span>
            </div>
            <span className="text-[10px] font-mono font-bold opacity-80">+40 Risk</span>
          </button>

          <button
            onClick={() => setSimNightFog(!simNightFog)}
            className={`p-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
              simNightFog
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4" />
              <span>Dense Mountain Fog</span>
            </div>
            <span className="text-[10px] font-mono font-bold opacity-80">+15 Risk</span>
          </button>
        </div>
      </div>

      {/* Evaluated Route Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Available Route Options ({availableOptions.length})
          </h3>
          <span className="text-xs text-slate-500">Select a route option to evaluate and dispatch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableOptions.map((opt) => {
            const isSelected = opt.id === selectedOptionId;
            const isCurrentlyActive = shipment.activeRouteId === opt.id;
            const isUnsafe = opt.riskLevel === 'Critical';

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative ${
                  isSelected
                    ? 'bg-white border-teal-600 ring-2 ring-teal-600/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      opt.type === 'Recommended'
                        ? 'bg-teal-100 text-teal-800'
                        : opt.type === 'Fastest'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {opt.type}
                  </span>

                  {isCurrentlyActive && (
                    <span className="text-[9px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded uppercase">
                      Current Active Route
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900">{opt.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.recommendationReason}</p>
                </div>

                {/* Score & Gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Risk Level</span>
                    <span
                      className={`font-mono font-bold ${
                        isUnsafe ? 'text-red-600' : opt.riskScore > 34 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {opt.riskScore}/100 ({opt.riskLevel})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isUnsafe ? 'bg-red-500' : opt.riskScore > 34 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${opt.riskScore}%` }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Distance</span>
                    <span className="font-bold text-slate-800">{opt.distanceKm} km</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Est. Duration</span>
                    <span className="font-bold text-teal-700">{opt.estimatedDurationHours} hrs</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segment Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Highway Segment Safety Audit — {activeOption.name}
            </h3>
            <p className="text-xs text-slate-500">Individual segment conditions along chosen corridor</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {segmentAudits.length} Segments
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Segment</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3">DEM Slope</th>
                <th className="py-2.5 px-3">Rainfall</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assessment Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {segmentAudits.map((seg) => (
                <tr key={seg.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-bold text-slate-900">{seg.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{seg.lengthKm} km</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{seg.demSlopeAngle}°</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-bold">{seg.rainfallRateMmHr} mm/h</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        seg.safetyFlag === 'SAFE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : seg.safetyFlag === 'CAUTION'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {seg.safetyFlag}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-md text-xs leading-relaxed">
                    {seg.aiRationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GIS Corridor Map Overlay */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900">GIS Corridor Map View</h3>
          <span className="text-xs text-slate-400 font-mono">Polylines & Hazard Markers</span>
        </div>
        <div className="rounded-lg overflow-hidden border border-slate-200">
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
            height="380px"
          />
        </div>
      </div>

      {/* Operational Dispatch Action Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono uppercase">Target Route:</span>
            <span className="font-bold text-white text-base">{activeOption.name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dispatching updates vehicle navigation telemetry and broadcasts updated ETA to Command Center.
          </p>
        </div>

        <button
          onClick={handleApplyReroute}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <Navigation className="w-4 h-4" />
          <span>DISPATCH REROUTE ORDER</span>
        </button>
      </div>

      {rerouteApplied && (
        <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Reroute order dispatched successfully. Vehicle navigation updated.</span>
        </div>
      )}
    </div>
  );
};
