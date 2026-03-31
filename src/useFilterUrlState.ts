import {parseAsString, useQueryStates} from 'nuqs'
import {useCallback, useMemo} from 'react'

import type {FilterDef} from './filters'
import {
  deserializeFilterValue,
  getFilterKey,
  isFilterActiveValue,
  serializeFilterValue,
} from './filters'

export interface UseFilterUrlStateResult {
  /** Current committed filter values keyed by each filter's stable key. */
  values: Record<string, unknown>
  /** Update one committed filter value and write it into shared URL/query state. */
  setFilterValue: (filterDef: FilterDef, value: unknown) => void
  /** Batch-apply multiple committed filter values at once. */
  setFilterValues: (values: Record<string, unknown>) => void
  /** Clear one committed filter value from shared URL/query state. */
  clearFilter: (filterDef: FilterDef) => void
  /** Clear all committed filter values from shared URL/query state. */
  clearAll: () => void
  /** Whether any committed filter value is currently active. */
  hasActiveFilters: boolean
}

/**
 * Shared URL-backed filter state for explicit filter definitions.
 *
 * This hook is intentionally generic: it owns committed filter state and
 * serialization, while higher-level components decide how to render or
 * compile that state.
 *
 * @param filterDefs - Explicit filter definitions that should participate in
 * shared URL/query-state management.
 * @returns Current committed filter values plus helpers to update, clear, and
 * batch-apply them.
 */
export function useFilterUrlState(filterDefs: FilterDef[] | undefined): UseFilterUrlStateResult {
  const filters = useMemo(() => filterDefs ?? [], [filterDefs])

  const keyMap = useMemo(() => {
    const map: Record<string, typeof parseAsString> = {}
    for (const filterDef of filters) {
      map[`filter.${getFilterKey(filterDef)}`] = parseAsString
    }
    return map
  }, [filters])

  const [filterParams, setFilterParams] = useQueryStates(keyMap, {history: 'replace'})

  const values = useMemo(() => {
    const nextValues: Record<string, unknown> = {}
    for (const filterDef of filters) {
      const key = getFilterKey(filterDef)
      nextValues[key] = deserializeFilterValue(filterDef, filterParams[`filter.${key}`] ?? null)
    }
    return nextValues
  }, [filterParams, filters])

  const setFilterValue = useCallback(
    (filterDef: FilterDef, value: unknown) => {
      const key = getFilterKey(filterDef)
      setFilterParams({
        ...Object.fromEntries(
          Object.keys(keyMap).map((paramKey) => [paramKey, filterParams[paramKey] ?? null]),
        ),
        [`filter.${key}`]: serializeFilterValue(filterDef, value),
      })
    },
    [filterParams, keyMap, setFilterParams],
  )

  const setFilterValues = useCallback(
    (nextValues: Record<string, unknown>) => {
      const params: Record<string, string | null> = {}
      for (const filterDef of filters) {
        const key = getFilterKey(filterDef)
        params[`filter.${key}`] = serializeFilterValue(filterDef, nextValues[key])
      }
      setFilterParams(params)
    },
    [filters, setFilterParams],
  )

  const clearFilter = useCallback(
    (filterDef: FilterDef) => {
      const key = getFilterKey(filterDef)
      setFilterParams({
        ...Object.fromEntries(
          Object.keys(keyMap).map((paramKey) => [paramKey, filterParams[paramKey] ?? null]),
        ),
        [`filter.${key}`]: null,
      })
    },
    [filterParams, keyMap, setFilterParams],
  )

  const clearAll = useCallback(() => {
    const nextValues: Record<string, null> = {}
    for (const filterDef of filters) {
      nextValues[`filter.${getFilterKey(filterDef)}`] = null
    }
    setFilterParams(nextValues)
  }, [filters, setFilterParams])

  const hasActiveFilters = useMemo(
    () => Object.values(values).some((value) => isFilterActiveValue(value)),
    [values],
  )

  return {
    values,
    setFilterValue,
    setFilterValues,
    clearFilter,
    clearAll,
    hasActiveFilters,
  }
}
