import React from 'react';
import { ShieldCheck, FileCheck, AlertTriangle, ArrowLeft } from 'lucide-react';

interface TermsViewProps {
  onNavigateToView: (view: string) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigateToView }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-8 font-body">
      <button
        onClick={() => onNavigateToView('landingPage')}
        className="inline-flex items-center space-x-2 text-xs font-bold text-[#087F8C] hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Main Landing Page</span>
      </button>

      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center space-x-2 bg-teal-50 text-[#087F8C] border border-teal-200 px-3 py-1 rounded-md text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>TERMS OF SERVICE</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900">Terms & Conditions</h1>
        <p className="text-xs text-slate-500">Effective Date: September 13, 2026 | PRAVAHA GIS Logistics Engine</p>
      </div>

      <div className="space-y-6 text-xs text-slate-700 leading-relaxed bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-[#087F8C]" />
            <span>1. Operational Usage</span>
          </h2>
          <p>
            PRAVAHA is designed for authorized disaster response personnel, fleet logistics operators, drivers, and inter-agency authority viewers. Users must maintain credentials securely and log incidents truthfully.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>2. Dynamic Rerouting & Driver Safety</span>
          </h2>
          <p>
            RouteGuard AI suggestions provide real-time hazard avoidance routes based on active GIS sensor feeds. Drivers must exercise professional judgment regarding physical road safety during adverse weather conditions.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-900">3. System Availability & Service Levels</h2>
          <p>
            The platform is engineered with PWA offline-first capabilities to operate during mountain network outages. Emergency incident queues sync automatically when connectivity is restored.
          </p>
        </section>
      </div>
    </div>
  );
};
