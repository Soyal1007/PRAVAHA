import React, { useState } from 'react';

export interface LinePoint {
  xLabel: string;
  value: number;
}

interface InteractiveLineChartProps {
  data: LinePoint[];
  title?: string;
  subtitle?: string;
  color?: string;
  unit?: string;
}

export const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  title,
  subtitle,
  color = '#087F8C',
  unit = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const padding = 30;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 10);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minVal) / range) * (height - padding * 2);
    return { x, y, label: d.xLabel, value: d.value, idx };
  });

  const pathD = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${
    height - padding
  } Z`;

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 font-body">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            {title && <h3 className="font-bold text-base text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {hoveredIdx !== null && (
            <div className="bg-teal-50 text-[#087F8C] px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-teal-200">
              {data[hoveredIdx].xLabel}: {data[hoveredIdx].value} {unit}
            </div>
          )}
        </div>
      )}

      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill={`url(#gradient-${color})`} />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt) => {
            const isHovered = hoveredIdx === pt.idx;
            return (
              <g key={pt.idx} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '7' : '4.5'}
                  fill="#FFFFFF"
                  stroke={color}
                  strokeWidth={isHovered ? '3.5' : '2.5'}
                  onMouseEnter={() => setHoveredIdx(pt.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 pt-1 px-4">
          {data.map((d, i) => (
            <span key={i} className="truncate">
              {d.xLabel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
