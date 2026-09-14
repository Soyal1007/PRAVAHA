import React from 'react';
import { CloudRain, Wind, Eye, Droplets, AlertTriangle } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';

export const WeatherCoreView: React.FC = () => {
  const { weatherEvents, triggerHeavyRainfall } = useAppState();
  const { t } = useLanguage();

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <CloudRain className="w-5 h-5 text-[#087F8C]" />
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('weatherCore')} Intelligence</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational meteorological monitoring tailored for Northeast India logistics corridors.
          </p>
        </div>
      </div>

      {/* Weather Grid */}
      <div data-tour="weather-radar-card" className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {weatherEvents.map(w => (
          <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-base text-slate-900">{w.locationName}</h3>
                <p className="text-xs text-slate-500">{w.state}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                w.floodRisk === 'Extreme' || w.floodRisk === 'High'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                Flood Risk: {w.floodRisk}
              </span>
            </div>

            {/* Condition Banner */}
            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 p-3 rounded-lg text-xs">
              <div>
                <span className="text-[10px] text-sky-700 font-bold uppercase block">Current Condition</span>
                <span className="font-bold text-slate-900 text-sm">{w.condition}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-sky-800">{w.rainfallMmHr} mm/hr</span>
                <span className="text-[10px] text-sky-600 block">Precipitation Rate</span>
              </div>
            </div>

            {/* Weather Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-[#F7F9FA] p-2.5 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Rainfall</span>
                  <span className="font-bold text-slate-800">{w.rainfallMmHr} mm</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Wind Speed</span>
                  <span className="font-bold text-slate-800">{w.windSpeedKmH} km/h</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Visibility</span>
                  <span className="font-bold text-slate-800">{w.visibilityMeters} m</span>
                </div>
              </div>
            </div>

            {/* Forecast text */}
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-700">24-Hour Corridor Impact Forecast:</span>
              <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">{w.forecast24h}</p>
            </div>

            <button
              onClick={() => triggerHeavyRainfall(w.locationName)}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate Torrential Rainstorm Event</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
