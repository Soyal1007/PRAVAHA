import React, { useState } from 'react';
import { LeafletMapView } from './LeafletMapView';
import { MapLayerState } from './MapLayerToggle';
import { Map, Key, Layers } from 'lucide-react';
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
  return (
    <div className="relative w-full">
      <LeafletMapView layers={layers} height={height} onSelectEntity={onSelectEntity} />
    </div>
  );
};
