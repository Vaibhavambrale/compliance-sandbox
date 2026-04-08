'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function HistoryFilters({
  useCases,
  models,
  tiers,
  currentUseCase,
  currentModel,
  currentTier,
}: {
  useCases: string[]
  models: string[]
  tiers: string[]
  currentUseCase?: string
  currentModel?: string
  currentTier?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/history?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className="border rounded-md px-3 py-2 text-sm bg-background"
        value={currentUseCase ?? ''}
        onChange={(e) => updateFilter('use_case', e.target.value)}
      >
        <option value="">All Use Cases</option>
        {useCases.map((uc) => (
          <option key={uc} value={uc}>
            {uc}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md px-3 py-2 text-sm bg-background"
        value={currentTier ?? ''}
        onChange={(e) => updateFilter('readiness_tier', e.target.value)}
      >
        <option value="">All Tiers</option>
        {tiers.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md px-3 py-2 text-sm bg-background"
        value={currentModel ?? ''}
        onChange={(e) => updateFilter('model_name', e.target.value)}
      >
        <option value="">All Models</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}
