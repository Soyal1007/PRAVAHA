import React from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';

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
    <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2 shadow-md flex flex-wrap items-center gap-1.5 z-10 text-xs">
      <div className="flex items-center space-x-1 text-slate-500 font-semibold px-2">
        <Layers className="w-3.5 h-3.5" />
        <span>Layers:</span>
      </div>
      {LAYER_CONFIGS.map(layer => {
        const isActive = layers[layer.key];
        return (
          <button
            key={layer.key}
            onClick={() => onToggleLayer(layer.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
              isActive
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${layer.color}`}></span>
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
};
