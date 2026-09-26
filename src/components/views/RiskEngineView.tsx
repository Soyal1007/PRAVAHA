import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Mountain,
  Truck,
  Satellite,
  MapPin,
  Clock,
  Info,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

// Evidence source badge
const EvidenceBadge: React.FC<{ label: string; status: 'connected' | 'stale' | 'unavailable' }> = ({
  label,
  status,
}) => {
  const colors = {
    connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stale: 'bg-amber-50 text-amber-700 border-amber-200',
    unavailable: 'bg-slate-100 text-slate-400 border-slate-200',
  };

  const dots = {
    connected: 'bg-emerald-500',
    stale: 'bg-amber-400',
    unavailable: 'bg-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${colors[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      <span>{label}</span>
    </span>
  );
};

// Risk level display configuration
const RISK_CONFIG = {
  Critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-600 text-white',
    bar: 'bg-red-500',
  },
  High: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-500 text-white',
    bar: 'bg-orange-500',
  },
  Moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-500 text-white',
    bar: 'bg-amber-400',
  },
  Low: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    bar: 'bg-emerald-500',
  },
} as const;

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  rainfall: <CloudRain className="w-3.5 h-3.5" />,
  terrain: <Mountain className="w-3.5 h-3.5" />,
  fleet: <Truck className="w-3.5 h-3.5" />,
  satellite: <Satellite className="w-3.5 h-3.5" />,
};

export const RiskEngineView: React.FC = () => {
  const { riskEvents } = useAppState();
  const [expandedId, setExpandedId] = useState<string | null>(riskEvents[0]?.id ?? null);

  if (!riskEvents || riskEvents.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-body">
        <Activity className="w-8 h-8 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold text-sm">No corridor risk data available</p>
        <p className="text-xs mt-1">Data source unavailable — last synchronization: —</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-body">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Risk Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last updated:{' '}
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
              &nbsp;·&nbsp; {riskEvents.length} corridors monitored
            </span>
          </p>
        </div>

        {/* Evidence source status strip */}
        <div className="flex flex-wrap gap-1.5">
          <EvidenceBadge label="IMD Weather" status="connected" />
          <EvidenceBadge label="GIS / NESDR" status="connected" />
          <EvidenceBadge label="Fleet GPS" status="connected" />
          <EvidenceBadge label="Satellite" status="stale" />
          <EvidenceBadge label="Field Reports" status="connected" />
        </div>
      </div>

      {/* Note on data provenance */}
      <div className="flex items-start space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Risk scores are computed from weather telemetry, official NESDR/NESAC GIS baseline layers, fleet GPS
          anomaly analysis, and field-submitted incident reports. They represent assessed conditions — not
          confirmed road closures. Field verification is required before taking operational action.
        </span>
      </div>

      {/* Corridor Risk List */}
      <div className="space-y-3">
        {riskEvents.map((risk) => {
          const level = risk.riskLevel as keyof typeof RISK_CONFIG;
          const config = RISK_CONFIG[level] ?? RISK_CONFIG['Low'];
          const isExpanded = expandedId === risk.id;

          // Build human-readable contributing factor list
          const factors: { icon: React.ReactNode; label: string; value: number; weight: string }[] = [
            {
              icon: FACTOR_ICONS.rainfall,
              label: 'Accumulated rainfall (24h / 72h)',
              value: risk.factors.rainfall,
              weight: 'IMD Weather Feed',
            },
            {
              icon: FACTOR_ICONS.terrain,
              label: 'Terrain susceptibility & slope grade',
              value: risk.factors.terrainSusceptibility,
              weight: 'NESDR Landslide Index (NESAC)',
            },
            {
              icon: FACTOR_ICONS.fleet,
              label: 'Fleet GPS speed anomaly',
              value: risk.factors.gpsAnomalies,
              weight: 'FleetPulse Telemetry',
            },
            {
              icon: FACTOR_ICONS.satellite,
              label: 'Historical incident count',
              value: risk.factors.historicalIncidents,
              weight: 'PRAVAHA Incident Archive',
            },
          ];

          return (
            <div
              key={risk.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${config.border}`}
            >
              {/* Corridor summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : risk.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Risk level badge */}
                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0 ${config.badge}`}
                  >
                    {risk.riskLevel}
                  </span>

                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{risk.corridorName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {risk.district}, {risk.state}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  {/* Score bar */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bar}`}
                        style={{ width: `${risk.overallScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">{risk.overallScore}/100</span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className={`border-t px-4 pb-5 pt-4 space-y-5 ${config.border} ${config.bg}`}>
                  {/* Why: contributing factors */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Contributing Factors
                    </div>
                    <div className="space-y-2">
                      {factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2 text-xs text-slate-700 min-w-0">
                            <span className="text-slate-400 shrink-0">{f.icon}</span>
                            <span className="truncate">{f.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:inline">
                              ({f.weight})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <div className="w-16 bg-white/70 h-1.5 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${config.bar}`}
                                style={{ width: `${f.value}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-600 w-8 text-right">
                              {f.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reasons summary */}
                  {risk.reasons && risk.reasons.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Assessment Summary
                      </div>
                      <ul className="space-y-1">
                        {risk.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended action */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Recommended Operational Action
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {level === 'Critical' || level === 'High'
                        ? 'Review corridor accessibility and consider alternate routing for active shipments. Request field verification before issuing public closure notice.'
                        : level === 'Moderate'
                        ? 'Monitor corridor closely. Notify fleet operators of elevated conditions. Activate field observation if rainfall persists.'
                        : 'No immediate action required. Continue standard monitoring.'}
                    </p>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                      <span>Human authorization required before escalation</span>
                    </div>
                  </div>

                  {/* Evidence source tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1 self-center">Evidence:</span>
                    <EvidenceBadge label="Weather" status="connected" />
                    <EvidenceBadge label="GIS" status="connected" />
                    <EvidenceBadge
                      label="Satellite"
                      status={risk.overallScore > 60 ? 'stale' : 'unavailable'}
                    />
                    <EvidenceBadge label="Fleet" status="connected" />
                    <EvidenceBadge label="Field" status="connected" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
