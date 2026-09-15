import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Play,
  User,
  MapPin,
  Compass,
  HelpCircle,
  Shield,
  Truck,
  Radio,
  Building2,
  Activity,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ROLE_TOURS,
  AREA_TOURS,
  MASTER_TOUR,
  GuidedTourConfig,
  TourStep,
} from '../../data/guidedTours';
import { useAuth } from '../../context/AuthContext';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: string) => void;
  onOpenReportModal: () => void;
  onOpenAIChat: () => void;
  currentView?: string;
  initialRole?: string;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
  onOpenReportModal,
  onOpenAIChat,
  currentView = 'landingPage',
  initialRole,
}) => {
  const { currentUser } = useAuth();
  const [activeTourId, setActiveTourId] = useState<string>('master');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Voice Dictation State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const effectiveRole = currentUser?.role || initialRole;
    if (effectiveRole && ROLE_TOURS[effectiveRole]) {
      setActiveTourId(`role-${effectiveRole}`);
    } else if (AREA_TOURS[currentView]) {
      setActiveTourId(`area-${currentView}`);
    } else {
      setActiveTourId('master');
    }
    setCurrentStepIndex(0);
  }, [isOpen, currentUser?.role, initialRole]);

  const getActiveConfig = (): GuidedTourConfig => {
    if (activeTourId === 'master') return MASTER_TOUR;
    if (activeTourId.startsWith('role-')) {
      const rName = activeTourId.replace('role-', '');
      return ROLE_TOURS[rName] || MASTER_TOUR;
    }
    if (activeTourId.startsWith('area-')) {
      const vName = activeTourId.replace('area-', '');
      return AREA_TOURS[vName] || MASTER_TOUR;
    }
    return MASTER_TOUR;
  };

  const activeConfig = getActiveConfig();
  const steps = activeConfig.steps || MASTER_TOUR.steps;
  const currentStep: TourStep = steps[currentStepIndex] || steps[0];

  // Speech Dictation Formatter
  const buildSpokenText = (step: TourStep, config: GuidedTourConfig): string => {
    const cleanTitle = step.title.replace(/^(\d+)\.\s*/, 'Step $1: ');
    const readableSubtitle = step.subtitle
      .replace(/KPIs/g, 'K P I\'s')
      .replace(/GIS/g, 'G I S')
      .replace(/AI/g, 'A I')
      .replace(/HQ/g, 'Headquarters')
      .replace(/SOS/g, 'S O S');

    const readableDescription = step.description
      .replace(/KPIs/g, 'K P I\'s')
      .replace(/GIS/g, 'G I S')
      .replace(/AI/g, 'A I')
      .replace(/NH-/g, 'National Highway ');

    let bulletText = '';
    if (step.keyPoints && step.keyPoints.length > 0) {
      bulletText = ' Key features include: ' + step.keyPoints.join('. ');
    }

    return `${cleanTitle}... ${readableSubtitle}... ${readableDescription}.${bulletText}`;
  };

  // Speech Dictation Effect
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    if (!isOpen || !isVoiceEnabled || !currentStep) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const textToDictate = buildSpokenText(currentStep, activeConfig);
    const utterance = new SpeechSynthesisUtterance(textToDictate);
    utterance.rate = 0.88; // Gentle, clear speed
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural'))) ||
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Daniel') || v.name.includes('Alex'))) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    const timer = setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 200);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [currentStepIndex, activeTourId, isOpen, isVoiceEnabled, currentStep]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (!isLast) setCurrentStepIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleAction = () => {
    if (currentStep.requiredView) {
      onNavigateToView(currentStep.requiredView);
    }
    if (currentStep.actionType === 'report') {
      onOpenReportModal();
    } else if (currentStep.actionType === 'aiChat') {
      onOpenAIChat();
    } else if (currentStep.actionType === 'sos') {
      alert('🚨 Driver SOS Emergency Alarm Dispatched to Disaster HQ & Logistics Operators!');
    } else if (currentStep.actionType === 'sync') {
      alert('🔄 IndexedDB Local Observations Synchronized with Central GIS Engine!');
    }
  };

  const switchTour = (tourId: string) => {
    setActiveTourId(tourId);
    setCurrentStepIndex(0);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsVoiceEnabled(false);
      setIsSpeaking(false);
    } else {
      setIsVoiceEnabled(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 font-body select-none">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Modal Header with Attached Logo & Voice Toggle */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="PRAVAHA Logo"
              className="w-10 h-10 object-contain rounded-xl bg-slate-800/80 p-1 border border-slate-700 shadow-md"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-lg tracking-tight text-white">
                  PRAVAHA Guided Tour
                </span>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                  {activeConfig.category === 'role'
                    ? `Role: ${activeConfig.targetRole}`
                    : activeConfig.category === 'area'
                    ? `Area Tour`
                    : `Master Tour`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Step {currentStepIndex + 1} of {steps.length} — {activeConfig.title}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Voice Dictation Button */}
            <button
              onClick={toggleVoice}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 cursor-pointer transition-colors ${
                isVoiceEnabled
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={isVoiceEnabled ? 'Voice Dictation Enabled (Click to Mute)' : 'Click to Enable Voice Dictation'}
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 className={`w-4 h-4 text-teal-300 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  <span>Voice Dictation ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Voice Muted</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tour Category Switcher Tabs */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">
              User Roles:
            </span>
            {Object.keys(ROLE_TOURS).map((rKey) => (
              <button
                key={rKey}
                onClick={() => switchTour(`role-${rKey}`)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeTourId === `role-${rKey}`
                    ? 'bg-[#087F8C] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {rKey}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {AREA_TOURS[currentView] && (
              <button
                onClick={() => switchTour(`area-${currentView}`)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTourId === `area-${currentView}`
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Current Area Tour
              </button>
            )}

            <button
              onClick={() => switchTour('master')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTourId === 'master'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Master Tour
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5 shrink-0">
          <div
            className="bg-[#087F8C] h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Main Body Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-[#087F8C]/15 border border-[#087F8C]/30 text-[#087F8C] shrink-0">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {activeConfig.title} — Step {currentStepIndex + 1}
                </span>
                {isVoiceEnabled && isSpeaking && (
                  <span className="text-xs font-extrabold text-[#087F8C] flex items-center space-x-1 animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Dictating...</span>
                  </span>
                )}
              </div>
              <h3 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs font-bold text-[#087F8C]">{currentStep.subtitle}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-body">
            {currentStep.description}
          </p>

          {/* Key Points */}
          {currentStep.keyPoints && currentStep.keyPoints.length > 0 && (
            <div className="bg-[#F7F9FA] p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Key Features & Instructions:
              </h4>
              <div className="space-y-2">
                {currentStep.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Launcher */}
          {currentStep.actionLabel && (
            <div className="p-3.5 bg-teal-50/90 border border-teal-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#087F8C] block">Execute or Test Feature:</span>
                <span className="text-[11px] text-slate-600">Access workspace controls immediately</span>
              </div>
              <button
                onClick={handleAction}
                className="bg-[#087F8C] hover:bg-[#075E68] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current text-teal-200" />
                <span>{currentStep.actionLabel}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  currentStepIndex === idx ? 'bg-[#087F8C] w-6' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {isLast ? (
              <button
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  onClose();
                }}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1"
              >
                <span>Finish Guided Tour</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-[#087F8C] hover:bg-[#075E68] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
