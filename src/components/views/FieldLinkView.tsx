import React, { useState, FormEvent } from 'react';
import {
  Radio,
  Camera,
  MapPin,
  Send,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Signal,
  Share2,
  ShieldCheck,
  Layers,
  X,
  Check,
  Eye,
  Clock,
  UserCheck,
  Mic,
  MessageSquare,
  Activity,
  Filter,
  Volume2,
  Download,
  Upload,
  Zap,
  Info,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { IncidentType, RiskLevel } from '../../types';
import { meshManager } from '../../services/mesh/MeshManager';

const PRESET_PHOTOS = [
  { label: '⛰️ Mountain Landslide', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80' },
  { label: '🌊 River Flood', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80' },
  { label: '🛣️ Road Damage', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80' },
  { label: '🌉 Bridge Damage', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' },
];

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
  isOutbox: boolean;
  isSos?: boolean;
  voiceNoteUrl?: string;
}

export const FieldLinkView: React.FC = () => {
  const { submitFieldReport, incidents, isOffline, pendingSyncCount, syncOfflineQueue, updateVerificationStatus } = useAppState();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'reporter' | 'chat' | 'monitor'>('reporter');
  
  // Incident Form state
  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [roadName, setRoadName] = useState<string>('NH-10 (Siliguri - Gangtok)');
  const [stateName, setStateName] = useState<string>('Sikkim / West Bengal');
  const [districtName, setDistrictName] = useState<string>('Kalimpong');
  const [severity, setSeverity] = useState<RiskLevel>('Critical');
  const [description, setDescription] = useState<string>('Major landslide blocking all lanes. Heavy debris & boulder fall.');
  const [reporterName, setReporterName] = useState<string>('Inspector Sharma');
  const [reporterRole, setReporterRole] = useState<string>('Field Officer');
  const [photoUrl, setPhotoUrl] = useState<string>(PRESET_PHOTOS[0].url);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [submittedToast, setSubmittedToast] = useState<boolean>(false);
  const [lastMeshMsgId, setLastMeshMsgId] = useState<string | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  // Community Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'Commander Das (Node PRV-GATEWAY-01)',
      role: 'Emergency Response Lead',
      text: '⚠️ Priority Alert: Teesta valley sector NH-10 experiencing heavy rockfalls. All rescue teams standby on 433 MHz.',
      timestamp: '10:14 AM',
      isOutbox: false,
      isSos: true,
    },
    {
      id: 'msg-2',
      sender: 'Inspector Sharma (PRV-NODE-7842)',
      role: 'Field Officer',
      text: 'Acknowledged. Setting up medical triage point near Kilometer 24 milestone.',
      timestamp: '10:15 AM',
      isOutbox: true,
    },
    {
      id: 'msg-3',
      sender: 'Citizen Volunteer (PRV-NODE-3310)',
      role: 'Local Resident',
      text: 'Alternative bypass via Melli bridge clear for light vehicles.',
      timestamp: '10:16 AM',
      isOutbox: false,
      voiceNoteUrl: '00:14s',
    },
  ]);
  const [newChatText, setNewChatText] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'inbox' | 'outbox'>('all');

  // Mesh Monitor State
  const [monitorFilter, setMonitorFilter] = useState<'all' | 'inbox' | 'outbox'>('all');

  const localNode = meshManager.localNode;

  // Toggle Voice Note Recording
  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setVoiceNote(`00:${recordingSeconds.toString().padStart(2, '0')}s`);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      const timer = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 30) {
            clearInterval(timer);
            setIsRecording(false);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleSubmitReport = (e: FormEvent) => {
    e.preventDefault();

    const formattedTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const placeString = `${roadName}, ${districtName}, ${stateName} (27.33° N, 88.61° E)`;

    submitFieldReport({
      incidentType,
      location: { lat: 27.33, lng: 88.61, name: placeString },
      state: stateName,
      district: districtName,
      roadName,
      severity,
      description: `${description} ${voiceNote ? `[🎙️ Voice Note: ${voiceNote}]` : ''} [Sent from ${placeString} at ${formattedTime}]`,
      photoUrl,
      reporterName: `${reporterName} (${localNode.nodeId})`,
      reporterRole,
      affectedVehicleIds: ['veh-2048'],
      affectedShipmentIds: ['ship-2048'],
      verificationSource: 'Field Report',
      confidenceScore: 95,
    });

    const meshMsg = meshManager.createIncidentReport({
      incidentType,
      severity,
      road: roadName,
      latitude: 27.33,
      longitude: 88.61,
      description,
      reporterName,
      photoUrl,
      sentTimestamp: formattedTime,
      sentPlace: placeString,
    });

    setLastMeshMsgId(meshMsg.messageId);
    setSubmittedToast(true);
    setTimeout(() => setSubmittedToast(false), 5000);
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: `${reporterName} (${localNode.nodeId})`,
      role: reporterRole,
      text: newChatText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutbox: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setNewChatText('');
  };

  const handleBroadcastSos = () => {
    const sosMsg: ChatMessage = {
      id: `sos-${Date.now()}`,
      sender: `${reporterName} (${localNode.nodeId})`,
      role: reporterRole,
      text: '🚨 SOS BROADCAST: Emergency Medical & Evacuation Assistance Required Immediately at Kilometer 24!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutbox: true,
      isSos: true,
    };
    setChatMessages((prev) => [...prev, sosMsg]);
  };

  const INCIDENT_TYPES: IncidentType[] = [
    'Landslide',
    'Flood',
    'Road Damage',
    'Bridge Damage',
    'Traffic',
    'Vehicle Breakdown',
    'Other',
  ];

  return (
    <div className="p-3 sm:p-5 space-y-5 max-w-[1600px] mx-auto font-body">
      {/* Lightbox Photo Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 text-white p-4 rounded-3xl max-w-3xl w-full space-y-3 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs text-teal-400 font-bold flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Transmitted Field Photo Inspector</span>
              </span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={activePhotoModal}
                alt="Transmitted Incident Visual"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Photo Status: 256-bit Hash Verified</span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-xl font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-[#087F8C] animate-pulse" />
            <h2 className="font-display font-black text-xl text-slate-900 tracking-tight">
              {t('fieldLink')} Resilient Emergency Mesh Dispatch
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Field Officer tactical portal with Bluetooth Low Energy mesh peer-to-peer relay, Community Chat, Voice Notes, and Node RSSI Monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Node: {localNode.nodeId}</span>
          </div>

          {pendingSyncCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              className="bg-[#087F8C] hover:bg-[#075E68] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync {pendingSyncCount} Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Node Details Card */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/40">
            <Signal className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-extrabold text-teal-400">CONNECTED MESH GATEWAY NODE</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border border-emerald-500/30">
                LIVE RELAY
              </span>
            </div>
            <p className="text-sm font-black font-mono text-white">PRV-GATEWAY-01 (Teesta Sector Relay)</p>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">SIGNAL STRENGTH</span>
            <span className="text-emerald-400 font-bold">-58 dBm (Strong)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">BANDWIDTH RATE</span>
            <span className="text-teal-300 font-bold">124 Kbps</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">ENCRYPTION</span>
            <span className="text-purple-300 font-bold">HMAC SHA-256</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">REPLAY TTL</span>
            <span className="text-amber-300 font-bold">5 Hops</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('reporter')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'reporter'
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Rapid Incident Reporter</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span>Emergency Community Chat</span>
          <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {chatMessages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'monitor'
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-purple-500" />
          <span>BLE Mesh Monitor (Inbox/Outbox)</span>
        </button>
      </div>

      {isOffline && (
        <div className="p-3 bg-amber-50 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-medium flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>OFFLINE MESH MODE:</strong> Internet disconnected. Reports & messages will be saved locally and transferred peer-to-peer over BLE to nearby PRAVAHA nodes.
          </span>
        </div>
      )}

      {submittedToast && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Report Created! Broadcasted via Offline Mesh Queue ({lastMeshMsgId})</span>
          </div>
          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono text-[10px]">
            BLE RELAY ACTIVE
          </span>
        </div>
      )}

      {/* TAB 1: INCIDENT REPORTER */}
      {activeTab === 'reporter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Incident Form (2 cols) */}
          <form onSubmit={handleSubmitReport} className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-sm text-slate-900">
                Submit Field Incident via Offline Mesh
              </h3>
              <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                TTL: 5 Hops
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Incident Type</label>
                <select
                  value={incidentType}
                  onChange={e => setIncidentType(e.target.value as IncidentType)}
                  className="w-full bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none cursor-pointer text-xs"
                >
                  {INCIDENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as RiskLevel)}
                  className="w-full bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="Critical">Critical (Total Blockage)</option>
                  <option value="High">High (Single Lane)</option>
                  <option value="Moderate">Moderate (Slow Traffic)</option>
                  <option value="Low">Low (Minor Hazard)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Road Corridor Name</label>
                <input
                  type="text"
                  value={roadName}
                  onChange={e => setRoadName(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">State & District</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={stateName}
                    onChange={e => setStateName(e.target.value)}
                    placeholder="State"
                    className="w-1/2 bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none text-xs"
                    required
                  />
                  <input
                    type="text"
                    value={districtName}
                    onChange={e => setDistrictName(e.target.value)}
                    placeholder="District"
                    className="w-1/2 bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reporter Name & Role</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={reporterName}
                    onChange={e => setReporterName(e.target.value)}
                    className="w-1/2 bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none text-xs"
                    required
                  />
                  <input
                    type="text"
                    value={reporterRole}
                    onChange={e => setReporterRole(e.target.value)}
                    className="w-1/2 bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              {/* Photo Attachment & Selector */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold">Photo Attachment (Visible to All Users)</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PHOTOS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPhotoUrl(p.url)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all ${
                        photoUrl === p.url
                          ? 'bg-[#087F8C] text-white border-[#087F8C]'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Or paste custom image URL..."
                  className="w-full bg-[#F7F9FA] border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>

            {/* Voice Note Recorder Section */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-slate-700 font-bold text-xs flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Mic className="w-4 h-4 text-teal-600" />
                  <span>Record Field Voice Memo (Optional)</span>
                </span>
                {voiceNote && (
                  <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-mono font-bold">
                    {voiceNote} Attached
                  </span>
                )}
              </label>
              
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`p-2.5 rounded-xl font-bold flex items-center space-x-2 text-white cursor-pointer transition-all ${
                    isRecording ? 'bg-red-600 animate-pulse' : 'bg-[#087F8C] hover:bg-[#075E68]'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{isRecording ? `Recording (00:${recordingSeconds.toString().padStart(2, '0')})` : 'Start Voice Record'}</span>
                </button>

                {voiceNote && !isRecording && (
                  <button
                    type="button"
                    onClick={() => setVoiceNote(null)}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Photo Preview in Form */}
            {photoUrl && (
              <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <img
                  src={photoUrl}
                  alt="Selected Incident Attachment"
                  className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setActivePhotoModal(photoUrl)}
                />
                <div>
                  <span className="text-[11px] font-bold text-slate-900 flex items-center space-x-1">
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                    <span>Attached Photo Preview</span>
                  </span>
                  <p className="text-[10px] text-slate-500">
                    This photo will be embedded into the BLE mesh packet and visible to all operators across the platform.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Detailed Description of Disruption</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#F7F9FA] border border-slate-200 rounded-xl p-3 font-medium focus:outline-none text-xs"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-3 rounded-xl font-extrabold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs text-xs"
            >
              <Send className="w-4 h-4" />
              <span>SUBMIT FIELD INCIDENT VIA PRAVAHA MESH</span>
            </button>
          </form>

          {/* Transmitted Incident Packages Stream */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-display font-black text-sm text-slate-900">Transmitted Incident Packages ({incidents.length})</h3>
              <span className="text-[11px] text-slate-400 font-mono">Live Mesh</span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 text-xs">
              {incidents.map(inc => (
                <div key={inc.id} className="p-3.5 bg-[#F7F9FA] border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="bg-teal-100 text-teal-900 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                        {inc.reporterName?.includes(localNode.nodeId) ? 'OUTBOX' : 'INBOX'}
                      </span>
                      <span className="font-black text-slate-900">{inc.incidentType}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        inc.verificationStatus === 'True Alarm (Verified)' || inc.status === 'Verified'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : inc.verificationStatus === 'False Alarm (Disproven)' || inc.status === 'Resolved'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {inc.verificationStatus || inc.status}
                    </span>
                  </div>

                  {/* Photo rendering for all users */}
                  {inc.photoUrl && (
                    <div className="relative group cursor-pointer" onClick={() => inc.photoUrl && setActivePhotoModal(inc.photoUrl)}>
                      <img
                        src={inc.photoUrl}
                        alt={inc.incidentType}
                        className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-2xs group-hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded text-[9px] font-mono flex items-center space-x-1">
                        <Eye className="w-3 h-3 text-teal-300" />
                        <span>Click to view photo</span>
                      </div>
                    </div>
                  )}

                  {/* Details: Time & Place */}
                  <div className="space-y-1 text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-200/80">
                    <div className="flex items-center space-x-1 text-slate-900 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{inc.roadName}, {inc.district} ({inc.state})</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-teal-600 shrink-0" />
                      <span>Sent: {new Date(inc.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500 text-[10px]">
                      <UserCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>Reporter: {inc.reporterName} ({inc.reporterRole})</span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">{inc.description}</p>

                  {/* Verification Controls */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => updateVerificationStatus(inc.id, 'True Alarm (Verified)', 'Verified by Field Operator', 'Field Officer Ground Check')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 rounded-xl text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Verify & Admit</span>
                    </button>
                    <button
                      onClick={() => updateVerificationStatus(inc.id, 'False Alarm (Disproven)', 'Flagged invalid by Field Operator')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-1.5 rounded-xl text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <X className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMERGENCY COMMUNITY CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-black text-base text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <span>Emergency Community Coordination Chat</span>
              </h3>
              <p className="text-xs text-slate-500">Peer-to-peer disaster channel running over BLE Mesh network</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBroadcastSos}
                className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer shadow-sm animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>BROADCAST SOS ALERT</span>
              </button>

              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold space-x-1">
                <button
                  onClick={() => setChatFilter('all')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${chatFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setChatFilter('inbox')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${chatFilter === 'inbox' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => setChatFilter('outbox')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${chatFilter === 'outbox' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  Outbox
                </button>
              </div>
            </div>
          </div>

          {/* Chat Message Feed */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto p-3 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
            {chatMessages
              .filter((m) => chatFilter === 'all' || (chatFilter === 'inbox' && !m.isOutbox) || (chatFilter === 'outbox' && m.isOutbox))
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-2xl max-w-2xl space-y-1 ${
                    msg.isSos
                      ? 'bg-red-50 border-2 border-red-300 text-red-950 ml-0'
                      : msg.isOutbox
                      ? 'bg-teal-50 border border-teal-200 text-teal-950 ml-auto'
                      : 'bg-white border border-slate-200 text-slate-900 mr-auto'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold">{msg.sender} ({msg.role})</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${msg.isOutbox ? 'bg-teal-200 text-teal-900' : 'bg-indigo-100 text-indigo-900'}`}>
                        {msg.isOutbox ? 'OUTBOX' : 'INBOX'}
                      </span>
                      <span className="text-slate-400">{msg.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>

                  {msg.voiceNoteUrl && (
                    <div className="flex items-center space-x-2 pt-1 text-xs font-bold text-teal-700">
                      <Volume2 className="w-4 h-4 text-teal-600" />
                      <span>Audio Attachment: {msg.voiceNoteUrl}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Chat Composer */}
          <form onSubmit={handleSendChat} className="flex items-center space-x-2">
            <input
              type="text"
              value={newChatText}
              onChange={(e) => setNewChatText(e.target.value)}
              placeholder="Type disaster response message or query..."
              className="flex-1 bg-[#F7F9FA] border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-xs focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#087F8C] hover:bg-[#075E68] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send Chat</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: BLE MESH PACKET MONITOR */}
      {activeTab === 'monitor' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-black text-base text-slate-900 flex items-center space-x-2 font-body">
                <Activity className="w-5 h-5 text-purple-600" />
                <span>Bluetooth Low Energy (BLE) Packet Monitor</span>
              </h3>
              <p className="text-xs text-slate-500 font-body">Live raw binary packet stream and packet payload inspector</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-mono text-xs">FILTER:</span>
              <button
                onClick={() => setMonitorFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${monitorFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                ALL PACKETS
              </button>
              <button
                onClick={() => setMonitorFilter('inbox')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${monitorFilter === 'inbox' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                INBOX ONLY
              </button>
              <button
                onClick={() => setMonitorFilter('outbox')}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${monitorFilter === 'outbox' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                OUTBOX ONLY
              </button>
            </div>
          </div>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl space-y-2 max-h-[500px] overflow-y-auto">
            {incidents
              .filter((_, idx) => monitorFilter === 'all' || (monitorFilter === 'outbox' ? idx % 2 === 0 : idx % 2 !== 0))
              .map((inc, index) => {
                const isOutbox = index % 2 === 0;
                return (
                  <div key={inc.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${isOutbox ? 'text-teal-400' : 'text-indigo-400'}`}>
                        [{isOutbox ? 'OUTBOX' : 'INBOX'}] PKT-0982734_{inc.id}
                      </span>
                      <span className="text-slate-500">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      SRC: {inc.reporterName} | TTL: 5 Hops | MAC: 4A:8B:12:F0:9B | HMAC: OK
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                      PAYLOAD: {`{"type":"${inc.incidentType}","severity":"${inc.severity}","road":"${inc.roadName}","photo":"${inc.photoUrl ? 'ATTACHED' : 'NONE'}"}`}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
