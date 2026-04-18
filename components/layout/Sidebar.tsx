'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FlaskConical,
  History,
  Settings,
  BookOpen,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/test/new', label: 'New Evaluation', icon: FlaskConical },
  { href: '/frameworks', label: 'Regulatory Frameworks', icon: BookOpen },
  { href: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-slate-950 text-white px-4 py-6 gap-1">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <h1 className="text-lg font-semibold tracking-tight">ComplianceAI</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">AI Model Compliance Evaluator</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href === '/test/new' && pathname.startsWith('/test/')) ||
            (item.href === '/test/new' && pathname.startsWith('/report/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-emerald-600/20 text-emerald-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-2 pt-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Evaluates AI models against DPDP Act, EU AI Act, NIST AI RMF &amp; MEITY Advisory compliance frameworks
        </p>
      </div>
    </aside>
  )
}
