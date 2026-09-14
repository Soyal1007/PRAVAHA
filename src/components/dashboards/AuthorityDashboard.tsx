import React from 'react';
import { Building2, FileText, PhoneCall, AlertTriangle, ShieldCheck, HeartPulse, Box, Activity } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { InteractivePieChart } from '../common/charts/InteractivePieChart';
import { InteractiveBarChart } from '../common/charts/InteractiveBarChart';

interface DashboardProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const AuthorityDashboard: React.FC<DashboardProps> = ({ onNavigateToView, onSelectEntity }) => {
  const { warehouses, hospitals, roads, incidents } = useAppState();
  const { t } = useLanguage();

  const activeIncidents = incidents.filter((i) => i.status === 'Active' || i.status === 'Verified');
  const criticalWarehouses = warehouses.filter((w) => w.riskLevel === 'Critical' || w.daysRemaining < 7);

  // Chart 1 Data: Hospital Emergency Access Pie Chart
  const hospitalAccessPieData = [
    { label: 'Clear Highway Access', value: hospitals.filter((h) => h.emergencyAccessStatus === 'Clear').length, color: '#10B981' },
    { label: 'Restricted Access', value: hospitals.filter((h) => h.emergencyAccessStatus === 'Restricted').length, color: '#F59E0B' },
    { label: 'Cut Off / Blocked', value: hospitals.filter((h) => h.emergencyAccessStatus === 'Cut Off').length, color: '#EF4444' },
  ];

  // Chart 2 Data: ICU Bed Capacity Bar Chart
  const icuBarData = hospitals.map((h) => ({
    label: h.name,
    value: h.icuAvailable,
    subtext: `${h.district} - Bed Cap: ${h.bedCapacity}`,
    color: h.icuAvailable < 5 ? '#EF4444' : h.icuAvailable < 15 ? '#F59E0B' : '#087F8C',
  }));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-body">
      {/* Authority Banner */}
      <div className="bg-gradient-to-r from-[#087F8C] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
            <Building2 className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="font-display font-black text-2xl tracking-tight text-white">
                State Disaster Management Command (Authority Viewer)
              </h2>
              <span className="bg-teal-400/20 text-teal-200 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border border-teal-400/30">
                SDMA Executive Read-Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl">
              High-level regional corridor risk synthesis, essential supply reserve auditing, and hospital accessibility tracking.
            </p>
          </div>
        </div>

        <button
          data-tour="authority-broadcast-btn"
          onClick={() => onNavigateToView('reports')}
          className="bg-white text-[#087F8C] hover:bg-teal-50 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <FileText className="w-4.5 h-4.5" />
          <span>Export Official SDMA Report PDF</span>
        </button>
      </div>

      {/* State Disruption Summary Cards - Airy & Spacious */}
      <div data-tour="authority-regional-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Active Road Incidents
          </div>
          <div className="text-3xl font-black text-red-600 font-display">
            {activeIncidents.length} Verified
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">NH-10 & NH-2 disaster zones</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Depots at Shortage Risk
          </div>
          <div className="text-3xl font-black text-amber-600 font-display">
            {criticalWarehouses.length} Depots
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">&lt; 7 Days stock remaining</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Hospitals Monitored
          </div>
          <div className="text-3xl font-black text-emerald-600 font-display">
            {hospitals.length} Centers
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">Emergency access verified</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Northeast States Covered
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">8 States</div>
          <p className="text-xs text-slate-500 font-medium pt-1">Assam, Sikkim, Manipur, Mizoram...</p>
        </div>
      </div>

      {/* GRAPHICAL REPRESENTATIONS */}
      <div data-tour="authority-icu-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InteractivePieChart
          title="Hospital Highway Emergency Access (Donut Chart)"
          subtitle="Proportion of emergency healthcare facilities with open vs blocked corridor access."
          data={hospitalAccessPieData}
          donut={true}
          centerText={String(hospitals.length)}
          centerSubtext="Hospitals Monitored"
        />

        <InteractiveBarChart
          title="ICU Bed Availability Stream (Bar Chart)"
          subtitle="Current available ICU emergency beds by hospital center."
          data={icuBarData}
          horizontal={true}
          unit="ICU beds"
        />
      </div>

      {/* Grid: Hospital Access Stream & Commodity Reserve Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hospital Accessibility Stream */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <HeartPulse className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-base text-slate-900">
                Hospital Emergency Access & ICU Capacity
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Health Directorate Stream</span>
          </div>

          <div className="space-y-3 text-xs">
            {hospitals.map((h) => (
              <div
                key={h.id}
                className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">{h.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {h.state} ({h.district})
                  </div>
                  <div className="text-xs text-slate-700 mt-1 font-medium">
                    Total Beds: {h.bedCapacity} | ICU Available:{' '}
                    <strong className="text-emerald-700 font-mono text-sm">{h.icuAvailable}</strong>
                  </div>
                </div>

                <div className="text-right space-y-1.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      h.emergencyAccessStatus === 'Clear'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    Access: {h.emergencyAccessStatus}
                  </span>
                  <span className="text-xs text-slate-500 block font-mono">
                    Stock: {h.medicalSupplyStockLevel}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commodity Reserve Depots */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Box className="w-5 h-5 text-[#087F8C]" />
              <h3 className="font-bold text-base text-slate-900">
                Regional Essential Commodities Monitor
              </h3>
            </div>
            <button
              onClick={() => onNavigateToView('supplyGrid')}
              className="text-xs text-[#087F8C] font-extrabold hover:underline cursor-pointer bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100"
            >
              SupplyGrid Details
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {warehouses.map((w) => (
              <div
                key={w.id}
                className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">{w.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {w.category} stock: <span className="font-mono font-bold text-slate-800">{w.availableStock}</span> {w.unitType}
                  </div>
                </div>

                <div className="text-right space-y-1.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      w.daysRemaining < 7
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {w.daysRemaining} Days Stock
                  </span>
                  <span className="text-xs text-slate-500 block font-mono">
                    Incoming: {w.incomingShipmentsCount} lots
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
