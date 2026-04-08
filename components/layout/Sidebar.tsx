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
  Cpu,
  BarChart3,
  Layers
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/usecases', label: 'Use Cases', icon: Layers },
  { href: '/test/new', label: 'New Test', icon: FlaskConical },
  { href: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { href: '/models', label: 'Models', icon: Cpu },
  { href: '/frameworks', label: 'Frameworks', icon: BookOpen },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-background px-4 py-6 gap-1">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold tracking-tight">Compliance Sandbox</h1>
        <p className="text-xs text-muted-foreground mt-1">AI Model Testing Platform</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href === '/test/new' && pathname.startsWith('/test/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
