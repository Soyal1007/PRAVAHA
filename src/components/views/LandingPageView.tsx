import React, { useState } from 'react';
import {
  ShieldAlert,
  Map,
  Truck,
  Boxes,
  Radio,
  Activity,
  Bot,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Flame,
  BarChart3,
  Navigation,
  Compass,
  HeartPulse,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { LeafletMapView } from '../map/LeafletMapView';
import { MapLayerState } from '../map/MapLayerToggle';
import { UserRole } from '../../types';

interface LandingPageViewProps {
  onNavigateToView: (view: string) => void;
  onOpenReportModal: () => void;
  onOpenAIChat: () => void;
  onOpenTour?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onNavigateToView,
  onOpenReportModal,
  onOpenAIChat,
  onOpenTour,
}) => {
  const { roads, shipments, vehicles, warehouses, blockRoadSegment, unblockRoadSegment, rerouteShipment } = useAppState();
  const { loginAsRole, demoAccounts } = useAuth();

  const [activeGuideTab, setActiveGuideTab] = useState<UserRole>('Logistics Administrator');
  const [simulatorState, setSimulatorState] = useState<'normal' | 'landslide' | 'rerouted'>('landslide');

  const [demoLayers] = useState<MapLayerState>({
    showVehicles: true,
    showShipments: true,
    showIncidents: true,
    showBlockedRoads: true,
    showWarehouses: true,
    showHospitals: true,
    showWeatherRisk: true,
    showRoutePolylines: true,
  });

  const handleRoleLaunch = (role: UserRole) => {
    loginAsRole(role);
    if (role === 'Driver') onNavigateToView('driverDashboard');
    else if (role === 'Field Officer') onNavigateToView('fieldLink');
    else if (role === 'Authority Viewer') onNavigateToView('authorityDashboard');
    else if (role === 'Logistics Operator') onNavigateToView('fleetPulse');
    else onNavigateToView('commandCenter');
  };

  const handleSimulateLandslide = () => {
    blockRoadSegment('rd-101', 'Severe 120m Landslide Debris');
    setSimulatorState('landslide');
  };

  const handleSimulateReroute = () => {
    rerouteShipment('shp-9001', 'opt-9001-alt1');
    setSimulatorState('rerouted');
  };

  const handleSimulateClearance = () => {
    unblockRoadSegment('rd-101');
    setSimulatorState('normal');
  };

  const activeBlockages = roads.filter((r) => r.status === 'Blocked').length;
  const totalRoads = roads.length;

  return (
    <div className="w-full space-y-10 pb-20 font-body view-enter-animation">
      {/* 1. TOP EMERGENCY HAZARD TICKER RIBBON */}
      <div className="bg-gradient-to-r from-red-600 via-amber-600 to-[#087F8C] text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-sm overflow-hidden">
        <div className="flex items-center space-x-3 truncate">
          <span className="bg-white text-red-600 font-black text-[10px] uppercase px-3 py-1 rounded-full flex items-center space-x-1 shrink-0 shadow-2xs">
            <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>LIVE HAZARD ALERT</span>
          </span>
          <span className="text-white font-bold truncate">
            Severe Landslide on NH-10 (Sevoke Corridor) | Relief Freight Rerouted via NH-37 (Silchar Bypass) | Speed telemetry active for 4 trucks.
          </span>
        </div>

        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="hidden md:flex items-center space-x-1.5 bg-white/20 hover:bg-white text-white hover:text-slate-900 font-extrabold cursor-pointer shrink-0 transition-all px-3.5 py-1 rounded-xl text-xs backdrop-blur-xs shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Take Guided Tour</span>
          </button>
        )}
      </div>

      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 space-y-12">
        {/* 2. GRAND HERO SECTION - Warm Rich Vibrant Teal & Amber Theme */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#065F66] via-[#087F8C] to-slate-900 text-white p-8 sm:p-14 shadow-2xl border border-teal-500/20">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[550px] h-[550px] bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[450px] h-[450px] bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-4xl space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900/80 p-2 border border-teal-400/40 shadow-xl flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="PRAVAHA Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="inline-flex items-center space-x-2.5 bg-amber-400/20 border border-amber-300/40 px-4 py-2 rounded-2xl text-xs font-black text-amber-200 shadow-md">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Climate & Disaster-Resilient GIS Supply Chain Engine</span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
                PRAVAHA <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-teal-200 to-emerald-300">
                  Logistics & Geo-Hazard Engine
                </span>
              </h1>
              <p className="text-sm sm:text-base font-extrabold text-teal-200 tracking-wider font-mono">
                Predict. Navigate. Deliver. — A SAFER, MORE CONNECTED NORTHEAST
              </p>
            </div>

            <p className="text-sm sm:text-base text-teal-50 leading-relaxed max-w-3xl font-body font-medium">
              Empowering disaster response authorities, relief truck drivers, field officers, and dispatch operators with real-time geospatial road condition tracking, AI dynamic rerouting, driver cab speed telematics, and offline incident reporting across high-risk mountain corridors.
            </p>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {onOpenTour && (
                <button
                  onClick={onOpenTour}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-sm transition-all shadow-xl flex items-center space-x-2.5 cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Guided Tour</span>
                </button>
              )}

              <button
                onClick={() => onNavigateToView('loginPortal')}
                data-tour="hero-login-btn"
                className="bg-white hover:bg-teal-50 text-[#087F8C] px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center space-x-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <LogIn className="w-5 h-5 text-[#087F8C]" />
                <span>Access Login Panels</span>
              </button>

              <button
                onClick={() => onNavigateToView('commandCenter')}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all backdrop-blur-md flex items-center space-x-2 cursor-pointer"
              >
                <Compass className="w-5 h-5 text-teal-200" />
                <span>Command Center</span>
              </button>

              <button
                onClick={onOpenReportModal}
                className="bg-red-500/30 hover:bg-red-500/40 text-red-200 border border-red-400/40 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 text-red-300" />
                <span>Report Situation</span>
              </button>
            </div>
          </div>

          {/* Live Metrics Bar - Colorful & Vibrant */}
          <div className="mt-12 pt-8 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 backdrop-blur-md space-y-1 hover:bg-white/15 transition-all">
              <div className="text-teal-200 font-bold uppercase text-[10px] tracking-wider">Monitored Corridors</div>
              <div className="font-display text-3xl font-black text-white">{totalRoads} Corridors</div>
              <div className="text-emerald-300 font-bold text-xs flex items-center space-x-1.5 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{totalRoads - activeBlockages} Open | {activeBlockages} Blocked</span>
              </div>
            </div>

            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 backdrop-blur-md space-y-1 hover:bg-white/15 transition-all">
              <div className="text-teal-200 font-bold uppercase text-[10px] tracking-wider">Active Relief Freight</div>
              <div className="font-display text-3xl font-black text-white">{shipments.length} Relief Kits</div>
              <div className="text-amber-300 font-bold text-xs pt-1">Medicines & Disaster Supplies</div>
            </div>

            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 backdrop-blur-md space-y-1 hover:bg-white/15 transition-all">
              <div className="text-teal-200 font-bold uppercase text-[10px] tracking-wider">Fleet Telemetry</div>
              <div className="font-display text-3xl font-black text-white">{vehicles.length} Relief Trucks</div>
              <div className="text-teal-200 font-bold text-xs pt-1">Live Speed & GPS Signal</div>
            </div>

            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 backdrop-blur-md space-y-1 hover:bg-white/15 transition-all">
              <div className="text-teal-200 font-bold uppercase text-[10px] tracking-wider">Supply Warehouses</div>
              <div className="font-display text-3xl font-black text-white">{warehouses.length} Regional Depots</div>
              <div className="text-amber-300 font-bold text-xs pt-1">ICU Stock Vulnerability Safeguard</div>
            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE LANDING PAGE HAZARD SIMULATOR & MAP */}
        <section data-tour="hazard-simulator" className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 data-tour="hazard-simulator-title" className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
                  Interactive GIS Hazard Simulator & Live Map
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Test live mountain hazard events directly on this landing page. Watch GIS road condition vectors change color and observe AI alternate bypass recalculation.
              </p>
            </div>

            {/* Simulator Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSimulateLandslide}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatorState === 'landslide'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>1. Simulate NH-10 Landslide</span>
              </button>

              <button
                onClick={handleSimulateReroute}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatorState === 'rerouted'
                    ? 'bg-[#087F8C] text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>2. AI RouteGuard Reroute</span>
              </button>

              <button
                onClick={handleSimulateClearance}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatorState === 'normal'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>3. Clear Landslide Debris</span>
              </button>
            </div>
          </div>

          {/* Active Simulation Status Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  simulatorState === 'landslide'
                    ? 'bg-red-500 animate-ping'
                    : simulatorState === 'rerouted'
                    ? 'bg-teal-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {simulatorState === 'landslide' && 'NH-10 (Sevoke Section): BLOCKED BY 120m LANDSLIDE DEBRIS'}
                {simulatorState === 'rerouted' && 'AI ROUTEGUARD: Freight shp-9001 rerouted via NH-37 (Silchar Bypass)'}
                {simulatorState === 'normal' && 'ALL CORRIDORS CLEAR: Normal GIS traffic flow active'}
              </span>
            </div>

            <button
              onClick={() => onNavigateToView('liveMap')}
              className="text-xs font-extrabold text-[#087F8C] hover:underline flex items-center space-x-1 cursor-pointer shrink-0 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100"
            >
              <span>Full GIS Map Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Embedded Live GIS Map */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
            <LeafletMapView layers={demoLayers} height="480px" />
          </div>
        </section>

        {/* 4. GUIDED "HOW TO USE IT PROPERLY & ACCESS EVERYTHING" */}
        <section data-tour="role-guide-tabs" className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-800 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center space-x-2.5">
                <Zap className="w-7 h-7 text-amber-400" />
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                  How to Use PRAVAHA & Access Every Feature
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
                PRAVAHA provides 5 isolated user role portals. Select a role tab to view exact operational steps and launch the dedicated portal.
              </p>
            </div>

            {onOpenTour && (
              <button
                onClick={onOpenTour}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Interactive Tour</span>
              </button>
            )}
          </div>

          {/* Role Selector Tabs */}
          <div className="flex flex-wrap gap-3">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                onClick={() => setActiveGuideTab(acc.role)}
                className={`px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                  activeGuideTab === acc.role
                    ? 'bg-[#087F8C] text-white shadow-lg border border-teal-400/40'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {acc.role}
              </button>
            ))}
          </div>

          {/* Active Guide Workflow Panel */}
          {(() => {
            const currentAcc = demoAccounts.find((a) => a.role === activeGuideTab) || demoAccounts[0];
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
                {/* User Profile Card */}
                <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700 space-y-5">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={currentAcc.avatar}
                      alt={currentAcc.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-teal-400"
                    />
                    <div>
                      <h4 className="font-extrabold text-base text-white">{currentAcc.name}</h4>
                      <span className="bg-teal-400/20 text-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-md border border-teal-400/30">
                        {currentAcc.role}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-body">{currentAcc.description}</p>

                  <div className="space-y-2 pt-3 border-t border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Role Login Credentials:
                    </div>
                    <div className="font-mono text-xs text-slate-200 font-bold bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      Email: {currentAcc.email}
                      <br />
                      Password: {currentAcc.pass}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRoleLaunch(currentAcc.role)}
                    className="w-full py-3.5 bg-[#087F8C] hover:bg-teal-600 text-white font-black rounded-2xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                  >
                    <LogIn className="w-4.5 h-4.5 text-teal-200" />
                    <span>Launch {currentAcc.role} Workspace</span>
                  </button>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-bold text-base text-white flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Operational Workflow for {currentAcc.role}</span>
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-start space-x-3.5">
                      <span className="w-7 h-7 rounded-full bg-teal-400/20 text-teal-200 font-bold flex items-center justify-center shrink-0 border border-teal-400/30 text-xs">
                        1
                      </span>
                      <div className="pt-0.5">
                        <strong className="text-white text-sm">Authenticate into Role Panel:</strong> Click "Launch Workspace" or enter credentials on the User Login Panels.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-start space-x-3.5">
                      <span className="w-7 h-7 rounded-full bg-teal-400/20 text-teal-200 font-bold flex items-center justify-center shrink-0 border border-teal-400/30 text-xs">
                        2
                      </span>
                      <div className="pt-0.5">
                        <strong className="text-white text-sm">Inspect Marked GIS Road Conditions:</strong> View red blocked landslide corridors vs green open corridors on the interactive map.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-start space-x-3.5">
                      <span className="w-7 h-7 rounded-full bg-teal-400/20 text-teal-200 font-bold flex items-center justify-center shrink-0 border border-teal-400/30 text-xs">
                        3
                      </span>
                      <div className="pt-0.5">
                        <strong className="text-white text-sm">Execute Role Actions:</strong> Drivers trigger cab SOS; Field Officers submit photos offline; Operators reroute trucks; Admins reallocate hospital supplies.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-start space-x-3.5">
                      <span className="w-7 h-7 rounded-full bg-teal-400/20 text-teal-200 font-bold flex items-center justify-center shrink-0 border border-teal-400/30 text-xs">
                        4
                      </span>
                      <div className="pt-0.5">
                        <strong className="text-white text-sm">Review Graphical Analytics & AI Bot:</strong> Check Pie & Bar charts for cargo distribution or query the AI Bot for instant highway status!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* 5. CORE CAPABILITIES SHOWCASE GRID - Colorful pastel backgrounds */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-display text-3xl font-black text-slate-900 tracking-tight">
              Complete Feature Capabilities Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Built for high-hazard mountain corridors, steep terrain landslides, and zero-network operational resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-emerald-50/60 p-6 rounded-3xl border border-emerald-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-emerald-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Map className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">Marked GIS Road Conditions</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  Highways and mountain corridors are dynamically marked on the map surface with color-coded risk vectors (Green for Open, Amber for Restricted, Red for Blocked Landslides).
                </p>
              </div>
              <button
                onClick={() => onNavigateToView('liveMap')}
                className="text-xs font-extrabold text-emerald-800 hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>Launch Live GIS Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Feature 2 */}
            <div className="bg-red-50/60 p-6 rounded-3xl border border-red-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-red-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">RouteGuard AI Rerouting</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  When a landslide or flash flood blocks a primary highway (e.g. NH-10), the AI Route Engine instantly evaluates alternate bypasses and dispatches updated turn navigation.
                </p>
              </div>
              <button
                onClick={() => onNavigateToView('routeGuard')}
                className="text-xs font-extrabold text-red-800 hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>Test RouteGuard Engine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Feature 3 */}
            <div className="bg-amber-50/60 p-6 rounded-3xl border border-amber-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-amber-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">Driver Telematics & Cab SOS</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  Driver mobile terminal provides live speedometer telemetry, turn guidance, and an emergency SOS button that alerts dispatchers when stalled in hazardous corridors.
                </p>
              </div>
              <button
                onClick={() => handleRoleLaunch('Driver')}
                className="text-xs font-extrabold text-amber-900 hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>Launch Driver Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Feature 4 */}
            <div className="bg-teal-50/60 p-6 rounded-3xl border border-teal-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-[#087F8C]">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#087F8C] text-white flex items-center justify-center font-bold shadow-xs">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">SupplyGrid ICU Protection</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  Monitors regional hospital stock levels and warehouse inventory. Calculates days of supply remaining and flags cut-off depots facing supply exhaustion.
                </p>
              </div>
              <button
                onClick={() => onNavigateToView('supplyGrid')}
                className="text-xs font-extrabold text-[#087F8C] hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>View Supply Grid Depots</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Feature 5 */}
            <div className="bg-indigo-50/60 p-6 rounded-3xl border border-indigo-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-indigo-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">FieldLink Offline Collector</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  Field officers in zero-connectivity mountain zones submit reports offline. Queued data automatically synchronizes to central state upon network recovery.
                </p>
              </div>
              <button
                onClick={() => handleRoleLaunch('Field Officer')}
                className="text-xs font-extrabold text-indigo-900 hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>View Field Officer App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Feature 6 */}
            <div className="bg-purple-50/60 p-6 rounded-3xl border border-purple-200/70 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between border-l-4 border-l-purple-500">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900">Graphical Pie & Bar Charts</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-body">
                  Analytics view renders live interactive Pie Charts for commodity relief kits, Donut Charts for risk levels, and Bar Charts for estimated corridor delays.
                </p>
              </div>
              <button
                onClick={() => onNavigateToView('analytics')}
                className="text-xs font-extrabold text-purple-900 hover:underline flex items-center space-x-1 cursor-pointer pt-2"
              >
                <span>View Analytics Charts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 6. LOGIN PANELS ACCESS GRID */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="font-display text-3xl font-black text-slate-900">5 User Role Portals</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Complete separation of roles with dedicated operational tools and privileges.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoAccounts.map((acc) => (
              <div
                key={acc.role}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between hover:border-[#087F8C]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-50 text-[#087F8C] font-extrabold text-xs px-3 py-1 rounded-xl border border-teal-100">
                      {acc.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Isolated</span>
                  </div>
                  <h4 className="font-display font-black text-lg text-slate-900">{acc.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-body">{acc.description}</p>
                </div>

                <button
                  onClick={() => handleRoleLaunch(acc.role)}
                  className="w-full py-3.5 bg-slate-900 hover:bg-[#087F8C] text-white font-black rounded-2xl text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer mt-4 shadow-sm"
                >
                  <LogIn className="w-4.5 h-4.5 text-teal-300" />
                  <span>Log In as {acc.role}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
