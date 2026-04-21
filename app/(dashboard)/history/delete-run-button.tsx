'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  runId: string
  modelName: string
  isRunning: boolean
}

export function DeleteRunButton({ runId, modelName, isRunning }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    setError(null)
    try {
      const res = await fetch('/api/runs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_run_id: runId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Delete failed')
        return
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Network error')
    }
  }

  if (isRunning) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Cannot delete a test that is currently running"
        data-testid={`delete-run-${runId}`}
      >
        <Trash2 size={12} />
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`delete-run-${runId}`}
        title="Delete this test run"
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <Trash2 size={12} />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-lg p-5 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete this test run?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete run for <strong>{modelName}</strong> and all its probe results, benchmark results, and remediation items?
              This cannot be undone.
            </p>
            {error && (
              <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmDelete}
                disabled={pending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-delete"
              >
                {pending ? <><Loader2 size={12} className="mr-1 animate-spin" /> Deleting…</> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
