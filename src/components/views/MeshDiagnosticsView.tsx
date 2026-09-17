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
} from 'lucide-react';
import { DevicePairingModal } from '../common/DevicePairingModal';
import { meshManager } from '../../services/mesh/MeshManager';
import { meshEventBus } from '../../services/mesh/MeshEventBus';
import { MeshDiagnosticsStats, MeshNode, MeshMessage, MeshPowerMode } from '../../services/mesh/meshTypes';

interface MeshDiagnosticsViewProps {
  onOpenDemoModal?: () => void;
}

export const MeshDiagnosticsView: React.FC<MeshDiagnosticsViewProps> = ({ onOpenDemoModal }) => {
  const [diag, setDiag] = useState<MeshDiagnosticsStats>(meshManager.getDiagnostics());
  const [peers, setPeers] = useState<MeshNode[]>(meshManager.peerManager.getPeers());
  const [queue, setQueue] = useState<MeshMessage[]>(meshManager.offlineQueue.getAllMessages());
  const [isPairingOpen, setIsPairingOpen] = useState(false);
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

    const interval = setInterval(refreshData, 2000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      clearInterval(interval);
    };
  }, []);

  const handlePowerChange = (mode: MeshPowerMode) => {
    meshManager.setPowerMode(mode);
  };

  return (
    <div className="space-y-6 font-body pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-900/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-teal-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Offline Communication Subsystem</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Mesh Network Diagnostics & Observability
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Real-time monitoring of local peer discovery, BLE store-and-forward queue, node identity, hop propagation, de-duplication cache, and cloud gateway synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-lg cursor-pointer transition-all border border-emerald-600"
              >
                <PlayCircle className="w-4 h-4 text-emerald-200 animate-pulse" />
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

          {/* Offline Queue & Messages Monitor */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Store-and-Forward Message Queue ({queue.length})</span>
              </h3>
              <button
                onClick={() => setQueue(meshManager.offlineQueue.getAllMessages())}
                className="text-xs text-[#087F8C] font-bold hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-bold">
                Queue is empty. Create a field report offline or launch Judge Demo to observe packets.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {queue.map((msg) => (
                  <div
                    key={msg.messageId}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-body"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900">{msg.messageId}</span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            msg.priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {msg.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          TTL: {msg.ttl} | Hops: {msg.hopCount}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] font-medium">
                        {(msg.payload as any)?.description || 'Field Incident Report'}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          msg.deliveryState === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : msg.deliveryState === 'RELAYED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {msg.deliveryState}
                      </span>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Origin: {msg.originNodeId}
                      </div>
                    </div>
                  </div>
                ))}
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
