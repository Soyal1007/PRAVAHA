import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppState } from '../../context/AppStateContext';
import { NORTHEAST_CENTER, ROUTE_POLYLINES } from '../../data/mapCoordinates';
import { MapLayerState } from './MapLayerToggle';

interface LeafletMapViewProps {
  layers: MapLayerState;
  height?: string;
  onSelectEntity?: (type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse', id: string) => void;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  layers,
  height = '550px',
  onSelectEntity,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const { vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents } = useAppState();

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [NORTHEAST_CENTER.lat, NORTHEAST_CENTER.lng],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Layers whenever state or toggle props change
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Draw Route Polylines
    if (layers.showRoutePolylines) {
      Object.entries(ROUTE_POLYLINES).forEach(([key, points]) => {
        const isAlternate = key.includes('alternate');
        const latLngs: [number, number][] = points.map(p => [p.lat, p.lng]);

        const polyline = L.polyline(latLngs, {
          color: isAlternate ? '#087F8C' : '#64748B',
          weight: isAlternate ? 4 : 3,
          dashArray: isAlternate ? '8, 8' : undefined,
          opacity: 0.85,
        });

        polyline.bindTooltip(`<b>Corridor:</b> ${key}`, { sticky: true });
        polyline.addTo(group);
      });
    }

    // 2. Draw Roads with Marked Road Conditions (Green = Open, Amber = Restricted, Red = Blocked)
    if (layers.showBlockedRoads) {
      roads.forEach(r => {
        const latLngs: [number, number][] = [
          [r.startPoint.lat, r.startPoint.lng],
          [r.endPoint.lat, r.endPoint.lng],
        ];

        let strokeColor = '#10B981'; // Open = Green/Teal
        if (r.status === 'Blocked') strokeColor = '#EF4444'; // Blocked = Red
        else if (r.status === 'Restricted') strokeColor = '#F59E0B'; // Restricted = Amber
        else if (r.status === 'Under Maintenance') strokeColor = '#F97316'; // Maintenance = Orange

        const roadLine = L.polyline(latLngs, {
          color: strokeColor,
          weight: 7,
          opacity: 0.9,
        });

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; min-width: 170px;">
            <div style="font-weight: bold; color: ${strokeColor}; font-size: 13px;">${r.roadName}</div>
            <div style="margin-top: 3px;">Status: <b>${r.status}</b> (Risk: ${r.riskScore}/100)</div>
            <div style="color: #64748B; font-size: 11px; margin-top: 2px;">${r.causeOfDisruption || 'Normal Traffic Flow'}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 4px;">State: ${r.state} - ${r.district}</div>
          </div>
        `;

        roadLine.bindPopup(popupContent);
        roadLine.on('click', () => {
          if (onSelectEntity) onSelectEntity('road', r.id);
        });

        roadLine.addTo(group);
      });
    }

    // 3. Draw Weather Risk Circles
    if (layers.showWeatherRisk) {
      weatherEvents.forEach(w => {
        if (w.floodRisk === 'High' || w.floodRisk === 'Extreme') {
          const circle = L.circle([w.coordinates.lat, w.coordinates.lng], {
            radius: 25000,
            color: '#0284C7',
            fillColor: '#38BDF8',
            fillOpacity: 0.25,
            weight: 1.5,
          });

          circle.bindTooltip(`<b>Weather Warning:</b> ${w.condition} (${w.rainfallMmHr} mm/hr)`, { sticky: true });
          circle.addTo(group);
        }
      });
    }

    // 4. Draw Warehouses
    if (layers.showWarehouses) {
      warehouses.forEach(wh => {
        const icon = L.divIcon({
          className: 'custom-warehouse-icon',
          html: `<div style="background-color: #D97706; color: white; width: 26px; height: 26px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">W</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([wh.location.lat, wh.location.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #1E293B;">${wh.name}</strong>
            <div>Stock: ${wh.availableStock} ${wh.unitType}</div>
            <div style="color: ${wh.riskLevel === 'Critical' ? '#DC2626' : '#16A34A'}; font-weight: bold;">
              Supply Remaining: ${wh.daysRemaining} days
            </div>
          </div>
        `);
        marker.on('click', () => {
          if (onSelectEntity) onSelectEntity('warehouse', wh.id);
        });
        marker.addTo(group);
      });
    }

    // 5. Draw Hospitals
    if (layers.showHospitals) {
      hospitals.forEach(h => {
        const icon = L.divIcon({
          className: 'custom-hospital-icon',
          html: `<div style="background-color: #2563EB; color: white; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">+</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([h.location.lat, h.location.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #1E293B;">${h.name}</strong>
            <div>ICU Beds Available: <b>${h.icuAvailable}</b></div>
            <div style="color: #16A34A;">Access: <b>${h.emergencyAccessStatus}</b></div>
          </div>
        `);
        marker.addTo(group);
      });
    }

    // 6. Draw Incidents
    if (layers.showIncidents) {
      incidents.forEach(inc => {
        const isCritical = inc.severity === 'Critical';
        const icon = L.divIcon({
          className: 'custom-incident-icon',
          html: `<div style="background-color: ${isCritical ? '#DC2626' : '#EA580C'}; color: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">!</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([inc.location.lat, inc.location.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
            <strong style="color: #DC2626;">${inc.incidentType} (${inc.severity})</strong>
            <div style="font-weight: bold; margin-top: 2px;">${inc.roadName}</div>
            <div style="color: #475569; font-size: 11px;">${inc.description}</div>
            <div style="color: #94A3B8; font-size: 10px; margin-top: 4px;">Reporter: ${inc.reporterName}</div>
          </div>
        `);
        marker.on('click', () => {
          if (onSelectEntity) onSelectEntity('incident', inc.id);
        });
        marker.addTo(group);
      });
    }

    // 7. Draw Vehicles
    if (layers.showVehicles) {
      vehicles.forEach(v => {
        const isAtRisk = v.status === 'At Risk' || v.riskLevel === 'Critical';
        const icon = L.divIcon({
          className: 'custom-vehicle-icon',
          html: `<div style="background-color: ${isAtRisk ? '#DC2626' : '#087F8C'}; color: white; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">🚚</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([v.currentLocation.lat, v.currentLocation.lng], { icon });
        const assignedShipment = shipments.find(s => s.id === v.assignedShipmentId);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 170px;">
            <strong style="color: #087F8C;">${v.registrationNumber}</strong>
            <div style="color: #475569;">${assignedShipment ? assignedShipment.title : 'General Cargo'}</div>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #E2E8F0;" />
            <div>Speed: <b>${v.speedKmH} km/h</b> | Status: <b style="color: ${isAtRisk ? '#DC2626' : '#16A34A'};">${v.status}</b></div>
            <div style="color: #64748B; font-size: 10px; margin-top: 3px;">Driver: ${v.driver.name}</div>
          </div>
        `);
        marker.on('click', () => {
          if (onSelectEntity) onSelectEntity('vehicle', v.id);
        });
        marker.addTo(group);
      });
    }
  }, [layers, vehicles, shipments, roads, incidents, warehouses, hospitals, weatherEvents, onSelectEntity]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-[11px] space-y-1.5 font-medium text-slate-700">
        <div className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Road Condition Legend</div>
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
