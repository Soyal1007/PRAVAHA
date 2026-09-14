import React from 'react';
import { HelpCircle, Phone, BookOpen, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const HelpSupportView: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-[#087F8C]" />
          <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('helpSupport')} & Documentation</h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          User guides, emergency hotlines, and operational procedures for PRAVAHA platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Hotlines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Emergency Hotlines & Control Rooms
          </h3>

          <div className="space-y-2">
            <div className="p-3 bg-[#F7F9FA] rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800">State Disaster Management Authority (SDMA)</span>
                <div className="text-slate-500 text-[11px]">Assam / Sikkim / Manipur Hotline</div>
              </div>
              <span className="font-mono font-bold text-[#087F8C]">1070 / 1077</span>
            </div>

            <div className="p-3 bg-[#F7F9FA] rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800">National Highways Authority (NHAI) Control</span>
                <div className="text-slate-500 text-[11px]">Northeast Corridor Emergency Desk</div>
              </div>
              <span className="font-mono font-bold text-[#087F8C]">1033</span>
            </div>

            <div className="p-3 bg-[#F7F9FA] rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800">PRAVAHA Master Control Tower</span>
                <div className="text-slate-500 text-[11px]">Guwahati Central Operations</div>
              </div>
              <span className="font-mono font-bold text-[#087F8C]">+91 361 294 8200</span>
            </div>
          </div>
        </div>

        {/* User Guides */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Platform Operating Principles
          </h3>

          <div className="space-y-2 text-slate-600 text-[11px] space-y-1.5">
            <p><strong>1. Shared Application State:</strong> All views (Command Center, Live Map, RouteGuard, FleetPulse) read and write to a single centralized state engine.</p>
            <p><strong>2. RouteGuard Scoring:</strong> Route recommendations follow deterministic math combining distance, estimated duration, weather risk, and road blockage status.</p>
            <p><strong>3. Field Officer Offline Queue:</strong> Field reports submitted while offline are stored in browser LocalStorage/IndexedDB and synced when online.</p>
            <p><strong>4. Multilingual Dictionary:</strong> Toggle between English, Hindi, Bengali, Assamese, Manipuri, Nepali, Khasi, and Mizo at any time in the header bar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
