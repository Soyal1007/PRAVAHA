import React from 'react';
import { Activity, ShieldAlert, BarChart, Info, Database, Cpu } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractiveRadarChart } from '../common/charts/InteractiveRadarChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

export const RiskEngineView: React.FC = () => {
  const { riskEvents } = useAppState();
  const { t } = useLanguage();

  const primaryCorridor = riskEvents[0] || {
    corridorName: 'NH-10 Sevoke Corridor',
    factors: {
      terrainSusceptibility: 85,
      rainfall: 90,
      historicalIncidents: 75,
      gpsAnomalies: 80,
    },
  };

  const radarData = [
    { axis: 'Terrain Vulnerability', value: primaryCorridor.factors.terrainSusceptibility },
    { axis: 'Rainfall Intensity', value: primaryCorridor.factors.rainfall },
    { axis: 'Historical Incidents', value: primaryCorridor.factors.historicalIncidents },
    { axis: 'GPS Telemetry Anomaly', value: primaryCorridor.factors.gpsAnomalies },
    { axis: 'Slope Steepness Index', value: 88 },
  ];

  const corridorScoreBarData = riskEvents.map((r) => ({
    label: r.corridorName,
    value: r.overallScore,
    subtext: `${r.district} - ${r.riskLevel}`,
    color: r.overallScore >= 75 ? '#EF4444' : r.overallScore >= 50 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto font-body bg-slate-50/50 min-h-screen">
      {/* Header - De-cluttered & Airy */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-[#087F8C] rounded-2xl border border-teal-100/80 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {t('riskEngine')} Explainable Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-factor corridor vulnerability score (0-100) integrated with official NESDR/NESAC ISRO Landslide Susceptibility & Flood Inundation GIS baselines.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-2xl text-xs text-indigo-900 font-extrabold">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>PravahaDisruptionRiskModel v1.0 (20% Weight)</span>
          </div>
          <div className="flex items-center space-x-2 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-2xl text-xs text-teal-900 font-extrabold">
            <Database className="w-4 h-4 text-[#087F8C]" />
            <span>NESDR GIS Baseline (15% Weight)</span>
          </div>
        </div>
      </div>

      {/* GRAPHICAL REPRESENTATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractiveRadarChart
          title="Multi-Hazard Radar Matrix (Radar Chart)"
          subtitle={`Primary high-risk corridor breakdown: ${primaryCorridor.corridorName || 'NH-10 Sevoke Corridor'}`}
          data={radarData}
          color="#EF4444"
        />

        <InteractiveBarChart
          title="Corridor Composite Risk Index (Bar Chart)"
          subtitle="Overall weighted risk score out of 100 for all monitored highland highways."
          data={corridorScoreBarData}
          horizontal={true}
          unit="/ 100 Risk"
        />
      </div>

      {/* RISK CORRIDORS MATRIX */}
      <div className="space-y-6">
        {riskEvents.map((re) => (
          <div
            key={re.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{re.corridorName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {re.district}, {re.state}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Composite Risk Score
                  </span>
                  <span
                    className={`text-3xl font-black font-display ${
                      re.overallScore >= 75 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {re.overallScore} / 100
                  </span>
                </div>
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold ${
                    re.riskLevel === 'Critical'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {re.riskLevel}
                </span>
              </div>
            </div>

            {/* Factor Contributors Progress Bars */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Factor Contributor Breakdown:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-700">Terrain Susceptibility</span>
                    <span className="font-mono font-bold text-slate-900">
                      {re.factors.terrainSusceptibility}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#087F8C] h-full rounded-full"
                      style={{ width: `${re.factors.terrainSusceptibility}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-700">Rainfall Intensity</span>
                    <span className="font-mono font-bold text-slate-900">
                      {re.factors.rainfall}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full"
                      style={{ width: `${re.factors.rainfall}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-700">Historical Incidents Rate</span>
                    <span className="font-mono font-bold text-slate-900">
                      {re.factors.historicalIncidents}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${re.factors.historicalIncidents}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-700">GPS Speed Anomaly Factor</span>
                    <span className="font-mono font-bold text-slate-900">
                      {re.factors.gpsAnomalies}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{ width: `${re.factors.gpsAnomalies}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reasons Explanation */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs space-y-2">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-[#087F8C]" />
                <span>Score Explanation Rationale:</span>
              </span>
              <ul className="list-disc list-inside text-slate-600 text-xs space-y-1 pl-1 leading-relaxed">
                {re.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
