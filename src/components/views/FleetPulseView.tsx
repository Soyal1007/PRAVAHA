import React, { useState } from 'react';
import { Truck, Filter, Activity, Navigation, Phone, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

interface FleetPulseViewProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const FleetPulseView: React.FC<FleetPulseViewProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { vehicles, shipments, updateVehicleSpeed } = useAppState();
  const { t } = useLanguage();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('veh-2048');

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const assignedShipment = shipments.find((s) => s.id === selectedVehicle.assignedShipmentId);

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'In Transit') return v.status === 'In Transit';
    if (statusFilter === 'At Risk') return v.status === 'At Risk' || v.riskLevel === 'Critical';
    if (statusFilter === 'Delayed') return v.status === 'Delayed';
    if (statusFilter === 'Idle') return v.status === 'Idle' || v.status === 'Offline';
    return true;
  });

  // Chart 1 Data: Fleet Telemetry Status Pie Chart
  const fleetStatusPieData = [
    { label: 'Active In-Transit', value: vehicles.filter((v) => v.status === 'In Transit').length, color: '#087F8C' },
    { label: 'At Risk / Critical', value: vehicles.filter((v) => v.status === 'At Risk').length, color: '#F59E0B' },
    { label: 'Delayed / Stalled', value: vehicles.filter((v) => v.status === 'Delayed').length, color: '#EF4444' },
    { label: 'Standby / Offline', value: vehicles.filter((v) => v.status === 'Idle' || v.status === 'Offline').length, color: '#10B981' },
  ];

  // Chart 2 Data: Live Speed Bar Chart Across Vehicles
  const vehicleSpeedBarData = vehicles.map((v) => ({
    label: v.registrationNumber,
    value: v.speedKmH,
    subtext: v.driver.name,
    color: v.speedKmH === 0 ? '#EF4444' : v.speedKmH < 25 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto font-body bg-slate-50/50 min-h-screen">
      {/* Workspace Header - De-cluttered & Airy */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-[#087F8C] rounded-2xl border border-teal-100/80 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {t('fleetPulse')} Telemetry & GPS Stream
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time relief truck movement, speed anomaly warnings, and active GPS telemetry stream.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
          {['All', 'In Transit', 'At Risk', 'Delayed', 'Idle'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[#087F8C] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* GRAPHICAL REPRESENTATION CHARTS */}
      <div data-tour="fleet-telemetry-chart" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Fleet Operational Telemetry (Donut Chart)"
          subtitle="Proportion of trucks currently en-route, rerouted around landslides, or stalled."
          data={fleetStatusPieData}
          donut={true}
          centerText={String(vehicles.length)}
          centerSubtext="Fleet Vehicles"
        />

        <InteractiveBarChart
          title="Vehicle Speed Telemetry (Bar Chart)"
          subtitle="Live recorded GPS speed telemetry in km/h across active relief trucks."
          data={vehicleSpeedBarData}
          horizontal={true}
          unit="km/h"
        />
      </div>

      {/* MAIN VEHICLES TABLE & TELEMETRY INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vehicles Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              Fleet Vehicles ({filteredVehicles.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
              Live Telemetry Stream
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Speed</th>
                  <th className="py-3 px-4">GPS Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVehicles.map((v) => {
                  const isSelected = v.id === selectedVehicleId;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#087F8C]">
                        {v.registrationNumber}
                        <div className="text-[10px] text-slate-400 font-normal">{v.vehicleType}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{v.driver.name}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 max-w-[150px] truncate">
                        {v.currentLocation.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {v.speedKmH} km/h
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            v.gpsStatus === 'Anomaly'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {v.gpsStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            v.status === 'At Risk' || v.status === 'Delayed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntity('vehicle', v.id);
                          }}
                          className="text-xs text-[#087F8C] font-extrabold hover:underline cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Vehicle Telemetry Side Inspector */}
        <div data-tour="reroute-action-card" className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Telemetry Inspector
              </div>
              <h3 className="font-bold text-xl text-slate-900 mt-0.5">
                {selectedVehicle.registrationNumber}
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                selectedVehicle.riskLevel === 'Critical'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {selectedVehicle.status}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Driver Name:</span>
              <span className="font-bold text-slate-900">{selectedVehicle.driver.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Driver Contact:</span>
              <span className="font-bold text-[#087F8C]">{selectedVehicle.driver.phone}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Current Speed:</span>
              <span className="font-bold text-slate-900 font-mono">
                {selectedVehicle.speedKmH} km/h
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Current Heading:</span>
              <span className="font-semibold text-slate-700 font-mono">
                {selectedVehicle.headingDegrees}° SSE
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Assigned Cargo:</span>
              <span className="font-bold text-slate-900">
                {assignedShipment ? assignedShipment.trackingCode : 'None'}
              </span>
            </div>
          </div>

          {/* Speed Telemetry History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Speed Trend Telemetry</span>
              <span className="text-[10px] text-slate-400 font-mono">km/h over time</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex items-end justify-between h-32 pt-6">
              {selectedVehicle.speedHistory.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-1.5 flex-1">
                  <span className="text-[9px] font-bold text-slate-700 font-mono">{item.speed}</span>
                  <div
                    className={`w-6 rounded-t-lg transition-all ${
                      item.speed < 20 ? 'bg-red-500' : 'bg-[#087F8C]'
                    }`}
                    style={{ height: `${Math.max((item.speed / 80) * 70, 10)}px` }}
                  ></div>
                  <span className="text-[9px] text-slate-400 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Speed Anomaly Controls */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <span className="text-xs font-bold text-slate-600 block">
              Simulate Live Speed Update:
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => updateVehicleSpeed(selectedVehicle.id, 52)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 rounded-xl font-bold cursor-pointer transition-colors"
              >
                52 km/h
              </button>
              <button
                onClick={() => updateVehicleSpeed(selectedVehicle.id, 18)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-2 rounded-xl font-bold cursor-pointer transition-colors"
              >
                18 km/h
              </button>
              <button
                onClick={() => updateVehicleSpeed(selectedVehicle.id, 0)}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2 rounded-xl font-bold cursor-pointer transition-colors"
              >
                0 km/h (Stalled)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
