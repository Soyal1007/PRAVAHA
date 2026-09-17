import React, { useState } from 'react';
import { Radio, Signal, Bluetooth, QrCode, Copy, Check, Smartphone, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { meshManager } from '../../services/mesh/MeshManager';
import { realWebRTCChannelDriver } from '../../services/mesh/RealWebRTCChannelDriver';
import { MeshNode } from '../../services/mesh/meshTypes';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ble' | 'webrtc'>('ble');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredNodes, setDiscoveredNodes] = useState<MeshNode[]>([]);
  const [offerSdp, setOfferSdp] = useState<string>('');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  const localNode = meshManager.localNode;

  const handleBleScan = async () => {
    setIsScanning(true);
    try {
      const nodes = await meshManager.transportManager.discoverPeers();
      setDiscoveredNodes(nodes);
      if (nodes.length > 0) {
        nodes.forEach((n) => meshManager.peerManager.updatePeer(n.nodeId, n));
      }
    } catch (e) {
      console.error(e);
    }
    setIsScanning(false);
  };

  const handleGenerateSdp = async () => {
    try {
      const { offerSdp } = await realWebRTCChannelDriver.createOffer();
      setOfferSdp(offerSdp);
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  };

  const handleAcceptAnswer = async () => {
    if (!answerInput) return;
    const ok = await realWebRTCChannelDriver.acceptAnswer(answerInput);
    if (ok) {
      setPairSuccess(true);
      setTimeout(() => setPairSuccess(false), 4000);
    }
  };

  const handleCopy = () => {
    if (offerSdp) {
      navigator.clipboard.writeText(offerSdp);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 font-body animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
              <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-white tracking-tight">
                Pair Physical Device for Offline Mesh
              </h3>
              <p className="text-xs text-slate-400">
                Connect physical smartphones, tablets, or laptops without Internet access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ble')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'ble' ? 'bg-[#087F8C] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>Web Bluetooth GATT Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('webrtc')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'webrtc' ? 'bg-[#087F8C] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>WebRTC Direct P2P Code</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Local Node Identity Banner */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-[#087F8C]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Local Device Identity</span>
                <span className="font-mono font-black text-slate-900">{localNode.nodeId} ({localNode.deviceName})</span>
              </div>
            </div>
            <span className="bg-teal-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
              READY TO PAIR
            </span>
          </div>

          {activeTab === 'ble' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Scan Physical Bluetooth LE Hardware</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Uses Chrome / Edge native <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">navigator.bluetooth</code> API to detect and connect GATT services on nearby phones, tablets, or BLE beacons.
                </p>

                <button
                  onClick={handleBleScan}
                  disabled={isScanning}
                  className="bg-[#087F8C] hover:bg-[#075E68] text-white px-4 py-2.5 rounded-xl font-extrabold flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning for Hardware Devices...' : 'Scan Nearby Bluetooth Devices'}</span>
                </button>
              </div>

              {discoveredNodes.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Discovered Devices ({discoveredNodes.length})</span>
                  {discoveredNodes.map((n) => (
                    <div key={n.nodeId} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{n.deviceName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{n.nodeId}</span>
                      </div>
                      <button
                        onClick={() => meshManager.peerManager.updatePeer(n.nodeId, { ...n, connectionState: 'CONNECTED' })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-[11px]"
                      >
                        Connect Peer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* WebRTC SDP Signal Code Generator */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">Step 1: Device A - Generate P2P Signal Code</h4>
                <p className="text-slate-600 text-xs">
                  Generates a WebRTC Session Description (SDP) token for direct offline data streaming without any server.
                </p>

                {!offerSdp ? (
                  <button
                    onClick={handleGenerateSdp}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    Generate P2P Pairing Token
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[10px] text-slate-700 break-all max-h-24 overflow-y-auto">
                      {offerSdp}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copySuccess ? 'Copied Token!' : 'Copy Pairing Token'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* WebRTC Accept Answer */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">Step 2: Device B - Paste Pairing Token</h4>
                <p className="text-slate-600 text-xs">
                  Paste the SDP token generated on the second physical device to establish the radio connection.
                </p>
                <textarea
                  rows={2}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Paste pairing token here..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-[10px] focus:outline-none"
                />
                <button
                  onClick={handleAcceptAnswer}
                  className="bg-[#087F8C] hover:bg-[#075E68] text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Connect WebRTC DataChannel
                </button>
                {pairSuccess && (
                  <div className="p-2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-xs flex items-center space-x-1">
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>Physical Device Paired & WebRTC DataChannel OPEN!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-extrabold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
