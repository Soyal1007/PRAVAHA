import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Radio,
  Share2,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Smartphone,
  Server,
  Activity,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { meshManager } from '../../services/mesh/MeshManager';
import { MeshMessage } from '../../services/mesh/meshTypes';

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: string) => void;
}

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const {
    setIsOffline,
    blockRoadSegment,
    rerouteShipment,
    verifyIncident,
    submitFieldReport,
    addNotification,
  } = useAppState();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [demoMessage, setDemoMessage] = useState<MeshMessage | null>(null);

  const STEPS = [
    {
      title: 'Step 1: Disable Internet (Phone A Offline)',
      actor: 'PHONE A (Field Officer)',
      nodeId: 'PRV-NODE-A8F31',
      desc: 'Cellular network & Wi-Fi lost in mountain valley. Phone A enters PRAVAHA OFFLINE MODE.',
      status: 'OFFLINE MODE ACTIVE',
    },
    {
      title: 'Step 2: Field Report Creation',
      actor: 'PHONE A (Field Officer)',
      nodeId: 'PRV-NODE-A8F31',
      desc: 'Field Officer reports LANDSLIDE on NH-10 (Siliguri-Gangtok Highway), Severity: CRITICAL.',
      status: 'INCIDENT CREATED LOCALLY',
    },
    {
      title: 'Step 3: Local Persistence & Storage',
      actor: 'PHONE A (Local Storage)',
      nodeId: 'PRV-NODE-A8F31',
      desc: 'Report saved into local IndexedDB / SQLite store-and-forward queue with cryptographic signature.',
      status: 'STORED IN OFFLINE QUEUE',
    },
    {
      title: 'Step 4: BLE Peer Discovery',
      actor: 'PHONE A ↔ PHONE B',
      nodeId: 'PRV-NODE-B82A',
      desc: 'Phone A advertises BLE service UUID: 0000PRV0. Discovers nearby convoy relay node Phone B (PRV-NODE-B82A).',
      status: 'PEER RELAY DISCOVERED',
    },
    {
      title: 'Step 5: Peer Transfer & Acknowledgement',
      actor: 'PHONE A → PHONE B',
      nodeId: 'PRV-NODE-B82A',
      desc: 'Encrypted packet transferred over BLE GATT connection. Phone B returns ACK-PRV-MSG-8F3A91.',
      status: 'TRANSFERRED & ACKNOWLEDGED',
    },
    {
      title: 'Step 6: Multi-Hop Mesh Relay',
      actor: 'PHONE B → PHONE C',
      nodeId: 'PRV-NODE-C17F',
      desc: 'Phone B relays report with hopCount=1, Decremented TTL=4 to Phone C (PRV-NODE-C17F Gateway).',
      status: 'MULTI-HOP RELAY COMPLETE',
    },
    {
      title: 'Step 7: Gateway Cloud Synchronization',
      actor: 'PHONE C (Internet Gateway)',
      nodeId: 'PRV-NODE-C17F',
      desc: 'Phone C detects active satellite link & uploads pending incident payload to central PRAVAHA Cloud API.',
      status: 'CLOUD SYNC COMPLETED',
    },
    {
      title: 'Step 8: Automated System Action',
      actor: 'PRAVAHA COMMAND CENTER & ROUTEGUARD',
      nodeId: 'CLOUD ENGINE',
      desc: 'Command Center updates live map with [MESH] tag, Risk Engine scores corridor 95/100, AlertNet triggers Critical Alert, and RouteGuard automatically reroutes affected shipments onto alternate corridor.',
      status: 'FULL SYSTEM REROUTE ACTIONED',
    },
  ];

  // Handle step action execution
  const executeStepAction = (stepIdx: number) => {
    switch (stepIdx) {
      case 0: // Step 1: Internet OFF
        setIsOffline(true);
        meshManager.syncManager.setOnlineStatus(false);
        break;

      case 1: // Step 2: Create report
        {
          const msg = meshManager.createIncidentReport({
            incidentType: 'Landslide',
            severity: 'Critical',
            road: 'NH-10 (Siliguri - Gangtok)',
            latitude: 27.33,
            longitude: 88.61,
            description: 'Major landslide blocking road. Heavy debris on both lanes.',
            reporterName: 'Field Officer Inspector Sharma (Phone A)',
          });
          setDemoMessage(msg);
        }
        break;

      case 3: // Step 4: Discover peer
        meshManager.peerManager.updatePeer('PRV-NODE-B82A', { connectionState: 'CONNECTED', signalStrength: 'Strong' });
        break;

      case 4: // Step 5: Transfer to B
        if (demoMessage) {
          meshManager.processIncomingMessage({
            ...demoMessage,
            senderNodeId: 'PRV-NODE-A8F31',
            hopCount: 1,
            ttl: 4,
          });
        }
        break;

      case 5: // Step 6: Relay to C
        if (demoMessage) {
          meshManager.processIncomingMessage({
            ...demoMessage,
            senderNodeId: 'PRV-NODE-B82A',
            hopCount: 2,
            ttl: 3,
          });
        }
        break;

      case 6: // Step 7: Sync via Gateway
        setIsOffline(false);
        meshManager.syncManager.setOnlineStatus(true);
        meshManager.attemptCloudSync();
        break;

      case 7: // Step 8: Complete System Reroute
        {
          // Submit field report into app state
          submitFieldReport({
            incidentType: 'Landslide',
            location: { lat: 27.33, lng: 88.61, name: 'NH-10 Km 42 (Sevoke)' },
            state: 'Sikkim / West Bengal',
            district: 'Darjeeling / Kalimpong',
            roadName: 'NH-10 (Siliguri - Gangtok)',
            severity: 'Critical',
            description: 'Major landslide blocking road received via PRAVAHA Offline Mesh',
            reporterName: 'PRV-NODE-A8F31 (Offline Mesh)',
            reporterRole: 'Field Officer',
            affectedVehicleIds: ['veh-101'],
            affectedShipmentIds: ['ship-2048'],
            verificationSource: 'Field Report',
            confidenceScore: 98,
          });

          // Block road segment
          blockRoadSegment('road-nh10', 'Major landslide debris received via PRAVAHA Offline Mesh');

          // Reroute shipment
          rerouteShipment('ship-2048', 'opt-2048-alt1');

          addNotification(
            'DEMO COMPLETE: Mesh Synchronization',
            'Offline Field Report → Bluetooth Mesh Relay → Cloud Sync → RouteGuard Reroute executed successfully!',
            'Critical'
          );
        }
        break;

      default:
        break;
    }
  };

  // Timer loop for auto playback
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          executeStepAction(next);
          return next;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, demoMessage]);

  const handleStepClick = (idx: number) => {
    setCurrentStep(idx);
    executeStepAction(idx);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setDemoMessage(null);
    executeStepAction(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn font-body">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
              <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-black text-lg text-white tracking-tight">
                  PRAVAHA Offline Resilience Demo
                </h3>
                <span className="bg-teal-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Judge Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                End-to-End Multi-Hop Store-and-Forward Mesh Demonstration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onNavigateToView) onNavigateToView('routeGuard');
                onClose();
              }}
              className="hidden sm:flex items-center space-x-1 text-xs font-bold text-teal-400 hover:text-teal-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer"
            >
              <span>View RouteGuard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Network Hop Visualization Diagram */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white relative overflow-hidden">
            <div className="text-xs font-black uppercase tracking-wider text-teal-400 mb-4 flex items-center justify-between">
              <span>Network Topology & Multi-Hop Hop State</span>
              <span className="text-[10px] font-mono text-slate-400">
                Step {currentStep + 1} of {STEPS.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
              {/* Phone A */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep >= 0 && currentStep <= 4
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold">Node A</span>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="font-bold text-xs text-white">PHONE A</div>
                <div className="text-[10px] text-slate-400 font-mono">PRV-NODE-A8F31</div>
                <div className="mt-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded font-bold text-amber-400">
                  {currentStep >= 1 ? 'Report Stored' : 'Offline Mode'}
                </div>
              </div>

              {/* Hop 1 -> Phone B */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep >= 3 && currentStep <= 5
                    ? 'bg-teal-950/60 border-teal-400 text-teal-200 ring-2 ring-teal-400/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold">Node B (Relay)</span>
                  <Radio className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="font-bold text-xs text-white">PHONE B</div>
                <div className="text-[10px] text-slate-400 font-mono">PRV-NODE-B82A</div>
                <div className="mt-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded font-bold text-teal-300">
                  {currentStep >= 4 ? 'Received & ACK' : 'BLE Relay Active'}
                </div>
              </div>

              {/* Hop 2 -> Phone C Gateway */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep >= 5 && currentStep <= 6
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold">Node C (Gateway)</span>
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="font-bold text-xs text-white">PHONE C</div>
                <div className="text-[10px] text-slate-400 font-mono">PRV-NODE-C17F</div>
                <div className="mt-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded font-bold text-emerald-400">
                  {currentStep >= 6 ? 'Cloud Gateway Sync' : 'Searching Link'}
                </div>
              </div>

              {/* PRAVAHA Cloud & RouteGuard */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep >= 7
                    ? 'bg-sky-950/60 border-sky-400 text-sky-200 ring-2 ring-sky-400/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold">Command Center</span>
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="font-bold text-xs text-white">PRAVAHA ENGINE</div>
                <div className="text-[10px] text-slate-400 font-mono">RouteGuard AI</div>
                <div className="mt-2 text-[10px] bg-slate-900/80 px-2 py-0.5 rounded font-bold text-sky-300">
                  {currentStep >= 7 ? 'Rerouted & Alerted' : 'Waiting Sync'}
                </div>
              </div>
            </div>
          </div>

          {/* Active Step Details Banner */}
          <div className="bg-teal-50/90 border border-teal-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F8C] bg-teal-100 px-2 py-0.5 rounded-md">
                Active Step #{currentStep + 1}
              </span>
              <h4 className="font-display font-black text-slate-900 text-base">
                {STEPS[currentStep].title}
              </h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed max-w-xl">
                {STEPS[currentStep].desc}
              </p>
            </div>

            <div className="shrink-0 bg-white border border-teal-200 rounded-2xl p-3 shadow-2xs space-y-1 text-center min-w-[160px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Node Status
              </span>
              <span className="text-xs font-extrabold text-[#087F8C] font-mono block">
                {STEPS[currentStep].status}
              </span>
            </div>
          </div>

          {/* Step Selector List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Demonstration Timeline (Click step to jump)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STEPS.map((s, idx) => {
                const isActive = currentStep === idx;
                const isDone = currentStep > idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    className={`text-left p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-md'
                        : isDone
                        ? 'bg-teal-50/80 text-teal-900 border-teal-200 hover:bg-teal-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
                          isActive
                            ? 'bg-white text-[#087F8C]'
                            : isDone
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate">{s.title.split(':')[1]}</span>
                    </div>

                    {isDone && <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Final Summary Banner (When completed) */}
          {currentStep === STEPS.length - 1 && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 border-2 border-teal-400 space-y-3 shadow-xl animate-fadeIn">
              <div className="flex items-center space-x-2 text-teal-400 font-mono text-xs font-black">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>OFFLINE RESILIENCE DEMONSTRATION VERIFIED</span>
              </div>
              <h3 className="font-display font-black text-xl text-white">
                CONNECTIVITY LOST. PRAVAHA REMAINS OPERATIONAL.
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                When conventional Internet connectivity is unavailable, PRAVAHA collects, stores,
                and transfers critical field reports peer-to-peer across mesh nodes until an Internet Gateway synchronizes with cloud intelligence.
              </p>
              <div className="pt-2 font-display font-black text-sm text-teal-300 tracking-wider">
                Predict. Navigate. Deliver.
              </div>
            </div>
          )}
        </div>

        {/* Modal Controls Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-[#087F8C] hover:bg-[#065F66] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Demo' : 'Auto Play Demo'}</span>
            </button>

            <button
              onClick={handleReset}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  const next = currentStep + 1;
                  setCurrentStep(next);
                  executeStepAction(next);
                }
              }}
              disabled={currentStep >= STEPS.length - 1}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
