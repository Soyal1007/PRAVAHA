import React, { useState } from 'react';
import {
  PhoneCall,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Phone,
  ShieldCheck,
  Globe,
  Radio,
  Sliders,
  Send,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { CallRegistration } from '../../types';

export const N8nCallAutomationView: React.FC = () => {
  const { n8nCalls, simulateN8nCall, updateN8nCallStatus, n8nWebhookUrl, setN8nWebhookUrl } = useAppState();
  const { t } = useLanguage();

  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('All');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [activeCallModal, setActiveCallModal] = useState<CallRegistration | null>(null);

  // Simulation Form State
  const [simForm, setSimForm] = useState<{
    phoneNumber: string;
    callerName: string;
    language: string;
    district: string;
    state: string;
    requestedRole: 'Volunteer' | 'Emergency Rescue Driver' | 'Field Relief Agent' | 'Citizen Reporter';
    audioTranscript: string;
    equipment: string;
  }>({
    phoneNumber: '+91 94351 99887',
    callerName: 'Jitendra Hazarika',
    language: 'Assamese',
    district: 'Lakhimpur',
    state: 'Assam',
    requestedRole: 'Volunteer',
    audioTranscript: 'নমস্কাৰ, মই লখিমপুৰৰ পৰা জীতেন হাজৰিকা। মোৰ ওচৰত ৪WD ট্ৰাক আছে আৰু বান সাহায্য যোগান বিতৰণৰ বাবে সাজু আছো।',
    equipment: '4WD Cargo Truck, Emergency Rations',
  });

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(n8nWebhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(1);

    setTimeout(() => setSimulationStep(2), 800);
    setTimeout(() => setSimulationStep(3), 1600);
    setTimeout(() => setSimulationStep(4), 2400);

    setTimeout(() => {
      simulateN8nCall({
        phoneNumber: simForm.phoneNumber,
        callerName: simForm.callerName,
        language: simForm.language,
        district: simForm.district,
        state: simForm.state,
        requestedRole: simForm.requestedRole,
        audioTranscript: simForm.audioTranscript,
        equipment: simForm.equipment,
      });
      setIsSimulating(false);
      setSimulationStep(0);
    }, 3200);
  };

  const filteredCalls = n8nCalls.filter(call => {
    const matchesSearch =
      call.callerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.phoneNumber.includes(searchQuery) ||
      call.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.audioTranscript.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'All'
        ? true
        : selectedStatusFilter === 'Approved'
        ? call.status === 'Approved'
        : selectedStatusFilter === 'Pending'
        ? call.status === 'Pending Approval'
        : selectedStatusFilter === 'Rejected'
        ? call.status === 'Rejected'
        : true;

    const matchesLanguage =
      selectedLanguageFilter === 'All' ? true : call.language === selectedLanguageFilter;

    return matchesSearch && matchesStatus && matchesLanguage;
  });

  const approvedCount = n8nCalls.filter(c => c.status === 'Approved').length;
  const pendingCount = n8nCalls.filter(c => c.status === 'Pending Approval').length;
  const rejectedCount = n8nCalls.filter(c => c.status === 'Rejected').length;

  return (
    <div className="space-y-6 font-body">
      {/* Header Banner - n8n Hotline Integration */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-[#087F8C] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-teal-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="bg-teal-400/20 text-teal-300 border border-teal-400/30 text-xs font-mono font-extrabold px-3 py-1 rounded-full uppercase flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-teal-400" />
                <span>n8n Voice Automation Active</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                IVR Status: 200 OK
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white flex items-center space-x-3">
              <PhoneCall className="w-8 h-8 text-teal-300 shrink-0" />
              <span>n8n Voice Call Automation & Registration</span>
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 max-w-3xl leading-relaxed">
              Automated IVR call-in registration system for citizens & field volunteers. People call the dedicated toll-free helpline number, speak in their native language (Assamese, Hindi, English, Mizo, etc.), and n8n processes speech-to-text, intent recognition, identity verification, and registers them directly into PRAVAHA.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-3 shrink-0 min-w-[320px]">
            <div className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
              Assam & Regional Voice Hotline
            </div>
            <div className="flex items-center justify-between bg-slate-900/80 px-3.5 py-2 rounded-xl border border-teal-500/30 font-mono text-sm text-teal-300 font-black">
              <span className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>+91 (800) 555-PRAV / +91 361 299 8080</span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-slate-300 font-mono">n8n Webhook Endpoint:</div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={n8nWebhookUrl}
                  className="bg-slate-950/80 text-teal-200 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-teal-500/20 flex-1 truncate"
                />
                <button
                  onClick={handleCopyWebhook}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 font-bold"
                  title="Copy Webhook URL"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Calls Processed</span>
            <PhoneCall className="w-4 h-4 text-[#087F8C]" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">
            {n8nCalls.length} Registrations
          </div>
          <p className="text-xs text-slate-500 font-medium">Auto-parsed via n8n Whisper AI</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Approved Volunteers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600 font-display">
              {approvedCount} Users
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Verified identity & equipment</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600 font-display">
              {pendingCount} Calls
            </span>
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
              Requires Action
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Awaiting call-back confirmation</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Spam / Disproven</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-red-600 font-display">
              {rejectedCount} Calls
            </span>
            <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md">
              Filtered
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">n8n intent filter auto-rejected</p>
        </div>
      </div>

      {/* n8n Automated Pipeline Visual Graph & Webhook Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Graph Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#087F8C]" />
                <span>n8n Voice Automation Workflow Pipeline</span>
              </h3>
              <p className="text-xs text-slate-500">
                End-to-end execution path for incoming phone call registrations
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-teal-50 text-[#087F8C] px-3 py-1 rounded-xl border border-teal-100">
              5 Node Steps
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Step 1 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs">
                1
              </div>
              <div className="text-xs font-bold text-slate-900">Inbound Call</div>
              <p className="text-[10px] text-slate-500">Twilio SIP Trunk receives phone call</p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-[#087F8C] text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs">
                2
              </div>
              <div className="text-xs font-bold text-slate-900">n8n Webhook</div>
              <p className="text-[10px] text-slate-500">Receives voice payload & metadata</p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs">
                3
              </div>
              <div className="text-xs font-bold text-slate-900">Whisper STT</div>
              <p className="text-[10px] text-slate-500">Assamese / Multilingual speech to text</p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-amber-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs">
                4
              </div>
              <div className="text-xs font-bold text-slate-900">NLP Verification</div>
              <p className="text-[10px] text-slate-500">Identifies role, location & equipment</p>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-8 h-8 mx-auto bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs">
                5
              </div>
              <div className="text-xs font-bold text-slate-900">PRAVAHA Sync</div>
              <p className="text-[10px] text-slate-500">Registers volunteer & dispatches SMS</p>
            </div>
          </div>

          <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-teal-900 font-medium">
              <Sparkles className="w-5 h-5 text-[#087F8C] shrink-0" />
              <span>
                Want to test the workflow? Use the simulator on the right to trigger an incoming call event live into the n8n pipeline!
              </span>
            </div>
          </div>
        </div>

        {/* Webhook Simulator Form Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <Send className="w-5 h-5 text-[#087F8C]" />
              <span>Simulate n8n Call Webhook</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Caller Name:</label>
              <input
                type="text"
                value={simForm.callerName}
                onChange={e => setSimForm({ ...simForm, callerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number:</label>
                <input
                  type="text"
                  value={simForm.phoneNumber}
                  onChange={e => setSimForm({ ...simForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Language:</label>
                <select
                  value={simForm.language}
                  onChange={e => setSimForm({ ...simForm, language: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Assamese">Assamese (অসমীয়া)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="English">English</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Mizo">Mizo</option>
                  <option value="Khasi">Khasi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">District:</label>
                <input
                  type="text"
                  value={simForm.district}
                  onChange={e => setSimForm({ ...simForm, district: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Requested Role:</label>
                <select
                  value={simForm.requestedRole}
                  onChange={e =>
                    setSimForm({
                      ...simForm,
                      requestedRole: e.target.value as 'Volunteer' | 'Emergency Rescue Driver' | 'Field Relief Agent' | 'Citizen Reporter',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Volunteer">Volunteer</option>
                  <option value="Emergency Rescue Driver">Emergency Rescue Driver</option>
                  <option value="Field Relief Agent">Field Relief Agent</option>
                  <option value="Citizen Reporter">Citizen Reporter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Audio Speech-to-Text Transcript:</label>
              <textarea
                rows={3}
                value={simForm.audioTranscript}
                onChange={e => setSimForm({ ...simForm, audioTranscript: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full bg-[#087F8C] hover:bg-teal-700 text-white font-extrabold py-3 px-4 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>n8n Pipeline Executing (Step {simulationStep}/4)...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-teal-200" />
                  <span>Trigger n8n Webhook Test Call</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Call Registrations Table Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-[#087F8C]" />
              <span>Voice Registration Approval Queue</span>
            </h3>
            <p className="text-xs text-slate-500">
              Review callers registered via n8n voice IVR hotline. Approve, verify identity, or flag false alarms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search caller name, phone, audio..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="All">Status: All Calls</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending Review</option>
              <option value="Rejected">Rejected / Disproven</option>
            </select>

            {/* Language Filter */}
            <select
              value={selectedLanguageFilter}
              onChange={e => setSelectedLanguageFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="All">Language: All</option>
              <option value="Assamese">Assamese</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Bengali">Bengali</option>
            </select>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5">Caller & Phone</th>
                <th className="p-3.5">Language & Location</th>
                <th className="p-3.5">Requested Role</th>
                <th className="p-3.5">Audio Transcript & n8n Data</th>
                <th className="p-3.5">Verification Provenance</th>
                <th className="p-3.5">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No voice registration calls match your filter.
                  </td>
                </tr>
              ) : (
                filteredCalls.map(call => (
                  <tr key={call.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 align-top">
                      <div className="font-extrabold text-slate-900 text-sm">{call.callerName}</div>
                      <div className="font-mono text-slate-500 text-[11px] mt-0.5 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-[#087F8C]" />
                        <span>{call.phoneNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {call.id}</div>
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-teal-600" />
                        <span className="font-bold text-slate-800">{call.language}</span>
                      </div>
                      <div className="text-slate-600 font-medium mt-1">
                        {call.district}, {call.state}
                      </div>
                    </td>

                    <td className="p-3.5 align-top">
                      <span className="bg-teal-50 text-[#087F8C] border border-teal-100 font-bold px-2.5 py-1 rounded-lg text-[11px] inline-block">
                        {call.requestedRole}
                      </span>
                      {call.extractedData?.equipment && (
                        <div className="text-[10px] text-slate-500 mt-1 font-medium">
                          Eq: {call.extractedData.equipment}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 align-top max-w-xs">
                      <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-[11px] leading-relaxed">
                        "{call.audioTranscript}"
                      </p>
                      <button
                        onClick={() => setActiveCallModal(call)}
                        className="text-[10px] text-[#087F8C] font-bold hover:underline mt-1 flex items-center space-x-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Inspect Speech Payload ({call.callDurationSec}s)</span>
                      </button>
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="space-y-1">
                        {call.verifiedStatus === 'True Identity' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center space-x-1 w-max">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>True Identity (Verified)</span>
                          </span>
                        ) : call.verifiedStatus === 'False Alarm / Spam' ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center space-x-1 w-max">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Spam / Disproven</span>
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center space-x-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Pending Inspection</span>
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          Workflow: {call.n8nWorkflowId}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 align-top space-y-2">
                      <div className="flex items-center space-x-1">
                        {call.status === 'Approved' && (
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                            Approved
                          </span>
                        )}
                        {call.status === 'Pending Approval' && (
                          <span className="bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                            Pending
                          </span>
                        )}
                        {call.status === 'Rejected' && (
                          <span className="bg-red-100 text-red-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                            Rejected
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1 pt-1">
                        {call.status !== 'Approved' && (
                          <button
                            onClick={() => updateN8nCallStatus(call.id, 'Approved', 'True Identity')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer"
                          >
                            Approve Registration
                          </button>
                        )}
                        {call.status !== 'Rejected' && (
                          <button
                            onClick={() => updateN8nCallStatus(call.id, 'Rejected', 'False Alarm / Spam')}
                            className="bg-slate-100 hover:bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 transition-colors cursor-pointer"
                          >
                            Flag False/Spam
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Call Speech Payload Modal */}
      {activeCallModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-[#087F8C]" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">n8n Speech Payload Inspector</h3>
                  <p className="text-xs text-slate-500">Caller ID: {activeCallModal.id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveCallModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{activeCallModal.callerName}</span>
                  <span className="font-mono text-slate-500">{activeCallModal.phoneNumber}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Location: <b>{activeCallModal.district}, {activeCallModal.state}</b> | Language: <b>{activeCallModal.language}</b>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Full Speech Audio Transcript:</label>
                <div className="p-3.5 bg-slate-900 text-teal-300 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800">
                  "{activeCallModal.audioTranscript}"
                </div>
              </div>

              {activeCallModal.extractedData && (
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-slate-800 block">n8n Extracted Volunteer Data:</label>
                  <div className="bg-teal-50/80 p-3 rounded-2xl border border-teal-200 text-[11px] space-y-1 text-teal-950">
                    <div><b>Equipment:</b> {activeCallModal.extractedData.equipment || 'None specified'}</div>
                    <div><b>Availability:</b> {activeCallModal.extractedData.availability || 'Immediate'}</div>
                    <div><b>Notes:</b> {activeCallModal.extractedData.notes}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setActiveCallModal(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
              {activeCallModal.status !== 'Approved' && (
                <button
                  onClick={() => {
                    updateN8nCallStatus(activeCallModal.id, 'Approved', 'True Identity');
                    setActiveCallModal(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Approve Registration
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
