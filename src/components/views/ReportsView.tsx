import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Filter } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateLogisticsReport } from '../../services/pdfGenerator';

export const ReportsView: React.FC = () => {
  const { shipments, vehicles, roads, incidents, warehouses, userRole } = useAppState();
  const { t } = useLanguage();

  const [reportState, setReportState] = useState<string>('All');
  const [reportCategory, setReportCategory] = useState<string>('All');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleExportPDF = () => {
    generateLogisticsReport(
      'PRAVAHA Operational Corridor Report',
      reportState,
      shipments,
      vehicles,
      incidents,
      roads
    );

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="p-5 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#087F8C]" />
            <h2 className="font-bold text-xl text-slate-900 tracking-tight">{t('reports')} & Audit Exporter</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate executive PDF logistics summaries, corridor accessibility audits, and CSV datasets.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="bg-[#087F8C] hover:bg-[#075E68] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>{t('exportPDF')}</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Operational PDF Report generated and downloaded to local filesystem!</span>
        </div>
      )}

      {/* Report Configuration & Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Report Parameters & Scope
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-600 font-bold mb-1">State Scope</label>
            <select
              value={reportState}
              onChange={e => setReportState(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Northeast States (8 States)</option>
              <option value="Assam">Assam</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Manipur">Manipur</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Mizoram">Mizoram</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Tripura">Tripura</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Cargo Category</label>
            <select
              value={reportCategory}
              onChange={e => setReportCategory(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-slate-200 rounded-lg px-3 py-2 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Commodities</option>
              <option value="Medicines">Medicines & Medical Supplies</option>
              <option value="Food">Food & Grains</option>
              <option value="Construction Materials">Construction Materials</option>
              <option value="Agricultural Inputs">Agricultural Inputs</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Target Audience</label>
            <div className="bg-[#F7F9FA] border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800">
              Role: {userRole}
            </div>
          </div>
        </div>
      </div>

      {/* Report Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 text-[#087F8C]">
            <FileText className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-900">Corridor Risk & Accessibility Audit</h4>
          </div>
          <p className="text-xs text-slate-500">
            Comprehensive breakdown of road blockages, landslide risks, and weather exposure across NH-10, NH-2, NH-37, and NH-6.
          </p>
          <button
            onClick={handleExportPDF}
            className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Generate Audit PDF
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 text-[#087F8C]">
            <FileText className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-900">Commodity Stock & Reserve Status</h4>
          </div>
          <p className="text-xs text-slate-500">
            Depot inventory, days-remaining reserves, and critical stock depletion warnings for medical & essential goods.
          </p>
          <button
            onClick={handleExportPDF}
            className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Generate Stock PDF
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 text-[#087F8C]">
            <FileText className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-900">Fleet Telemetry & Speed History</h4>
          </div>
          <p className="text-xs text-slate-500">
            GPS tracking compliance log, speed anomaly events, driver contacts, and shipment assignment history.
          </p>
          <button
            onClick={handleExportPDF}
            className="w-full bg-[#087F8C] hover:bg-[#075E68] text-white py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Generate Fleet PDF
          </button>
        </div>
      </div>
    </div>
  );
};
