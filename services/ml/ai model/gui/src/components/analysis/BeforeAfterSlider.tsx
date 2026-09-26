import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Image, ArrowLeftRight, Sparkles, Loader2, MapPin,
  AlertTriangle, ChevronRight, X, CheckCircle2, AlertCircle,
  ShieldAlert, Droplets, Mountain, Construction, TreePine,
  Sun, Building2, Layers, CheckCircle, CircleDot, Clock,
  Ruler, Cpu, Leaf, BarChart3, Flame,
} from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useAnalysis } from '@/context/AnalysisContext';
import type { HistogramData, LandCoverClass } from '@/types';

/* ── Constants ───────────────────────────────────────────────── */

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  low:      { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  medium:   { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  high:     { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  critical: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  flood:                 <Droplets className="w-8 h-8" />,
  landslide:             <Mountain className="w-8 h-8" />,
  road_damage:           <Construction className="w-8 h-8" />,
  vegetation_loss:       <TreePine className="w-8 h-8" />,
  drought:               <Sun className="w-8 h-8" />,
  construction:          <Building2 className="w-8 h-8" />,
  infrastructure_damage: <ShieldAlert className="w-8 h-8" />,
  surface_change:        <Layers className="w-8 h-8" />,
  check_circle:          <CheckCircle className="w-8 h-8" />,
};

const EVENT_GRADIENT: Record<string, { from: string; to: string; glow: string }> = {
  flood:                 { from: '#1E40AF', to: '#3B82F6', glow: 'rgba(59,130,246,0.25)' },
  landslide:             { from: '#92400E', to: '#F59E0B', glow: 'rgba(245,158,11,0.25)' },
  road_damage:           { from: '#4338CA', to: '#6366F1', glow: 'rgba(99,102,241,0.25)' },
  vegetation_loss:       { from: '#166534', to: '#22C55E', glow: 'rgba(34,197,94,0.25)' },
  drought:               { from: '#C2410C', to: '#F97316', glow: 'rgba(249,115,22,0.25)' },
  construction:          { from: '#1E3A5F', to: '#0EA5E9', glow: 'rgba(14,165,233,0.25)' },
  infrastructure_damage: { from: '#9F1239', to: '#F43F5E', glow: 'rgba(244,63,94,0.25)' },
  surface_change:        { from: '#374151', to: '#6B7280', glow: 'rgba(107,114,128,0.25)' },
  check_circle:          { from: '#065F46', to: '#10B981', glow: 'rgba(16,185,129,0.25)' },
};

const PROCESSING_STEPS = [
  { label: 'Preprocessing', desc: 'Normalizing & aligning image pair' },
  { label: 'Pixel Differencing', desc: 'Computing absolute pixel differences' },
  { label: 'Region Detection', desc: 'Finding contiguous change areas' },
  { label: 'NDVI & Spectral Analysis', desc: 'Computing vegetation indices & histograms' },
  { label: 'Change Classification', desc: 'Classifying regions & generating risk map' },
  { label: 'Report Generation', desc: 'Building severity assessment & recommendations' },
];

/* ── Subcomponents ───────────────────────────────────────────── */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
      {icon}
      <div>
        <h3 className="text-sm font-black text-main" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {title}
        </h3>
        {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function MiniHistogram({ data, label }: { data: HistogramData; label: string }) {
  const maxVal = Math.max(...data.r, ...data.g, ...data.b, 1);
  return (
    <div className="flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 text-center">{label}</p>
      <div className="h-20 flex items-end gap-px px-1">
        {data.r.map((_, i) => {
          const rH = (data.r[i] / maxVal) * 100;
          const gH = (data.g[i] / maxVal) * 100;
          const bH = (data.b[i] / maxVal) * 100;
          const avgH = (rH + gH + bH) / 3;
          // Determine dominant channel for color
          const dominant = rH >= gH && rH >= bH ? '#EF4444' : gH >= bH ? '#22C55E' : '#3B82F6';
          return (
            <div key={i} className="flex-1 rounded-t-sm" style={{
              height: `${Math.max(avgH, 1)}%`,
              background: dominant,
              opacity: 0.7,
              minWidth: 1,
            }} />
          );
        })}
      </div>
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[8px] text-muted">0</span>
        <span className="text-[8px] text-muted">255</span>
      </div>
    </div>
  );
}

function LandCoverBar({ classes, label }: { classes: LandCoverClass[]; label: string }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 text-center">{label}</p>
      {/* Stacked bar */}
      <div className="h-5 rounded-full overflow-hidden flex">
        {classes.map((cls, i) => (
          <div key={i} style={{ width: `${cls.percentage}%`, background: cls.color }}
            title={`${cls.name}: ${cls.percentage}%`} />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {classes.map((cls, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: cls.color }} />
            <span className="text-[10px] text-muted">
              {cls.name.replace('_', ' ')} {cls.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DropZone({
  label, file, imageUrl, onDrop, onClear, disabled,
}: {
  label: string; file: File | null; imageUrl: string | null;
  onDrop: (files: File[]) => void; onClear: () => void; disabled?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'] },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className="relative rounded-3xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-[250ms] flex-1 min-h-[220px] flex flex-col items-center justify-center"
      style={{
        borderColor: isDragActive ? '#087F8C' : '#E2E8F0',
        background: isDragActive ? '#EAF6F6' : imageUrl ? 'transparent' : '#FAFBFC',
      }}
    >
      <input {...getInputProps()} />
      {imageUrl ? (
        <div className="relative w-full">
          <img src={imageUrl} alt={label} className="w-full h-48 object-contain rounded-2xl" />
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur shadow-lg hover:bg-white transition-all"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
          <div className="mt-3">
            <p className="text-sm font-bold text-main truncate">{file?.name}</p>
            <p className="text-xs text-muted">
              {file && (file.size / 1024).toFixed(1)} KB — Click to replace
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mb-3">
            {isDragActive ? <Image className="w-7 h-7 text-brand" /> : <Upload className="w-7 h-7 text-brand" />}
          </div>
          <p className="text-sm font-bold text-main mb-1">{label}</p>
          <p className="text-xs text-muted">PNG, JPEG, TIFF, WebP up to 50 MB</p>
        </>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function BeforeAfterSlider() {
  const {
    beforeImageUrl, afterImageUrl, changeResult, isAnalyzing,
    processingStep, error, analyzeBeforeAfter,
  } = useAnalysis();

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [localBeforeUrl, setLocalBeforeUrl] = useState<string | null>(null);
  const [localAfterUrl, setLocalAfterUrl] = useState<string | null>(null);

  const handleBeforeDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setBeforeFile(files[0]);
      if (localBeforeUrl) URL.revokeObjectURL(localBeforeUrl);
      setLocalBeforeUrl(URL.createObjectURL(files[0]));
    }
  }, [localBeforeUrl]);

  const handleAfterDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setAfterFile(files[0]);
      if (localAfterUrl) URL.revokeObjectURL(localAfterUrl);
      setLocalAfterUrl(URL.createObjectURL(files[0]));
    }
  }, [localAfterUrl]);

  const handleClearBefore = useCallback(() => {
    if (localBeforeUrl) URL.revokeObjectURL(localBeforeUrl);
    setBeforeFile(null);
    setLocalBeforeUrl(null);
  }, [localBeforeUrl]);

  const handleClearAfter = useCallback(() => {
    if (localAfterUrl) URL.revokeObjectURL(localAfterUrl);
    setAfterFile(null);
    setLocalAfterUrl(null);
  }, [localAfterUrl]);

  const handleCompare = () => {
    if (beforeFile && afterFile) analyzeBeforeAfter(beforeFile, afterFile);
  };

  const bUrl = beforeImageUrl || localBeforeUrl;
  const aUrl = afterImageUrl || localAfterUrl;
  const r = changeResult; // shorthand

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ── Upload Zones ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <DropZone label="Before Image" file={beforeFile} imageUrl={localBeforeUrl}
          onDrop={handleBeforeDrop} onClear={handleClearBefore} disabled={isAnalyzing} />
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-brand" />
          </div>
        </div>
        <DropZone label="After Image" file={afterFile} imageUrl={localAfterUrl}
          onDrop={handleAfterDrop} onClear={handleClearAfter} disabled={isAnalyzing} />
      </div>

      {/* ── Action Button ──────────────────────────────────────── */}
      <button
        onClick={handleCompare}
        disabled={(!beforeFile || !afterFile) || isAnalyzing}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all duration-[250ms] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#087F8C' }}
        onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#065F66'; }}
        onMouseLeave={e => (e.currentTarget.style.background = '#087F8C')}
      >
        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {isAnalyzing ? 'Detecting Changes...' : 'Run Change Detection'}
      </button>

      {/* ── Processing Pipeline ────────────────────────────────── */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="bg-card rounded-3xl border border-border p-5">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}>Processing Pipeline</h4>
            <div className="space-y-3">
              {PROCESSING_STEPS.map((step, i) => {
                const stepNum = i + 1;
                const done = processingStep > stepNum;
                const active = processingStep === stepNum;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: done ? '#10B981' : active ? '#087F8C' : '#F1F5F9' }}>
                      {done ? <CheckCircle2 className="w-4 h-4 text-white" />
                        : active ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                        : <span className="text-xs font-bold text-muted">{stepNum}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: done || active ? '#0F172A' : '#94A3B8' }}>{step.label}</p>
                      <p className="text-[10px]" style={{ color: done || active ? '#475569' : '#CBD5E1' }}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl border"
            style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#DC2626' }}>Analysis Error</p>
              <p className="text-xs mt-1" style={{ color: '#991B1B' }}>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESULTS SECTION ────────────────────────────────────── */}
      {bUrl && aUrl && r && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Metadata Strip */}
          {r.metadata && (
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-2xl border border-border bg-card text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> {r.metadata.imageWidth} × {r.metadata.imageHeight} px</span>
              <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> {(r.metadata.totalPixels / 1e6).toFixed(2)} MP</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {r.metadata.analysisTimeMs} ms</span>
              <span className="flex items-center gap-1.5 ml-auto font-mono text-[10px]" style={{ color: '#64748B' }}>
                {r.metadata.engine} v{r.metadata.version}
              </span>
            </div>
          )}

          {/* Before / After Slider */}
          <div className="card-vibrant overflow-hidden">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={bUrl} alt="Before" />}
              itemTwo={<ReactCompareSliderImage src={aUrl} alt="After" />}
              style={{ height: 400, borderRadius: '1.25rem' }}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-xs font-bold text-muted">◀ BEFORE</span>
              <span className="text-xs font-bold text-muted">AFTER ▶</span>
            </div>
          </div>

          {/* Change Map */}
          {r.changeMap && (
            <div className="card-vibrant overflow-hidden">
              <SectionHeader icon={<Flame className="w-4 h-4 text-brand" />}
                title="AI-Generated Change Map"
                subtitle="Red overlay shows detected change regions with bounding boxes" />
              <img src={r.changeMap} alt="Change map" className="w-full object-contain" style={{ maxHeight: 400 }} />
            </div>
          )}

          {/* ── EVENT CLASSIFICATION BANNER ──────────────────────── */}
          {r.event && (() => {
            const evt = r.event;
            const grad = EVENT_GRADIENT[evt.icon] || EVENT_GRADIENT.surface_change;
            const sev = severityColors[evt.severity] || severityColors.low;
            return (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ boxShadow: `0 8px 40px ${grad.glow}` }}>
                  {/* Gradient header */}
                  <div className="px-6 py-5 text-white flex items-center gap-4"
                    style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                      {EVENT_ICONS[evt.icon] || <CircleDot className="w-8 h-8" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {evt.type}
                      </h2>
                      <p className="text-sm opacity-90 mt-0.5">Confidence: {(evt.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase shrink-0"
                      style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {evt.severity}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="bg-card border border-t-0 border-border rounded-b-3xl p-5 space-y-4">
                    <p className="text-sm text-main leading-relaxed">{evt.description}</p>
                    {evt.evidence.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2"
                          style={{ fontFamily: "'Outfit', sans-serif" }}>Evidence</h4>
                        <div className="flex flex-wrap gap-2">
                          {evt.evidence.map((e, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border"
                              style={{ background: '#F8FAFC', color: '#475569' }}>{e}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {evt.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2"
                          style={{ fontFamily: "'Outfit', sans-serif" }}>Recommended Actions</h4>
                        <div className="space-y-2">
                          {evt.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: grad.to + '20' }}>
                                <span className="text-[10px] font-black" style={{ color: grad.to }}>{i + 1}</span>
                              </div>
                              <p className="text-xs text-main">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* ── Summary Stats ────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card-vibrant p-5 text-center">
              <p className="text-3xl font-black text-brand" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {r.changePercentage.toFixed(1)}%
              </p>
              <p className="text-xs font-medium text-muted mt-1">Area Changed</p>
            </div>
            <div className="card-vibrant p-5 text-center">
              <p className="text-3xl font-black" style={{ fontFamily: "'Outfit', sans-serif", color: '#E11D48' }}>
                {r.totalChangedArea.toFixed(0)}
              </p>
              <p className="text-xs font-medium text-muted mt-1">sq meters affected</p>
            </div>
            <div className="card-vibrant p-5 text-center">
              <p className="text-3xl font-black" style={{ fontFamily: "'Outfit', sans-serif", color: '#7C3AED' }}>
                {r.regions.length}
              </p>
              <p className="text-xs font-medium text-muted mt-1">Regions Detected</p>
            </div>
          </div>

          {/* ── Risk Heatmap ─────────────────────────────────────── */}
          {r.riskHeatmap && (
            <div className="card-vibrant overflow-hidden">
              <SectionHeader icon={<Flame className="w-4 h-4" style={{ color: '#E11D48' }} />}
                title="Risk Severity Heatmap"
                subtitle="Gaussian-weighted severity zones — blue (low) to red (critical)" />
              <img src={r.riskHeatmap} alt="Risk heatmap" className="w-full object-contain" style={{ maxHeight: 400 }} />
            </div>
          )}

          {/* ── NDVI Vegetation Health ───────────────────────────── */}
          {r.ndviBefore && r.ndviAfter && (
            <div className="card-vibrant overflow-hidden">
              <SectionHeader icon={<Leaf className="w-4 h-4" style={{ color: '#22C55E' }} />}
                title="NDVI Vegetation Health Index"
                subtitle="Excess Green Index (ExG) — green = healthy, red = stressed/bare" />
              <div className="grid grid-cols-2 gap-0">
                <div>
                  <img src={r.ndviBefore.ndviMap} alt="NDVI Before" className="w-full object-contain" style={{ maxHeight: 300 }} />
                  <div className="px-3 py-2 border-t border-r border-border text-center">
                    <p className="text-[10px] font-black uppercase text-muted">Before</p>
                    <p className="text-sm font-black" style={{ color: '#22C55E' }}>
                      {r.ndviBefore.vegetationPct}% Healthy
                    </p>
                    <p className="text-[10px] text-muted">Health Score: {r.ndviBefore.healthScore}/100</p>
                  </div>
                </div>
                <div>
                  <img src={r.ndviAfter.ndviMap} alt="NDVI After" className="w-full object-contain" style={{ maxHeight: 300 }} />
                  <div className="px-3 py-2 border-t border-border text-center">
                    <p className="text-[10px] font-black uppercase text-muted">After</p>
                    <p className="text-sm font-black" style={{ color: r.ndviAfter.vegetationPct < r.ndviBefore.vegetationPct ? '#E11D48' : '#22C55E' }}>
                      {r.ndviAfter.vegetationPct}% Healthy
                    </p>
                    <p className="text-[10px] text-muted">Health Score: {r.ndviAfter.healthScore}/100</p>
                  </div>
                </div>
              </div>
              {/* Vegetation change delta */}
              {(() => {
                const delta = r.ndviAfter.vegetationPct - r.ndviBefore.vegetationPct;
                const lost = delta < -1;
                return (
                  <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: lost ? '#E11D48' : '#22C55E' }} />
                    <p className="text-xs font-bold" style={{ color: lost ? '#E11D48' : '#22C55E' }}>
                      {lost ? `Vegetation declined by ${Math.abs(delta).toFixed(1)}%` : delta > 1 ? `Vegetation increased by ${delta.toFixed(1)}%` : 'No significant vegetation change'}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Land Cover Comparison ────────────────────────────── */}
          {r.landCoverBefore && r.landCoverAfter && (r.landCoverBefore.length > 0 || r.landCoverAfter.length > 0) && (
            <div className="card-vibrant p-5">
              <h3 className="text-sm font-black text-main mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}>
                <Layers className="w-4 h-4 text-brand" /> Land Cover Classification
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <LandCoverBar classes={r.landCoverBefore} label="Before" />
                <LandCoverBar classes={r.landCoverAfter} label="After" />
              </div>
            </div>
          )}

          {/* ── RGB Histogram Comparison ─────────────────────────── */}
          {r.histogramBefore && r.histogramAfter && (
            <div className="card-vibrant p-5">
              <h3 className="text-sm font-black text-main mb-4 flex items-center gap-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}>
                <BarChart3 className="w-4 h-4 text-brand" /> Spectral Distribution (RGB Histogram)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <MiniHistogram data={r.histogramBefore} label="Before" />
                <MiniHistogram data={r.histogramAfter} label="After" />
              </div>
            </div>
          )}

          {/* ── Change Regions ───────────────────────────────────── */}
          {r.regions.length > 0 && (
            <div className="card-vibrant p-5">
              <h3 className="text-sm font-black text-main mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Detected Change Regions
              </h3>
              <div className="space-y-3">
                {r.regions.map(region => {
                  const sev = severityColors[region.severity] || severityColors.low;
                  return (
                    <div key={region.id} className="p-4 rounded-2xl border border-border bg-canvas/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" style={{ color: sev.text }} />
                          <span className="text-sm font-bold text-main">{region.type}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                          style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                          {region.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-2">{region.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{region.area.toFixed(0)} sq m
                        </span>
                        <span className="flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />({region.coordinates.x}, {region.coordinates.y})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
