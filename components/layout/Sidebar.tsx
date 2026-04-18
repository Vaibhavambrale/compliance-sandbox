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
  Search,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/test/new', label: 'Tests', icon: FlaskConical },
  { href: '/frameworks', label: 'Compliance', icon: BookOpen },
  { href: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Search */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
          <Search size={14} />
          <span>Find...</span>
        </div>
      </div>

      {/* Brand */}
      <div className="px-3 py-3 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">ComplianceAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href ||
            (href === '/test/new' && (pathname.startsWith('/test/') || pathname.startsWith('/report/')))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-violet-600' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Evaluates against DPDP Act, EU AI Act, NIST AI RMF &amp; MEITY Advisory
        </p>
      </div>
    </aside>
  )
}
