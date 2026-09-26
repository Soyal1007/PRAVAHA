import React, { useState } from 'react';
import { Truck, Activity, Phone, AlertTriangle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

interface FleetPulseViewProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const FleetPulseView: React.FC<FleetPulseViewProps> = ({ onSelectEntity }) => {
  const { vehicles, shipments, updateVehicleSpeed } = useAppState();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'veh-2048');

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const assignedShipment = shipments.find((s) => s.id === selectedVehicle?.assignedShipmentId);

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'In Transit') return v.status === 'In Transit';
    if (statusFilter === 'At Risk') return v.status === 'At Risk' || v.riskLevel === 'Critical';
    if (statusFilter === 'Delayed') return v.status === 'Delayed';
    if (statusFilter === 'Idle') return v.status === 'Idle' || v.status === 'Offline';
    return true;
  });

  const fleetStatusPieData = [
    { label: 'In Transit', value: vehicles.filter((v) => v.status === 'In Transit').length, color: '#087F8C' },
    { label: 'At Risk', value: vehicles.filter((v) => v.status === 'At Risk').length, color: '#F59E0B' },
    { label: 'Delayed', value: vehicles.filter((v) => v.status === 'Delayed').length, color: '#EF4444' },
    { label: 'Idle / Offline', value: vehicles.filter((v) => v.status === 'Idle' || v.status === 'Offline').length, color: '#94A3B8' },
  ];

  const vehicleSpeedBarData = vehicles.map((v) => ({
    label: v.registrationNumber,
    value: v.speedKmH,
    subtext: v.driver.name,
    color: v.speedKmH === 0 ? '#EF4444' : v.speedKmH < 25 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="space-y-5 font-body">
      {/* Compact Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Fleet Telemetry & GPS Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Real-time GPS stream · {vehicles.length} relief trucks monitored</span>
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          {['All', 'In Transit', 'At Risk', 'Delayed', 'Idle'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InteractivePieChart
          title="Fleet Operational Status"
          subtitle="Proportion of trucks in transit, at risk, delayed, or idle."
          data={fleetStatusPieData}
          donut={true}
          centerText={String(vehicles.length)}
          centerSubtext="Vehicles"
        />

        <InteractiveBarChart
          title="Vehicle Recorded Speed (km/h)"
          subtitle="Live telemetry speed readings across fleet."
          data={vehicleSpeedBarData}
          horizontal={true}
          unit="km/h"
        />
      </div>

      {/* Main Table + Telemetry Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vehicles Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">
              Active Vehicles ({filteredVehicles.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {vehicles.filter((v) => v.gpsStatus === 'Online').length} GPS Online
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">GPS</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => {
                  const isSelected = v.id === selectedVehicleId;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {v.registrationNumber}
                        <div className="text-[10px] text-slate-400 font-normal">{v.vehicleType}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{v.driver.name}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate">
                        {v.currentLocation.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {v.speedKmH} km/h
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            v.gpsStatus === 'Anomaly'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {v.gpsStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            v.status === 'At Risk' || v.status === 'Delayed'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntity('vehicle', v.id);
                          }}
                          className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                        >
                          Details
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
        {selectedVehicle && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Selected Telemetry
                </span>
                <h3 className="font-bold text-base text-slate-900">{selectedVehicle.registrationNumber}</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  selectedVehicle.riskLevel === 'Critical'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {selectedVehicle.status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Driver:</span>
                <span className="font-bold text-slate-900">{selectedVehicle.driver.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Phone:</span>
                <span className="font-bold text-teal-700 flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{selectedVehicle.driver.phone}</span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Recorded Speed:</span>
                <span className="font-mono font-bold text-slate-900">{selectedVehicle.speedKmH} km/h</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Heading:</span>
                <span className="font-mono text-slate-700">{selectedVehicle.headingDegrees}° SSE</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Assigned Cargo:</span>
                <span className="font-bold text-slate-900">
                  {assignedShipment ? assignedShipment.trackingCode : 'None'}
                </span>
              </div>
            </div>

            {/* Speed History Trend */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">Speed Trend (Last Hours)</span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-end justify-between h-24 pt-4">
                {selectedVehicle.speedHistory.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center space-y-1 flex-1">
                    <span className="text-[9px] font-mono text-slate-700">{item.speed}</span>
                    <div
                      className={`w-4 rounded-t ${item.speed < 20 ? 'bg-red-500' : 'bg-teal-700'}`}
                      style={{ height: `${Math.max((item.speed / 80) * 50, 6)}px` }}
                    />
                    <span className="text-[8px] text-slate-400 font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Speed Telemetry Simulation */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">
                Telemetry Speed Diagnostic Simulation:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  onClick={() => updateVehicleSpeed(selectedVehicle.id, 52)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded font-semibold transition-colors cursor-pointer"
                >
                  52 km/h
                </button>
                <button
                  onClick={() => updateVehicleSpeed(selectedVehicle.id, 18)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-1.5 rounded font-semibold transition-colors cursor-pointer"
                >
                  18 km/h
                </button>
                <button
                  onClick={() => updateVehicleSpeed(selectedVehicle.id, 0)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-1.5 rounded font-semibold transition-colors cursor-pointer"
                >
                  0 (Stalled)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
