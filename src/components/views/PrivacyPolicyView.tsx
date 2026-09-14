import React from 'react';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onNavigateToView: (view: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigateToView }) => {
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
          <Shield className="w-4 h-4" />
          <span>LEGAL & COMPLIANCE</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
        <p className="text-xs text-slate-500">Effective Date: September 13, 2026 | PRAVAHA GIS Logistics Engine</p>
      </div>

      <div className="space-y-6 text-xs text-slate-700 leading-relaxed bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#087F8C]" />
            <span>1. Data Collection & Geospatial Telemetry</span>
          </h2>
          <p>
            PRAVAHA processes real-time GPS telemetry, road hazard reports, and driver speed data exclusively for disaster relief optimization and emergency cargo routing. Vehicle telemetry is encrypted in transit and at rest.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-[#087F8C]" />
            <span>2. Offline Storage & Local Queue Management</span>
          </h2>
          <p>
            FieldLink reports created in zero-connectivity mountain dead-zones are temporarily cached in browser IndexedDB storage. Cached data automatically synchronizes with central state upon network restoration and is purged according to retention schedules.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#087F8C]" />
            <span>3. Inter-Agency Data Sharing</span>
          </h2>
          <p>
            Hazard data may be shared with verified National Disaster Management Authority (NDMA) partners and regional transport authorities strictly for emergency infrastructure clearance and life-saving operations.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-900">4. Contact & Data Officer</h2>
          <p>
            For privacy inquiries or data requests, contact the PRAVAHA Logistics Compliance Office at <span className="font-mono text-[#087F8C] font-bold">privacy@pravaha-gis.gov.in</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
