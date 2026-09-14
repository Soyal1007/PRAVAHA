import React, { useState } from 'react';
import { ShieldAlert, Navigation, ArrowRight, CheckCircle2, AlertTriangle, CloudRain, Clock, MapPin } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { evaluateRouteOption } from '../../services/routeEngine';
import { ROUTE_OPTIONS_MAP } from '../../data/seedData';
import { RouteOption } from '../../types';

export const RouteGuardView: React.FC = () => {
  const { shipments, vehicles, roads, rerouteShipment } = useAppState();
  const { t } = useLanguage();

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('ship-2048');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-2048-rec');
  const [rerouteApplied, setRerouteApplied] = useState<boolean>(false);

  const shipment = shipments.find(s => s.id === selectedShipmentId) || shipments[0];
  const assignedVehicle = vehicles.find(v => v.id === shipment.vehicleId);

  const availableOptions: RouteOption[] = ROUTE_OPTIONS_MAP[shipment.id] || [
    evaluateRouteOption('Primary Corridor (NH-10)', 'Fastest', 472, 42, 60, true, true, true, 'siliguri-gangtok-nh10'),
    evaluateRouteOption('Bypass Alternate (NH-37)', 'Recommended', 495, 48, 24, false, false, false, 'guwahati-imphal-alternate'),
  ];

  const activeOption = availableOptions.find(o => o.id === selectedOptionId) || availableOptions[0];

  const handleApplyReroute = () => {
    rerouteShipment(shipment.id, activeOption.id);
    setRerouteApplied(true);
    setTimeout(() => setRerouteApplied(false), 4000);
  };

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-[#087F8C]" />
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('routeGuard')} Routing Engine</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic explainable route planning, disruption exposure modeling, and dynamic rerouting execution.
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center space-x-2 bg-[#F7F9FA] p-2 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Select Active Shipment:</span>
          <select
            value={selectedShipmentId}
            onChange={e => {
              setSelectedShipmentId(e.target.value);
              setRerouteApplied(false);
            }}
            className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            {shipments.map(s => (
              <option key={s.id} value={s.id}>
                {s.trackingCode} - {s.title.substring(0, 30)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipment Detail Overview */}
      <div data-tour="rg-simulator-panel" className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tracking Code</span>
          <div className="font-bold text-base text-[#087F8C]">{shipment.trackingCode}</div>
          <div className="text-slate-600 font-medium mt-0.5">{shipment.title}</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Origin & Destination</span>
          <div className="font-semibold text-slate-900 mt-0.5">
            {shipment.origin.name} → {shipment.destination.name}
          </div>
          <div className="text-slate-500">Category: {shipment.category}</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Fleet Truck</span>
          <div className="font-bold text-slate-900 mt-0.5">
            {assignedVehicle ? `${assignedVehicle.registrationNumber} (${assignedVehicle.driver.name})` : 'Unassigned'}
          </div>
          <div className="text-slate-500">Speed: {assignedVehicle ? assignedVehicle.speedKmH : 0} km/h</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status & Risk</span>
          <div className="mt-0.5 flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
              shipment.riskLevel === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {shipment.riskLevel} Risk ({shipment.riskScore}/100)
            </span>
          </div>
          <div className="text-slate-500 mt-0.5">Status: <b>{shipment.status}</b></div>
        </div>
      </div>

      {/* Comparative Route Options */}
      <div data-tour="rg-options-list" className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900">
          Generated Route Options & Scoring Rationale
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableOptions.map(opt => {
            const isSelected = opt.id === selectedOptionId;
            const isCurrentlyActive = shipment.activeRouteId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative ${
                  isSelected
                    ? 'bg-white border-[#087F8C] ring-2 ring-[#087F8C]/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Badge Header */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    opt.type === 'Recommended'
                      ? 'bg-teal-100 text-[#087F8C] border border-teal-200'
                      : opt.type === 'Fastest'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {opt.type.toUpperCase()}
                  </span>

                  {isCurrentlyActive && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200">
                      Active Route
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900">{opt.name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{opt.recommendationReason}</p>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#F7F9FA] p-2.5 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Distance</span>
                    <span className="font-bold text-slate-800">{opt.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Est. Duration</span>
                    <span className="font-bold text-[#087F8C]">{opt.estimatedDurationHours} hrs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Risk Score</span>
                    <span className={`font-bold ${opt.riskLevel === 'Critical' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {opt.riskScore} / 100 ({opt.riskLevel})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Weather</span>
                    <span className="font-medium text-slate-700">{opt.weatherExposure}</span>
                  </div>
                </div>

                {/* Select indicator */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Formula Score: {opt.riskScore + 30}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-[#087F8C] border-[#087F8C] text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reroute Execution Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="font-bold text-xs text-slate-900">
            Selected Option: <span className="text-[#087F8C]">{activeOption.name}</span>
          </div>
          <p className="text-xs text-slate-500">
            Applying this route will update assigned truck navigation telemetry, recalculated ETAs, and broadcast state to FleetPulse & Command Center.
          </p>
        </div>

        <button
          onClick={handleApplyReroute}
          className="bg-[#087F8C] hover:bg-[#075E68] text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Navigation className="w-4 h-4" />
          <span>APPLY REROUTE TO SHIPMENT</span>
        </button>
      </div>

      {rerouteApplied && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Route change successfully propagated across shared application state!</span>
        </div>
      )}
    </div>
  );
};
