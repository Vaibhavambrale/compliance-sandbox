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
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function ReportCharts({
  radarData,
  barData,
  overallScore,
}: {
  radarData: RadarDataPoint[]
  barData: BarDataPoint[]
  overallScore: number
}) {
  const fillColor = overallScore >= 70 ? '#22c55e' : overallScore >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-medium mb-2">Radar Overview</h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
            <Tooltip />
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
        <h4 className="text-sm font-medium mb-2">Scores by Dimension (worst → best)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="dimension" tick={{ fontSize: 12 }} width={110} />
            <Tooltip />
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
