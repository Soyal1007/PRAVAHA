import React, { useState } from 'react';
import { LeafletMapView } from './LeafletMapView';
import { GoogleMapView } from './GoogleMapView';
import { MapLayerState } from './MapLayerToggle';
import { getGoogleMapsApiKey } from '../../config/maps';
import { REGIONAL_PRESETS, RegionalPreset } from '../../data/mapCoordinates';
import { Compass } from 'lucide-react';

interface InteractiveMapProps {
  layers: MapLayerState;
  height?: string;
  onSelectEntity?: (type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse', id: string) => void;
  highlightCoordinates?: { lat: number; lng: number };
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  layers,
  height = '550px',
  onSelectEntity,
}) => {
  const apiKey = getGoogleMapsApiKey();
  const [provider, setProvider] = useState<'google' | 'leaflet'>(apiKey ? 'google' : 'leaflet');
  const [selectedPreset, setSelectedPreset] = useState<RegionalPreset>(REGIONAL_PRESETS[0]);

  return (
    <div className="relative w-full">
      {/* Top Map Bar: Provider Toggle & Regional Preset Selector */}
      <div className="absolute top-2 left-2 right-2 z-[100] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Map Engine Provider Toggle Bar */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center space-x-1 text-xs pointer-events-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Engine:</span>
          <button
            onClick={() => setProvider('google')}
            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              provider === 'google'
                ? 'bg-[#087F8C] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Google Maps
          </button>
          <button
            onClick={() => setProvider('leaflet')}
            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              provider === 'leaflet'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Leaflet OSM
          </button>
        </div>

        {/* Regional Focus Preset Selector */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center space-x-2 text-xs pointer-events-auto">
          <Compass className="w-4 h-4 text-[#087F8C]" />
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Focus Area:
          </span>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const preset = REGIONAL_PRESETS.find(p => p.id === e.target.value);
              if (preset) setSelectedPreset(preset);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-xs px-2.5 py-1 rounded-lg outline-none cursor-pointer"
          >
            {REGIONAL_PRESETS.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.state}: {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {provider === 'google' ? (
        <GoogleMapView
          layers={layers}
          height={height}
          onSelectEntity={onSelectEntity}
          center={selectedPreset.center}
          zoom={selectedPreset.zoom}
          onSwitchToLeaflet={() => setProvider('leaflet')}
        />
      ) : (
        <LeafletMapView
          layers={layers}
          height={height}
          onSelectEntity={onSelectEntity}
          center={selectedPreset.center}
          zoom={selectedPreset.zoom}
        />
      )}
    </div>
  );
};

