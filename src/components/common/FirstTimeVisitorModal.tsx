import React from 'react';
import { Sparkles, ArrowRight, HelpCircle, ShieldCheck, MapPin, Navigation } from 'lucide-react';

interface FirstTimeVisitorModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const FirstTimeVisitorModal: React.FC<FirstTimeVisitorModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-body animate-fade-in">
      <div className="relative max-w-md w-full bg-slate-900 border border-slate-700/80 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500"></div>
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#087F8C]/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Brand Icon & Welcome Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center shadow-lg shrink-0">
            <img src="/logo.png" alt="PRAVAHA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Welcome Explorer</span>
            </div>
            <h2 className="font-display font-black text-xl text-white tracking-tight mt-0.5">
              Welcome to PRAVAHA
            </h2>
          </div>
        </div>

        {/* Notification Question & Content */}
        <div className="bg-slate-800/70 border border-slate-700/70 p-4 rounded-2xl space-y-3">
          <div className="flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-white">
                Is this your first time visiting the site?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-body">
                We strongly recommend taking our interactive guided tour. It highlights marked GIS landslide corridors, RouteGuard AI alternate bypasses, offline field collection, and 5 isolated role workspaces!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>Interactive GIS</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center space-x-2">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>RouteGuard AI</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={onAccept}
            className="w-full py-3.5 bg-gradient-to-r from-[#087F8C] to-emerald-600 hover:from-[#075E68] hover:to-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-teal-200 group-hover:rotate-12 transition-transform" />
            <span>Yes, Show Me the Guided Tour</span>
          </button>

          <button
            onClick={onDecline}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs rounded-2xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>No, Skip to Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
