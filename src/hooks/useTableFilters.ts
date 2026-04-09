import {useQueryState, useQueryStates, parseAsString} from 'nuqs'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import type {DocumentBase} from '../types/tableTypes'

export interface FilterState {
  [columnId: string]: string | undefined
}

export interface ColumnFilterConfig<T extends DocumentBase = DocumentBase> {
  id: string
  filterMode: 'exact' | 'range'
  filterFn?: (row: T, filterValue: string) => boolean
}

export interface ComputedFilterConfig<T extends DocumentBase = DocumentBase> {
  label: string
  predicate: (row: T) => boolean
}

export interface UseTableFiltersConfig<T extends DocumentBase = DocumentBase> {
  filterableColumns: string[]
  columns?: ColumnFilterConfig<T>[]
  searchableFields?: string[]
  searchDebounceMs?: number
  computedFilters?: Record<string, ComputedFilterConfig<T>>
}

export interface UseTableFiltersResult<T extends DocumentBase> {
  filters: FilterState
  searchQuery: string
  searchInputValue: string
  setFilter: (columnId: string, value: string | undefined) => void
  clearFilter: (columnId: string) => void
  clearAll: () => void
  setSearchInput: (value: string) => void
  hasActiveFilters: boolean
  getFilterOptions: (columnId: string, data: T[]) => string[]
  applyFilters: (data: T[]) => T[]
  computedFilter: string | null
  setComputedFilter: (name: string | null) => void
  computedFilters?: Record<string, ComputedFilterConfig<T>>
}

/**
 * Parse a range value string in the format `min..max`.
 * Supports open-ended ranges: `min..` (>= min) and `..max` (<= max).
 */
export function parseRangeValue(value: string): {min?: string; max?: string} {
  const separatorIndex = value.indexOf('..')
  if (separatorIndex === -1) {
    return {min: value, max: value}
  }
  const min = value.slice(0, separatorIndex) || undefined
  const max = value.slice(separatorIndex + 2) || undefined
  return {min, max}
}

/**
 * Apply a range comparison on a document value.
 * Works for both ISO date strings (lexicographic comparison) and numbers.
 */
function applyRangeFilter(
  docValue: unknown,
  min: string | undefined,
  max: string | undefined,
): boolean {
  if (docValue == null) return false

  const isNumeric =
    typeof docValue === 'number' ||
    (typeof docValue === 'string' &&
      !isNaN(Number(docValue)) &&
      (min == null || !isNaN(Number(min))))

  if (isNumeric) {
    const numValue = Number(docValue)
    if (min != null && numValue < Number(min)) return false
    if (max != null && numValue > Number(max)) return false
    return true
  }

  // String/date comparison (lexicographic — works for ISO dates)
  const strValue = String(docValue)
  if (min != null && strValue < min) return false
  if (max != null && strValue > max) return false
  return true
}

export function useTableFilters<T extends DocumentBase>(
  config: UseTableFiltersConfig<T>,
): UseTableFiltersResult<T> {
  const {
    filterableColumns,
    columns: columnConfigs,
    searchableFields = [],
    searchDebounceMs = 300,
    computedFilters: computedFiltersConfig,
  } = config

  // Build a lookup map from column configs for O(1) access
  const columnConfigMap = useMemo(() => {
    const map = new Map<string, ColumnFilterConfig<T>>()
    if (columnConfigs) {
      for (const col of columnConfigs) {
        map.set(col.id, col)
      }
    }
    return map
  }, [columnConfigs])

  // Build a stable key map for nuqs useQueryStates
  const filterKeyMap = useMemo(() => {
    const map: Record<string, typeof parseAsString> = {}
    for (const col of filterableColumns) {
      map[`filter.${col}`] = parseAsString
    }
    return map
  }, [filterableColumns])

  const [filterParams, setFilterParams] = useQueryStates(filterKeyMap, {history: 'replace'})

  // URL-synced search via nuqs
  const [searchParam, setSearchParam] = useQueryState(
    'search',
    parseAsString.withOptions({history: 'replace'}),
  )

  // URL-synced computed filter via nuqs
  const [computedFilterParam, setComputedFilterParam] = useQueryState(
    'computed',
    parseAsString.withOptions({history: 'replace'}),
  )

  // Derive filter state from URL params
  const filters = useMemo(() => {
    const state: FilterState = {}
    for (const col of filterableColumns) {
      const value = filterParams[`filter.${col}`]
      if (value) state[col] = value
    }
    return state
  }, [filterableColumns, filterParams])

  // Local search state for immediate input + debounced URL sync
  const [searchInputValue, setSearchInputValue] = useState(searchParam ?? '')
  const [searchQuery, setSearchQuery] = useState(searchParam ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSearchInput = useCallback(
    (value: string) => {
      setSearchInputValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value)
        setSearchParam(value || null)
      }, searchDebounceMs)
    },
    [searchDebounceMs, setSearchParam],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const setFilter = useCallback(
    (columnId: string, value: string | undefined) => {
      setFilterParams({[`filter.${columnId}`]: value ?? null})
    },
    [setFilterParams],
  )

  const clearFilter = useCallback(
    (columnId: string) => {
      setFilterParams({[`filter.${columnId}`]: null})
    },
    [setFilterParams],
  )

  const setComputedFilter = useCallback(
    (name: string | null) => {
      setComputedFilterParam(name)
    },
    [setComputedFilterParam],
  )

  const clearAll = useCallback(() => {
    const nulls: Record<string, null> = {}
    for (const col of filterableColumns) {
      nulls[`filter.${col}`] = null
    }
    setFilterParams(nulls)
    setSearchInputValue('')
    setSearchQuery('')
    setSearchParam(null)
    setComputedFilterParam(null)
  }, [filterableColumns, setFilterParams, setSearchParam, setComputedFilterParam])

  const computedFilter = computedFilterParam ?? null

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filters).some((v) => v !== undefined) ||
      searchQuery.length > 0 ||
      computedFilter != null,
    [filters, searchQuery, computedFilter],
  )

  const getFilterOptions = useCallback((columnId: string, data: T[]): string[] => {
    const values = new Set<string>()
    for (const doc of data) {
      const value = doc[columnId]
      if (value != null) values.add(String(value))
    }
    return Array.from(values).sort()
  }, [])

  const applyFilters = useCallback(
    (data: T[]): T[] => {
      let result = data

      // Apply column filters with dispatch by mode
      for (const [columnId, filterValue] of Object.entries(filters)) {
        if (filterValue === undefined) continue

        const colConfig = columnConfigMap.get(columnId)

        if (colConfig?.filterFn) {
          // Custom filter function takes priority
          result = result.filter((doc) => colConfig.filterFn!(doc, filterValue))
        } else if (colConfig?.filterMode === 'range') {
          // Range filter: parse min..max and compare
          const {min, max} = parseRangeValue(filterValue)
          result = result.filter((doc) => applyRangeFilter(doc[columnId], min, max))
        } else {
          // Default: exact match
          result = result.filter((doc) => String(doc[columnId]) === filterValue)
        }
      }

      // Apply search filter
      if (searchQuery.length > 0) {
        const query = searchQuery.toLowerCase()
        result = result.filter((doc) =>
          searchableFields.some((field) => {
            const value = doc[field]
            return value != null && String(value).toLowerCase().includes(query)
          }),
        )
      }

      // Apply computed filter
      if (computedFilter != null && computedFiltersConfig) {
        const computedConfig = computedFiltersConfig[computedFilter]
        if (computedConfig) {
          result = result.filter((doc) => computedConfig.predicate(doc as T))
        }
      }

      return result
    },
    [
      filters,
      searchQuery,
      searchableFields,
      columnConfigMap,
      computedFilter,
      computedFiltersConfig,
    ],
  )

  return {
    filters,
    searchQuery,
    searchInputValue,
    setFilter,
    clearFilter,
    clearAll,
    setSearchInput,
    hasActiveFilters,
    getFilterOptions,
    applyFilters,
    computedFilter,
    setComputedFilter,
    computedFilters: computedFiltersConfig as Record<string, ComputedFilterConfig<T>> | undefined,
  }
}
