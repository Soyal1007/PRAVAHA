import { motion } from 'framer-motion';
import { Shield, GitCompareArrows, AlertTriangle, Radio } from 'lucide-react';
import BeforeAfterSlider from './components/analysis/BeforeAfterSlider';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';

/* ── Alert Ticker ───────────────────────────────────────────────── */

const DEFAULT_ALERTS = [
  '🛰️ Sentinel-2A pass over NE India — imagery acquired 09:42 UTC',
  '⚠️ IMD rainfall advisory: Heavy rain expected in Assam, Meghalaya next 48 hrs',
  '📡 ISRO Cartosat-3 scheduled acquisition — Arunachal Pradesh corridor 14:30 IST',
  '🟢 All border monitoring stations online — 24/7 surveillance active',
  '🔔 NDRF teams on standby in flood-prone districts of Bihar and Assam',
  '📊 Weekly change detection report due — 47 sites pending review',
];

function AlertTicker() {
  const { changeResult } = useAnalysis();

  // Build alert list: live result (if any) + defaults
  const alerts = [...DEFAULT_ALERTS];
  if (changeResult?.event && changeResult.event.type !== 'No Significant Change') {
    const e = changeResult.event;
    alerts.unshift(
      `🚨 LIVE ALERT: ${e.type} detected — ${e.severity.toUpperCase()} severity — ${changeResult.changePercentage.toFixed(1)}% area changed`
    );
  }

  // Duplicate for seamless loop
  const doubled = [...alerts, ...alerts];

  return (
    <div
      className="relative overflow-hidden whitespace-nowrap"
      style={{
        background: 'linear-gradient(90deg, #0F172A 0%, #1E293B 100%)',
        height: 32,
      }}
    >
      {/* Pulsing dot */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5">
        <Radio className="w-3 h-3 text-red-400 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
          LIVE
        </span>
        <div className="w-px h-4 bg-white/20 ml-1" />
      </div>

      {/* Scrolling text */}
      <div
        className="flex items-center h-full"
        style={{
          paddingLeft: 90,
          animation: `ticker ${alerts.length * 6}s linear infinite`,
        }}
      >
        {doubled.map((alert, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-[11px] text-slate-300 mr-12"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <span className="w-1 h-1 rounded-full bg-teal-400 shrink-0" />
            {alert}
          </span>
        ))}
      </div>

      {/* Edge fades */}
      <div
        className="absolute left-20 top-0 bottom-0 w-8 z-10"
        style={{ background: 'linear-gradient(90deg, #0F172A, transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10"
        style={{ background: 'linear-gradient(270deg, #1E293B, transparent)' }}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ── App Shell ──────────────────────────────────────────────────── */

function AppInner() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Alert Ticker — topmost element */}
      <AlertTicker />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #065F66, #087F8C)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-main leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}>
              NER-SHIELD
            </h1>
            <p className="text-[10px] text-muted leading-tight">
              Satellite Image Analysis System
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #065F66, #087F8C)' }}>
              <GitCompareArrows className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-main"
                style={{ fontFamily: "'Outfit', sans-serif" }}>
                Before / After Change Detection
              </h2>
              <p className="text-xs text-muted">
                Upload two satellite images to detect and analyze real changes
              </p>
            </div>
          </div>

          <BeforeAfterSlider />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-[10px] text-muted">
            NER-SHIELD &mdash; AI-Powered Border Monitoring &mdash; SIH 2026
          </p>
          <p className="text-[10px] text-muted">
            Team PRAVAHA
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AnalysisProvider>
      <AppInner />
    </AnalysisProvider>
  );
}
