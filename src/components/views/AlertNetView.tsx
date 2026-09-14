import React from 'react';
import { Bell, AlertTriangle, CheckCircle2, Navigation, MessageSquare, PhoneCall } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';

interface AlertNetViewProps {
  onNavigateToView: (view: string) => void;
}

export const AlertNetView: React.FC<AlertNetViewProps> = ({ onNavigateToView }) => {
  const { alerts, acknowledgeAlert, notifyDrivers, notifyAuthority } = useAppState();
  const { t } = useLanguage();

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('alertNet')} Emergency Center</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time severity alert stream with state-mutating resolution controls.
          </p>
        </div>
      </div>

      {/* Alert Stream */}
      <div data-tour="alert-broadcast-card" className="space-y-4">
        {alerts.map(alt => {
          const isCritical = alt.severity === 'Critical';

          return (
            <div
              key={alt.id}
              className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                alt.acknowledged
                  ? 'border-slate-200 bg-slate-50/50'
                  : isCritical
                  ? 'border-red-300 ring-2 ring-red-500/10'
                  : 'border-amber-300'
              }`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{alt.title}</h3>
                    <p className="text-xs text-slate-500">{alt.corridorOrLocation} • {new Date(alt.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {alt.severity}
                  </span>
                  {alt.acknowledged && (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                      ACKNOWLEDGED
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 font-medium">{alt.description}</p>

              {/* Alert Metrics */}
              <div className="grid grid-cols-3 gap-3 bg-[#F7F9FA] p-2.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Affected Shipments</span>
                  <span className="font-bold text-slate-800">{alt.affectedShipmentsCount} Shipments</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Affected Vehicles</span>
                  <span className="font-bold text-slate-800">{alt.affectedVehiclesCount} Trucks</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Estimated Delay</span>
                  <span className="font-bold text-red-600">+{alt.estimatedDelayMinutes} Mins</span>
                </div>
              </div>

              {/* State Mutating Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onNavigateToView('routeGuard')}
                  className="bg-[#087F8C] hover:bg-[#075E68] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Reroute Shipments</span>
                </button>

                <button
                  onClick={() => notifyDrivers(alt.id)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Notify Drivers</span>
                </button>

                <button
                  onClick={() => notifyAuthority(alt.id)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Notify Authority</span>
                </button>

                {!alt.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alt.id)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer ml-auto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Acknowledge</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
