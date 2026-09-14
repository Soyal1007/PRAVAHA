import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { useLanguage } from '../../context/LanguageContext';

export const DemoPlayerBar: React.FC = () => {
  const { isDemoActive, currentDemoStep, demoStepInfo, nextStep, prevStep, toggleAutoPlay, isAutoPlay, resetDemo } = useSimulation();
  const { t } = useLanguage();

  if (!isDemoActive) return null;

  const totalSteps = 12;
  const progressPercent = Math.min(Math.round((currentDemoStep / totalSteps) * 100), 100);

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 shadow-lg relative z-20 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Step Info */}
        <div className="flex items-start space-x-3">
          <div className="bg-[#087F8C] text-white px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap mt-0.5 shadow-xs">
            STEP {currentDemoStep} / 12
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-teal-300">{demoStepInfo.title}</h3>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 max-w-2xl">{demoStepInfo.description}</p>
            <p className="text-[11px] text-teal-400 font-mono mt-0.5">⚡ {demoStepInfo.actionSummary}</p>
          </div>
        </div>

        {/* Controls & Progress */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end w-32">
            <span className="text-[10px] text-slate-400 font-mono">{progressPercent}% Completed</span>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-[#087F8C] h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={prevStep}
              disabled={currentDemoStep <= 1}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-md text-xs font-medium cursor-pointer"
              title={t('prevStep')}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={toggleAutoPlay}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1 shadow-2xs cursor-pointer"
            >
              {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isAutoPlay ? 'Pause' : t('autoPlay')}</span>
            </button>

            <button
              onClick={nextStep}
              disabled={currentDemoStep >= totalSteps}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-md text-xs font-medium cursor-pointer flex items-center space-x-1"
              title={t('nextStep')}
            >
              <span>{t('nextStep')}</span>
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={resetDemo}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-md text-xs cursor-pointer ml-2"
              title={t('resetDemo')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
