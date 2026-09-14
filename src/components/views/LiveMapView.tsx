import React, { useState } from 'react';
import { Map, Filter, Search, Eye, RefreshCw, ChevronRight } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { MapLayerToggle, MapLayerState } from '../map/MapLayerToggle';

interface LiveMapViewProps {
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({ onSelectEntity }) => {
  const { t } = useLanguage();
  const { vehicles, shipments, roads, incidents, warehouses } = useAppState();

  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [mapLayers, setMapLayers] = useState<MapLayerState>({
    showVehicles: true,
    showShipments: true,
    showIncidents: true,
    showBlockedRoads: true,
    showWarehouses: true,
    showHospitals: true,
    showWeatherRisk: true,
    showRoutePolylines: true,
  });

  const toggleLayer = (key: keyof MapLayerState) => {
    setMapLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const STATES = ['All', 'Assam', 'Sikkim', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh'];
  const RISKS = ['All', 'Critical', 'High', 'Moderate', 'Low'];

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Map className="w-5 h-5 text-[#087F8C]" />
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('liveMap')} Workspace</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive GIS geospatial surface with real-time road accessibility, telemetry overlay, and disaster risk layers.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <div className="flex items-center space-x-1 bg-[#F7F9FA] border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-medium">State:</span>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center space-x-1 bg-[#F7F9FA] border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-medium">Risk:</span>
            <select
              value={selectedRisk}
              onChange={e => setSelectedRisk(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {RISKS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Layer Toggle Bar */}
      <MapLayerToggle layers={mapLayers} onToggleLayer={toggleLayer} />

      {/* Map and Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-2 shadow-2xs">
          <InteractiveMap layers={mapLayers} height="650px" onSelectEntity={onSelectEntity} />
        </div>

        {/* Inspector Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 mb-3">
              Geospatial Inventory
            </h3>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Monitored Corridors ({roads.length})
                </span>
                <div className="space-y-1.5">
                  {roads.map(r => (
                    <div
                      key={r.id}
                      onClick={() => onSelectEntity('road', r.id)}
                      className="p-2 bg-[#F7F9FA] hover:bg-teal-50 rounded-lg border border-slate-200/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{r.roadName}</div>
                        <div className="text-[10px] text-slate-500">{r.state}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.status === 'Blocked' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Active Fleet Vehicles ({vehicles.length})
                </span>
                <div className="space-y-1.5">
                  {vehicles.map(v => (
                    <div
                      key={v.id}
                      onClick={() => onSelectEntity('vehicle', v.id)}
                      className="p-2 bg-[#F7F9FA] hover:bg-teal-50 rounded-lg border border-slate-200/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{v.registrationNumber}</div>
                        <div className="text-[10px] text-slate-500">{v.currentLocation.name}</div>
                      </div>
                      <span className="text-[10px] font-bold text-[#087F8C]">
                        {v.speedKmH} km/h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Click any feature marker or list item to open inspector drawer.
          </div>
        </div>
      </div>
    </div>
  );
};
