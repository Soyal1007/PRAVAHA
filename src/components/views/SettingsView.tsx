import React, { useState } from 'react';
import { Settings, Key, MapPin, CheckCircle, Save } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { getGoogleMapsApiKey, setGoogleMapsApiKey } from '../../config/maps';

export const SettingsView: React.FC = () => {
  const { userRole, setUserRole, isOffline, setIsOffline } = useAppState();
  const { t } = useLanguage();

  const [mapsKey, setMapsKey] = useState<string>(getGoogleMapsApiKey());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveMapsKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleMapsApiKey(mapsKey.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-[#087F8C]" />
          <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('settings')} & System Configuration</h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure platform defaults, telemetry polling intervals, Google Maps API key, and user permissions.
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5 text-xs">
        {/* Active Role & Network Controls */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Active Role & Network Simulation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Active User Role</label>
              <select
                value={userRole}
                onChange={e => setUserRole(e.target.value as any)}
                className="w-full bg-[#F7F9FA] border border-slate-200 rounded-lg px-3 py-2 font-bold text-[#087F8C] focus:outline-none cursor-pointer"
              >
                <option value="Logistics Administrator">Logistics Administrator</option>
                <option value="Logistics Operator">Logistics Operator</option>
                <option value="Field Officer">Field Officer</option>
                <option value="Driver">Driver</option>
                <option value="Authority Viewer">Authority Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Network Emulation</label>
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`w-full py-2 px-3 rounded-lg font-bold flex items-center justify-between border cursor-pointer ${
                  isOffline ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <span>Current Network State:</span>
                <span>{isOffline ? 'OFFLINE (Simulated)' : 'ONLINE'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* GIS & Google Maps Key Management */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#087F8C]" />
              <span>Google Maps Integration & GIS API Key</span>
            </h3>
            <span className="text-[10px] bg-teal-50 text-[#087F8C] font-mono font-bold px-2 py-0.5 rounded border border-teal-200">
              VITE_GOOGLE_MAPS_API_KEY
            </span>
          </div>

          <p className="text-slate-500 text-xs">
            Enter your Google Maps Javascript API Demo or Production key below. You can also edit <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200">.env</code> directly in your workspace root.
          </p>

          <form onSubmit={handleSaveMapsKey} className="space-y-3 max-w-xl">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={mapsKey}
                  onChange={e => setMapsKey(e.target.value)}
                  placeholder="Paste your Google Maps API key (AIzaSy...)"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F9FA] border border-slate-300 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:border-[#087F8C]"
                />
              </div>
              <button
                type="submit"
                className="bg-[#087F8C] hover:bg-[#075E68] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Save Key</span>
              </button>
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2 font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Google Maps API Key saved! Refresh the Live Map to reload GIS tiles.</span>
              </div>
            )}
          </form>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
          <span>PRAVAHA Platform Build 2.4.0 (Enterprise Release)</span>
          <span className="font-mono">React 19 + TypeScript + Google Maps JS API</span>
        </div>
      </div>
    </div>
  );
};
