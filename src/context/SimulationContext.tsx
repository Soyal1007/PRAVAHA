import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppState } from './AppStateContext';

export interface DemoStepInfo {
  stepNumber: number;
  title: string;
  description: string;
  actionSummary: string;
}

export const DEMO_STEPS: DemoStepInfo[] = [
  {
    stepNumber: 0,
    title: 'Initial State: Normal Transit',
    description: 'Essential Medicine Shipment PRV-2048 (Truck AS-01-AB-7821) is en route from Guwahati to Imphal via NH-2. Risk is Low, ETA is 11h 40m.',
    actionSummary: 'Baseline operational telemetry monitoring active.',
  },
  {
    stepNumber: 1,
    title: 'Step 1: Heavy Rainfall Increases',
    description: 'Northeast monsoon precipitation intensifies over the Senapati mountain pass. WeatherCore records 48mm/hr downpour.',
    actionSummary: 'WeatherCore & Risk Engine update corridor risk level to High.',
  },
  {
    stepNumber: 2,
    title: 'Step 2: Vehicle Slowdown & GPS Anomaly',
    description: 'Truck AS-01-AB-7821 speed drops from 42 km/h to 18 km/h due to localized waterlogging and mud deposits.',
    actionSummary: 'FleetPulse flags GPS Anomaly. ETA updated to 13h 15m.',
  },
  {
    stepNumber: 3,
    title: 'Step 3: Field Officer Submits Landslide Report',
    description: 'Field Officer Haokip Thang submits a FieldLink report confirming mudslide debris blocking the Senapati Pass.',
    actionSummary: 'FieldLink creates report rep-senapati-01.',
  },
  {
    stepNumber: 4,
    title: 'Step 4: Incident Verified & Road Blocked',
    description: 'Disaster Management Team verifies the field report. NH-2 Senapati section status set to BLOCKED.',
    actionSummary: 'NH-2 road status becomes BLOCKED in shared state.',
  },
  {
    stepNumber: 5,
    title: 'Step 5: Affected Shipments Identified',
    description: 'System scans active fleet and identifies PRV-2048 and PRV-9042 trapped behind the blockage zone.',
    actionSummary: 'Command Center & AlertNet flag 2 shipments as Critical Risk.',
  },
  {
    stepNumber: 6,
    title: 'Step 6: RouteGuard Recalculates Alternatives',
    description: 'RouteGuard engine runs deterministic scoring on alternate southern bypass via Silchar / Jiribam (NH-37).',
    actionSummary: 'RouteGuard scores alternate bypass (Distance: 495km, Risk: 28/100).',
  },
  {
    stepNumber: 7,
    title: 'Step 7: Alternative Route Recommended',
    description: 'System presents Recommended Safer Alternate bypassing the blocked mountain corridor.',
    actionSummary: 'Route option opt-2048-rec selected as prime recommendation.',
  },
  {
    stepNumber: 8,
    title: 'Step 8: Operator Reroutes Shipment',
    description: 'Logistics Operator clicks "REROUTE SHIPMENT" to dispatch updated navigation coordinates to vehicle AS-01-AB-7821.',
    actionSummary: 'Operator triggers reroute action on PRV-2048.',
  },
  {
    stepNumber: 9,
    title: 'Step 9: Vehicle Route & Live Map Update',
    description: 'Vehicle AS-01-AB-7821 accepts new route via Silchar corridor. Speed resumes at 48 km/h. Live Map updates polylines.',
    actionSummary: 'Live Map & FleetPulse update active polyline and vessel speed.',
  },
  {
    stepNumber: 10,
    title: 'Step 10: AlertNet Generates Operational Alerts',
    description: 'AlertNet broadcasts reroute confirmation to regional transport coordinators and emergency dispatchers.',
    actionSummary: 'Alert alt-002 updated to Resolved/Handled.',
  },
  {
    stepNumber: 11,
    title: 'Step 11: SupplyGrid Updates Commodity Risk',
    description: 'Imphal Regional Medical Depot stock risk reduces from Critical to Moderate as medicine delivery is restored.',
    actionSummary: 'SupplyGrid updates Imphal Depot days remaining from 1.8 to 3.5 days.',
  },
  {
    stepNumber: 12,
    title: 'Step 12: Analytics Records Disruption Metrics',
    description: 'Analytics engine logs disruption duration, reroute efficiency, and zero delivery loss.',
    actionSummary: 'Event logged in regional performance audit.',
  },
];

interface SimulationContextType {
  currentDemoStep: number;
  isDemoActive: boolean;
  isAutoPlay: boolean;
  startDemo: () => void;
  nextStep: () => void;
  prevStep: () => void;
  toggleAutoPlay: () => void;
  resetDemo: () => void;
  demoStepInfo: DemoStepInfo;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDemoStep, setCurrentDemoStep] = useState<number>(0);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);

  const {
    triggerHeavyRainfall,
    updateVehicleSpeed,
    submitFieldReport,
    verifyIncident,
    blockRoadSegment,
    rerouteShipment,
    resetAllState,
  } = useAppState();

  const demoStepInfo = DEMO_STEPS[currentDemoStep] || DEMO_STEPS[0];

  const executeStepLogic = (step: number) => {
    switch (step) {
      case 1:
        triggerHeavyRainfall('Senapati');
        break;
      case 2:
        updateVehicleSpeed('veh-2048', 18);
        break;
      case 3:
        submitFieldReport({
          incidentType: 'Landslide',
          location: { lat: 25.183, lng: 94.015, name: 'Senapati Pass, NH-2' },
          state: 'Manipur',
          district: 'Senapati',
          roadName: 'NH-2',
          severity: 'Critical',
          description: 'Severe mudslide triggered by heavy rainfall on NH-2 pass.',
          reporterName: 'Haokip Thang',
          reporterRole: 'Field Officer',
          affectedVehicleIds: ['veh-2048'],
          affectedShipmentIds: ['ship-2048'],
          verificationSource: 'Field Report',
          confidenceScore: 92,
        });
        break;
      case 4:
        verifyIncident('rep-senapati-01');
        blockRoadSegment('seg-nh2-senapati', 'Landslide & mud deposit blocking NH-2');
        break;
      case 8:
        rerouteShipment('ship-2048', 'opt-2048-rec');
        break;
      case 9:
        updateVehicleSpeed('veh-2048', 48);
        break;
      default:
        break;
    }
  };

  const startDemo = () => {
    setIsDemoActive(true);
    setCurrentDemoStep(1);
    executeStepLogic(1);
  };

  const nextStep = () => {
    if (currentDemoStep < DEMO_STEPS.length - 1) {
      const next = currentDemoStep + 1;
      setCurrentDemoStep(next);
      executeStepLogic(next);
    } else {
      setIsAutoPlay(false);
    }
  };

  const prevStep = () => {
    if (currentDemoStep > 0) {
      setCurrentDemoStep(prev => prev - 1);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlay(prev => !prev);
  };

  const resetDemo = () => {
    setIsAutoPlay(false);
    setIsDemoActive(false);
    setCurrentDemoStep(0);
    resetAllState();
  };

  // AutoPlay timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isAutoPlay && isDemoActive) {
      timer = setInterval(() => {
        setCurrentDemoStep(prev => {
          if (prev < DEMO_STEPS.length - 1) {
            const next = prev + 1;
            executeStepLogic(next);
            return next;
          } else {
            setIsAutoPlay(false);
            return prev;
          }
        });
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isAutoPlay, isDemoActive]);

  return (
    <SimulationContext.Provider
      value={{
        currentDemoStep,
        isDemoActive,
        isAutoPlay,
        startDemo,
        nextStep,
        prevStep,
        toggleAutoPlay,
        resetDemo,
        demoStepInfo,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
