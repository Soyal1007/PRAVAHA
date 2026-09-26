import React, { useState } from 'react';
import { Boxes, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { CommodityCategory } from '../../types';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

export const SupplyGridView: React.FC = () => {
  const { warehouses, shipments, vehicles } = useAppState();

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

  const warehouseRiskPieData = [
    { label: 'Adequate Stock (>7 Days)', value: warehouses.filter((w) => w.daysRemaining >= 7).length, color: '#10B981' },
    { label: 'Moderate Reserve (3-7 Days)', value: warehouses.filter((w) => w.daysRemaining >= 3 && w.daysRemaining < 7).length, color: '#F59E0B' },
    { label: 'Critical Reserve (<3 Days)', value: warehouses.filter((w) => w.daysRemaining < 3).length, color: '#EF4444' },
  ];

  const warehouseStockBarData = warehouses.map((w) => ({
    label: w.name,
    value: w.daysRemaining,
    subtext: `${w.district} — ${w.category}`,
    color: w.daysRemaining < 3 ? '#EF4444' : w.daysRemaining < 7 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="space-y-5 font-body">
      {/* Compact Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Inventory & Supply Grid Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Depot reserve monitoring & days-remaining cutoff assessment</span>
          </p>
        </div>

        {/* Commodity Category Filter */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InteractivePieChart
          title="Depot Reserve Vulnerability"
          subtitle="Proportion of warehouses with adequate vs critical stock reserves."
          data={warehouseRiskPieData}
          donut={true}
          centerText={String(warehouses.length)}
          centerSubtext="Depots"
        />

        <InteractiveBarChart
          title="Days Remaining by Depot"
          subtitle="Estimated supply duration before depletion at current consumption rates."
          data={warehouseStockBarData}
          horizontal={true}
          unit="Days"
        />
      </div>

      {/* Warehouse Depot Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900">
          Monitored Regional Supply Depots ({filteredWarehouses.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredWarehouses.map((wh) => {
            const isCritical = wh.daysRemaining < 3;
            // Find active shipments originating or targeting this warehouse
            const activeIncoming = shipments.filter(
              (s) => s.destination.name.includes(wh.district) || s.destination.id === wh.id
            );

            return (
              <div
                key={wh.id}
                className={`bg-white rounded-xl border p-4 space-y-3 transition-all ${
                  isCritical ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{wh.name}</h4>
                    <p className="text-xs text-slate-500">
                      {wh.district}, {wh.state}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      isCritical
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : wh.daysRemaining < 7
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isCritical ? 'Critical' : wh.daysRemaining < 7 ? 'Moderate' : 'Adequate'}
                  </span>
                </div>

                {/* Primary Commodity */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Primary Commodity:</span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {wh.category}
                  </span>
                </div>

                {/* Reserve Duration Box */}
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    isCritical
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Estimated Reserve Duration
                    </span>
                    <div className="text-xl font-black font-mono">{wh.daysRemaining} Days</div>
                  </div>
                  {isCritical ? (
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  )}
                </div>

                {/* Inventory Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Available</span>
                    <span className="font-mono font-bold text-slate-900">
                      {wh.availableStock.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Demand</span>
                    <span className="font-mono font-bold text-slate-900">
                      {wh.demandedStock.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">In Transit</span>
                    <span className="font-mono font-bold text-teal-700">
                      +{wh.incomingShipmentsCount} Lots
                    </span>
                  </div>
                </div>

                {/* Supply Chain Integration View */}
                {activeIncoming.length > 0 && (
                  <div className="text-xs space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Inbound Relief Convoy:
                    </span>
                    {activeIncoming.slice(0, 2).map((s) => {
                      const veh = vehicles.find((v) => v.id === s.vehicleId);
                      return (
                        <div key={s.id} className="text-[11px] text-slate-700 font-medium">
                          • {s.trackingCode} — {veh ? veh.registrationNumber : 'En-route'} ({s.status})
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Operational Recommendation */}
                <div className="text-xs pt-1">
                  <span className="font-bold text-slate-700 block mb-0.5">Operational Recommendation:</span>
                  <p className="text-slate-600 text-xs bg-slate-50 p-2 rounded border border-slate-200/70 leading-normal">
                    {isCritical
                      ? 'Priority reroute required! Initiate emergency medical convoy from Guwahati Central Hub.'
                      : 'Stock level adequate. Continue routine replenishment via NH-37.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
