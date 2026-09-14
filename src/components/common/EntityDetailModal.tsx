import React from 'react';
import { X, Truck, Package, MapPin, AlertTriangle, ShieldCheck, PhoneCall, Navigation, ArrowRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface EntityDetailModalProps {
  entity: { type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse'; id: string } | null;
  onClose: () => void;
  onNavigateToView: (view: string) => void;
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ entity, onClose, onNavigateToView }) => {
  const {
    vehicles,
    shipments,
    roads,
    incidents,
    warehouses,
    verifyIncident,
    blockRoadSegment,
    unblockRoadSegment,
  } = useAppState();

  if (!entity) return null;

  let content = null;

  if (entity.type === 'vehicle') {
    const veh = vehicles.find(v => v.id === entity.id);
    if (!veh) return null;
    const shipment = shipments.find(s => s.id === veh.assignedShipmentId);

    content = (
      <div>
        <div className="flex items-center space-x-2 text-[#087F8C]">
          <Truck className="w-5 h-5" />
          <h3 className="font-bold text-lg text-slate-900">{veh.registrationNumber}</h3>
          <span className="text-xs bg-teal-50 text-[#087F8C] px-2 py-0.5 rounded-full font-semibold border border-teal-200">
            {veh.vehicleType}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 my-4 bg-[#F7F9FA] p-3 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver</span>
            <span className="font-bold text-slate-800">{veh.driver.name}</span>
            <span className="text-slate-500 block">{veh.driver.phone}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Speed / Status</span>
            <span className="font-bold text-slate-800">{veh.speedKmH} km/h</span>
            <span className={`block font-semibold ${veh.status === 'At Risk' ? 'text-red-600' : 'text-emerald-600'}`}>
              {veh.status} ({veh.gpsStatus})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Location</span>
            <span className="font-medium text-slate-700">{veh.currentLocation.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Cargo</span>
            <span className="font-bold text-slate-800">{shipment ? shipment.trackingCode : 'None'}</span>
          </div>
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => {
              onClose();
              onNavigateToView('fleetPulse');
            }}
            className="flex-1 bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Track in FleetPulse</span>
          </button>
          {shipment && (
            <button
              onClick={() => {
                onClose();
                onNavigateToView('routeGuard');
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Reroute Shipment</span>
            </button>
          )}
        </div>
      </div>
    );
  } else if (entity.type === 'shipment') {
    const shp = shipments.find(s => s.id === entity.id);
    if (!shp) return null;

    content = (
      <div>
        <div className="flex items-center space-x-2 text-[#087F8C]">
          <Package className="w-5 h-5" />
          <h3 className="font-bold text-lg text-slate-900">{shp.trackingCode}</h3>
          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold border border-red-200">
            Priority: {shp.priority}
          </span>
        </div>
        <p className="text-xs text-slate-600 font-medium mt-1">{shp.title}</p>

        <div className="my-4 bg-[#F7F9FA] p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Origin:</span>
            <span className="font-semibold text-slate-800">{shp.origin.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Destination:</span>
            <span className="font-semibold text-slate-800">{shp.destination.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current ETA:</span>
            <span className="font-bold text-[#087F8C]">
              {new Date(shp.currentEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Risk Score:</span>
            <span className={`font-bold ${shp.riskLevel === 'Critical' ? 'text-red-600' : 'text-emerald-600'}`}>
              {shp.riskScore} / 100 ({shp.riskLevel})
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            onNavigateToView('routeGuard');
          }}
          className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <span>Calculate Alternate Routes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  } else if (entity.type === 'road') {
    const rd = roads.find(r => r.id === entity.id);
    if (!rd) return null;

    content = (
      <div>
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-[#087F8C]" />
          <h3 className="font-bold text-lg text-slate-900">{rd.roadName}</h3>
        </div>
        <div className="text-xs text-slate-500 mt-1">{rd.state} - {rd.district} ({rd.roadClass})</div>

        <div className="my-4 bg-[#F7F9FA] p-3 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Road Status:</span>
            <span className={`font-bold ${rd.status === 'Blocked' ? 'text-red-600' : 'text-emerald-600'}`}>
              {rd.status}
            </span>
          </div>
          {rd.causeOfDisruption && (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Disruption Cause</span>
              <p className="text-slate-700 font-medium">{rd.causeOfDisruption}</p>
            </div>
          )}
        </div>

        {rd.status === 'Blocked' ? (
          <button
            onClick={() => {
              unblockRoadSegment(rd.id);
              onClose();
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Clear Blockage & Open Road
          </button>
        ) : (
          <button
            onClick={() => {
              blockRoadSegment(rd.id, 'Emergency road failure reported.');
              onClose();
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Flag Corridor as BLOCKED
          </button>
        )}
      </div>
    );
  } else if (entity.type === 'incident') {
    const inc = incidents.find(i => i.id === entity.id);
    if (!inc) return null;

    content = (
      <div>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold text-lg text-slate-900">{inc.incidentType} Incident</h3>
        </div>
        <p className="text-xs text-slate-600 mt-1">{inc.roadName} ({inc.district}, {inc.state})</p>

        <div className="my-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
          <p className="text-slate-700 font-medium">{inc.description}</p>
          <div className="flex justify-between text-[11px] text-slate-500 border-t border-slate-200 pt-2">
            <span>Reporter: {inc.reporterName}</span>
            <span>Status: <strong>{inc.status}</strong></span>
          </div>
        </div>

        {inc.status !== 'Verified' && inc.status !== 'Active' && (
          <button
            onClick={() => {
              verifyIncident(inc.id);
              onClose();
            }}
            className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify & Propagate Blockage State</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 relative animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        {content}
      </div>
    </div>
  );
};
