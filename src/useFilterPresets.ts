import {useCallback, useMemo} from 'react'

import type {FilterPreset} from './filters'
import type {UseFilterUrlStateResult} from './useFilterUrlState'

export interface UseFilterPresetsResult {
  /** The currently active preset key, if any preset exactly matches committed filter state. */
  activePreset: string | null
  /** Apply a preset or clear presets by writing shared URL-backed filter state. */
  applyPreset: (presetKey: string | null) => void
}

/**
 * Apply named presets against the same URL-backed filter state used by the table.
 *
 * Presets are a thin layer over normal filters: they write normal filter values
 * into URL/query state instead of introducing a second source of truth.
 *
 * @param filterState - Shared URL-backed filter state owned by the table.
 * @param presets - Named presets that write one or more normal filter values
 * into that shared state.
 * @returns The currently active preset key, if any, and a helper to apply or
 * clear presets.
 */
export function useFilterPresets(
  filterState: UseFilterUrlStateResult,
  presets: Record<string, FilterPreset> | undefined,
): UseFilterPresetsResult {
  const presetEntries = Object.entries(presets ?? {})

  const activePreset = useMemo(() => {
    const hasAnyActiveFilter = Object.values(filterState.values).some((value) => {
      if (value == null || value === '') return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(
          (entry) => entry != null && entry !== '',
        )
      }
      return true
    })

    for (const [presetKey, preset] of presetEntries) {
      const presetValues = preset.getValues?.() ?? preset.values ?? {}
      const presetKeys = Object.keys(presetValues)

      if (presetKeys.length === 0 && !hasAnyActiveFilter) {
        return presetKey
      }

      const matches = presetKeys.every(
        (key) => JSON.stringify(filterState.values[key]) === JSON.stringify(presetValues[key]),
      )

      if (matches && presetKeys.length > 0) {
        return presetKey
      }
    }

    return null
  }, [filterState.values, presetEntries])

  const applyPreset = useCallback(
    (presetKey: string | null) => {
      if (!presetKey) {
        filterState.clearAll()
        return
      }

      const preset = presets?.[presetKey]
      if (!preset) return
      filterState.setFilterValues(preset.getValues?.() ?? preset.values ?? {})
    },
    [filterState, presets],
  )

  return {activePreset, applyPreset}
}
