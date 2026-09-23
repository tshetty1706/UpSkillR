import React, { useState } from 'react';

/**
 * Responsive Line Chart Component using SVG
 */
export const LineChartComponent = ({ data = [], xKey = 'date', yKey = 'submissions', height = 220 }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No activity data recorded for this period yet.</p>
      </div>
    );
  }

  const padding = 40;
  const width = 600;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const yValues = data.map((d) => d[yKey] || 0);
  const maxY = Math.max(...yValues, 5);

  const points = data.map((d, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - ((d[yKey] || 0) / maxY) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.length === 1
    ? `M ${padding} ${points[0].y} L ${width - padding} ${points[0].y}`
    : points.reduce((acc, point, index) => `${acc} ${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`, '');

  const areaD = points.length === 1
    ? ''
    : `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="svg-chart-container" style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg-chart">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = height - padding - ratio * chartHeight;
          const val = Math.round(ratio * maxY);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="var(--border-subtle, #E2EAE5)"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted, #56675D)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Shaded Area under curve */}
        {areaD && <path d={areaD} fill="var(--brand-green-tint, rgba(17,104,48,0.08))" />}

        {/* Main Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--brand-primary, #116830)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint === idx ? 6 : 4}
              fill="var(--surface, #FFFFFF)"
              stroke="var(--brand-primary, #116830)"
              strokeWidth="2.5"
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* X-axis labels */}
            {(data.length <= 8 || idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1) && (
              <text
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-muted, #56675D)"
              >
                {pt.data[xKey]}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(points[hoveredPoint].x / width) * 100}%`,
            top: `${(points[hoveredPoint].y / height) * 100 - 36}px`
          }}
        >
          <strong>{points[hoveredPoint].data[xKey]}</strong>: {points[hoveredPoint].data[yKey]}
        </div>
      )}
    </div>
  );
};

/**
 * Responsive Bar Chart Component using SVG/CSS
 */
export const BarChartComponent = ({
  data = [],
  xKey = 'label',
  yKey = 'value',
  height = 220,
  valueSuffix = '',
  colors = ['var(--brand-primary)', 'var(--color-info, #2563EB)', 'var(--color-warning, #D97706)']
}) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No comparison data recorded yet.</p>
      </div>
    );
  }

  const yValues = data.map((d) => Number(d[yKey]) || 0);
  const maxY = Math.max(...yValues, 10);

  return (
    <div className="bar-chart-wrapper" style={{ height: `${height}px` }}>
      <div className="bar-chart-bars-container">
        {data.map((item, idx) => {
          const val = Number(item[yKey]) || 0;
          const heightPct = Math.min(Math.max((val / maxY) * 100, val > 0 ? 5 : 2), 100);
          const barColor = colors[idx % colors.length];

          return (
            <div
              key={idx}
              className="bar-item-col"
              onMouseEnter={() => setHoveredBar(idx)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div className="bar-fill-track">
                {hoveredBar === idx && (
                  <div className="bar-tooltip">
                    {item[xKey] || item.title || item.category}: <strong>{val}{valueSuffix}</strong>
                  </div>
                )}
                <div
                  className="bar-fill"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor
                  }}
                />
              </div>
              <span className="bar-val-label">{val}{valueSuffix}</span>
              <span className="bar-x-label" title={item[xKey] || item.title || item.category}>
                {item[xKey] || item.title || item.category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Responsive Pie / Donut Chart Component
 */
export const PieChartComponent = ({ data = [], height = 220 }) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No distribution data available.</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (Number(item.value) || Number(item.count) || 0), 0);

  if (total === 0) {
    return (
      <div className="chart-empty-state">
        <p>No submissions or recorded data available yet.</p>
      </div>
    );
  }

  let accumulatedPercent = 0;

  const defaultColors = [
    'var(--color-success, #16A34A)',
    'var(--color-error, #DC2626)',
    'var(--color-warning, #D97706)',
    'var(--color-info, #2563EB)',
    'var(--brand-primary, #116830)'
  ];

  const slices = data.map((item, idx) => {
    const val = Number(item.value) || Number(item.count) || 0;
    const percent = val / total;
    const startAngle = accumulatedPercent * 360;
    accumulatedPercent += percent;
    const endAngle = accumulatedPercent * 360;
    const color = item.color || defaultColors[idx % defaultColors.length];

    return {
      name: item.name || item.category || `Item ${idx + 1}`,
      value: val,
      percent: Math.round(percent * 100),
      startAngle,
      endAngle,
      color
    };
  });

  // Helper to calculate SVG arc path
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="pie-chart-wrapper" style={{ minHeight: `${height}px` }}>
      <div className="pie-svg-container">
        <svg viewBox="-1 -1 2 2" className="pie-svg">
          {slices.map((slice, i) => {
            const val = slice.value;
            if (val === 0) return null;

            // If 100% single slice
            if (slice.percent === 100) {
              return (
                <circle
                  key={i}
                  cx="0"
                  cy="0"
                  r="0.8"
                  fill={slice.color}
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            }

            const [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
            const [endX, endY] = getCoordinatesForPercent(slice.endAngle / 360);
            const largeArcFlag = slice.percent > 50 ? 1 : 0;

            const pathData = [
              `M ${startX * 0.85} ${startY * 0.85}`,
              `A 0.85 0.85 0 ${largeArcFlag} 1 ${endX * 0.85} ${endY * 0.85}`,
              `L ${endX * 0.45} ${endY * 0.45}`,
              `A 0.45 0.45 0 ${largeArcFlag} 0 ${startX * 0.45} ${startY * 0.45}`,
              'Z'
            ].join(' ');

            return (
              <path
                key={i}
                d={pathData}
                fill={slice.color}
                opacity={hoveredSlice === null || hoveredSlice === i ? 1 : 0.6}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        <div className="pie-center-label">
          <span className="pie-total-val">{total}</span>
          <span className="pie-total-text">Total</span>
        </div>
      </div>

      <div className="pie-legend">
        {slices.map((slice, i) => (
          <div
            key={i}
            className={`pie-legend-item ${hoveredSlice === i ? 'active' : ''}`}
            onMouseEnter={() => setHoveredSlice(i)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <span className="pie-legend-dot" style={{ backgroundColor: slice.color }} />
            <span className="pie-legend-name">{slice.name}:</span>
            <strong className="pie-legend-val">{slice.value} ({slice.percent}%)</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
