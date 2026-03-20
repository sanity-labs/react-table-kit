import {useQueryState, useQueryStates, parseAsString} from 'nuqs'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import type {DocumentBase} from './types'

export interface FilterState {
  [columnId: string]: string | undefined
}

export interface UseTableFiltersConfig {
  filterableColumns: string[]
  searchableFields?: string[]
  searchDebounceMs?: number
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
}

export function useTableFilters<T extends DocumentBase>(
  config: UseTableFiltersConfig,
): UseTableFiltersResult<T> {
  const {filterableColumns, searchableFields = [], searchDebounceMs = 300} = config

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

  const clearAll = useCallback(() => {
    const nulls: Record<string, null> = {}
    for (const col of filterableColumns) {
      nulls[`filter.${col}`] = null
    }
    setFilterParams(nulls)
    setSearchInputValue('')
    setSearchQuery('')
    setSearchParam(null)
  }, [filterableColumns, setFilterParams, setSearchParam])

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== undefined) || searchQuery.length > 0,
    [filters, searchQuery],
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
      for (const [columnId, filterValue] of Object.entries(filters)) {
        if (filterValue === undefined) continue
        result = result.filter((doc) => String(doc[columnId]) === filterValue)
      }
      if (searchQuery.length > 0) {
        const query = searchQuery.toLowerCase()
        result = result.filter((doc) =>
          searchableFields.some((field) => {
            const value = doc[field]
            return value != null && String(value).toLowerCase().includes(query)
          }),
        )
      }
      return result
    },
    [filters, searchQuery, searchableFields],
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
  }
}
