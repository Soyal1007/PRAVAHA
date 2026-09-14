import React, { useState } from 'react';

export interface PieDataItem {
  label: string;
  value: number;
  color: string;
}

interface InteractivePieChartProps {
  data: PieDataItem[];
  title?: string;
  subtitle?: string;
  donut?: boolean;
  centerText?: string;
  centerSubtext?: string;
  height?: number;
}

export const InteractivePieChart: React.FC<InteractivePieChartProps> = ({
  data,
  title,
  subtitle,
  donut = true,
  centerText,
  centerSubtext,
  height = 240,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  let accumulatedPercent = 0;
  const slices = data.map((item, idx) => {
    const percent = (item.value / total) * 100;
    const strokeDasharray = `${percent} ${100 - percent}`;
    const strokeDashoffset = 100 - accumulatedPercent;
    accumulatedPercent += percent;

    return {
      ...item,
      percent: Math.round(percent),
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 font-body">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-3">
          {title && <h3 className="font-bold text-base text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* SVG Donut / Pie Render */}
        <div className="flex items-center justify-center relative py-2">
          <svg
            width="220"
            height="220"
            viewBox="0 0 42 42"
            className="w-48 h-48 transform -rotate-90 filter drop-shadow-xs"
          >
            <circle
              cx="21"
              cy="21"
              r="15.91549430918954"
              fill={donut ? '#FFFFFF' : '#F8FAFC'}
              stroke="#F1F5F9"
              strokeWidth={donut ? '6' : '1'}
            />
            {slices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <circle
                  key={slice.idx}
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? '7.5' : '6'}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
              );
            })}
          </svg>

          {donut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {hoveredIdx !== null ? slices[hoveredIdx].value : centerText || total}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {hoveredIdx !== null ? slices[hoveredIdx].label : centerSubtext || 'Total'}
              </span>
            </div>
          )}
        </div>

        {/* Legend Breakdown */}
        <div className="space-y-2 text-xs">
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <div
                key={slice.idx}
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  ></span>
                  <span className="font-semibold text-slate-800">{slice.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-900">{slice.value}</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">
                    ({slice.percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
