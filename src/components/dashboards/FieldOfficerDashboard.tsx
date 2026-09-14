import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Camera, MapPin, Send, CheckCircle2, CloudOff, RefreshCw, Upload } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { IncidentType, RiskLevel } from '../../types';

interface DashboardProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const FieldOfficerDashboard: React.FC<DashboardProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { incidents, submitFieldReport, isOffline, pendingSyncCount, syncOfflineQueue } = useAppState();
  const { t } = useLanguage();

  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [severity, setSeverity] = useState<RiskLevel>('Critical');
  const [roadName, setRoadName] = useState<string>('NH-2 (Kohima - Imphal Highway)');
  const [stateName, setStateName] = useState<string>('Manipur');
  const [district, setDistrict] = useState<string>('Senapati');
  const [description, setDescription] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    submitFieldReport({
      incidentType,
      severity,
      roadName,
      state: stateName,
      district,
      description,
      location: {
        lat: 25.26,
        lng: 94.02,
        name: `${roadName}, ${district}`,
      },
      photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60',
      reporterName: 'Field Officer Bikram Sharma',
      reporterRole: 'Disaster Assessment Officer',
      affectedVehicleIds: ['veh-2048'],
      affectedShipmentIds: ['ship-2048'],
      verificationSource: 'Field Report',
      confidenceScore: 98,
    });

    setDescription('');
    setSubmittedMessage(
      isOffline
        ? 'Report saved locally to FieldLink Offline Queue!'
        : 'Field Report transmitted to Command Center & Verified!'
    );

    setTimeout(() => setSubmittedMessage(null), 5000);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      {/* Role Banner */}
      <div className="bg-[#087F8C] text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-xs">
            <ShieldAlert className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-xl tracking-tight">Field Incident & Assessment Portal (Officer)</h2>
              {isOffline ? (
                <span className="bg-amber-500 text-slate-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                  Offline Mode Active
                </span>
              ) : (
                <span className="bg-emerald-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                  Direct Live Sync
                </span>
              )}
            </div>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Submit ground-level disaster observations, road damage photos, and landslide blockages with instant route guard dispatch.
            </p>
          </div>
        </div>

        {pendingSyncCount > 0 && (
          <button
            onClick={syncOfflineQueue}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Sync {pendingSyncCount} Offline Report(s)</span>
          </button>
        )}
      </div>

      {submittedMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submittedMessage}</span>
        </div>
      )}

      {/* Main Grid: Form & Incident History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quick Report Submission Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-[#087F8C]" />
              <span>Submit Ground Incident Report</span>
            </h3>
            <span className="text-[10px] bg-teal-50 text-[#087F8C] font-bold px-2 py-0.5 rounded border border-teal-200">
              GPS Auto-Pin: 25.26° N, 94.02° E
            </span>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Incident Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Landslide', 'Flood', 'Road Damage', 'Bridge Damage', 'Traffic', 'Other'] as IncidentType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIncidentType(type)}
                    className={`py-2 px-2 rounded-lg font-semibold border cursor-pointer text-center transition-all ${
                      incidentType === type
                        ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-2xs'
                        : 'bg-[#F7F9FA] text-slate-700 border-slate-200 hover:bg-slate-200/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as RiskLevel)}
                  className="w-full p-2 bg-[#F7F9FA] border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  <option value="Critical">Critical (Road Blocked)</option>
                  <option value="High">High (Single Lane Pass)</option>
                  <option value="Moderate">Moderate (Slow Traffic)</option>
                  <option value="Low">Low (Caution Advised)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State / District</label>
                <input
                  type="text"
                  value={`${stateName} / ${district}`}
                  onChange={e => {
                    const parts = e.target.value.split('/');
                    if (parts[0]) setStateName(parts[0].trim());
                    if (parts[1]) setDistrict(parts[1].trim());
                  }}
                  className="w-full p-2 bg-[#F7F9FA] border border-slate-200 rounded-lg font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Affected Road / Highway Corridor</label>
              <input
                type="text"
                value={roadName}
                onChange={e => setRoadName(e.target.value)}
                className="w-full p-2 bg-[#F7F9FA] border border-slate-200 rounded-lg font-semibold text-slate-800"
                placeholder="e.g. NH-2 (Kohima - Imphal)"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Observation Details & Debris Estimate</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                required
                className="w-full p-2.5 bg-[#F7F9FA] border border-slate-200 rounded-lg font-normal text-slate-800 focus:outline-none focus:border-[#087F8C]"
                placeholder="Describe ground condition, block status, estimated clearance time..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#087F8C] hover:bg-[#075E68] text-white font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ground Assessment</span>
            </button>
          </form>
        </div>

        {/* Live Field Incident Log */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Recent Field Dispatches ({incidents.length})</h3>
            <button
              onClick={() => onNavigateToView('fieldLink')}
              className="text-xs text-[#087F8C] font-semibold hover:underline cursor-pointer"
            >
              View FieldLink Queue
            </button>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {incidents.map(inc => (
              <div key={inc.id} className="p-3 bg-[#F7F9FA] rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{inc.incidentType}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <div className="text-slate-600 font-medium">{inc.roadName} ({inc.state})</div>
                <p className="text-slate-700">{inc.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                  <span>Reporter: {inc.reporterName}</span>
                  <span className="font-bold text-[#087F8C]">Confidence: {inc.confidenceScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
