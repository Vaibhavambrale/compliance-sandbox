'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from 'recharts'

interface RadarDataPoint {
  dimension: string
  score: number
  fullMark: number
}

interface BarDataPoint {
  dimension: string
  score: number
}

function barFill(score: number) {
  if (score >= 70) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  color: '#111827',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
  fontSize: '12px',
}

const TICK_STYLE = { fill: '#9ca3af', fontSize: 11 }

export default function ReportCharts({
  radarData,
  barData,
  overallScore,
}: {
  radarData: RadarDataPoint[]
  barData: BarDataPoint[]
  overallScore: number
}) {
  const fillColor = overallScore >= 70 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar Chart */}
      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dimension Radar</h4>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Radar
              name="Score"
              dataKey="score"
              stroke={fillColor}
              fill={fillColor}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart with threshold line */}
      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score by Dimension</h4>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="w-3 h-0.5 bg-violet-400 inline-block" /> 70% threshold
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} layout="vertical" margin={{ left: 100, right: 20 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={TICK_STYLE}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="dimension"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={95}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(124, 58, 237, 0.04)' }} />
            <ReferenceLine x={70} stroke="#7c3aed" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
              {barData.map((entry, index) => (
                <Cell key={index} fill={barFill(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
