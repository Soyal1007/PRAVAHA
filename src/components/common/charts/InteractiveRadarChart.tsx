import React, { useState } from 'react';

export interface RadarMetric {
  axis: string;
  value: number; // 0 - 100 scale
}

interface InteractiveRadarChartProps {
  data: RadarMetric[];
  title?: string;
  subtitle?: string;
  color?: string;
}

export const InteractiveRadarChart: React.FC<InteractiveRadarChartProps> = ({
  data,
  title,
  subtitle,
  color = '#087F8C',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length < 3) return null;

  const size = 260;
  const center = size / 2;
  const radius = 90;
  const numAxes = data.length;

  const getCoordinates = (index: number, valPercent: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const r = (valPercent / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const dataPoints = data.map((d, i) => getCoordinates(i, d.value));

  const polygonPath = dataPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  ) + ' Z';

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 font-body">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-3">
          {title && <h3 className="font-bold text-base text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
        {/* SVG Radar */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Concentric grid rings */}
            {[25, 50, 75, 100].map((ringPct) => {
              const ringPoints = data.map((_, i) => getCoordinates(i, ringPct));
              const ringPath = ringPoints.reduce(
                (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
                ''
              ) + ' Z';
              return (
                <path
                  key={ringPct}
                  d={ringPath}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={ringPct === 100 ? 'none' : '3 3'}
                />
              );
            })}

            {/* Axis lines */}
            {data.map((_, i) => {
              const outerPt = getCoordinates(i, 100);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={outerPt.x}
                  y2={outerPt.y}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
              );
            })}

            {/* Radar Polygon */}
            <path
              d={polygonPath}
              fill={color}
              fillOpacity="0.25"
              stroke={color}
              strokeWidth="3"
            />

            {/* Radar Point Handles */}
            {dataPoints.map((pt, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '6' : '4'}
                  fill="#FFFFFF"
                  stroke={color}
                  strokeWidth="2.5"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-200"
                />
              );
            })}
          </svg>
        </div>

        {/* Legend / Metrics List */}
        <div className="space-y-2 text-xs w-full sm:w-auto min-w-[200px]">
          {data.map((d, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-teal-50 border-teal-300 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/70'
                }`}
              >
                <span className="font-semibold text-slate-800">{d.axis}</span>
                <span className="font-mono font-bold text-slate-900">{d.value} / 100</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
