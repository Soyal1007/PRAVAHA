import React from 'react';
import { Navigation, Truck, AlertTriangle, MessageSquare, ArrowRight, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

interface DashboardProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const OperatorDashboard: React.FC<DashboardProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { shipments, vehicles, roads } = useAppState();
  const { t } = useLanguage();

  const criticalShipments = shipments.filter(
    (s) => s.riskLevel === 'Critical' || s.status === 'Critical Risk'
  );

  // Chart 1 Data: Dispatch Risk Pie Chart
  const dispatchRiskPieData = [
    { label: 'Normal Flow', value: shipments.filter((s) => s.riskLevel === 'Low').length, color: '#10B981' },
    { label: 'Moderate Watch', value: shipments.filter((s) => s.riskLevel === 'Moderate').length, color: '#F59E0B' },
    { label: 'High / Critical Threat', value: shipments.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Critical').length, color: '#EF4444' },
  ];

  // Chart 2 Data: ETA & Reroute Delay Bar Chart
  const rerouteBarData = shipments.map((s) => ({
    label: s.trackingCode,
    value: s.riskLevel === 'Critical' ? 180 : s.riskLevel === 'High' ? 45 : 15,
    subtext: s.title,
    color: s.riskLevel === 'Critical' ? '#EF4444' : s.riskLevel === 'High' ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="space-y-6 font-body">
      {/* Role Banner - Spacious & Premium */}
      <div className="bg-gradient-to-r from-[#087F8C] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
            <Navigation className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="font-display font-black text-2xl tracking-tight text-white">
                Fleet Dispatch & Reroute Center (Operator)
              </h2>
              <span className="bg-teal-400/20 text-teal-200 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border border-teal-400/30">
                Dispatch Desk Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl">
              Live corridor rerouting, vehicle speed overrides, driver instruction dispatch, and RouteGuard execution.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToView('routeGuard')}
          className="bg-white text-[#087F8C] hover:bg-teal-50 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <Navigation className="w-4.5 h-4.5" />
          <span>Launch RouteGuard Engine</span>
        </button>
      </div>

      {/* Critical Action Banner if Critical Shipments exist */}
      {criticalShipments.length > 0 && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center space-x-4">
            <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-base text-red-900">
                {criticalShipments.length} Shipment(s) Trapped by Landslide / Road Blockage
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                {criticalShipments.map((s) => `${s.trackingCode} (${s.title})`).join(', ')} — Immediate operator reroute recommended.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToView('routeGuard')}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Reroute Now in RouteGuard
          </button>
        </div>
      )}

      {/* GRAPHICAL REPRESENTATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Cargo Dispatch Risk Classification (Donut Chart)"
          subtitle="Distribution of active relief shipments by risk threat index."
          data={dispatchRiskPieData}
          donut={true}
          centerText={String(shipments.length)}
          centerSubtext="Total Active Cargo"
        />

        <InteractiveBarChart
          title="Corridor Detour Delay Profile (Bar Chart)"
          subtitle="Reroute delay impact in minutes across active shipments."
          data={rerouteBarData}
          horizontal={true}
          unit="mins delay"
        />
      </div>

      {/* Dispatch Fleet Table & GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Dispatch Grid */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              Active Cargo Fleet ({shipments.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">Click row to inspect route</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Tracking</th>
                  <th className="py-3 px-4">Cargo Title</th>
                  <th className="py-3 px-4">Origin → Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">ETA</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => {
                  const isCritical = s.riskLevel === 'Critical' || s.status === 'Critical Risk';

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectEntity('shipment', s.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isCritical ? 'bg-red-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#087F8C] font-mono">
                        {s.trackingCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[160px] truncate">
                        {s.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {s.origin.name.split(',')[0]} → {s.destination.name.split(',')[0]}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            isCritical ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {new Date(s.currentEta).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToView('routeGuard');
                          }}
                          className="bg-[#087F8C] hover:bg-[#075E68] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          Reroute
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live GIS Map */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Live Dispatch GIS</h3>
            <span className="text-xs text-slate-400 font-medium">Northeast Corridors</span>
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
              height="440px"
              onSelectEntity={onSelectEntity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
