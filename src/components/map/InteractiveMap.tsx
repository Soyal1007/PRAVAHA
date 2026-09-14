import React, { useState } from 'react';
import { LeafletMapView } from './LeafletMapView';
import { GoogleMapView } from './GoogleMapView';
import { MapLayerState } from './MapLayerToggle';
import { getGoogleMapsApiKey } from '../../config/maps';

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
  const [provider, setProvider] = useState<'google' | 'leaflet'>(apiKey ? 'google' : 'google');

  return (
    <div className="relative w-full">
      {/* Map Engine Provider Toggle Bar */}
      <div className="absolute top-2 left-2 z-[100] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 shadow-md flex items-center space-x-1 text-xs">
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

      {provider === 'google' ? (
        <GoogleMapView layers={layers} height={height} onSelectEntity={onSelectEntity} />
      ) : (
        <LeafletMapView layers={layers} height={height} onSelectEntity={onSelectEntity} />
      )}
    </div>
  );
};

