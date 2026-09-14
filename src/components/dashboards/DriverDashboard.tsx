import React, { useState } from 'react';
import {
  Truck,
  Navigation,
  AlertTriangle,
  Phone,
  ShieldAlert,
  CheckCircle2,
  Gauge,
  MapPin,
  Radio,
  Clock,
  Thermometer,
  Fuel,
  Compass,
  Send,
  Wrench,
  CloudRain,
  ShieldCheck,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { LeafletMapView } from '../map/LeafletMapView';
import { MapLayerState } from '../map/MapLayerToggle';

interface DashboardProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const DriverDashboard: React.FC<DashboardProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { vehicles, shipments, roads, updateVehicleSpeed, submitFieldReport } = useAppState();
  const { t } = useLanguage();

  // Driver assigned vehicle & shipment
  const activeVehicle = vehicles.find((v) => v.id === 'veh-2048') || vehicles[0];
  const assignedShipment = shipments.find((s) => s.id === activeVehicle.assignedShipmentId) || shipments[0];

  const [sosSent, setSosSent] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<'primary' | 'alt1' | 'alt2'>('alt1');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Problem Reporting Form State
  const [problemType, setProblemType] = useState<any>('Landslide');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemSeverity, setProblemSeverity] = useState<'High' | 'Critical' | 'Moderate'>('High');

  // Map layer toggle for driver cab map
  const [mapLayers] = useState<MapLayerState>({
    showVehicles: true,
    showShipments: fontShow(true),
    showIncidents: true,
    showBlockedRoads: true,
    showWarehouses: true,
    showHospitals: true,
    showWeatherRisk: true,
    showRoutePolylines: true,
  });

  function fontShow(val: boolean) {
    return val;
  }

  const handleTriggerSOS = () => {
    updateVehicleSpeed(activeVehicle.id, 0);
    submitFieldReport({
      incidentType: 'Vehicle Breakdown',
      severity: 'Critical',
      roadName: 'NH-10 (Sevoke Sector)',
      state: 'Sikkim',
      district: 'East Sikkim',
      description: `DRIVER CAB SOS ALERT: Vehicle ${activeVehicle.registrationNumber} stalled or trapped. Driver: ${activeVehicle.driver.name} (${activeVehicle.driver.phone}).`,
      location: activeVehicle.currentLocation,
      reporterName: activeVehicle.driver.name,
      reporterRole: 'Fleet Driver',
      affectedVehicleIds: [activeVehicle.id],
      affectedShipmentIds: [assignedShipment.id],
      verificationSource: 'GPS Signal',
      confidenceScore: 98,
    });

    setSosSent(true);
    setTimeout(() => setSosSent(false), 7000);
  };

  const handleReportProblemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFieldReport({
      incidentType: problemType,
      severity: problemSeverity,
      roadName: 'NH-10 / NH-37 Corridor',
      state: 'Sikkim',
      district: 'Gangtok',
      description: problemDescription || `Driver reported ${problemType} on active route corridor.`,
      location: activeVehicle.currentLocation,
      reporterName: activeVehicle.driver.name,
      reporterRole: 'Fleet Driver',
      affectedVehicleIds: [activeVehicle.id],
      affectedShipmentIds: [assignedShipment.id],
      verificationSource: 'Field Report',
      confidenceScore: 90,
    });

    setReportSuccess(true);
    setProblemDescription('');
    setTimeout(() => setReportSuccess(false), 5000);
  };

  const ROUTE_OPTIONS = [
    {
      id: 'primary',
      name: 'Primary Highway (NH-10 via Sevoke)',
      distance: '112 km',
      eta: '3 hrs 10 mins',
      status: 'Blocked by Landslide',
      statusColor: 'bg-red-100 text-red-800 border-red-300',
      recommended: false,
    },
    {
      id: 'alt1',
      name: 'AI Recommended Bypass (NH-37 Silchar Corridor)',
      distance: '148 km',
      eta: '4 hrs 05 mins',
      status: 'Open & Clear',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      recommended: true,
    },
    {
      id: 'alt2',
      name: 'Rural Mountain Detour (Old Cart Road)',
      distance: '135 km',
      eta: '5 hrs 20 mins',
      status: 'Narrow Terrain / Rain Hazard',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      recommended: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto font-body view-enter-animation">
      {/* Driver Mobile Cab Header Bar */}
      <div data-tour="driver-cab-header" className="bg-gradient-to-r from-[#065F66] via-[#087F8C] to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md">
            <Truck className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="font-display font-black text-2xl tracking-tight text-white">
                Driver Cab Telemetry & Navigation Terminal
              </h2>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                GPS Live Tracking Active
              </span>
            </div>
            <p className="text-xs text-teal-100/90 mt-1 font-medium">
              Assigned Vehicle: <strong className="text-white font-mono">{activeVehicle.registrationNumber}</strong> | Driver: {activeVehicle.driver.name} ({activeVehicle.driver.phone})
            </p>
          </div>
        </div>

        {/* SOS Button */}
        <button
          data-tour="driver-sos-btn"
          onClick={handleTriggerSOS}
          className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-2xl text-xs transition-all shadow-xl flex items-center space-x-2.5 cursor-pointer shrink-0 transform hover:scale-105"
        >
          <Radio className="w-4.5 h-4.5 animate-pulse text-white" />
          <span>EMERGENCY DRIVER SOS</span>
        </button>
      </div>

      {sosSent && (
        <div className="p-4.5 bg-red-100 border border-red-300 text-red-950 rounded-2xl text-xs font-black flex items-center space-x-3 shadow-xs">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 animate-bounce" />
          <span>CRITICAL: SOS Signal Broadcasted to Dispatch Control Center! Vehicle speed set to 0 km/h and dispatch officer notified immediately.</span>
        </div>
      )}

      {reportSuccess && (
        <div className="p-4.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-black flex items-center space-x-3 shadow-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <span>In-Cab Incident Report submitted successfully to Central Control & Field Officers!</span>
        </div>
      )}

      {/* Grid Layout: Left Column (Map & Navigation), Right Column (Telematics & Problem Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2-Column Area: Interactive GIS Map & Route Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Cab GIS Map */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-5 h-5 text-[#087F8C]" />
                <h3 className="font-display font-black text-lg text-slate-900">
                  Live Truck Location & Route GPS
                </h3>
              </div>
              <span className="text-xs bg-teal-50 text-[#087F8C] font-extrabold px-3 py-1 rounded-xl">
                Current Location: {activeVehicle.currentLocation.lat.toFixed(3)}, {activeVehicle.currentLocation.lng.toFixed(3)}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
              <LeafletMapView layers={mapLayers} height="380px" />
            </div>
          </div>

          {/* Route Selection Panel */}
          <div data-tour="driver-navigation-card" className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Navigation className="w-5 h-5 text-[#087F8C]" />
                <h3 className="font-display font-black text-lg text-slate-900">
                  Cab Route Selection & Dynamic AI Guidance
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">Select preferred corridor</span>
            </div>

            <div className="space-y-3">
              {ROUTE_OPTIONS.map((route) => (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id as any)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedRouteId === route.id
                      ? 'bg-teal-50/90 border-[#087F8C] shadow-sm'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900">{route.name}</span>
                      {route.recommended && (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          AI Recommended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-600 font-medium">
                      <span>Distance: <strong>{route.distance}</strong></span>
                      <span>ETA: <strong>{route.eta}</strong></span>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1.5 rounded-xl font-extrabold border ${route.statusColor} self-start sm:self-center`}>
                    {route.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1-Column Area: Speed Telemetry, Problem Reporting, & Cargo Manifest */}
        <div className="space-y-6">
          {/* Live Speedometer & Telematics Card */}
          <div data-tour="driver-speedometer" className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-base text-slate-900 flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-[#087F8C]" />
                <span>Speedometer & Telematics</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                Normal Pulse
              </span>
            </div>

            {/* Circular Speed Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-[#087F8C]/30 bg-teal-50/50 shadow-inner">
                <div className="text-center">
                  <div className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                    {activeVehicle.speedKmH}
                  </div>
                  <div className="text-xs text-[#087F8C] font-extrabold">KM / H</div>
                </div>
              </div>

              {/* Speed Simulator Buttons */}
              <div className="w-full space-y-1.5 pt-4">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block text-center">
                  Simulate Speedometer Controls:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => updateVehicleSpeed(activeVehicle.id, 55)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 rounded-xl font-extrabold cursor-pointer transition-colors"
                  >
                    55 km/h
                  </button>
                  <button
                    onClick={() => updateVehicleSpeed(activeVehicle.id, 20)}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-2 rounded-xl font-extrabold cursor-pointer transition-colors"
                  >
                    20 km/h
                  </button>
                  <button
                    onClick={() => updateVehicleSpeed(activeVehicle.id, 0)}
                    className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 py-2 rounded-xl font-extrabold cursor-pointer transition-colors"
                  >
                    Stalled (0)
                  </button>
                </div>
              </div>
            </div>

            {/* In-Cab Sensors Metric Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[10px] uppercase">
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fuel Tank</span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm">78% (320 L)</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[10px] uppercase">
                  <Thermometer className="w-3.5 h-3.5 text-teal-600" />
                  <span>Cargo Temp</span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm">4.2 °C (Cold Chain)</div>
              </div>
            </div>
          </div>

          {/* In-Cab Problem Reporting Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-black text-base text-slate-900">
                In-Cab Problem & Incident Reporter
              </h3>
            </div>

            <form onSubmit={handleReportProblemSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Incident Type:
                </label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#087F8C]"
                >
                  <option value="Landslide">Landslide Debris</option>
                  <option value="Vehicle Breakdown">Vehicle Mechanical Breakdown</option>
                  <option value="Flood">Severe Heavy Rain / Flash Flood</option>
                  <option value="Road Damage">Road Cut / Bridge Clearance Issue</option>
                  <option value="Traffic">Traffic / Bottleneck Delay</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Severity Level:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Moderate', 'High', 'Critical'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setProblemSeverity(sev)}
                      className={`py-2 rounded-xl font-black text-xs border cursor-pointer transition-all ${
                        problemSeverity === sev
                          ? sev === 'Critical'
                            ? 'bg-red-600 text-white border-red-600'
                            : sev === 'High'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-[#087F8C] text-white border-[#087F8C]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
                  Description / Situation Details:
                </label>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Describe road blockage, vehicle status, or immediate assistance needed..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-[#087F8C]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#087F8C] hover:bg-[#065F66] text-white font-black rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4 text-teal-200" />
                <span>Submit Problem Report</span>
              </button>
            </form>
          </div>

          {/* Active Manifest Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#087F8C]" />
                <span>Assigned Cargo Manifest</span>
              </h4>
              <span className="font-mono text-[11px] text-[#087F8C] font-black">
                {assignedShipment.trackingCode}
              </span>
            </div>
            <div className="space-y-1.5 text-slate-700 font-medium">
              <div><strong>Title:</strong> {assignedShipment.title}</div>
              <div><strong>Quantity:</strong> {assignedShipment.quantityUnits} {assignedShipment.unitType}</div>
              <div><strong>Priority:</strong> {assignedShipment.priority}</div>
              <div><strong>ETA:</strong> {new Date(assignedShipment.currentEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
