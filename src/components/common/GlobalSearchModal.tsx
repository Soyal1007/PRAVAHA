import React, { useState, useEffect } from 'react';
import { Search, X, Truck, Package, MapPin, AlertTriangle, Building2 } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse', id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const { vehicles, shipments, roads, warehouses, incidents } = useAppState();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredVehicles = q ? vehicles.filter(v => v.registrationNumber.toLowerCase().includes(q) || v.driver.name.toLowerCase().includes(q)) : [];
  const filteredShipments = q ? shipments.filter(s => s.trackingCode.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) : [];
  const filteredRoads = q ? roads.filter(r => r.roadName.toLowerCase().includes(q) || r.state.toLowerCase().includes(q)) : [];
  const filteredWarehouses = q ? warehouses.filter(w => w.name.toLowerCase().includes(q) || w.district.toLowerCase().includes(q)) : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scaleUp">
        {/* Input */}
        <div className="p-3 border-b border-slate-100 flex items-center space-x-3">
          <Search className="w-5 h-5 text-[#087F8C]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search PRV-2048, AS-01-AB-7821, NH-10, Imphal..."
            className="w-full bg-transparent border-none text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-sm"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {!q && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Type vehicle code, shipment tracking ID, highway name, or district...
            </div>
          )}

          {/* Shipments */}
          {filteredShipments.length > 0 && (
            <div className="py-2">
              <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shipments</div>
              {filteredShipments.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectResult('shipment', s.id);
                    onClose();
                  }}
                  className="p-2 hover:bg-teal-50 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Package className="w-4 h-4 text-[#087F8C]" />
                    <div>
                      <div className="font-bold text-slate-800">{s.trackingCode} - {s.title}</div>
                      <div className="text-slate-500 text-[11px]">{s.origin.name} → {s.destination.name}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    s.riskLevel === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Vehicles */}
          {filteredVehicles.length > 0 && (
            <div className="py-2">
              <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicles</div>
              {filteredVehicles.map(v => (
                <div
                  key={v.id}
                  onClick={() => {
                    onSelectResult('vehicle', v.id);
                    onClose();
                  }}
                  className="p-2 hover:bg-teal-50 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Truck className="w-4 h-4 text-[#087F8C]" />
                    <div>
                      <div className="font-bold text-slate-800">{v.registrationNumber} ({v.vehicleType})</div>
                      <div className="text-slate-500 text-[11px]">Driver: {v.driver.name} | Speed: {v.speedKmH} km/h</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Roads */}
          {filteredRoads.length > 0 && (
            <div className="py-2">
              <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Road Corridors</div>
              {filteredRoads.map(r => (
                <div
                  key={r.id}
                  onClick={() => {
                    onSelectResult('road', r.id);
                    onClose();
                  }}
                  className="p-2 hover:bg-teal-50 rounded-lg flex items-center justify-between cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <MapPin className="w-4 h-4 text-[#087F8C]" />
                    <div>
                      <div className="font-bold text-slate-800">{r.roadName}</div>
                      <div className="text-slate-500 text-[11px]">{r.state} ({r.district})</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    r.status === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
