'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'

export function DashboardRefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      data-testid="dashboard-refresh"
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
      title="Reload latest test data"
    >
      <RefreshCw size={12} className={pending ? 'animate-spin' : ''} />
      Refresh
    </button>
  )
}
