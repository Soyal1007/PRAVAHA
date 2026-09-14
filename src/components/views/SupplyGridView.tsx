import React, { useState } from 'react';
import { Boxes, AlertTriangle, CheckCircle2, TrendingDown, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { CommodityCategory } from '../../types';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

export const SupplyGridView: React.FC = () => {
  const { warehouses, shipments } = useAppState();
  const { t } = useLanguage();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const CATEGORIES: ('All' | CommodityCategory)[] = [
    'All',
    'Medicines',
    'Food',
    'Construction Materials',
    'Agricultural Inputs',
  ];

  const filteredWarehouses = warehouses.filter((w) => {
    if (categoryFilter === 'All') return true;
    return w.category === categoryFilter;
  });

  // Chart 1 Data: Depot Reserve Vulnerability Pie Chart
  const warehouseRiskPieData = [
    { label: 'Adequate Stock (> 7 Days)', value: warehouses.filter((w) => w.daysRemaining >= 7).length, color: '#10B981' },
    { label: 'Moderate Reserve (3-7 Days)', value: warehouses.filter((w) => w.daysRemaining >= 3 && w.daysRemaining < 7).length, color: '#F59E0B' },
    { label: 'Critical Cutoff (< 3 Days)', value: warehouses.filter((w) => w.daysRemaining < 3).length, color: '#EF4444' },
  ];

  // Chart 2 Data: Days Remaining Reserves Bar Chart per Warehouse
  const warehouseStockBarData = warehouses.map((w) => ({
    label: w.name,
    value: w.daysRemaining,
    subtext: `${w.district} - ${w.category}`,
    color: w.daysRemaining < 3 ? '#EF4444' : w.daysRemaining < 7 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto font-body bg-slate-50/50 min-h-screen">
      {/* Header - De-cluttered & Airy */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-[#087F8C] rounded-2xl border border-teal-100/80 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {t('supplyGrid')} Inventory Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Regional depot reserve reserves monitoring, days-remaining calculation, and ICU safeguard metrics.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#087F8C] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRAPHICAL REPRESENTATION CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Depot Stock Risk Classification (Donut Chart)"
          subtitle="Proportion of regional warehouses with critical stock cutoff vs adequate reserves."
          data={warehouseRiskPieData}
          donut={true}
          centerText={String(warehouses.length)}
          centerSubtext="Depots Monitored"
        />

        <InteractiveBarChart
          title="Stock Reserves Days Remaining (Bar Chart)"
          subtitle="Estimated remaining days of essential supply per regional warehouse depot."
          data={warehouseStockBarData}
          horizontal={true}
          unit="Days"
        />
      </div>

      {/* GRID OF DEPOT / COMMODITY RESERVE CARDS */}
      <div data-tour="supply-depot-cards" className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredWarehouses.map((wh) => {
          const isCritical = wh.riskLevel === 'Critical';

          return (
            <div
              key={wh.id}
              className={`bg-white rounded-3xl border p-6 shadow-xs space-y-4 transition-all ${
                isCritical ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200/80'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{wh.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {wh.district}, {wh.state}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    isCritical ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {wh.riskLevel} Risk
                </span>
              </div>

              {/* Commodity Category */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Primary Commodity:</span>
                <span className="font-bold text-[#087F8C] bg-teal-50 px-2.5 py-1 rounded-lg">
                  {wh.category}
                </span>
              </div>

              {/* Days Remaining Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  wh.daysRemaining < 3.0
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-slate-500">
                    Estimated Days Remaining
                  </span>
                  <div className="text-2xl font-black font-display">{wh.daysRemaining} Days</div>
                </div>
                {wh.daysRemaining < 3.0 ? (
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                )}
              </div>

              {/* Stock Numbers */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Available</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {wh.availableStock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Demand</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {wh.demandedStock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Incoming</span>
                  <span className="font-mono font-bold text-[#087F8C] text-sm">
                    +{wh.incomingShipmentsCount} Lots
                  </span>
                </div>
              </div>

              {/* Operational Recommendation */}
              <div className="text-xs border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-700 block mb-1">
                  Operational Recommendation:
                </span>
                <p className="text-slate-600 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/70 leading-relaxed font-body">
                  {wh.daysRemaining < 3.0
                    ? ' Priority reroute required! Initiate emergency medical convoy from Guwahati Central Hub immediately.'
                    : ' Stock level adequate. Monitor regional road accessibility along NH-37.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
