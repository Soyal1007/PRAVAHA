import React, { useState, useEffect } from 'react';
import { ArrowRight, Truck, MapPin, ShieldCheck } from 'lucide-react';

interface StartupSplashScreenProps {
  onComplete: () => void;
}

export const StartupSplashScreen: React.FC<StartupSplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusIndex, setStatusIndex] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);

  const STATUS_MESSAGES = [
    'Loading mountain corridor GIS maps...',
    'Connecting relief fleet telematics...',
    'Verifying offline sync queues & IndexedDB...',
    'PRAVAHA platform ready.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsFading(true);
            setTimeout(onComplete, 500);
          }, 350);
          return 100;
        }
        return prev + 3;
      });
    }, 35);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (progress < 33) setStatusIndex(0);
    else if (progress < 66) setStatusIndex(1);
    else if (progress < 95) setStatusIndex(2);
    else setStatusIndex(3);
  }, [progress]);

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(onComplete, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-6 transition-opacity duration-700 ease-in-out font-body ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow effect */}
      <div className="absolute w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        {/* Brand Logo & Name */}
        <div className="space-y-5 flex flex-col items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#087F8C] rounded-3xl blur-xl opacity-40 animate-pulse"></div>
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-700/80 p-2.5 flex items-center justify-center shadow-2xl relative">
              <img
                src="/logo.png"
                alt="PRAVAHA Logo"
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-black tracking-wider text-white">
              PRAVAHA
            </h1>
            <p className="text-xs text-teal-300 font-extrabold uppercase tracking-widest">
              Predict. Navigate. Deliver.
            </p>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              A SAFER, MORE CONNECTED NORTHEAST
            </p>
          </div>
        </div>

        {/* Status & Progress Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="truncate">{STATUS_MESSAGES[statusIndex]}</span>
            <span className="text-teal-400 font-mono font-bold">{progress}%</span>
          </div>

          <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-[#087F8C] to-emerald-400 rounded-full transition-all duration-100 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2">
            <MapPin className={`w-4 h-4 ${progress > 33 ? 'text-teal-400' : 'text-slate-600'}`} />
            <span>GIS Corridors</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2">
            <Truck className={`w-4 h-4 ${progress > 66 ? 'text-teal-400' : 'text-slate-600'}`} />
            <span>Relief Fleet</span>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer pt-2"
        >
          <span>Skip to platform</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
