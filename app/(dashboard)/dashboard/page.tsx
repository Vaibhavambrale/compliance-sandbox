import Link from 'next/link'
import { getDashboardStats, type TestRun } from '@/lib/api/dashboard'
import { tierBadgeClass, scoreColor } from '@/lib/scoring'
import {
  Shield,
  Target,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react'

/* ── Compliance Health Gauge (SVG arc) ───────────────────────── */
function ComplianceGauge({ score }: { score: number | null }) {
  const value = score ?? 0
  const radius = 80
  const stroke = 10
  const circumference = Math.PI * radius // half-circle
  const progress = (value / 100) * circumference
  const gaugeColor = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  const tierLabel = value >= 85 ? 'Deployment Ready' : value >= 70 ? 'Conditionally Ready' : value >= 50 ? 'Not Ready' : 'Do Not Deploy'

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d="M 10 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={gaugeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
        {/* Score text */}
        <text x="100" y="90" textAnchor="middle" className="fill-gray-900" style={{ fontSize: '36px', fontWeight: 700 }}>
          {score !== null ? value : '—'}
        </text>
        <text x="100" y="110" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '11px', fontWeight: 500 }}>
          {score !== null ? 'out of 100' : 'no data'}
        </text>
      </svg>
      {score !== null && (
        <span className={`mt-1 text-xs font-semibold px-3 py-1 rounded-full ${
          value >= 70 ? 'bg-emerald-50 text-emerald-700' : value >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
        }`}>
          {tierLabel}
        </span>
      )}
    </div>
  )
}

/* ── KPI Stat Card with icon + trend ─────────────────────────── */
function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subtitle,
  trend,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  label: string
  value: React.ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
            trend === 'up' ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
      <p className="text-[11px] text-gray-500 mt-1 font-medium uppercase tracking-wider">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

/* ── Score Pill ───────────────────────────────────────────────── */
function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-xs">—</span>
  const color = score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-red-700 bg-red-50 border-red-100'
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${color}`}>
      {score.toFixed(0)}%
    </span>
  )
}

/* ── Status Dot ──────────────────────────────────────────────── */
function StatusDot({ tier }: { tier: string | null }) {
  const color = !tier ? 'bg-gray-300'
    : tier === 'Deployment Ready' ? 'bg-emerald-400'
    : tier === 'Conditionally Ready' ? 'bg-amber-400'
    : 'bg-red-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center shadow-sm">
        <Shield size={28} className="text-violet-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1.5">No evaluations yet</h2>
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">
          Start by connecting your AI model and running a compliance evaluation against regulatory frameworks.
        </p>
      </div>
      <Link
        href="/test/new"
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors"
      >
        <Plus size={16} />
        Run First Evaluation
      </Link>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────── */
export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (stats.totalTests === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* ─── Header Row ─── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Dashboard</span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <Sparkles size={10} />
              7-Metric Programmatic Scoring
            </span>
          </div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Compliance Overview</h1>
        </div>
        <Link
          href="/test/new"
          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={14} />
          New Evaluation
        </Link>
      </div>

      {/* ─── Hero: Gauge + KPI Cards ─── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Compliance Gauge */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Compliance Health</p>
          <ComplianceGauge score={stats.avgComplianceScore} />
        </div>

        {/* KPI Grid */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-4">
          <KpiCard
            icon={Activity}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            label="Total Evaluations"
            value={stats.totalTests}
            subtitle="All time"
          />
          <KpiCard
            icon={Shield}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            label="Avg Compliance"
            value={
              stats.avgComplianceScore !== null
                ? <span className={scoreColor(stats.avgComplianceScore)}>{stats.avgComplianceScore.toFixed(1)}%</span>
                : <span className="text-gray-300">—</span>
            }
            subtitle="Across completed runs"
            trend={stats.avgComplianceScore !== null ? (stats.avgComplianceScore >= 70 ? 'up' : 'down') : null}
          />
          <KpiCard
            icon={Target}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            label="Avg Capability"
            value={
              stats.avgCapabilityScore !== null
                ? <span className={scoreColor(stats.avgCapabilityScore)}>{stats.avgCapabilityScore.toFixed(1)}%</span>
                : <span className="text-gray-300">—</span>
            }
            subtitle="Benchmark performance"
            trend={stats.avgCapabilityScore !== null ? (stats.avgCapabilityScore >= 60 ? 'up' : 'down') : null}
          />
          <KpiCard
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-50"
            label="Top Failure"
            value={
              stats.topFailureDimension
                ? <span className="text-sm font-bold text-red-600 capitalize">{stats.topFailureDimension}</span>
                : <span className="text-gray-300">—</span>
            }
            subtitle="Most probes below threshold"
          />
        </div>
      </div>

      {/* ─── Recent Evaluations ─── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Recent Evaluations</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Latest compliance test runs</p>
          </div>
          <Link href="/history" className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-t border-gray-100 bg-gray-50/60">
              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">Status</th>
              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5">Model</th>
              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5">Use Case</th>
              <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5">Compliance</th>
              <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5">Capability</th>
              <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5">Tier</th>
              <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentRuns.map((run: TestRun) => (
              <tr key={run.id} className="border-t border-gray-50 hover:bg-violet-50/30 transition-colors group">
                <td className="px-5 py-3">
                  <StatusDot tier={run.readiness_tier} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/report/${run.id}`} className="text-[13px] font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                    {run.model_name}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px] block">{run.use_case}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <ScorePill score={run.compliance_score} />
                </td>
                <td className="px-3 py-3 text-right">
                  <ScorePill score={run.capability_score} />
                </td>
                <td className="px-3 py-3">
                  {run.readiness_tier ? (
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${tierBadgeClass(run.readiness_tier)}`}>
                      {run.readiness_tier}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-[11px] text-gray-400">{new Date(run.created_at).toLocaleDateString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/test/new"
          className="group bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold">Run New Evaluation</p>
              <p className="text-xs text-violet-200 mt-1 leading-relaxed">
                Connect your model and evaluate against regulatory compliance frameworks.
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ArrowUpRight size={16} />
            </div>
          </div>
        </Link>
        <Link
          href="/frameworks"
          className="group bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Explore Frameworks</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Review DPDP Act, EU AI Act, NIST RMF and MEITY Advisory requirements.
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
              <ChevronRight size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
