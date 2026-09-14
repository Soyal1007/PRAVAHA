export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  keyPoints: string[];
  requiredView?: string;
  actionType?: 'navigate' | 'report' | 'aiChat' | 'sos' | 'sync';
  actionLabel?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GuidedTourConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'role' | 'area' | 'master';
  targetRole?: string;
  targetView?: string;
  steps: TourStep[];
}

// 1. SPECIFIC USER ROLE TOURS
export const ROLE_TOURS: Record<string, GuidedTourConfig> = {
  Driver: {
    id: 'role-driver',
    title: 'Relief Driver Cab Guided Tour',
    subtitle: 'Cab Navigation, Speed Telematics, & SOS Beacon',
    description:
      'Learn how relief truck drivers receive turn guidance, monitor telemetry speed, and trigger instant SOS alerts when trapped in landslide zones.',
    category: 'role',
    targetRole: 'Driver',
    targetView: 'driverDashboard',
    steps: [
      {
        id: 'driver-overview',
        targetSelector: '[data-tour="driver-cab-header"]',
        title: '1. Driver Mobile Terminal Header',
        subtitle: 'Cab Status & Vehicle Assignment',
        description:
          'Surfaces your assigned vehicle (e.g. TRK-401 Heavy Relief Truck), active cargo load (Medicines/Food), and live GPS connectivity signal.',
        keyPoints: [
          'Vehicle Identification & Freight Cargo Weight',
          'Assigned Route: Sevoke to Gangtok Corridor',
          'Live Signal Indicator & GPS Fix Quality',
        ],
        requiredView: 'driverDashboard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'driver-telematics',
        targetSelector: '[data-tour="driver-speedometer"]',
        title: '2. Speed & Hazard Telematics',
        subtitle: 'Real-Time Speedometer & Safety Gauge',
        description:
          'Displays current speed (km/h) against mountain corridor safe speed limits. Automatically warns drivers when entering landslide hazard sectors.',
        keyPoints: [
          'Live Digital Speedometer (0-80 km/h Range)',
          'High-Gradient Altitude & Slope Angle Telemetry',
          'Corridor Speed Limit Compliance Monitor',
        ],
        requiredView: 'driverDashboard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'driver-[#087F8C]',
        targetSelector: '[data-tour="driver-navigation-card"]',
        title: '3. Turn-by-Turn Reroute Guidance',
        subtitle: 'Dynamic AI Alternate Path Instructions',
        description:
          'When RouteGuard AI detects a road blockage ahead, updated turn directions push directly to your screen with estimated time of arrival (ETA).',
        keyPoints: [
          'Next Waypoint Distance & Elevation Change',
          'Automated Voice / Display Navigation Prompts',
          'Instant Bypass Approval when Primary Highway is Blocked',
        ],
        requiredView: 'driverDashboard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'driver-sos',
        targetSelector: '[data-tour="driver-sos-btn"]',
        title: '4. Driver Emergency SOS Button',
        subtitle: 'One-Tap Distress Signal',
        description:
          'If your truck breaks down or is caught near active rockfalls, press SOS to send instant GPS coordinates to the Disaster HQ and Operator desk.',
        keyPoints: [
          'Sends Emergency Coordinates to SDMA & Logistics Operators',
          'Works Offline via Satellite / Mesh Sync',
          'Triggers Priority Towing & Rescue Response',
        ],
        actionType: 'sos',
        actionLabel: 'Test SOS Alarm Beacon',
        requiredView: 'driverDashboard',
        tooltipPosition: 'top',
      },
    ],
  },

  'Field Officer': {
    id: 'role-officer',
    title: 'Field Officer Guided Tour',
    subtitle: 'Ground Inspections & Offline Hazard Reporting',
    description:
      'Learn how disaster inspection officers capture landslide damage, record road width reductions, and sync findings when returning online.',
    category: 'role',
    targetRole: 'Field Officer',
    targetView: 'fieldLink',
    steps: [
      {
        id: 'officer-collector',
        targetSelector: '[data-tour="field-collector-form"]',
        title: '1. Incident Observation Form',
        subtitle: 'Geotagged Damage Assessment',
        description:
          'Record highway blockages, landslide volume, road washouts, and upload photo evidence directly from the field site.',
        keyPoints: [
          'Corridor Selection (NH-10, NH-2, NH-37)',
          'Severity Classification (Minor, Moderate, Critical Blockage)',
          'Geotagged GPS Latitude & Longitude Tagging',
        ],
        requiredView: 'fieldLink',
        tooltipPosition: 'bottom',
      },
      {
        id: 'officer-offline',
        targetSelector: '[data-tour="offline-sync-queue"]',
        title: '2. Offline Storage Queue',
        subtitle: 'IndexedDB Zero-Connectivity Cache',
        description:
          'When working in remote mountain valleys without cell signal, reports save safely in local browser storage without data loss.',
        keyPoints: [
          'Zero-Network Local Storage Guard',
          'Automatic Pending Reports Counter',
          'Zero Data Loss in Mountain Dead-Zones',
        ],
        requiredView: 'fieldLink',
        tooltipPosition: 'bottom',
      },
      {
        id: 'officer-sync-action',
        targetSelector: '[data-tour="sync-now-btn"]',
        title: '3. Sync Local Data to HQ',
        subtitle: 'One-Click Central Synchronization',
        description:
          'Upon re-entering mobile signal coverage, click "Sync Now" to broadcast all collected field incidents to the central GIS engine.',
        keyPoints: [
          'Auto-Sync upon network reconnection',
          'Cryptographic Data Integrity Check',
          'Instantly updates live map road colors for all users',
        ],
        actionType: 'sync',
        actionLabel: 'Trigger Data Synchronization',
        requiredView: 'fieldLink',
        tooltipPosition: 'top',
      },
    ],
  },

  'Logistics Administrator': {
    id: 'role-admin',
    title: 'Logistics Admin Command HQ Tour',
    subtitle: 'Master Supply Chain & Fleet Control',
    description:
      'Comprehensive guide for Logistics Admins overseeing regional warehouse inventories, truck dispatching, and corridor safety indices.',
    category: 'role',
    targetRole: 'Logistics Administrator',
    targetView: 'commandCenter',
    steps: [
      {
        id: 'admin-kpis',
        targetSelector: '[data-tour="command-kpis"]',
        title: '1. Master Operational KPIs',
        subtitle: 'Real-Time Strategic Health Cards',
        description:
          'Monitor overall active fleet percentage, open highway corridors, emergency dispatch requests, and regional supply days remaining.',
        keyPoints: [
          'Active Fleet Utilization Metric',
          'Corridor Health & Landslide Blockage Ratio',
          'Disaster Relief Kit Delivery Progress',
        ],
        requiredView: 'commandCenter',
        tooltipPosition: 'bottom',
      },
      {
        id: 'admin-fleet-table',
        targetSelector: '[data-tour="fleet-table"]',
        title: '2. Fleet Dispatch & Rerouting Table',
        subtitle: 'Multi-Vehicle Control Desk',
        description:
          'View every active truck, driver assignment, speed telemetry, cargo contents, and trigger instant manual or AI reroutes.',
        keyPoints: [
          'Click any truck row to view detailed driver telemetry',
          'Reallocate shipments between warehouses with one click',
          'Override AI routing decisions manually if necessary',
        ],
        requiredView: 'commandCenter',
        tooltipPosition: 'bottom',
      },
      {
        id: 'admin-hazard-feed',
        targetSelector: '[data-tour="active-alerts-feed"]',
        title: '3. Real-Time Hazard Alert Feed',
        subtitle: 'Live Incident Notifications',
        description:
          'Streams live field officer uploads, weather warnings, and driver SOS beacons in chronological order for immediate dispatch action.',
        keyPoints: [
          'Severity color badges (Critical, Warning, Info)',
          'Acknowledge alerts to notify regional response teams',
          'Filter by corridor or alert category',
        ],
        requiredView: 'commandCenter',
        tooltipPosition: 'top',
      },
    ],
  },

  'Logistics Operator': {
    id: 'role-operator',
    title: 'Logistics Operator Desk Guided Tour',
    subtitle: 'Dispatcher Console & Reroute Engine',
    description:
      'Guide for dispatch operators handling real-time convoy communications, highway hazard mitigation, and route optimization.',
    category: 'role',
    targetRole: 'Logistics Operator',
    targetView: 'fleetPulse',
    steps: [
      {
        id: 'operator-fleet',
        targetSelector: '[data-tour="fleet-telemetry-chart"]',
        title: '1. Fleet Speed & Telemetry Graphs',
        subtitle: 'Convoy Speedometer History',
        description:
          'Tracks real-time convoy velocity, detecting vehicle stalls or unexpected slowdowns caused by mudslides or narrow mountain bridges.',
        keyPoints: [
          'Interactive SVG Telemetry Speed Charts',
          'Stalled Vehicle Detection Alarm',
          'Historical Average Corridor Speed Comparison',
        ],
        requiredView: 'fleetPulse',
        tooltipPosition: 'bottom',
      },
      {
        id: 'operator-reroute',
        targetSelector: '[data-tour="reroute-action-card"]',
        title: '2. RouteGuard Reroute Dispatch',
        subtitle: 'Corridor Hazard Bypass',
        description:
          'Simulate blockages or accept RouteGuard AI bypass suggestions to push turn directions directly to driver cab screens.',
        keyPoints: [
          'Dynamic distance & travel time trade-off analysis',
          'Instant push notification to driver cab terminal',
          'Automated ETA update to destination relief depots',
        ],
        requiredView: 'fleetPulse',
        tooltipPosition: 'bottom',
      },
    ],
  },

  'Authority Viewer': {
    id: 'role-authority',
    title: 'Disaster Authority (SDMA) HQ Tour',
    subtitle: 'Inter-Agency Emergency Oversight',
    description:
      'Guided walkthrough for State Disaster Management Authority (SDMA) leaders monitoring regional safety indexes and hospital ICU reserves.',
    category: 'role',
    targetRole: 'Authority Viewer',
    targetView: 'authorityDashboard',
    steps: [
      {
        id: 'authority-hq',
        targetSelector: '[data-tour="authority-regional-kpis"]',
        title: '1. Regional Disaster Readiness Index',
        subtitle: 'Statewide Risk & Safety Index',
        description:
          'Provides high-level disaster preparedness scores across Sikkim, Assam, Meghalaya, and Arunachal Pradesh corridors.',
        keyPoints: [
          'Composite Risk Score (0-100 scale)',
          'Active Emergency Declarations Status',
          'Inter-Agency Army & NDRF Coordination Feed',
        ],
        requiredView: 'authorityDashboard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'authority-icu',
        targetSelector: '[data-tour="authority-icu-grid"]',
        title: '2. Hospital Medical Reserve & Bed Monitor',
        subtitle: 'ICU Beds & Oxygen Stock Safeguard',
        description:
          'Track critical medical supplies, blood bank reserves, and ICU bed availability across regional medical centers.',
        keyPoints: [
          'Hospital Stock Exhaustion Warnings',
          'Oxygen Cylinder & Essential Medicine Supply Depletion Timer',
          'Automated Priority Freight Dispatch Trigger',
        ],
        requiredView: 'authorityDashboard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'authority-broadcast',
        targetSelector: '[data-tour="authority-broadcast-btn"]',
        title: '3. Emergency Inter-Agency Broadcast',
        subtitle: 'Statewide Public & Convoy Alerts',
        description:
          'Issue official disaster notifications, highway closures, and public safety advisories across all PRAVAHA connected terminals.',
        keyPoints: [
          'Push Emergency SMS / App Notifications to Drivers & Officers',
          'Multilingual Broadcast Support',
          'Official SDMA Stamp & Audit Trail',
        ],
        requiredView: 'authorityDashboard',
        tooltipPosition: 'top',
      },
    ],
  },
};

// 2. SPECIFIC AREA / WORKSPACE TOURS
export const AREA_TOURS: Record<string, GuidedTourConfig> = {
  landingPage: {
    id: 'area-landingPage',
    title: 'PRAVAHA Main Landing Overview Tour',
    subtitle: 'Platform Architecture & Interactive Hazard Simulator',
    description:
      'Explore the main entry portal, interactive GIS hazard simulator, and role-based workspace switcher.',
    category: 'area',
    targetView: 'landingPage',
    steps: [
      {
        id: 'landing-hero',
        targetSelector: '[data-tour="hero-login-btn"]',
        title: '1. Role Login Panel Entry',
        subtitle: 'Isolated Role Portals',
        description:
          'Access specialized workspaces for Drivers, Field Officers, Admins, Operators, and Authorities.',
        keyPoints: [
          'Pre-configured demo login credentials',
          'Role-isolated privilege permissions',
        ],
        requiredView: 'landingPage',
        tooltipPosition: 'bottom',
      },
      {
        id: 'landing-sim',
        targetSelector: '[data-tour="hazard-simulator-title"]',
        title: '2. GIS Hazard Simulator',
        subtitle: 'Live NH-10 Landslide Test',
        description:
          'Simulate road blockages on NH-10 and observe Leaflet GIS map vectors change color and AI RouteGuard recalculate alternate paths.',
        keyPoints: [
          'Simulate NH-10 Landslide Debris',
          'Observe RouteGuard AI Alternate Path Rerouting',
          'Clear Landslide Debris & Restore Normal Traffic',
        ],
        requiredView: 'landingPage',
        tooltipPosition: 'bottom',
      },
      {
        id: 'landing-guides',
        targetSelector: '[data-tour="role-guide-tabs"]',
        title: '3. User Workflow Instructions',
        subtitle: 'Step-by-step Operational Guides',
        description:
          'Select role tabs to view detailed operational instructions for every platform user type.',
        keyPoints: ['Role credential reference', 'Operational workflow steps'],
        requiredView: 'landingPage',
        tooltipPosition: 'top',
      },
    ],
  },

  liveMap: {
    id: 'area-liveMap',
    title: 'Live GIS Map Workspace Tour',
    subtitle: 'Leaflet Vectors & Real-Time Highway Tracking',
    description:
      'Learn how to navigate Leaflet GIS maps, toggle map layers, inspect trucks, and analyze road blockages.',
    category: 'area',
    targetView: 'liveMap',
    steps: [
      {
        id: 'map-vectors',
        targetSelector: '.leaflet-container',
        title: '1. Color-Coded Highway Vectors',
        subtitle: 'Real-Time Road Conditions',
        description:
          'Highways are color-coded: Green = Open, Amber = Slowdown / Restricted, Red = Landslide Blockage.',
        keyPoints: [
          '🟢 Green: Free Flow Traffic',
          '🟡 Amber: Single Lane / High Hazard Caution',
          '🔴 Red: Fully Blocked Landslide Segment',
        ],
        requiredView: 'liveMap',
        tooltipPosition: 'bottom',
      },
      {
        id: 'map-inspect',
        targetSelector: '[data-tour="map-layer-toggle"]',
        title: '2. GIS Layer Controls',
        subtitle: 'Custom Map Overlays',
        description:
          'Toggle visibility of trucks, warehouses, hospitals, weather hazards, and route polylines.',
        keyPoints: [
          'Show / Hide Relief Fleet Markers',
          'Overlay IMD Weather Risk Heatmaps',
          'Filter Landslide Incidents & Blocked Corridors',
        ],
        requiredView: 'liveMap',
        tooltipPosition: 'bottom',
      },
    ],
  },

  commandCenter: {
    id: 'area-commandCenter',
    title: 'Command Center Workspace Tour',
    subtitle: 'Master Disaster Operations Control Desk',
    description:
      'Overview of the centralized command dashboard for logistics dispatchers and system admins.',
    category: 'area',
    targetView: 'commandCenter',
    steps: [
      {
        id: 'cmd-kpis',
        targetSelector: '[data-tour="command-kpis"]',
        title: '1. Master Operational Indicators',
        subtitle: 'System-wide Health Summary',
        description:
          'Surfaces active relief convoys, blocked corridors, and inventory health across all regional depots.',
        keyPoints: [
          'Live convoy count & delivery progress',
          'Corridor obstruction breakdown',
        ],
        requiredView: 'commandCenter',
        tooltipPosition: 'bottom',
      },
      {
        id: 'cmd-table',
        targetSelector: '[data-tour="fleet-table"]',
        title: '2. Fleet Dispatch & Reroute Table',
        subtitle: 'Interactive Convoy Management',
        description:
          'Select any truck row to view detailed driver telemetry, inspect freight manifests, or execute manual reroutes.',
        keyPoints: [
          'Filter by status (Moving, Stalled, Rerouted)',
          'Instant driver contact & dispatch override',
        ],
        requiredView: 'commandCenter',
        tooltipPosition: 'top',
      },
    ],
  },

  routeGuard: {
    id: 'area-routeGuard',
    title: 'RouteGuard AI Engine Tour',
    subtitle: 'Deterministic Explanatory Rerouting Engine',
    description:
      'Deep dive into RouteGuard AI: evaluating landslide risk, calculating alternate bypasses, and comparing travel times.',
    category: 'area',
    targetView: 'routeGuard',
    steps: [
      {
        id: 'rg-sim',
        targetSelector: '[data-tour="rg-simulator-panel"]',
        title: '1. Route Risk & Obstruction Evaluation',
        subtitle: 'Multi-Factor Corridor Scoring',
        description:
          'Calculates risk score (0-100) based on rainfall intensity, slope stability, and road width restrictions.',
        keyPoints: [
          'Simulate road blockages on primary corridors',
          'Compare distance (km) vs risk level vs travel time',
        ],
        requiredView: 'routeGuard',
        tooltipPosition: 'bottom',
      },
      {
        id: 'rg-options',
        targetSelector: '[data-tour="rg-options-list"]',
        title: '2. Alternate Bypass Comparison',
        subtitle: 'Ranked Alternate Bypasses',
        description:
          'Presents alternate routes ranked by safety index, travel duration, and fuel consumption.',
        keyPoints: [
          'Option A: Fast but High Hazard Exposure',
          'Option B: Safe Low-Risk Mountain Bypass',
          'Dispatch chosen route directly to Driver Cab',
        ],
        requiredView: 'routeGuard',
        tooltipPosition: 'top',
      },
    ],
  },

  fleetPulse: {
    id: 'area-fleetPulse',
    title: 'FleetPulse Telematics Tour',
    subtitle: 'Speed Graphs & Anomaly Detection',
    description:
      'Monitor real-time truck velocity, detect stalled convoys, and review telemetry history.',
    category: 'area',
    targetView: 'fleetPulse',
    steps: [
      {
        id: 'fp-graph',
        targetSelector: '[data-tour="fleet-telemetry-chart"]',
        title: '1. Speed History Telemetry',
        subtitle: 'SVG Speedometer Trend',
        description:
          'Graphs speed over time to pinpoint traffic bottlenecks, steep ascents, or vehicle breakdowns.',
        keyPoints: [
          'Speed vs Time Line Graph',
          'GPS Signal Loss Detection',
          'Stalled Vehicle Alarm Alert',
        ],
        requiredView: 'fleetPulse',
        tooltipPosition: 'bottom',
      },
    ],
  },

  supplyGrid: {
    id: 'area-supplyGrid',
    title: 'SupplyGrid Inventory & ICU Tour',
    subtitle: 'Depot Stock & Hospital Safeguards',
    description:
      'Track essential relief kits, medicine stock levels, and days of supply remaining for isolated regions.',
    category: 'area',
    targetView: 'supplyGrid',
    steps: [
      {
        id: 'sg-depots',
        targetSelector: '[data-tour="supply-depot-cards"]',
        title: '1. Warehouse Stock Levels',
        subtitle: 'Regional Relief Inventory',
        description:
          'Monitor stock days remaining for medicines, food rations, drinking water, and heavy equipment.',
        keyPoints: [
          'Depot Stock Status Badges (Sufficient, Critical, Depleted)',
          'Calculates Days of Supply Remaining',
        ],
        requiredView: 'supplyGrid',
        tooltipPosition: 'bottom',
      },
    ],
  },

  weatherCore: {
    id: 'area-weatherCore',
    title: 'WeatherCore Radar Tour',
    subtitle: 'IMD Meteorological Forecasts & Landslide Risk',
    description:
      'View live rainfall intensity, monsoon alerts, and cloudburst probability across mountain passes.',
    category: 'area',
    targetView: 'weatherCore',
    steps: [
      {
        id: 'wc-radar',
        targetSelector: '[data-tour="weather-radar-card"]',
        title: '1. Satellite & Rainfall Forecast',
        subtitle: 'Precipitation Risk Engine',
        description:
          'Surfaces 24-hour precipitation radar data for vulnerable mountain sections like Sevoke and Teesta Valley.',
        keyPoints: [
          'Precipitation mm/hr intensity index',
          'Landslide probability warning tags',
        ],
        requiredView: 'weatherCore',
        tooltipPosition: 'bottom',
      },
    ],
  },

  riskEngine: {
    id: 'area-riskEngine',
    title: 'RiskEngine Analytics Tour',
    subtitle: 'Corridor Safety Scoring & Hazard Modeling',
    description:
      'Examine predictive risk models combining geological fault lines, weather data, and traffic load.',
    category: 'area',
    targetView: 'riskEngine',
    steps: [
      {
        id: 're-matrix',
        targetSelector: '[data-tour="risk-matrix-card"]',
        title: '1. Multi-Vector Risk Matrix',
        subtitle: 'Corridor Safety Ratings',
        description:
          'Rates each national highway segment from 0 (Safe) to 100 (Extremely Hazardous).',
        keyPoints: ['Geological slope angle', 'Monsoon saturation coefficient'],
        requiredView: 'riskEngine',
        tooltipPosition: 'bottom',
      },
    ],
  },

  fieldLink: {
    id: 'area-fieldLink',
    title: 'FieldLink Offline Collector Tour',
    subtitle: 'Mobile Observation Entry & Sync',
    description:
      'Walkthrough of the Field Officer mobile interface for capturing landslide damage offline.',
    category: 'area',
    targetView: 'fieldLink',
    steps: [
      {
        id: 'fl-form',
        targetSelector: '[data-tour="field-collector-form"]',
        title: '1. Incident Capture Form',
        subtitle: 'Photo & Geotag Upload',
        description:
          'Log blockage location, obstacle type, and upload ground photos.',
        keyPoints: ['IndexedDB local caching', 'Geotag verification'],
        requiredView: 'fieldLink',
        tooltipPosition: 'bottom',
      },
    ],
  },

  alertNet: {
    id: 'area-alertNet',
    title: 'AlertNet Broadcaster Tour',
    subtitle: 'Emergency SOS & Broadcast Control',
    description:
      'Issue critical weather alerts, road closure notices, and emergency broadcasts across the network.',
    category: 'area',
    targetView: 'alertNet',
    steps: [
      {
        id: 'an-broadcast',
        targetSelector: '[data-tour="alert-broadcast-card"]',
        title: '1. Emergency Alert Broadcaster',
        subtitle: 'Targeted Notification Dispatch',
        description:
          'Select target audiences (Drivers, Officers, Public) and dispatch high-priority alerts.',
        keyPoints: ['Multilingual broadcast', 'SMS / Mobile Push Channels'],
        requiredView: 'alertNet',
        tooltipPosition: 'bottom',
      },
    ],
  },

  analytics: {
    id: 'area-analytics',
    title: 'Analytics & Graphical Charts Tour',
    subtitle: 'SVG Pie Charts, Donut Charts, & Delay Bar Charts',
    description:
      'Analyze commodity relief distribution with interactive SVG Pie Charts and corridor delay comparison bars.',
    category: 'area',
    targetView: 'analytics',
    steps: [
      {
        id: 'ana-charts',
        targetSelector: '[data-tour="analytics-pie-chart"]',
        title: '1. Commodity Distribution Pie Chart',
        subtitle: 'Relief Freight Breakdown',
        description:
          'Interactive SVG Pie Chart showing percentage share of medicines, food rations, drinking water, and shelter kits.',
        keyPoints: [
          'Medicine Kits (35%), Food Rations (30%), Water (20%), Equipment (15%)',
          'Hover over slices to highlight freight totals',
        ],
        requiredView: 'analytics',
        tooltipPosition: 'bottom',
      },
      {
        id: 'ana-donut',
        targetSelector: '[data-tour="analytics-donut-chart"]',
        title: '2. Cargo Risk Donut & Delay Bar Charts',
        subtitle: 'Corridor Bottleneck Analysis',
        description:
          'Compares average delay hours across NH-10, NH-2, and NH-37 mountain passes.',
        keyPoints: [
          'NH-10 Sevoke: +3.2 Hours Landslide Delay',
          'Export PDF summary report button',
        ],
        requiredView: 'analytics',
        tooltipPosition: 'top',
      },
    ],
  },

  loginPortal: {
    id: 'area-loginPortal',
    title: 'User Login Portals Tour',
    subtitle: 'Multi-Role Switching & Credentials',
    description:
      'Overview of how to switch between Driver, Field Officer, Admin, Operator, and Authority workspaces.',
    category: 'area',
    targetView: 'loginPortal',
    steps: [
      {
        id: 'lp-roles',
        targetSelector: '.grid',
        title: '1. Role Selection Grid',
        subtitle: 'Choose Pre-Configured Demo Accounts',
        description:
          'Click any role tab to auto-fill demo credentials and preview permissions.',
        keyPoints: ['Instant demo login', 'Role privilege description'],
        requiredView: 'loginPortal',
        tooltipPosition: 'bottom',
      },
    ],
  },
};

// 3. MASTER OVERVIEW TOUR
export const MASTER_TOUR: GuidedTourConfig = {
  id: 'master-platform',
  title: 'PRAVAHA Platform Master Guided Tour',
  subtitle: 'Complete Disaster Logistics & Geo-Hazard Infrastructure Walkthrough',
  description:
    'Comprehensive tour covering marked GIS maps, RouteGuard AI rerouting, driver cab telematics, offline field reporting, and SVG analytics.',
  category: 'master',
  steps: [
    {
      id: 'm-1',
      targetSelector: '[data-tour="search-bar"]',
      title: '1. Global Header Command Bar',
      subtitle: 'Universal Search & Incident Reporting',
      description:
        'Access global entity search (Ctrl+K), hazard reporting, AI assistant, and offline switcher.',
      keyPoints: [
        'Search vehicles, shipments, and road corridors',
        'Report road situations with offline auto-sync',
        'Toggle Online / Offline mountain network simulation',
      ],
      requiredView: 'landingPage',
      tooltipPosition: 'bottom',
    },
    {
      id: 'm-2',
      targetSelector: '[data-tour="hero-login-btn"]',
      title: '2. 5 Isolated User Role Portals',
      subtitle: 'Role-Based Privileges',
      description:
        'PRAVAHA provides isolated workspaces for Drivers, Field Officers, Admins, Operators, and Authorities.',
      keyPoints: [
        'Driver Cab: Telematics & SOS',
        'Field Officer: Offline photo capture',
        'Admin & Operator: Master dispatch & reroute desk',
      ],
      requiredView: 'landingPage',
      tooltipPosition: 'top',
    },
    {
      id: 'm-3',
      targetSelector: '[data-tour="hazard-simulator-title"]',
      title: '3. Interactive GIS Hazard Simulator',
      subtitle: 'Live NH-10 Landslide Test',
      description:
        'Simulate road blockages and watch Leaflet GIS map vectors update in real time.',
      keyPoints: [
        'Simulate Sevoke Landslide Debris',
        'RouteGuard AI alternate path recalculation',
      ],
      requiredView: 'landingPage',
      tooltipPosition: 'bottom',
    },
  ],
};

// Helper function to resolve tour for current context
export const getTourForContext = (
  viewId: string,
  roleName?: string
): GuidedTourConfig => {
  // If a role tour is requested and exists, prioritize role tour
  if (roleName && ROLE_TOURS[roleName]) {
    return ROLE_TOURS[roleName];
  }

  // Else if area tour exists for current view
  if (AREA_TOURS[viewId]) {
    return AREA_TOURS[viewId];
  }

  // Default to master tour
  return MASTER_TOUR;
};
