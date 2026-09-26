import React from 'react';
import { ShieldCheck, Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Server, BarChart3, PieChart as PieIcon, MapPin, Clock } from 'lucide-react';
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
  const { shipments, vehicles, roads, incidents, alerts, systemEvents, updateVerificationStatus } = useAppState();
  const { t } = useLanguage();

  const activeBlockages = roads.filter((r) => r.status === 'Blocked');
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical');

  // Chart 1 Data: Fleet Operational State Pie Chart
  const fleetPieData = [
    { label: t('inTransitRelief'), value: vehicles.filter((v) => v.status === 'In Transit').length, color: '#087F8C' },
    { label: t('atRiskBypasses'), value: vehicles.filter((v) => v.status === 'At Risk').length, color: '#F59E0B' },
    { label: t('stalledDelayed'), value: vehicles.filter((v) => v.status === 'Delayed').length, color: '#EF4444' },
    { label: t('availableStandby'), value: vehicles.filter((v) => v.status === 'Idle').length, color: '#10B981' },
  ];

  // Chart 2 Data: Highway Corridor Status Bar Chart
  const roadStatusBarData = [
    { label: t('openPassableCorridors'), value: roads.filter((r) => r.status === 'Open').length, color: '#10B981' },
    { label: t('restrictedCorridors'), value: roads.filter((r) => r.status === 'Restricted').length, color: '#F59E0B' },
    { label: t('blockedLandslidePasses'), value: roads.filter((r) => r.status === 'Blocked').length, color: '#EF4444' },
    { label: t('underMaintenance'), value: roads.filter((r) => r.status === 'Under Maintenance').length, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-5 font-body">
      {/* Compact Operational Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <MapPin className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Northeast Region · India</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToView('analytics')}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => onNavigateToView('reports')}
            className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div data-tour="command-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Fleet</div>
          <div className="text-2xl font-black text-slate-900">{vehicles.length}</div>
          <div className="text-[11px] text-slate-500">
            {vehicles.filter(v => v.gpsStatus === 'Online').length} GPS online ·{' '}
            {vehicles.filter(v => v.gpsStatus === 'Offline').length} offline
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Road Blockages</div>
          <div className={`text-2xl font-black ${activeBlockages.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {activeBlockages.length}
          </div>
          <div className="text-[11px] text-slate-500">
            {activeBlockages.length > 0 ? activeBlockages.map(r => r.roadName.split(' ')[0]).join(', ') : 'All corridors open'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unacknowledged Alerts</div>
          <div className={`text-2xl font-black ${criticalAlerts.filter(a => !a.acknowledged).length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {criticalAlerts.filter(a => !a.acknowledged).length}
          </div>
          <div className="text-[11px] text-slate-500">
            {criticalAlerts.length} critical total
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Verification</div>
          <div className="text-2xl font-black text-slate-900">
            {incidents.filter(i => i.verificationStatus === 'Unverified (Pending Inspection)').length}
          </div>
          <div className="text-[11px] text-slate-500">field reports awaiting review</div>
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

      {/* Incident Data Provenance & Verification Center (True vs False Alarm Verification) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-[#087F8C]" />
              <h3 className="font-extrabold text-lg text-slate-900 font-display">
                Data Provenance & Incident Verification Center
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cross-verify incident data sources (Satellite Radar, IoT Sensors, CWC Gauges, n8n Voice Hotline) to disproven false alarms and validate true emergency hazards.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {incidents.filter(i => i.verificationStatus === 'True Alarm (Verified)').length} True Verified
              </span>
            </span>
            <span className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl border border-red-200 flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>
                {incidents.filter(i => i.verificationStatus === 'False Alarm (Disproven)').length} False Alarms Disproven
              </span>
            </span>
          </div>
        </div>

        {/* Verification Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Incident & Location</th>
                <th className="p-3.5">Exact Verification Source</th>
                <th className="p-3.5">Sensor Confidence</th>
                <th className="p-3.5">Cross-Validation Notes</th>
                <th className="p-3.5">Verification Status</th>
                <th className="p-3.5">Admin Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map(inc => {
                const isTrue = inc.verificationStatus === 'True Alarm (Verified)';
                const isFalse = inc.verificationStatus === 'False Alarm (Disproven)';
                return (
                  <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 align-top">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                        <span>{inc.incidentType}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.severity}
                        </span>
                      </div>
                      <div className="text-slate-600 font-medium text-xs mt-0.5">{inc.location.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {inc.id} | {inc.roadName}</div>
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="font-bold text-[#087F8C] bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100 text-xs inline-block">
                        {inc.verificationSource}
                      </div>
                      {inc.verifiedBy && (
                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                          Verified By: {inc.verifiedBy}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              inc.confidenceScore > 80 ? 'bg-emerald-500' : inc.confidenceScore > 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${inc.confidenceScore}%` }}
                          />
                        </div>
                        <span className="font-mono font-extrabold text-slate-800 text-xs">
                          {inc.confidenceScore}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {inc.crossValidationSourcesCount || 1} Independent Sources
                      </div>
                    </td>

                    <td className="p-3.5 align-top max-w-xs">
                      <p className="text-slate-700 text-[11px] leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        {inc.verificationNotes || inc.description}
                      </p>
                    </td>

                    <td className="p-3.5 align-top">
                      {isTrue ? (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2.5 py-1 rounded-xl text-[11px] flex items-center space-x-1 w-max shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>TRUE ALARM (VERIFIED)</span>
                        </span>
                      ) : isFalse ? (
                        <span className="bg-red-100 text-red-900 border border-red-300 font-black px-2.5 py-1 rounded-xl text-[11px] flex items-center space-x-1 w-max shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>FALSE ALARM (DISPROVEN)</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black px-2.5 py-1 rounded-xl text-[11px] flex items-center space-x-1 w-max shadow-2xs">
                          <Activity className="w-3.5 h-3.5 text-amber-600" />
                          <span>UNVERIFIED (PENDING)</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="flex flex-col space-y-1.5">
                        <button
                          onClick={() => updateVerificationStatus(inc.id, 'True Alarm (Verified)', 'Verified via Admin Master Command', inc.verificationSource)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          Mark as True Alarm
                        </button>
                        <button
                          onClick={() => updateVerificationStatus(inc.id, 'False Alarm (Disproven)', 'Ground inspection disproved alert. De-escalated.', inc.verificationSource)}
                          className="bg-slate-100 hover:bg-red-50 text-red-700 font-extrabold px-3 py-1.5 rounded-xl text-[11px] border border-slate-200 transition-colors cursor-pointer"
                        >
                          Flag as False Alarm
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
