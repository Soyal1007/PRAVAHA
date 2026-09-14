import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Play,
  User,
  Compass,
  MapPin,
  HelpCircle,
  Radio,
  AlertTriangle,
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

interface InSituGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: string) => void;
  onOpenReportModal: () => void;
  onOpenAIChat: () => void;
  currentView?: string;
  initialRole?: string;
}

export const InSituGuidedTour: React.FC<InSituGuidedTourProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
  onOpenReportModal,
  onOpenAIChat,
  currentView = 'landingPage',
  initialRole,
}) => {
  const { currentUser } = useAuth();

  // Active Tour Selection: Area, Role, or Master
  const [activeTourId, setActiveTourId] = useState<string>('master');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showSelectorMenu, setShowSelectorMenu] = useState<boolean>(false);

  // Voice Dictation (Text-to-Speech) State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Automatically pick the most context-aware tour when opened
  useEffect(() => {
    if (!isOpen) return;

    const effectiveRole = initialRole || currentUser?.role;
    if (effectiveRole && ROLE_TOURS[effectiveRole]) {
      setActiveTourId(`role-${effectiveRole}`);
    } else if (AREA_TOURS[currentView]) {
      setActiveTourId(`area-${currentView}`);
    } else {
      setActiveTourId('master');
    }
    setCurrentStepIndex(0);
  }, [isOpen, currentView, initialRole, currentUser]);

  // Resolve current active tour object
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

  // Format text for fluid, natural speech dictation
  const buildSpokenText = (step: TourStep, config: GuidedTourConfig): string => {
    // Clean up title (replace "1. " with "Step 1: ")
    const cleanTitle = step.title.replace(/^(\d+)\.\s*/, 'Step $1: ');
    
    // Expand abbreviations for smooth dictation
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

  // Speech Dictation Hook
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    if (!isOpen || !isVoiceEnabled || !currentStep) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const textToDictate = buildSpokenText(currentStep, activeConfig);
    const utterance = new SpeechSynthesisUtterance(textToDictate);

    // Natural, smooth speech settings
    utterance.rate = 0.88; // Gentle, easy-to-follow pace
    utterance.pitch = 1.0;

    // Pick cleanest English voice
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

    // Short delay to sync smoothly with visual spotlight placement
    const speechTimer = setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 280);

    return () => {
      clearTimeout(speechTimer);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [currentStepIndex, activeTourId, isOpen, isVoiceEnabled, currentStep]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Element spotlight positioning
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.requiredView) {
      onNavigateToView(currentStep.requiredView);
    }

    const timer = setTimeout(() => {
      if (currentStep.targetSelector) {
        const el = document.querySelector(currentStep.targetSelector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            setTargetRect(el.getBoundingClientRect());
          }, 180);
          return;
        }
      }
      setTargetRect(null);
    }, 120);

    return () => clearTimeout(timer);
  }, [currentStepIndex, activeTourId, isOpen, onNavigateToView]);

  useEffect(() => {
    const handleUpdate = () => {
      if (!isOpen || !currentStep?.targetSelector) return;
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, activeTourId, currentStepIndex]);

  if (!isOpen || !currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (!isLast) setCurrentStepIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleAction = () => {
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
    setShowSelectorMenu(false);
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

  // Compute tooltip coordinates
  let tooltipTop = 120;
  let tooltipLeft = 100;
  const cardWidth = 420;
  const cardHeight = 330;

  if (targetRect) {
    const margin = 16;
    const spaceBelow = window.innerHeight - targetRect.bottom;

    if (currentStep.tooltipPosition === 'top' || spaceBelow < cardHeight + 20) {
      tooltipTop = targetRect.top - cardHeight - margin;
    } else {
      tooltipTop = targetRect.bottom + margin;
    }

    tooltipLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;

    tooltipLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, tooltipLeft));
    tooltipTop = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, tooltipTop));
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto font-body select-none">
      {/* Spotlight Backdrop Overlay */}
      {targetRect ? (
        <div
          className="fixed z-50 rounded-2xl border-2 border-teal-400 pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
          }}
        />
      ) : (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Floating Popover Tooltip Card */}
      <div
        className="fixed z-50 w-[420px] bg-slate-900 text-white p-5 rounded-3xl border border-slate-700/90 shadow-2xl transition-all duration-300 ease-out space-y-4 font-body"
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
        }}
      >
        {/* Row 1: Brand Logo, Title, Step Count & Close Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="PRAVAHA Logo"
              className="w-8 h-8 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white tracking-wide">
                  PRAVAHA Tour
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                {activeConfig.title}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Category Badge, Voice Toggle & Switch Tour Controls */}
        <div className="flex items-center justify-between bg-slate-950/70 px-3 py-2 rounded-2xl border border-slate-800/80 text-xs">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
            {activeConfig.category === 'role'
              ? `Role: ${activeConfig.targetRole}`
              : activeConfig.category === 'area'
              ? `Area Tour`
              : `Master Platform Tour`}
          </span>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Voice Dictation Toggle Button */}
            <button
              onClick={toggleVoice}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border flex items-center space-x-1.5 cursor-pointer transition-all ${
                isVoiceEnabled
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={isVoiceEnabled ? 'Voice Dictation Active (Click to Mute)' : 'Click to Enable Voice Dictation'}
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 className={`w-3.5 h-3.5 text-teal-300 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  <span>Voice ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Voice OFF</span>
                </>
              )}
            </button>

            {/* Tour Switcher Button */}
            <button
              onClick={() => setShowSelectorMenu(!showSelectorMenu)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-extrabold border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
              title="Change Guided Tour"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch</span>
            </button>
          </div>
        </div>

        {/* Tour Switcher Menu Dropdown */}
        {showSelectorMenu && (
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs animate-fadeIn">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Select Specific Guided Tour:
            </div>
            
            {/* Role Tours */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-teal-400 flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>Specific User Role Tours:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(ROLE_TOURS).map((rKey) => (
                  <button
                    key={rKey}
                    onClick={() => switchTour(`role-${rKey}`)}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-colors cursor-pointer truncate ${
                      activeTourId === `role-${rKey}`
                        ? 'bg-[#087F8C] text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {rKey} Tour
                  </button>
                ))}
              </div>
            </div>

            {/* Area Tours */}
            <div className="space-y-1 pt-1.5 border-t border-slate-900">
              <div className="text-[10px] font-bold text-amber-400 flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>Specific Area / Workspace Tours:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                {Object.keys(AREA_TOURS).map((aKey) => (
                  <button
                    key={aKey}
                    onClick={() => switchTour(`area-${aKey}`)}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-colors cursor-pointer truncate ${
                      activeTourId === `area-${aKey}`
                        ? 'bg-[#087F8C] text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {AREA_TOURS[aKey].title.replace(' Tour', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Master Tour */}
            <button
              onClick={() => switchTour('master')}
              className={`w-full text-center py-1.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${
                activeTourId === 'master'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Master Platform Overview Tour
            </button>
          </div>
        )}

        {/* Step Title & Subtitle with Speaking Status Indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider">
              {activeConfig.title}
            </span>
            {isVoiceEnabled && isSpeaking && (
              <span className="text-[10px] font-extrabold text-teal-300 flex items-center space-x-1 animate-pulse bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/30">
                <Volume2 className="w-3 h-3 text-teal-300" />
                <span>Speaking...</span>
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-white leading-tight">
            {currentStep.title}
          </h3>
          <p className="text-xs font-bold text-teal-300">{currentStep.subtitle}</p>
        </div>

        {/* Description & Key Points */}
        <div className="space-y-2.5">
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {currentStep.description}
          </p>

          {currentStep.keyPoints && currentStep.keyPoints.length > 0 && (
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-[11px]">
              {currentStep.keyPoints.map((pt, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{pt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        {currentStep.actionLabel && (
          <button
            onClick={handleAction}
            className="w-full py-2.5 bg-[#087F8C] hover:bg-[#075E68] text-white text-xs font-extrabold rounded-2xl transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current text-teal-200" />
            <span>{currentStep.actionLabel}</span>
          </button>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentStepIndex === idx ? 'bg-teal-400 w-4' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 shadow-sm"
            >
              <span>Finish</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-[#087F8C] hover:bg-[#075E68] text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
