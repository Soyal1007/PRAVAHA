import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { NORTHEAST_CENTER, ROUTE_POLYLINES } from '../../data/mapCoordinates';
import { MapLayerState } from './MapLayerToggle';
import { getGoogleMapsApiKey, setGoogleMapsApiKey, hasUserProvidedApiKey } from '../../config/maps';
import { AlertTriangle, Key, Save } from 'lucide-react';

interface GoogleMapViewProps {
  layers: MapLayerState;
  height?: string;
  onSelectEntity?: (type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse', id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  onSwitchToLeaflet?: () => void;
}

const createSvgDataUrl = (svgString: string) => {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString);
};

const warehouseIconUrl = createSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect x="2" y="2" width="28" height="28" rx="6" fill="#D97706" stroke="#FFFFFF" stroke-width="2"/>
    <text x="16" y="21" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle">W</text>
  </svg>
`);

const hospitalIconUrl = createSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M15 8v14M8 15h14" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
  </svg>
`);

const createIncidentIconUrl = (isCritical: boolean) => createSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="${isCritical ? '#DC2626' : '#EA580C'}" stroke="#FFFFFF" stroke-width="2"/>
    <text x="17" y="23" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
  </svg>
`);

const createVehicleIconUrl = (isAtRisk: boolean) => createSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="${isAtRisk ? '#DC2626' : '#087F8C'}" stroke="#FFFFFF" stroke-width="2.5"/>
    <text x="18" y="23" font-family="Arial, sans-serif" font-size="16" fill="#FFFFFF" text-anchor="middle">🚚</text>
  </svg>
`);

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  layers,
  height = '550px',
  onSelectEntity,
  center = NORTHEAST_CENTER,
  zoom = 7,
  onSwitchToLeaflet,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const objectsRef = useRef<Array<google.maps.Polyline | google.maps.Marker | google.maps.Circle | google.maps.Polygon>>([]);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState<string>('');

  const { vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents, nesdrDatasets, nesdrHazardZones } = useAppState();

  const apiKey = getGoogleMapsApiKey();
  const hasUserKey = hasUserProvidedApiKey();

  // Dynamic Map Panning when center/zoom changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      try {
        mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
        mapInstanceRef.current.setZoom(zoom);
      } catch (e) {
        console.warn('Error panning Google Map:', e);
      }
    }
  }, [center, zoom]);

  // Load Google Maps API Script
  useEffect(() => {
    // Catch Google Maps API Authentication Failure
    (window as any).gm_authFailure = () => {
      setLoadError('Google Maps API Key Authentication failed. The provided API key is invalid or restricted. Please enter a valid key below or switch to Leaflet OSM.');
      if (onSwitchToLeaflet && !hasUserKey) {
        onSwitchToLeaflet();
      }
    };

    if (!apiKey) {
      setLoadError('Google Maps API key is missing. Please enter your API key below or configure VITE_GOOGLE_MAPS_API_KEY in .env.');
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      setLoadError(null);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;

    const timeoutTimer = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        setLoadError('Google Maps SDK loading timed out. Switching to Leaflet OSM.');
        if (onSwitchToLeaflet) onSwitchToLeaflet();
      }
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutTimer);
      setMapLoaded(true);
      setLoadError(null);
    };

    script.onerror = () => {
      clearTimeout(timeoutTimer);
      setLoadError('Failed to load Google Maps SDK. Please check network connection or verify API key.');
      if (onSwitchToLeaflet) onSwitchToLeaflet();
    };

    document.head.appendChild(script);

    return () => {
      clearTimeout(timeoutTimer);
    };
  }, [apiKey, onSwitchToLeaflet, hasUserKey]);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      mapContainerRef.current.innerHTML = '';

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error('Error initializing Google Map:', err);
      setLoadError(err.message || 'Error initializing Google Maps.');
      if (onSwitchToLeaflet) onSwitchToLeaflet();
    }
  }, [mapLoaded, center, zoom, onSwitchToLeaflet]);

  // Render Map Layers & Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;

    objectsRef.current.forEach(obj => obj.setMap(null));
    objectsRef.current = [];

    const closeActiveInfoWindow = () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
    };

    // 1. Route Polylines
    if (layers.showRoutePolylines) {
      Object.entries(ROUTE_POLYLINES).forEach(([key, points]) => {
        const isAlternate = key.includes('alternate');
        const path = points.map(p => ({ lat: p.lat, lng: p.lng }));

        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: isAlternate ? '#087F8C' : '#64748B',
          strokeOpacity: 0.85,
          strokeWeight: isAlternate ? 4 : 3,
          map,
        });

        objectsRef.current.push(polyline);
      });
    }

    // 2. Marked Road Conditions
    if (layers.showBlockedRoads) {
      roads.forEach(r => {
        const path = [
          { lat: r.startPoint.lat, lng: r.startPoint.lng },
          { lat: r.endPoint.lat, lng: r.endPoint.lng },
        ];

        let strokeColor = '#10B981';
        if (r.status === 'Blocked') strokeColor = '#EF4444';
        else if (r.status === 'Restricted') strokeColor = '#F59E0B';
        else if (r.status === 'Under Maintenance') strokeColor = '#F97316';

        const roadLine = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor,
          strokeOpacity: 0.9,
          strokeWeight: 6,
          map,
        });

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
            <div style="font-weight: bold; color: ${strokeColor};">${r.roadName}</div>
            <div>Status: <b>${r.status}</b> (Risk: ${r.riskScore}/100)</div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        roadLine.addListener('click', (e: google.maps.MapMouseEvent) => {
          closeActiveInfoWindow();
          if (e.latLng) {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
            activeInfoWindowRef.current = infoWindow;
          }
          if (onSelectEntity) onSelectEntity('road', r.id);
        });

        objectsRef.current.push(roadLine);
      });
    }

    // 3. Vehicles
    if (layers.showVehicles) {
      vehicles.forEach(v => {
        const isAtRisk = v.status === 'At Risk' || v.riskLevel === 'Critical';

        const marker = new google.maps.Marker({
          position: { lat: v.currentLocation.lat, lng: v.currentLocation.lng },
          map,
          title: v.registrationNumber,
          icon: {
            url: createVehicleIconUrl(isAtRisk),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
        });

        marker.addListener('click', () => {
          if (onSelectEntity) onSelectEntity('vehicle', v.id);
        });

        objectsRef.current.push(marker);
      });
    }
  }, [layers, vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents, mapLoaded, onSelectEntity]);

  if (loadError) {
    return (
      <div className="relative w-full rounded-xl border border-amber-300 bg-amber-50 p-6 text-slate-800 space-y-4" style={{ height }}>
        <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Google Maps Key Required</span>
        </div>

        <p className="text-xs text-amber-900 leading-relaxed font-medium">
          {loadError}
        </p>

        <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2 max-w-lg">
          <label className="block text-[10px] font-bold text-slate-700 uppercase">
            Configure Google Maps API Key
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (inputKey.trim()) {
                  setGoogleMapsApiKey(inputKey.trim());
                  window.location.reload();
                }
              }}
              className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center space-x-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Key</span>
            </button>
            {onSwitchToLeaflet && (
              <button
                onClick={onSwitchToLeaflet}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-bold text-xs cursor-pointer"
              >
                Use Leaflet OSM
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height }}>
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center space-y-2 z-[20]">
          <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-600">Loading Google Maps API...</span>
        </div>
      )}

      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

      <div className="absolute top-3 right-3 z-[10] bg-white/90 px-2.5 py-1 rounded border border-slate-200 text-[10px] font-bold text-teal-700">
        Google Maps JS API
      </div>
    </div>
  );
};
