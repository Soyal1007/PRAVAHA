import React, { useState, FormEvent } from 'react';
import { Radio, Camera, MapPin, Send, CheckCircle2, AlertTriangle, WifiOff, RefreshCw, Signal, Share2, ShieldCheck, Layers } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { IncidentType, RiskLevel } from '../../types';
import { meshManager } from '../../services/mesh/MeshManager';

export const FieldLinkView: React.FC = () => {
  const { submitFieldReport, incidents, isOffline, pendingSyncCount, syncOfflineQueue } = useAppState();
  const { t } = useLanguage();

  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [roadName, setRoadName] = useState<string>('NH-10 (Siliguri - Gangtok)');
  const [stateName, setStateName] = useState<string>('Sikkim / West Bengal');
  const [districtName, setDistrictName] = useState<string>('Kalimpong');
  const [severity, setSeverity] = useState<RiskLevel>('Critical');
  const [description, setDescription] = useState<string>('Major landslide blocking all lanes. Heavy debris & boulder fall.');
  const [reporterName, setReporterName] = useState<string>('Inspector Sharma');
  const [reporterRole, setReporterRole] = useState<string>('Field Officer');
  const [submittedToast, setSubmittedToast] = useState<boolean>(false);
  const [lastMeshMsgId, setLastMeshMsgId] = useState<string | null>(null);

  const localNode = meshManager.localNode;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // 1. Submit to central app state
    submitFieldReport({
      incidentType,
      location: { lat: 27.33, lng: 88.61, name: `${roadName}, ${districtName}` },
      state: stateName,
      district: districtName,
      roadName,
      severity,
      description: `${description} [PRAVAHA Offline Mesh]`,
      photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60',
      reporterName: `${reporterName} (${localNode.nodeId})`,
      reporterRole,
      affectedVehicleIds: ['veh-2048'],
      affectedShipmentIds: ['ship-2048'],
      verificationSource: 'Field Report',
      confidenceScore: 95,
    });

    // 2. Also register into PRAVAHA Mesh Store-and-Forward Engine
    const meshMsg = meshManager.createIncidentReport({
      incidentType,
      severity,
      road: roadName,
      latitude: 27.33,
      longitude: 88.61,
      description,
      reporterName,
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

            <div>
              <label className="block text-slate-700 font-bold mb-1">Photo Attachment</label>
              <div className="bg-[#F7F9FA] border border-slate-200 border-dashed rounded-xl p-2.5 flex items-center justify-between text-slate-500">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-[#087F8C]" />
                  <span className="text-[11px]">Landslide_NH10_photo.jpg</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Photo Attached</span>
              </div>
            </div>
          </div>

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

        {/* Incident Stream & Mesh Queue */}
        <div data-tour="offline-sync-queue" className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-display font-black text-sm text-slate-900">Field Reports Queue</h3>
            <span className="text-[11px] text-slate-400 font-mono">{incidents.length} total</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
            {incidents.map(inc => (
              <div key={inc.id} className="p-3.5 bg-[#F7F9FA] border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{inc.incidentType}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    inc.status === 'Pending Sync' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {inc.status}
                  </span>
                </div>
                <div className="text-slate-600 text-[11px] font-medium">{inc.roadName} ({inc.state})</div>
                <p className="text-slate-500 text-[11px] line-clamp-2">{inc.description}</p>
                <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-1.5 flex justify-between">
                  <span>By: {inc.reporterName}</span>
                  <span className="font-mono text-[#087F8C]">BLE Mesh</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
