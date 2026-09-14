import React, { useState } from 'react';
import { BarChart3, PieChart as PieIcon, TrendingUp, ShieldCheck, Activity, Download, RefreshCw } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';
import { InteractiveLineChart } from '../common/charts/InteractiveLineChart';
import { InteractiveRadarChart } from '../common/charts/InteractiveRadarChart';

export const AnalyticsView: React.FC = () => {
  const { shipments, vehicles, roads, incidents, warehouses } = useAppState();
  const { t } = useLanguage();

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // 1. Commodity Pie Chart Data
  const categoryCounts: Record<string, number> = {};
  shipments.forEach((s) => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });

  const CATEGORY_COLORS: Record<string, string> = {
    Medicines: '#087F8C',
    Food: '#10B981',
    'Disaster Relief Supplies': '#F59E0B',
    Fuel: '#EF4444',
    'Construction Materials': '#8B5CF6',
    'Agricultural Inputs': '#3B82F6',
  };

  const commodityPieData = Object.keys(categoryCounts).map((cat) => ({
    label: cat,
    value: categoryCounts[cat],
    color: CATEGORY_COLORS[cat] || '#64748B',
  }));

  // 2. Cargo Risk Level Donut Chart Data
  const riskCounts = {
    Low: shipments.filter((s) => s.riskLevel === 'Low').length,
    Moderate: shipments.filter((s) => s.riskLevel === 'Moderate').length,
    High: shipments.filter((s) => s.riskLevel === 'High').length,
    Critical: shipments.filter((s) => s.riskLevel === 'Critical').length,
  };

  const riskDonutData = [
    { label: 'Low Risk', value: riskCounts.Low, color: '#10B981' },
    { label: 'Moderate Risk', value: riskCounts.Moderate, color: '#F59E0B' },
    { label: 'High Risk', value: riskCounts.High, color: '#F97316' },
    { label: 'Critical Risk', value: riskCounts.Critical, color: '#EF4444' },
  ];

  // 3. Corridor Delay Bar Chart Data
  const corridorBarData = roads.map((r) => {
    const isBlocked = r.status === 'Blocked';
    const delayMins = isBlocked ? 180 : r.status === 'Restricted' ? 45 : 10;
    return {
      label: r.roadName,
      value: delayMins,
      subtext: `${r.state} - ${r.status}`,
      color: isBlocked ? '#EF4444' : r.status === 'Restricted' ? '#F59E0B' : '#087F8C',
    };
  });

  // 4. Hourly Traffic & Reroute Volume Line Chart Data
  const trafficLineData = [
    { xLabel: '00:00', value: 12 },
    { xLabel: '04:00', value: 8 },
    { xLabel: '08:00', value: 45 },
    { xLabel: '12:00', value: 82 },
    { xLabel: '16:00', value: 96 },
    { xLabel: '20:00', value: 54 },
    { xLabel: '23:59', value: 28 },
  ];

  // 5. Multi-Hazard Resilience Radar Chart Data
  const radarRiskData = [
    { axis: 'Landslide Vulnerability', value: 78 },
    { axis: 'Road Capacity', value: 64 },
    { axis: 'Weather Threat Index', value: 85 },
    { axis: 'Fleet Telematics Coverage', value: 92 },
    { axis: 'Stock Depot Margin', value: 70 },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto font-body bg-slate-50/50 min-h-screen">
      {/* Workspace Header - De-cluttered & Airy */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-[#087F8C] rounded-2xl border border-teal-100/80 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {t('analytics')} & Graphical Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Visual pie charts, line graphs, corridor delays, and disaster resilience matrix.
            </p>
          </div>
        </div>

        {/* Time Selector & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-700">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#087F8C] text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button className="p-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Analytics</span>
          </button>
        </div>
      </div>

      {/* Top De-cluttered KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            On-Time Supply Rate
          </div>
          <div className="text-3xl font-black text-emerald-600 font-display">94.8%</div>
          <div className="text-xs text-slate-500 font-medium">+3.2% vs previous period</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Average Reroute Delay
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">22.4 mins</div>
          <div className="text-xs text-slate-500 font-medium">Mitigated by RouteGuard AI</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Corridor Safety Index
          </div>
          <div className="text-3xl font-black text-[#087F8C] font-display">88.2 / 100</div>
          <div className="text-xs text-slate-500 font-medium">Real-time weighted GIS index</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Blocked Segments
          </div>
          <div className="text-3xl font-black text-amber-600 font-display">
            {roads.filter((r) => r.status === 'Blocked').length} Corridors
          </div>
          <div className="text-xs text-slate-500 font-medium">{roads.length} total monitored</div>
        </div>
      </div>

      {/* CHARTS GRID SECTION 1: PIE & DONUT CHARTS */}
      <div data-tour="analytics-pie-chart" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Relief Cargo Commodity Distribution (Pie Chart)"
          subtitle="Proportion of medical, food, fuel, and shelter freight lots currently dispatched."
          data={commodityPieData}
          donut={true}
          centerText={String(shipments.length)}
          centerSubtext="Active Shipments"
        />

        <InteractivePieChart
          title="Cargo Risk Level Breakdown (Donut Chart)"
          subtitle="Geospatial hazard index classification for in-transit shipments."
          data={riskDonutData}
          donut={true}
          centerText={String(riskCounts.Critical + riskCounts.High)}
          centerSubtext="High & Critical"
        />
      </div>

      {/* CHARTS GRID SECTION 2: LINE CHART & RADAR CHART */}
      <div data-tour="analytics-donut-chart" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractiveLineChart
          title="Hourly Corridor Traffic & Freight Throughput (Line Graph)"
          subtitle="Real-time vehicle passage volume over 24-hour cycle across mountain passes."
          data={trafficLineData}
          color="#087F8C"
          unit="trucks/hr"
        />

        <InteractiveRadarChart
          title="Corridor Multi-Hazard Risk Matrix (Radar Chart)"
          subtitle="5-axis resilience assessment across weather, slope stability, and stock margins."
          data={radarRiskData}
          color="#F59E0B"
        />
      </div>

      {/* CHARTS GRID SECTION 3: CORRIDOR DELAY BAR CHART */}
      <div className="w-full">
        <InteractiveBarChart
          title="Mountain Corridor Delay & Travel Duration (Bar Chart)"
          subtitle="Estimated detour delay in minutes caused by landslides or road restrictions."
          data={corridorBarData}
          horizontal={true}
          unit="mins delay"
        />
      </div>
    </div>
  );
};
