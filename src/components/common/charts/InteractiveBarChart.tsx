import React, { useState } from 'react';

export interface BarDataItem {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  subtext?: string;
}

interface InteractiveBarChartProps {
  data: BarDataItem[];
  title?: string;
  subtitle?: string;
  horizontal?: boolean;
  unit?: string;
}

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  title,
  subtitle,
  horizontal = true,
  unit = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const highestValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 font-body">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-3">
          {title && <h3 className="font-bold text-base text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {horizontal ? (
        <div className="space-y-3.5 text-xs pt-1">
          {data.map((item, idx) => {
            const max = item.maxValue || highestValue;
            const pct = Math.min(100, Math.round((item.value / max) * 100));
            const isHovered = hoveredIdx === idx;
            const barColor = item.color || '#087F8C';

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-3 rounded-2xl border transition-all ${
                  isHovered
                    ? 'bg-teal-50/50 border-teal-300 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span>{item.label}</span>
                    {item.subtext && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({item.subtext})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {item.value} {unit}
                  </span>
                </div>

                <div className="w-full bg-slate-200/70 h-3.5 rounded-full overflow-hidden flex items-center p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[9px] font-bold text-white font-mono shadow-2xs"
                    style={{
                      width: `${Math.max(6, pct)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vertical Bar Chart */
        <div className="pt-4 space-y-2">
          <div className="flex items-end justify-around h-44 border-b border-slate-200 px-2 gap-3">
            {data.map((item, idx) => {
              const max = item.maxValue || highestValue;
              const heightPct = Math.min(100, Math.round((item.value / max) * 100));
              const isHovered = hoveredIdx === idx;
              const barColor = item.color || '#087F8C';

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <span
                    className={`text-[11px] font-mono font-bold mb-1 transition-opacity ${
                      isHovered ? 'opacity-100 text-[#087F8C]' : 'opacity-70 text-slate-600'
                    }`}
                  >
                    {item.value}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-xl transition-all duration-500 group-hover:brightness-110"
                    style={{
                      height: `${Math.max(8, heightPct)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-around text-center text-[11px] font-semibold text-slate-600 pt-1">
            {data.map((item, idx) => (
              <span key={idx} className="flex-1 truncate px-1">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
