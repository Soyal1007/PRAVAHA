import React from 'react';
import { Layers, Database, ShieldAlert, Waves, Mountain, HardDrive } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export interface MapLayerState {
  showVehicles: boolean;
  showShipments: boolean;
  showIncidents: boolean;
  showBlockedRoads: boolean;
  showWarehouses: boolean;
  showHospitals: boolean;
  showWeatherRisk: boolean;
  showRoutePolylines: boolean;
}

interface MapLayerToggleProps {
  layers: MapLayerState;
  onToggleLayer: (key: keyof MapLayerState) => void;
}

export const MapLayerToggle: React.FC<MapLayerToggleProps> = ({ layers, onToggleLayer }) => {
  const { nesdrDatasets, toggleNesdrDatasetOverlay } = useAppState();

  const LAYER_CONFIGS: { key: keyof MapLayerState; label: string; color: string }[] = [
    { key: 'showVehicles', label: 'Vehicles', color: 'bg-teal-500' },
    { key: 'showShipments', label: 'Shipments', color: 'bg-emerald-500' },
    { key: 'showIncidents', label: 'Incidents', color: 'bg-red-500' },
    { key: 'showBlockedRoads', label: 'Blocked Roads', color: 'bg-[#DC2626]' },
    { key: 'showWarehouses', label: 'Depots', color: 'bg-amber-500' },
    { key: 'showHospitals', label: 'Hospitals', color: 'bg-blue-500' },
    { key: 'showWeatherRisk', label: 'Weather Risk', color: 'bg-sky-400' },
    { key: 'showRoutePolylines', label: 'Routes', color: 'bg-indigo-500' },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
      {/* Standard Layers */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center space-x-1 text-slate-500 font-bold px-1 text-[11px] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-[#087F8C]" />
          <span>Core GIS:</span>
        </div>
        {LAYER_CONFIGS.map(layer => {
          const isActive = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => onToggleLayer(layer.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${layer.color}`}></span>
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Official NESDR / NESAC Spatial Datasets Section */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3">
        <div className="flex items-center space-x-1 text-teal-700 font-extrabold px-1 text-[10px] uppercase tracking-wider">
          <Database className="w-3.5 h-3.5 text-[#087F8C]" />
          <span>NESDR / NESAC Layers:</span>
        </div>
        {nesdrDatasets.map(ds => (
          <button
            key={ds.id}
            onClick={() => toggleNesdrDatasetOverlay(ds.id)}
            title={`Source: ${ds.sourceAgency} | Updated: ${ds.lastUpdated} [${ds.classification}]`}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center space-x-1 transition-all cursor-pointer ${
              ds.activeOverlay
                ? 'bg-[#087F8C] text-white shadow-2xs'
                : 'bg-teal-50 text-teal-800 border border-teal-200/60 hover:bg-teal-100'
            }`}
          >
            {ds.id.includes('LHS') && <ShieldAlert className="w-3 h-3 text-amber-300" />}
            {ds.id.includes('FLEWS') && <Waves className="w-3 h-3 text-cyan-300" />}
            {ds.id.includes('DEM') && <Mountain className="w-3 h-3 text-emerald-300" />}
            {ds.id.includes('SISDP') && <HardDrive className="w-3 h-3 text-indigo-300" />}
            <span>{ds.title.split(' ')[1] || ds.title}</span>
            <span className="text-[9px] opacity-75 font-mono">({ds.classification})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
