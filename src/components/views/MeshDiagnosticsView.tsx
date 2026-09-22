import React, { useState, useEffect } from 'react';
import {
  Radio,
  Signal,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  CloudUpload,
  Layers,
  Battery,
  Lock,
  RefreshCw,
  PlayCircle,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  FileCode,
  Eye,
  Camera,
  MapPin,
  UserCheck,
  Check,
  X,
} from 'lucide-react';
import { DevicePairingModal } from '../common/DevicePairingModal';
import { meshManager } from '../../services/mesh/MeshManager';
import { meshEventBus } from '../../services/mesh/MeshEventBus';
import { MeshDiagnosticsStats, MeshNode, MeshMessage, MeshPowerMode } from '../../services/mesh/meshTypes';
import { useAppState } from '../../context/AppStateContext';

interface MeshDiagnosticsViewProps {
  onOpenDemoModal?: () => void;
}

export const MeshDiagnosticsView: React.FC<MeshDiagnosticsViewProps> = ({ onOpenDemoModal }) => {
  const { submitFieldReport } = useAppState();
  const [diag, setDiag] = useState<MeshDiagnosticsStats>(meshManager.getDiagnostics());
  const [peers, setPeers] = useState<MeshNode[]>(meshManager.peerManager.getPeers());
  const [queue, setQueue] = useState<MeshMessage[]>(meshManager.offlineQueue.getAllMessages());
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: string }>>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'Mesh Manager initialized. Local Node: ' + meshManager.localNode.nodeId, type: 'info' },
    { id: '2', time: new Date().toLocaleTimeString(), text: 'BLE & WebRTC Transport Drivers active. IndexedDB persistent queue ready.', type: 'info' },
  ]);

  const addLog = (text: string, type = 'info') => {
    setLogs((prev) => [
      { id: Date.now().toString(), time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 40),
    ]);
  };

  useEffect(() => {
    const refreshData = () => {
      setDiag(meshManager.getDiagnostics());
      setPeers(meshManager.peerManager.getPeers());
      setQueue(meshManager.offlineQueue.getAllMessages());
    };

    const unsub1 = meshEventBus.on('messageCreated', ({ message }) => {
      addLog(`Created offline report ${message.messageId} (Priority: ${message.priority})`, 'success');
      refreshData();
    });

    const unsub2 = meshEventBus.on('messageReceived', ({ message }) => {
      addLog(`Received packet ${message.messageId} from ${message.senderNodeId || message.originNodeId}`, 'info');
      refreshData();
    });

    const unsub3 = meshEventBus.on('messageRelayed', ({ messageId, peerNodeId }) => {
      addLog(`Relayed packet ${messageId} to peer ${peerNodeId}`, 'warning');
      refreshData();
    });

    const unsub4 = meshEventBus.on('messageSyncedToCloud', ({ message }) => {
      addLog(`Gateway synchronized ${message.messageId} to PRAVAHA Cloud API!`, 'success');
      refreshData();
    });

    const unsub5 = meshEventBus.on('duplicateBlocked', ({ messageId }) => {
      addLog(`Duplicate packet ${messageId} blocked by MessageCache`, 'error');
      refreshData();
    });

    const unsub6 = meshEventBus.on('powerModeChanged', ({ mode }) => {
      addLog(`Mesh power mode changed to: ${mode}`, 'info');
      refreshData();
    });

    const unsub7 = meshEventBus.on('messageVerifiedAndAdmitted', ({ message, verifierName }) => {
      addLog(`Package ${message.messageId} VERIFIED & ADMITTED by ${verifierName}!`, 'success');
      refreshData();
    });

    const unsub8 = meshEventBus.on('messageRejectedByAdmin', ({ message, reason }) => {
      addLog(`Package ${message.messageId} REJECTED: ${reason}`, 'error');
      refreshData();
    });

    const interval = setInterval(refreshData, 1500);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      clearInterval(interval);
    };
  }, []);

  const handlePowerChange = (mode: MeshPowerMode) => {
    meshManager.setPowerMode(mode);
  };

  const handleBroadcastTestPacket = () => {
    const formattedTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg = meshManager.createIncidentReport({
      incidentType: 'Landslide',
      severity: 'Critical',
      road: 'NH-10 (Siliguri-Gangtok Corridor)',
      latitude: 27.33,
      longitude: 88.61,
      description: 'Live Test Mesh Packet broadcast from web control panel with photo evidence & GPS tag',
      reporterName: 'Inspector Sharma (Field Officer)',
      reporterRole: 'BLE Mesh Control Operator',
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
      sentTimestamp: formattedTime,
      sentPlace: 'NH-10 Mile 14, Kalimpong District (27.3300° N, 88.6100° E)',
    });
    addLog(`Broadcast live test packet ${msg.messageId} over BLE Mesh!`, 'success');
    setDiag(meshManager.getDiagnostics());
    setQueue(meshManager.offlineQueue.getAllMessages());
  };

  const handleVerifyAndAdmit = (msg: MeshMessage) => {
    const updated = meshManager.verifyAndAdmitMessage(msg.messageId, 'System Admin');
    if (updated) {
      const payload = updated.payload as any;
      submitFieldReport({
        incidentType: payload.incidentType || 'Landslide',
        location: {
          lat: payload.latitude || 27.33,
          lng: payload.longitude || 88.61,
          name: payload.sentPlace || payload.road || 'NH-10 Corridor',
        },
        state: payload.state || 'West Bengal / Sikkim',
        district: payload.district || 'Kalimpong',
        roadName: payload.road || 'NH-10',
        severity: payload.severity || 'Critical',
        description: `[VERIFIED MESH PACKAGE ${msg.messageId}] ${payload.description}`,
        photoUrl: payload.photoUrl,
        reporterName: payload.reporterName || updated.originNodeId,
        reporterRole: payload.reporterRole || 'Field Officer',
        affectedVehicleIds: ['veh-2048'],
        affectedShipmentIds: ['ship-2048'],
        verificationSource: 'Field Report',
        confidenceScore: 99,
      });
      addLog(`Admitted package ${msg.messageId} into Central GIS Map & Live Alerts`, 'success');
      setQueue(meshManager.offlineQueue.getAllMessages());
    }
  };

  const handleReject = (msg: MeshMessage) => {
    meshManager.rejectMessage(msg.messageId, 'Flagged invalid by operator');
    addLog(`Rejected package ${msg.messageId}`, 'error');
    setQueue(meshManager.offlineQueue.getAllMessages());
  };

  return (
    <div className="space-y-6 font-body pb-12">
      {/* Lightbox Photo Modal */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 text-white p-4 rounded-3xl max-w-3xl w-full space-y-3 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs text-teal-400 font-bold flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Transmitted BLE Mesh Photo Attachment</span>
              </span>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedPhotoModal}
                alt="Enlarged Transmitted Evidence"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Verified Photo Hash Integrity</span>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-xl font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-900/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-teal-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
              <span>Offline Communication Subsystem</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-black">
                LIVE STREAMING
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Mesh Network Diagnostics & Control Panel
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Real-time monitoring of local peer discovery, BLE store-and-forward queue, node identity, hop propagation, de-duplication cache, and cloud gateway synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleBroadcastTestPacket}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-lg cursor-pointer transition-all border border-emerald-400"
            >
              <Zap className="w-4 h-4 text-emerald-200 animate-bounce" />
              <span>Broadcast Live Test Packet</span>
            </button>

            <button
              onClick={() => setIsPairingOpen(true)}
              className="bg-[#087F8C] hover:bg-[#075E68] text-white px-4 py-3 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-lg cursor-pointer transition-all border border-teal-500"
            >
              <Radio className="w-4 h-4 text-teal-200 animate-pulse" />
              <span>Pair Physical Device</span>
            </button>

            {onOpenDemoModal && (
              <button
                onClick={onOpenDemoModal}
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-3 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-lg cursor-pointer transition-all border border-indigo-600"
              >
                <PlayCircle className="w-4 h-4 text-indigo-200 animate-pulse" />
                <span>Launch Judge Demo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Local Node */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Local Node ID
          </span>
          <div className="font-mono font-black text-xs text-[#087F8C] truncate">{diag.nodeId}</div>
          <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md inline-block">
            {diag.role}
          </span>
        </div>

        {/* Nearby Nodes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Nearby Nodes
          </span>
          <div className="font-display font-black text-xl text-slate-900 flex items-center space-x-1">
            <Signal className="w-5 h-5 text-teal-600" />
            <span>{diag.nearbyNodesCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Active BLE Peers</span>
        </div>

        {/* Pending Queue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Offline Queue
          </span>
          <div className="font-display font-black text-xl text-amber-600 flex items-center space-x-1">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>{diag.queueSize}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Pending Messages</span>
        </div>

        {/* Relayed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Messages Relayed
          </span>
          <div className="font-display font-black text-xl text-indigo-600 flex items-center space-x-1">
            <Send className="w-5 h-5 text-indigo-500" />
            <span>{diag.messagesRelayed}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Peer Hops</span>
        </div>

        {/* Synced */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Synced to Cloud
          </span>
          <div className="font-display font-black text-xl text-emerald-600 flex items-center space-x-1">
            <CloudUpload className="w-5 h-5 text-emerald-500" />
            <span>{diag.messagesSynced}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Gateway Syncs</span>
        </div>

        {/* Power Mode */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Battery & Power
          </span>
          <div className="font-display font-black text-xs text-slate-800 flex items-center space-x-1">
            <Battery className="w-4 h-4 text-emerald-500" />
            <span>{diag.batteryLevel}%</span>
          </div>
          <span className="text-[10px] font-bold text-teal-800">{diag.powerMode}</span>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Local Node & Power Controls */}
        <div className="space-y-6">
          {/* Node Identity Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-sm text-slate-900 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#087F8C]" />
                <span>Node Configuration</span>
              </h3>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {diag.securityStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Node Identity:</span>
                <span className="font-mono font-bold text-slate-900">{diag.nodeId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Device Role:</span>
                <span className="font-bold text-slate-900">{diag.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Network Security:</span>
                <span className="font-bold text-emerald-700 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>HMAC-SHA256 Signed</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Internet Connectivity:</span>
                <span
                  className={`font-bold ${
                    diag.internetConnected ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {diag.internetConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Power Mode Selector */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Mesh Scan & Power Profile
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Mesh Active', 'Mesh Low Power', 'Mesh Off'] as MeshPowerMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handlePowerChange(mode)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
                      diag.powerMode === mode
                        ? 'bg-[#087F8C] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode.replace('Mesh ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* De-duplication & Security Stats */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-display font-black text-sm text-slate-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Protocol Integrity & Loops</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Duplicates Blocked (A→B→A loop):</span>
                <span className="font-mono font-black text-slate-900">
                  {diag.duplicateMessagesBlocked}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Default TTL / Hop Limit:</span>
                <span className="font-mono font-black text-slate-900">5 Hops</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Last Cloud Gateway Sync:</span>
                <span className="font-mono font-bold text-slate-700">
                  {diag.lastCloudSync || 'None in session'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Nearby Devices Table & Message Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nearby Mesh Nodes Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-slate-900 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-teal-600" />
                <span>Nearby Discovered PRAVAHA Mesh Devices</span>
              </h3>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {peers.length} Nodes in range
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-body">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-3">Node ID</th>
                    <th className="py-2.5 px-3">Device Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Signal / RSSI</th>
                    <th className="py-2.5 px-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {peers.map((peer) => (
                    <tr key={peer.nodeId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#087F8C]">
                        {peer.nodeId}
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-bold">{peer.deviceName}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          {peer.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {peer.signalStrength} ({peer.rssi} dBm)
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            peer.connectionState === 'CONNECTED'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {peer.connectionState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Store-and-Forward Incident Packages & Verification Control Panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-black text-sm text-slate-900 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Transmitted Incident Packages & Verification Control ({queue.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inspect incoming BLE Mesh payloads, transmitted photo evidence, time & place metadata, and admit/reject packages into Central GIS.
                </p>
              </div>
              <button
                onClick={() => setQueue(meshManager.offlineQueue.getAllMessages())}
                className="text-xs text-[#087F8C] font-bold hover:underline flex items-center space-x-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-bold space-y-2">
                <p>No offline incident packages in queue.</p>
                <button
                  onClick={handleBroadcastTestPacket}
                  className="bg-[#087F8C] text-white px-3 py-1.5 rounded-xl font-bold hover:bg-[#075E68] text-xs cursor-pointer"
                >
                  Broadcast Live Test Packet
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
                {queue.map((msg) => {
                  const payload = msg.payload as any;
                  const photo = payload?.photoUrl;
                  const status = msg.verificationStatus || payload?.verificationStatus || 'Pending Verification';

                  return (
                    <div
                      key={msg.messageId}
                      className={`p-4 rounded-2xl border transition-all text-xs font-body space-y-3 ${
                        status === 'Verified & Admitted'
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : status === 'Rejected'
                          ? 'bg-red-50/60 border-red-200'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Top Bar: Message ID, Priority, & Status Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {msg.messageId}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              msg.priority === 'CRITICAL'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {msg.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            TTL: {msg.ttl} | Hops: {msg.hopCount}
                          </span>
                        </div>

                        {/* Status Pill */}
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1 ${
                            status === 'Verified & Admitted'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : status === 'Rejected'
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          <span>{status === 'Verified & Admitted' ? '✔' : status === 'Rejected' ? '✖' : '⏳'}</span>
                          <span>{status}</span>
                        </span>
                      </div>

                      {/* Main Grid: Photo Preview + Time/Place Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Transmitted Photo */}
                        {photo ? (
                          <div
                            className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 h-28 bg-slate-100 flex items-center justify-center"
                            onClick={() => setSelectedPhotoModal(photo)}
                          >
                            <img
                              src={photo}
                              alt={payload.incidentType || 'Incident Photo'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold space-x-1">
                              <Eye className="w-3.5 h-3.5 text-teal-300" />
                              <span>Enlarge Photo</span>
                            </div>
                            <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                              PHOTO ATTACHED
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-28 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                            <Camera className="w-5 h-5 text-slate-300 mb-1" />
                            <span>No Photo Attached</span>
                          </div>
                        )}

                        {/* Metadata Details (Time & Place) */}
                        <div className="md:col-span-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {payload.incidentType || 'Field Incident'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({payload.severity || 'Critical'} Disruption)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="font-mono text-[10px]">
                                <strong>Sent Time:</strong> {payload.sentTimestamp || new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="truncate">
                                <strong>Sent Place:</strong> {payload.sentPlace || payload.road || 'NH-10 Corridor'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">
                                <strong>Reporter:</strong> {payload.reporterName || msg.originNodeId}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <Radio className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
                              <span className="font-mono text-[10px]">
                                <strong>Origin Node:</strong> {msg.originNodeId}
                              </span>
                            </div>
                          </div>

                          <p className="text-slate-700 text-[11px] font-medium leading-normal bg-white p-2 rounded-xl border border-slate-100">
                            {payload.description || 'No detailed description provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Admin Verification & Control Actions */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                        <div className="text-[10px] text-slate-500 font-mono">
                          {status === 'Verified & Admitted' && msg.verifiedBy && (
                            <span className="text-emerald-700 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Admitted by {msg.verifiedBy} at {new Date(msg.verifiedAt || '').toLocaleTimeString()}</span>
                            </span>
                          )}
                          {status === 'Rejected' && (
                            <span className="text-red-700 font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Rejected: {msg.rejectionReason || 'Invalid Report'}</span>
                            </span>
                          )}
                          {status === 'Pending Verification' && (
                            <span className="text-amber-700 font-medium">
                              Awaiting Central Administrator or Field Operator Audit
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleVerifyAndAdmit(msg)}
                            disabled={status === 'Verified & Admitted'}
                            className={`px-3 py-1.5 rounded-xl font-black text-[11px] flex items-center space-x-1.5 transition-all shadow-2xs ${
                              status === 'Verified & Admitted'
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Admit to GIS</span>
                          </button>

                          <button
                            onClick={() => handleReject(msg)}
                            disabled={status === 'Rejected'}
                            className={`px-3 py-1.5 rounded-xl font-black text-[11px] flex items-center space-x-1.5 transition-all shadow-2xs ${
                              status === 'Rejected'
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer active:scale-95'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject Package</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Log Console */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
                <FileCode className="w-4 h-4" />
                <span>Live Event Log Console</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Real-time PubSub Bus</span>
            </div>

            <div className="font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 pr-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warning'
                        ? 'text-amber-400'
                        : log.type === 'error'
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Device Pairing Modal for Real Physical Hardware */}
      <DevicePairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
      />
    </div>
  );
};
