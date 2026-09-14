import React from 'react';
import { ShieldCheck, Activity, Users, FileText, Bell, AlertTriangle, ArrowUpRight, CheckCircle2, Server, Database, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

interface DashboardProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { shipments, vehicles, roads, incidents, alerts, systemEvents } = useAppState();
  const { t } = useLanguage();

  const activeBlockages = roads.filter((r) => r.status === 'Blocked');
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical');

  // Chart 1 Data: Fleet Operational State Pie Chart
  const fleetPieData = [
    { label: 'In-Transit Relief', value: vehicles.filter((v) => v.status === 'In Transit').length, color: '#087F8C' },
    { label: 'At-Risk Bypasses', value: vehicles.filter((v) => v.status === 'At Risk').length, color: '#F59E0B' },
    { label: 'Stalled / Delayed', value: vehicles.filter((v) => v.status === 'Delayed').length, color: '#EF4444' },
    { label: 'Available Standby', value: vehicles.filter((v) => v.status === 'Idle').length, color: '#10B981' },
  ];

  // Chart 2 Data: Highway Corridor Status Bar Chart
  const roadStatusBarData = [
    { label: 'Open Passable Corridors', value: roads.filter((r) => r.status === 'Open').length, color: '#10B981' },
    { label: 'Restricted Corridors', value: roads.filter((r) => r.status === 'Restricted').length, color: '#F59E0B' },
    { label: 'Blocked Landslide Passes', value: roads.filter((r) => r.status === 'Blocked').length, color: '#EF4444' },
    { label: 'Under Maintenance', value: roads.filter((r) => r.status === 'Under Maintenance').length, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6 font-body">
      {/* Role Banner - Spacious & Premium */}
      <div className="bg-gradient-to-r from-[#087F8C] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
            <ShieldCheck className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="font-display font-black text-2xl tracking-tight text-white">
                Master Control Tower (Administrator)
              </h2>
              <span className="bg-teal-400/20 text-teal-200 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border border-teal-400/30">
                Full Privileges
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl">
              Full platform oversight, real-time audit event logs, graphical intelligence, and cross-state mountain corridor routing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateToView('analytics')}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4 text-teal-300" />
            <span>Full Analytics Hub</span>
          </button>

          <button
            onClick={() => onNavigateToView('reports')}
            className="bg-white text-[#087F8C] hover:bg-teal-50 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            Export Executive Audit
          </button>
        </div>
      </div>

      {/* KPI Cards - De-cluttered & Airy */}
      <div data-tour="command-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Active Fleet
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {vehicles.length} Trucks
            </span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              100% Online
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">Active GPS telemetry stream</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Road Blockages
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-red-600 font-display">
              {activeBlockages.length} Corridors
            </span>
            <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md">
              Action Req.
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">NH-10 & NH-2 Landslide Passes</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Critical Emergency Alerts
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600 font-display">
              {criticalAlerts.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">AlertNet real-time dispatch</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            System Uptime & Node Health
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600 font-display">99.98%</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              Nominal
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">Guwahati Master Node</p>
        </div>
      </div>

      {/* GRAPHICAL REPRESENTATION SECTION */}
      <div data-tour="fleet-table" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Fleet Operational Status (Donut Chart)"
          subtitle="Proportion of trucks currently en-route, rerouted around landslides, or available."
          data={fleetPieData}
          donut={true}
          centerText={String(vehicles.length)}
          centerSubtext="Total Fleet"
        />

        <InteractiveBarChart
          title="Corridor Network Status Breakdown (Bar Chart)"
          subtitle="Live count of open, restricted, and blocked high-altitude highways."
          data={roadStatusBarData}
          horizontal={true}
          unit="corridors"
        />
      </div>

      {/* Main Grid: Master GIS Map & System Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Master GIS Map */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Regional GIS Command Workspace
              </h3>
              <p className="text-xs text-slate-500">Live corridor layer vectors and vehicle locations</p>
            </div>
            <button
              onClick={() => onNavigateToView('liveMap')}
              className="text-xs text-[#087F8C] font-extrabold hover:underline flex items-center space-x-1 cursor-pointer bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100"
            >
              <span>Full Screen Map</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <InteractiveMap
              layers={{
                showVehicles: true,
                showShipments: true,
                showIncidents: true,
                showBlockedRoads: true,
                showWarehouses: true,
                showHospitals: true,
                showWeatherRisk: true,
                showRoutePolylines: true,
              }}
              height="500px"
              onSelectEntity={onSelectEntity}
            />
          </div>
        </div>

        {/* System Event Audit Stream */}
        <div data-tour="active-alerts-feed" className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-[#087F8C]" />
              <h3 className="font-bold text-base text-slate-900">Audit & State Log</h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-mono font-bold px-2.5 py-1 rounded-lg">
              {systemEvents.length} Events
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs flex-1">
            {systemEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-1.5 hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#087F8C]">{evt.eventType}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-slate-700 text-xs font-medium leading-relaxed">
                  {evt.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/60">
                  <span>Actor: {evt.actor}</span>
                  <span className="font-mono">{evt.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
