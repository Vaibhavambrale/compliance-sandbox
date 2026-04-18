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
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
}

const TICK_STYLE = { fill: '#6b7280' }

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
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-medium mb-2">Radar Overview</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, ...TICK_STYLE }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Radar
              name="Score"
              dataKey="score"
              stroke={fillColor}
              fill={fillColor}
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Scores by Dimension (worst to best)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" domain={[0, 100]} tick={TICK_STYLE} axisLine={{ stroke: '#e5e7eb' }} />
            <YAxis type="category" dataKey="dimension" tick={{ fontSize: 12, ...TICK_STYLE }} width={110} axisLine={{ stroke: '#e5e7eb' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
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
