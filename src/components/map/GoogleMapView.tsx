import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { NORTHEAST_CENTER, ROUTE_POLYLINES } from '../../data/mapCoordinates';
import { MapLayerState } from './MapLayerToggle';
import { getGoogleMapsApiKey } from '../../config/maps';
import { AlertTriangle, Key, MapPin, Layers } from 'lucide-react';

interface GoogleMapViewProps {
  layers: MapLayerState;
  height?: string;
  onSelectEntity?: (type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse', id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const objectsRef = useRef<Array<google.maps.Polyline | google.maps.Marker | google.maps.Circle | google.maps.Polygon>>([]);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents, nesdrDatasets, nesdrHazardZones } = useAppState();

  // Dynamic Map Panning when center/zoom changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  const apiKey = getGoogleMapsApiKey();

  // Load Google Maps API Script
  useEffect(() => {
    // Catch Google Maps API Authentication Failure
    (window as any).gm_authFailure = () => {
      setLoadError('Google Maps API Key Authentication failed. Please verify your API key in Settings or switch to Leaflet OSM.');
    };

    if (!apiKey) {
      setLoadError('Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in .env or Settings.');
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already injected
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkLoaded);
          setMapLoaded(true);
        }
      }, 200);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setMapLoaded(true);
    };

    script.onerror = () => {
      setLoadError('Failed to load Google Maps SDK. Please check your network connection or API key.');
    };

    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      // Re-center if map instance exists
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapInstanceRef.current.setZoom(zoom);
      return;
    }

    try {
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9ecf8' }],
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f3f6f8' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ lightness: 20 }],
          },
          {
            featureType: 'poi',
            elementType: 'all',
            stylers: [{ visibility: 'simplified' }],
          },
        ],
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error('Error initializing Google Map:', err);
      setLoadError(err.message || 'Error initializing Google Maps.');
    }

    return () => {
      if (objectsRef.current) {
        objectsRef.current.forEach(obj => obj.setMap(null));
        objectsRef.current = [];
      }
      mapInstanceRef.current = null;
    };
  }, [mapLoaded, center, zoom]);

  // Render Map Layers & Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;

    // Clear previous objects
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

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="font-family: sans-serif; font-size: 12px; padding: 2px;"><b>Corridor:</b> ${key}</div>`,
        });

        polyline.addListener('mouseover', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
          }
        });

        polyline.addListener('mouseout', () => {
          infoWindow.close();
        });

        objectsRef.current.push(polyline);
      });
    }

    // 2. Marked Road Conditions (Green = Open, Amber = Restricted, Red = Blocked)
    if (layers.showBlockedRoads) {
      roads.forEach(r => {
        const path = [
          { lat: r.startPoint.lat, lng: r.startPoint.lng },
          { lat: r.endPoint.lat, lng: r.endPoint.lng },
        ];

        let strokeColor = '#10B981'; // Open = Emerald Green
        if (r.status === 'Blocked') strokeColor = '#EF4444'; // Blocked = Red
        else if (r.status === 'Restricted') strokeColor = '#F59E0B'; // Restricted = Amber
        else if (r.status === 'Under Maintenance') strokeColor = '#F97316'; // Maintenance = Orange

        const roadLine = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor,
          strokeOpacity: 0.9,
          strokeWeight: 6,
          map,
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; min-width: 180px; padding: 4px;">
            <div style="font-weight: 800; color: ${strokeColor}; font-size: 13px; margin-bottom: 2px;">${r.roadName}</div>
            <div>Status: <b style="color: ${strokeColor};">${r.status}</b> (Risk Score: ${r.riskScore}/100)</div>
            <div style="color: #64748B; font-size: 11px; margin-top: 3px;">${r.causeOfDisruption || 'Normal Traffic Flow'}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 4px;">State: ${r.state} - ${r.district}</div>
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

    // 3. Weather Risk Circles
    if (layers.showWeatherRisk) {
      weatherEvents.forEach(w => {
        if (w.floodRisk === 'High' || w.floodRisk === 'Extreme') {
          const circle = new google.maps.Circle({
            strokeColor: '#0284C7',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#38BDF8',
            fillOpacity: 0.25,
            map,
            center: { lat: w.coordinates.lat, lng: w.coordinates.lng },
            radius: 25000,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-family: sans-serif; font-size: 12px; padding: 2px;"><b>Weather Warning:</b> ${w.condition} (${w.rainfallMmHr} mm/hr)</div>`,
            position: { lat: w.coordinates.lat, lng: w.coordinates.lng },
          });

          circle.addListener('click', () => {
            closeActiveInfoWindow();
            infoWindow.open(map);
            activeInfoWindowRef.current = infoWindow;
          });

          objectsRef.current.push(circle);
        }
      });
    }

    // 4. NESDR / NESAC Official GIS Hazard Overlays
    const activeDatasetIds = new Set(nesdrDatasets.filter(d => d.activeOverlay).map(d => d.id));
    if (activeDatasetIds.size > 0) {
      nesdrHazardZones.forEach(zone => {
        if (activeDatasetIds.has(zone.datasetId)) {
          let fillColor = '#D97706'; // Amber Landslide
          let strokeColor = '#B45309';

          if (zone.type === 'Flood Inundation') {
            fillColor = '#0284C7'; // Blue
            strokeColor = '#0369A1';
          } else if (zone.type === 'River Bank Erosion') {
            fillColor = '#DC2626'; // Red
            strokeColor = '#991B1B';
          } else if (zone.type === 'DEM Slope Gradient') {
            fillColor = '#059669'; // Emerald
            strokeColor = '#047857';
          }

          const polygon = new google.maps.Polygon({
            paths: zone.coordinates,
            strokeColor,
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor,
            fillOpacity: 0.35,
            map,
          });

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; max-width: 260px; padding: 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 800; background: #087F8C; color: white; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                  ${zone.sourceInfo.classification} DATASET
                </span>
                <span style="font-size: 10px; color: #64748B; font-weight: 700;">Score: ${zone.susceptibilityScore}/100</span>
              </div>
              <div style="font-weight: 800; color: #0F172A; font-size: 13px; margin-bottom: 3px; line-height: 1.3;">
                ${zone.name}
              </div>
              <div style="color: #475569; font-size: 11px; margin-bottom: 6px;">
                <b>Hazard Type:</b> ${zone.type} (${zone.severity} Severity)
              </div>
              <div style="background: #F1F5F9; border-left: 3px solid #087F8C; padding: 6px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;">
                <div style="color: #1E293B; font-weight: 700;">Source Attribution:</div>
                <div style="color: #334155;">${zone.sourceInfo.agency}</div>
                <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Dataset: ${zone.sourceInfo.datasetTitle}</div>
                <div style="color: #64748B; font-size: 10px;">Last Updated: <b>${zone.sourceInfo.updatedDate}</b></div>
              </div>
              <div style="font-size: 10px; color: #475569;">
                <b>Affected Highways:</b> ${zone.affectedCorridors.join(', ')}
              </div>
              <div style="margin-top: 6px; text-align: right;">
                <a href="${zone.sourceInfo.ogcUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; color: #087F8C; font-weight: 800; text-decoration: underline;">
                  View NESDR Service →
                </a>
              </div>
            </div>
          `;

          const infoWindow = new google.maps.InfoWindow({
            content: popupContent,
            position: zone.coordinates[0],
          });

          polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
            closeActiveInfoWindow();
            if (e.latLng) {
              infoWindow.setPosition(e.latLng);
            }
            infoWindow.open(map);
            activeInfoWindowRef.current = infoWindow;
          });

          objectsRef.current.push(polygon);
        }
      });
    }

    // 4. Warehouses
    if (layers.showWarehouses) {
      warehouses.forEach(wh => {
        const marker = new google.maps.Marker({
          position: { lat: wh.location.lat, lng: wh.location.lng },
          map,
          title: wh.name,
          icon: {
            url: warehouseIconUrl,
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 14),
          },
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: #1E293B; font-size: 13px;">${wh.name}</strong>
            <div style="margin-top: 2px;">Available Stock: <b>${wh.availableStock} ${wh.unitType}</b></div>
            <div style="color: ${wh.riskLevel === 'Critical' ? '#DC2626' : '#16A34A'}; font-weight: bold; margin-top: 2px;">
              Days Remaining: ${wh.daysRemaining} days (${wh.riskLevel} Risk)
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        marker.addListener('click', () => {
          closeActiveInfoWindow();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
          if (onSelectEntity) onSelectEntity('warehouse', wh.id);
        });

        objectsRef.current.push(marker);
      });
    }

    // 5. Hospitals
    if (layers.showHospitals) {
      hospitals.forEach(h => {
        const marker = new google.maps.Marker({
          position: { lat: h.location.lat, lng: h.location.lng },
          map,
          title: h.name,
          icon: {
            url: hospitalIconUrl,
            scaledSize: new google.maps.Size(26, 26),
            anchor: new google.maps.Point(13, 13),
          },
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: #1E293B; font-size: 13px;">${h.name}</strong>
            <div style="margin-top: 2px;">ICU Beds Available: <b>${h.icuAvailable}</b></div>
            <div style="color: #16A34A; margin-top: 2px;">Emergency Access: <b>${h.emergencyAccessStatus}</b></div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        marker.addListener('click', () => {
          closeActiveInfoWindow();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
        });

        objectsRef.current.push(marker);
      });
    }

    // 6. Incidents
    if (layers.showIncidents) {
      incidents.forEach(inc => {
        const isCritical = inc.severity === 'Critical';
        const marker = new google.maps.Marker({
          position: { lat: inc.location.lat, lng: inc.location.lng },
          map,
          title: `${inc.incidentType} (${inc.severity})`,
          icon: {
            url: createIncidentIconUrl(isCritical),
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15),
          },
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; min-width: 180px; padding: 4px;">
            <strong style="color: #DC2626; font-size: 13px;">${inc.incidentType} (${inc.severity})</strong>
            <div style="font-weight: bold; margin-top: 2px;">${inc.roadName}</div>
            <div style="color: #475569; font-size: 11px; margin-top: 2px;">${inc.description}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 4px;">Reporter: ${inc.reporterName}</div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        marker.addListener('click', () => {
          closeActiveInfoWindow();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
          if (onSelectEntity) onSelectEntity('incident', inc.id);
        });

        objectsRef.current.push(marker);
      });
    }

    // 7. Vehicles
    if (layers.showVehicles) {
      vehicles.forEach(v => {
        const isAtRisk = v.status === 'At Risk' || v.riskLevel === 'Critical';
        const assignedShipment = shipments.find(s => s.id === v.assignedShipmentId);

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

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; min-width: 170px; padding: 4px;">
            <strong style="color: #087F8C; font-size: 13px;">${v.registrationNumber}</strong>
            <div style="color: #475569; margin-top: 1px;">${assignedShipment ? assignedShipment.title : 'General Freight'}</div>
            <hr style="margin: 5px 0; border: none; border-top: 1px solid #E2E8F0;" />
            <div>Speed: <b>${v.speedKmH} km/h</b> | Status: <b style="color: ${isAtRisk ? '#DC2626' : '#16A34A'};">${v.status}</b></div>
            <div style="color: #64748B; font-size: 10px; margin-top: 3px;">Driver: ${v.driver.name} (${v.driver.phone})</div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        marker.addListener('click', () => {
          closeActiveInfoWindow();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
          if (onSelectEntity) onSelectEntity('vehicle', v.id);
        });

        objectsRef.current.push(marker);
      });
    }
  }, [layers, vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents, mapLoaded, onSelectEntity]);

  if (loadError) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border border-amber-300 bg-amber-50 p-6 text-slate-800 space-y-3" style={{ height }}>
        <div className="flex items-center space-x-2 text-amber-800 font-extrabold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Google Maps Key Notice</span>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed max-w-xl">
          {loadError}
        </p>
        <div className="text-xs text-slate-600 space-y-1">
          <div>To resolve this:</div>
          <ul className="list-disc list-inside text-[11px] font-mono text-slate-700 space-y-0.5">
            <li>Ensure <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> is set in <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code></li>
            <li>Or set the key under <b>Settings & System Configuration</b> in the UI</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Provider Badge */}
      <div className="absolute top-3 right-3 z-[10] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-xs flex items-center space-x-1.5 text-[10px] font-bold text-[#087F8C]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Google Maps JS API</span>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[10] bg-white/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-[11px] space-y-1.5 font-medium text-slate-700">
        <div className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Google Maps GIS Corridors</div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-1 bg-emerald-500 rounded-full"></span>
          <span>Open & Clear Corridor</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-1 bg-amber-500 rounded-full"></span>
          <span>Restricted / Single Lane</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-1 bg-red-500 rounded-full"></span>
          <span>Blocked / Landslide Disruption</span>
        </div>
      </div>
    </div>
  );
};
