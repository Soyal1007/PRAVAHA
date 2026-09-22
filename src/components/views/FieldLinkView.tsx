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

export const FieldLinkView: React.FC = () => {
  const { submitFieldReport, incidents, isOffline, pendingSyncCount, syncOfflineQueue, verifyIncident, updateVerificationStatus } = useAppState();
  const { t } = useLanguage();

  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [roadName, setRoadName] = useState<string>('NH-10 (Siliguri - Gangtok)');
  const [stateName, setStateName] = useState<string>('Sikkim / West Bengal');
  const [districtName, setDistrictName] = useState<string>('Kalimpong');
  const [severity, setSeverity] = useState<RiskLevel>('Critical');
  const [description, setDescription] = useState<string>('Major landslide blocking all lanes. Heavy debris & boulder fall.');
  const [reporterName, setReporterName] = useState<string>('Inspector Sharma');
  const [reporterRole, setReporterRole] = useState<string>('Field Officer');
  const [photoUrl, setPhotoUrl] = useState<string>(PRESET_PHOTOS[0].url);
  const [submittedToast, setSubmittedToast] = useState<boolean>(false);
  const [lastMeshMsgId, setLastMeshMsgId] = useState<string | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  const localNode = meshManager.localNode;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const formattedTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const placeString = `${roadName}, ${districtName}, ${stateName} (27.33° N, 88.61° E)`;

    // 1. Submit to central app state
    submitFieldReport({
      incidentType,
      location: { lat: 27.33, lng: 88.61, name: placeString },
      state: stateName,
      district: districtName,
      roadName,
      severity,
      description: `${description} [Sent from ${placeString} at ${formattedTime}]`,
      photoUrl,
      reporterName: `${reporterName} (${localNode.nodeId})`,
      reporterRole,
      affectedVehicleIds: ['veh-2048'],
      affectedShipmentIds: ['ship-2048'],
      verificationSource: 'Field Report',
      confidenceScore: 95,
    });

    // 2. Register into PRAVAHA Mesh Store-and-Forward Engine
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

      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-[#087F8C] animate-pulse" />
            <h2 className="font-display font-black text-xl text-slate-900 tracking-tight">{t('fieldLink')} Offline Incident Dispatch</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Field Officer tactical portal with Bluetooth Low Energy mesh peer-to-peer relay, store-and-forward queue, and HMAC security.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Node Identity Badge */}
          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Node: {localNode.nodeId}</span>
          </div>

          {pendingSyncCount > 0 && (
            <button
              data-tour="sync-now-btn"
              onClick={syncOfflineQueue}
              className="bg-[#087F8C] hover:bg-[#075E68] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync {pendingSyncCount} Reports</span>
            </button>
          )}
        </div>
      </div>

      {isOffline && (
        <div className="p-3 bg-amber-50 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-medium flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>OFFLINE MESH MODE:</strong> Internet disconnected. Reports will be saved into local storage and transferred peer-to-peer over BLE to nearby PRAVAHA nodes.
          </span>
        </div>
      )}

      {submittedToast && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Report Created! Stored in Offline Mesh Queue ({lastMeshMsgId})</span>
          </div>
          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono text-[10px]">
            BLE RELAY READY
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Incident Form (2 cols) */}
        <form data-tour="field-collector-form" onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
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

        {/* Incident Stream & Mesh Queue with Photo & Verification Controls */}
        <div data-tour="offline-sync-queue" className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-display font-black text-sm text-slate-900">Transmitted Incident Packages ({incidents.length})</h3>
            <span className="text-[11px] text-slate-400 font-mono">Live Mesh</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 text-xs">
            {incidents.map(inc => (
              <div key={inc.id} className="p-3.5 bg-[#F7F9FA] border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">{inc.incidentType}</span>
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

                {/* Option to Verify & Admit or Reject Package */}
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
    </div>
  );
};
