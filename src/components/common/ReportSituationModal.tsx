import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Camera, CheckCircle2, Wifi, WifiOff, Send } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface ReportSituationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IncidentType = 'Landslide' | 'Flood' | 'Road Damage' | 'Bridge Damage' | 'Vehicle Breakdown' | 'Traffic Jam' | 'Other';

const INCIDENT_OPTIONS: { label: string; emoji: string; value: IncidentType }[] = [
  { label: 'Landslide', emoji: '⛰️', value: 'Landslide' },
  { label: 'Flood', emoji: '🌊', value: 'Flood' },
  { label: 'Road Damage', emoji: '🚧', value: 'Road Damage' },
  { label: 'Bridge Damage', emoji: '🌉', value: 'Bridge Damage' },
  { label: 'Vehicle Breakdown', emoji: '🚛', value: 'Vehicle Breakdown' },
  { label: 'Traffic Jam', emoji: '🚦', value: 'Traffic Jam' },
  { label: 'Other', emoji: '📌', value: 'Other' },
];

const SEVERITY_OPTIONS = [
  { label: 'Critical – Road Blocked', value: 'Critical', color: 'border-red-400 text-red-700 bg-red-50' },
  { label: 'High – Single Lane', value: 'High', color: 'border-orange-400 text-orange-700 bg-orange-50' },
  { label: 'Moderate – Slow Traffic', value: 'Moderate', color: 'border-amber-400 text-amber-700 bg-amber-50' },
  { label: 'Low – Caution Only', value: 'Low', color: 'border-green-400 text-green-700 bg-green-50' },
];

export const ReportSituationModal: React.FC<ReportSituationModalProps> = ({ isOpen, onClose }) => {
  const { roads, isOffline, submitFieldReport } = useAppState();

  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [severity, setSeverity] = useState<string>('Critical');
  const [roadId, setRoadId] = useState<string>(roads[0]?.id ?? '');
  const [description, setDescription] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedRoad = roads.find((r) => r.id === roadId) ?? roads[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      submitFieldReport({
        incidentType: incidentType as any,
        severity: severity as any,
        roadName: selectedRoad?.roadName ?? 'Unknown Road',
        state: selectedRoad?.state ?? 'Unknown State',
        district: selectedRoad?.district ?? 'Unknown District',
        description: description.trim(),
        location: selectedRoad?.startPoint ?? { lat: 26.14, lng: 91.74, name: 'Guwahati' },
        reporterName: 'Platform User',
        reporterRole: 'Situation Reporter',
        affectedVehicleIds: [],
        affectedShipmentIds: [],
        verificationSource: 'Field Report',
        confidenceScore: 75,
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1000);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setDescription('');
    setIncidentType('Landslide');
    setSeverity('Critical');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${isOffline ? 'bg-amber-500' : 'bg-red-600'} text-white`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Report Road Situation</h2>
              <p className="text-[11px] text-white/80">
                {isOffline ? 'Offline — will sync when connected' : 'Report goes live immediately'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 text-[11px] font-bold bg-white/20 px-2 py-1 rounded-lg`}>
              {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              <span>{isOffline ? 'OFFLINE' : 'LIVE'}</span>
            </div>
            <button onClick={handleClose} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success State */}
        {isSubmitted ? (
          <div className="p-10 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            <h3 className="font-extrabold text-xl text-slate-900">Situation Reported!</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              {isOffline
                ? 'Your report has been saved locally and will automatically sync to Command Center when connectivity is restored.'
                : 'Your incident report has been transmitted to the Command Center and field officers have been notified.'}
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono">
              ID: INC-{Date.now().toString().slice(-6)} | {incidentType} | {severity} Severity
            </div>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 bg-[#087F8C] hover:bg-[#075E68] text-white font-bold rounded-xl transition-colors cursor-pointer text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Incident Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Incident Type</label>
              <div className="grid grid-cols-4 gap-2">
                {INCIDENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIncidentType(opt.value)}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                      incidentType === opt.value
                        ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-base mb-0.5">{opt.emoji}</div>
                    <div className="text-[10px] leading-tight">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Road & Severity Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                  Affected Road
                </label>
                <select
                  value={roadId}
                  onChange={(e) => setRoadId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#087F8C]"
                >
                  {roads.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roadName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#087F8C]"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observation (required)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="Describe what you observed — blockage size, cause, estimated clearance time..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#087F8C] resize-none"
              />
            </div>

            {/* GPS Tag strip */}
            <div className="flex items-center space-x-2 text-xs bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-[#087F8C] shrink-0" />
              <div>
                <span className="font-bold text-[#087F8C]">GPS: Auto-Tagged</span>
                <span className="text-slate-500 ml-2">
                  {selectedRoad ? `${selectedRoad.startPoint.lat.toFixed(3)}° N, ${selectedRoad.startPoint.lng.toFixed(3)}° E — ${selectedRoad.state}` : 'Locating...'}
                </span>
              </div>
              <span className="ml-auto flex items-center space-x-1 text-slate-500">
                <Camera className="w-3.5 h-3.5" />
                <span>Photo Ready</span>
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!description.trim() || isSubmitting}
              className={`w-full py-3 font-bold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isSubmitting
                  ? 'bg-slate-500 text-white cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Situation Report</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
