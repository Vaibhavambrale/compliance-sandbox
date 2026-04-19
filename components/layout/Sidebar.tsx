'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FlaskConical,
  BookOpen,
  BarChart3,
  History,
  Settings,
  ShieldCheck,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/test/new', label: 'New Evaluation', icon: FlaskConical },
    ],
  },
  {
    label: 'Results',
    items: [
      { href: '/history', label: 'History', icon: History },
      { href: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/frameworks', label: 'Frameworks', icon: BookOpen },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-sm">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <span className="text-[14px] font-bold text-gray-900 tracking-tight block leading-tight">ComplianceAI</span>
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">AI Model Evaluator</span>
          </div>
        </Link>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.12em] px-3 mb-1.5">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href ||
                  (href === '/test/new' && (pathname.startsWith('/test/') || pathname.startsWith('/report/')))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-violet-50 text-violet-700 shadow-sm shadow-violet-100'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-violet-600' : 'text-gray-400'} strokeWidth={isActive ? 2.2 : 1.8} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Frameworks</p>
          <div className="flex flex-wrap gap-1">
            {['DPDP', 'EU AI Act', 'NIST', 'MEITY'].map(fw => (
              <span key={fw} className="text-[9px] text-gray-500 bg-white rounded px-1.5 py-0.5 border border-gray-100 font-medium">{fw}</span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
