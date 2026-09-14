import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Vehicle,
  Shipment,
  RoadSegment,
  Incident,
  WeatherEvent,
  RiskEvent,
  Warehouse,
  Hospital,
  Alert,
  Notification,
  SystemEvent,
  FieldReport,
  RiskLevel,
} from '../types';
import {
  CURRENT_USER,
  INITIAL_VEHICLES,
  INITIAL_SHIPMENTS,
  INITIAL_ROADS,
  INITIAL_INCIDENTS,
  INITIAL_WEATHER,
  INITIAL_RISK_EVENTS,
  INITIAL_WAREHOUSES,
  INITIAL_HOSPITALS,
  INITIAL_ALERTS,
  INITIAL_NOTIFICATIONS,
  ROUTE_OPTIONS_MAP,
} from '../data/seedData';
import { offlineStorage } from '../services/offlineStorage';
import { evaluateRouteOption } from '../services/routeEngine';

interface AppStateContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  pendingSyncCount: number;
  vehicles: Vehicle[];
  shipments: Shipment[];
  roads: RoadSegment[];
  incidents: Incident[];
  weatherEvents: WeatherEvent[];
  riskEvents: RiskEvent[];
  warehouses: Warehouse[];
  hospitals: Hospital[];
  alerts: Alert[];
  notifications: Notification[];
  systemEvents: SystemEvent[];

  // Actions
  rerouteShipment: (shipmentId: string, newRouteOptionId: string) => void;
  submitFieldReport: (report: Omit<FieldReport, 'id' | 'timestamp' | 'status'>) => void;
  verifyIncident: (incidentId: string) => void;
  blockRoadSegment: (roadId: string, cause: string) => void;
  unblockRoadSegment: (roadId: string) => void;
  updateVehicleSpeed: (vehicleId: string, speedKmH: number) => void;
  triggerHeavyRainfall: (corridorName: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  notifyDrivers: (alertId: string) => void;
  notifyAuthority: (alertId: string) => void;
  syncOfflineQueue: () => void;
  resetAllState: () => void;
  selectedEntity: { type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse'; id: string } | null;
  setSelectedEntity: (entity: { type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse'; id: string } | null) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('Logistics Administrator');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [shipments, setShipments] = useState<Shipment[]>(INITIAL_SHIPMENTS);
  const [roads, setRoads] = useState<RoadSegment[]>(INITIAL_ROADS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>(INITIAL_WEATHER);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>(INITIAL_RISK_EVENTS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse'; id: string } | null>(null);

  // Sync offline storage count
  useEffect(() => {
    const pending = offlineStorage.getPendingReports().length + offlineStorage.getPendingGps().length;
    setPendingSyncCount(pending);
  }, []);

  const addSystemLog = (description: string, actor = CURRENT_USER.name) => {
    const newLog: SystemEvent = {
      id: `sys-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      eventType: 'State Mutation',
      description,
      actor,
      source: 'System Watchdog',
    };
    setSystemEvents(prev => [newLog, ...prev]);
  };

  const addNotification = (title: string, message: string, type: 'Critical' | 'Operations' | 'System' = 'Operations') => {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // State Propagation: Reroute Shipment
  const rerouteShipment = (shipmentId: string, newRouteOptionId: string) => {
    let targetShipment = shipments.find(s => s.id === shipmentId);
    if (!targetShipment) return;

    const availableOptions = ROUTE_OPTIONS_MAP[shipmentId] || [];
    const chosenOption = availableOptions.find(o => o.id === newRouteOptionId) || availableOptions[0];

    // Calculate new ETA
    const departure = new Date();
    const durationHours = chosenOption ? chosenOption.estimatedDurationHours : 11.67;
    const newEtaDate = new Date(departure.getTime() + durationHours * 3600 * 1000);
    const newEtaStr = newEtaDate.toISOString();

    setShipments(prev =>
      prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            activeRouteId: newRouteOptionId,
            status: 'Rerouted',
            riskScore: chosenOption ? chosenOption.riskScore : 25,
            riskLevel: chosenOption ? chosenOption.riskLevel : 'Low',
            currentEta: newEtaStr,
            notes: `Rerouted onto ${chosenOption ? chosenOption.name : 'Safer Alternate Route'} by operator.`,
          };
        }
        return s;
      })
    );

    // Update assigned vehicle
    setVehicles(prev =>
      prev.map(v => {
        if (v.assignedShipmentId === shipmentId) {
          return {
            ...v,
            assignedRouteId: newRouteOptionId,
            status: 'In Transit',
            riskLevel: chosenOption ? chosenOption.riskLevel : 'Low',
            speedKmH: 48,
          };
        }
        return v;
      })
    );

    // Update SupplyGrid warehouse risk
    setWarehouses(prev =>
      prev.map(w => {
        if (w.id === 'wh-imphal') {
          return {
            ...w,
            incomingShipmentsCount: 1,
            riskLevel: 'Moderate', // improved from Critical
            daysRemaining: 3.5,
          };
        }
        return w;
      })
    );

    addNotification('Shipment Rerouted', `Shipment ${targetShipment.trackingCode} assigned to ${chosenOption ? chosenOption.name : 'Alternate Route'}.`, 'Operations');
    addSystemLog(`Rerouted shipment ${targetShipment.trackingCode} to ${chosenOption ? chosenOption.name : newRouteOptionId}`);
  };

  // Submit Field Report (Offline capable)
  const submitFieldReport = (reportData: Omit<FieldReport, 'id' | 'timestamp' | 'status'>) => {
    const newReport: FieldReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: isOffline ? 'Pending Sync' : 'Submitted',
    };

    if (isOffline) {
      offlineStorage.savePendingReport(newReport);
      setPendingSyncCount(prev => prev + 1);
      addNotification('Report Queued Offline', `Field report queued locally. Will auto-sync when connection returns.`, 'System');
      return;
    }

    // Online submission: propagate to incidents, alerts, live map
    setIncidents(prev => [newReport, ...prev]);
    addNotification('Field Incident Reported', `New ${newReport.incidentType} reported on ${newReport.roadName} by ${newReport.reporterName}.`, 'Operations');
    addSystemLog(`Submitted field report ${newReport.id} on ${newReport.roadName}`);
  };

  // Verify Incident -> State Propagation to block road & trigger alerts
  const verifyIncident = (incidentId: string) => {
    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) return;

    setIncidents(prev =>
      prev.map(i => (i.id === incidentId ? { ...i, status: 'Verified' } : i))
    );

    // Block relevant road
    const targetRoad = roads.find(r => r.roadName.includes(targetInc.roadName) || targetInc.roadName.includes(r.roadName));
    if (targetRoad) {
      blockRoadSegment(targetRoad.id, targetInc.description);
    } else {
      addNotification('Incident Verified', `Incident on ${targetInc.roadName} marked as Verified.`, 'Critical');
    }
  };

  // Block Road Segment -> Updates Command Center, Map, Risk, Vehicles, Shipments, RouteGuard & Alerts
  const blockRoadSegment = (roadId: string, cause: string) => {
    const road = roads.find(r => r.id === roadId);
    const roadTitle = road ? road.roadName : 'Primary Highway';

    setRoads(prev =>
      prev.map(r => (r.id === roadId ? { ...r, status: 'Blocked', riskScore: 95, riskLevel: 'Critical', causeOfDisruption: cause } : r))
    );

    // Update risk event
    setRiskEvents(prev =>
      prev.map(re => (re.corridorName.includes(roadTitle) || roadTitle.includes(re.corridorName) ? { ...re, overallScore: 92, riskLevel: 'Critical' } : re))
    );

    // Find affected vehicles & shipments
    const affectedVehs = vehicles.filter(v => v.assignedShipmentId === 'ship-2048' || v.assignedShipmentId === 'ship-9042');
    setVehicles(prev =>
      prev.map(v => (affectedVehs.some(av => av.id === v.id) ? { ...v, status: 'At Risk', riskLevel: 'Critical', speedKmH: 12 } : v))
    );

    setShipments(prev =>
      prev.map(s => (s.id === 'ship-2048' || s.id === 'ship-9042' ? { ...s, status: 'Critical Risk', riskScore: 88, riskLevel: 'Critical' } : s))
    );

    // Create Critical Alert in AlertNet
    const newAlert: Alert = {
      id: `alt-${Date.now()}`,
      title: `CRITICAL: ${roadTitle} BLOCKED`,
      severity: 'Critical',
      category: 'Disruption',
      corridorOrLocation: roadTitle,
      description: cause || 'Severe landslide debris blocking all lanes.',
      affectedShipmentsCount: affectedVehs.length,
      affectedVehiclesCount: affectedVehs.length,
      estimatedDelayMinutes: 180,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      actions: ['Reroute Shipments', 'Notify Drivers', 'Notify Authority', 'Acknowledge'],
    };
    setAlerts(prev => [newAlert, ...prev]);

    // SupplyGrid update
    setWarehouses(prev =>
      prev.map(w => (w.id === 'wh-imphal' ? { ...w, riskLevel: 'Critical', daysRemaining: 1.8 } : w))
    );

    addNotification('Road Blockage Confirmed', `${roadTitle} is now BLOCKED. Affected shipments flagged for rerouting.`, 'Critical');
    addSystemLog(`Blocked road segment ${roadTitle}: ${cause}`);
  };

  const unblockRoadSegment = (roadId: string) => {
    setRoads(prev =>
      prev.map(r => (r.id === roadId ? { ...r, status: 'Open', riskScore: 20, riskLevel: 'Low', causeOfDisruption: undefined } : r))
    );
    addNotification('Road Restored', `Road segment has been cleared and opened.`, 'Operations');
  };

  const updateVehicleSpeed = (vehicleId: string, speedKmH: number) => {
    setVehicles(prev =>
      prev.map(v => {
        if (v.id === vehicleId) {
          const isAnomaly = speedKmH < 20 && v.status === 'In Transit';
          return {
            ...v,
            speedKmH,
            gpsStatus: isAnomaly ? 'Anomaly' : 'Online',
            status: speedKmH === 0 ? 'Idle' : isAnomaly ? 'At Risk' : 'In Transit',
            speedHistory: [...v.speedHistory, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), speed: speedKmH }],
          };
        }
        return v;
      })
    );

    if (speedKmH < 20) {
      addNotification('GPS Anomaly Detected', `Vehicle speed dropped to ${speedKmH} km/h on active corridor.`, 'Operations');
    }
  };

  const triggerHeavyRainfall = (corridorName: string) => {
    setWeatherEvents(prev =>
      prev.map(w => (w.locationName.includes(corridorName) ? { ...w, condition: 'Torrential Downpour', rainfallMmHr: 82, floodRisk: 'Extreme' } : w))
    );
    setRiskEvents(prev =>
      prev.map(r => (r.corridorName.includes(corridorName) ? { ...r, overallScore: 78, riskLevel: 'High' } : r))
    );
    addNotification('Weather Warning', `Torrential rain forecast triggered on ${corridorName}. Corridor risk elevated.`, 'Critical');
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    addNotification('Alert Acknowledged', `Alert acknowledged by operator.`, 'System');
  };

  const notifyDrivers = (alertId: string) => {
    addNotification('Driver Notification Sent', `SMS & In-cab alert dispatched to assigned drivers.`, 'Operations');
    addSystemLog(`Dispatched driver advisory for alert ${alertId}`);
  };

  const notifyAuthority = (alertId: string) => {
    addNotification('Authority Dispatched', `NDMA & District Magistrate emergency portal updated.`, 'Critical');
    addSystemLog(`Notified regional administration for alert ${alertId}`);
  };

  const syncOfflineQueue = () => {
    const pendingReports = offlineStorage.getPendingReports();
    if (pendingReports.length === 0) return;

    const syncedReports = pendingReports.map(r => ({ ...r, status: 'Submitted' as const }));
    setIncidents(prev => [...syncedReports, ...prev]);

    offlineStorage.clearPendingReports();
    offlineStorage.clearPendingGps();
    setPendingSyncCount(0);

    addNotification('Offline Sync Completed', `Successfully synchronized ${pendingReports.length} field reports to central state.`, 'Operations');
    addSystemLog(`Synced ${pendingReports.length} pending offline items.`);
  };

  const resetAllState = () => {
    setVehicles(INITIAL_VEHICLES);
    setShipments(INITIAL_SHIPMENTS);
    setRoads(INITIAL_ROADS);
    setIncidents(INITIAL_INCIDENTS);
    setWeatherEvents(INITIAL_WEATHER);
    setRiskEvents(INITIAL_RISK_EVENTS);
    setWarehouses(INITIAL_WAREHOUSES);
    setHospitals(INITIAL_HOSPITALS);
    setAlerts(INITIAL_ALERTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setPendingSyncCount(0);
    setSelectedEntity(null);
    offlineStorage.clearPendingReports();
    offlineStorage.clearPendingGps();
    addNotification('System Reset', 'All entities returned to initial operational state.', 'System');
  };

  return (
    <AppStateContext.Provider
      value={{
        userRole,
        setUserRole,
        isOffline,
        setIsOffline,
        pendingSyncCount,
        vehicles,
        shipments,
        roads,
        incidents,
        weatherEvents,
        riskEvents,
        warehouses,
        hospitals,
        alerts,
        notifications,
        systemEvents,
        rerouteShipment,
        submitFieldReport,
        verifyIncident,
        blockRoadSegment,
        unblockRoadSegment,
        updateVehicleSpeed,
        triggerHeavyRainfall,
        acknowledgeAlert,
        notifyDrivers,
        notifyAuthority,
        syncOfflineQueue,
        resetAllState,
        selectedEntity,
        setSelectedEntity,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
