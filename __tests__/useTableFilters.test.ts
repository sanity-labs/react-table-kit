import {renderHook, act} from '@testing-library/react'
import {useState, useCallback} from 'react'
import {describe, it, expect, vi, beforeEach} from 'vitest'

import type {DocumentBase} from '../src/types/tableTypes'

// Shared backing store for inspecting URL state in tests
let _queryStatesStore: Record<string, string | null> = {}
let _singleStatesStore: Record<string, string | null> = {}

// Mock nuqs with React state so re-renders happen properly
vi.mock('nuqs', () => {
  type QueryStatesSetter = (updates: Record<string, string | null>) => void
  type SingleStateSetter = (value: string | null) => void
  return {
    parseAsString: {
      withOptions: () => ({
        /* parser */
      }),
    },
    useQueryStates: vi.fn(
      (
        _keyMap: Record<string, unknown>,
        _opts?: unknown,
      ): [Record<string, string | null>, QueryStatesSetter] => {
        // Use React state for reactivity
        const [state, setStateRaw] = useState<Record<string, string | null>>(() => ({
          ..._queryStatesStore,
        }))
        const setState = useCallback((updates: Record<string, string | null>) => {
          setStateRaw((prev: Record<string, string | null>) => {
            const next = {...prev}
            for (const [key, value] of Object.entries(updates)) {
              if (value === null) {
                delete next[key]
              } else {
                next[key] = value
              }
            }
            // Also update backing store for inspection
            Object.assign(_queryStatesStore, next)
            // Clean nulls from backing store
            for (const [key, value] of Object.entries(updates)) {
              if (value === null) {
                delete _queryStatesStore[key]
              }
            }
            return next
          })
        }, [])
        return [state, setState]
      },
    ),
    useQueryState: vi.fn((key: string, _parser?: unknown): [string | null, SingleStateSetter] => {
      const [state, setStateRaw] = useState<Record<string, string | null>>(() => ({
        ..._singleStatesStore,
      }))
      const value = state[key] ?? null
      const setValue = useCallback(
        (newValue: string | null) => {
          setStateRaw((prev: Record<string, string | null>) => {
            const next = {...prev}
            if (newValue === null) {
              delete next[key]
              delete _singleStatesStore[key]
            } else {
              next[key] = newValue
              _singleStatesStore[key] = newValue
            }
            return next
          })
        },
        [key],
      )
      return [value, setValue]
    }),
    // Helper to reset state between tests
    __resetState: () => {
      _queryStatesStore = {}
      _singleStatesStore = {}
    },
    // Helper to inspect state for URL persistence tests
    __getQueryStates: () => ({..._queryStatesStore}),
    __getSingleStates: () => ({..._singleStatesStore}),
  }
})

import {useTableFilters} from '../src/hooks/useTableFilters'
import type {ComputedFilterConfig} from '../src/hooks/useTableFilters'

// Test data types
interface TestDoc extends DocumentBase {
  _id: string
  _type: string
  title: string
  status: string
  plannedPublishDate: string
  budget: number
}

const testData: TestDoc[] = [
  {
    _id: '1',
    _type: 'article',
    title: 'Alpha',
    status: 'draft',
    plannedPublishDate: '2026-03-25',
    budget: 1000,
  },
  {
    _id: '2',
    _type: 'article',
    title: 'Beta',
    status: 'published',
    plannedPublishDate: '2026-03-28',
    budget: 2000,
  },
  {
    _id: '3',
    _type: 'article',
    title: 'Gamma',
    status: 'draft',
    plannedPublishDate: '2026-04-01',
    budget: 3000,
  },
  {
    _id: '4',
    _type: 'article',
    title: 'Delta',
    status: 'review',
    plannedPublishDate: '2026-04-04',
    budget: 500,
  },
  {
    _id: '5',
    _type: 'article',
    title: 'Epsilon',
    status: 'published',
    plannedPublishDate: '2026-04-10',
    budget: 1500,
  },
]

describe('useTableFilters', () => {
  beforeEach(async () => {
    const nuqsModule = (await import('nuqs')) as unknown as {
      __resetState: () => void
    }
    nuqsModule.__resetState()
  })

  // T1-2.B1: Exact filter still works (regression)
  it('B1: exact filter still works (regression)', () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['status'],
      }),
    )

    act(() => {
      result.current.setFilter('status', 'draft')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(2)
    expect(filtered.map((d) => d._id)).toEqual(['1', '3'])
  })

  // T1-2.B2: Range filter with min..max filters dates between min and max (inclusive)
  it('B2: range filter with min..max filters dates between min and max (inclusive)', () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
      }),
    )

    act(() => {
      result.current.setFilter('plannedPublishDate', '2026-03-28..2026-04-04')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((d) => d._id)).toEqual(['2', '3', '4'])
  })

  // T1-2.B3: Range filter with min.. filters dates >= min (open-ended)
  it('B3: range filter with min.. filters dates >= min (open-ended)', () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
      }),
    )

    act(() => {
      result.current.setFilter('plannedPublishDate', '2026-04-01..')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((d) => d._id)).toEqual(['3', '4', '5'])
  })

  // T1-2.B4: Range filter with ..max filters dates <= max (open-ended)
  it('B4: range filter with ..max filters dates <= max (open-ended)', () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
      }),
    )

    act(() => {
      result.current.setFilter('plannedPublishDate', '..2026-03-28')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(2)
    expect(filtered.map((d) => d._id)).toEqual(['1', '2'])
  })

  // T1-2.B5: Range filter on numeric field works
  it('B5: range filter on numeric field works', () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['budget'],
        columns: [{id: 'budget', filterMode: 'range'}],
      }),
    )

    act(() => {
      result.current.setFilter('budget', '1000..2000')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(3)
    expect(filtered.map((d) => d._id)).toEqual(['1', '2', '5'])
  })

  // T1-2.B6: filterFn column uses custom predicate
  it('B6: filterFn column uses custom predicate', () => {
    const customFilterFn = (row: TestDoc, filterValue: string) => {
      // Custom: filter by title starting with the filter value
      return row.title.toLowerCase().startsWith(filterValue.toLowerCase())
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['title'],
        columns: [{id: 'title', filterMode: 'exact', filterFn: customFilterFn}],
      }),
    )

    act(() => {
      result.current.setFilter('title', 'a')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]._id).toBe('1') // Alpha
  })

  // T1-2.B7: Computed filter activates named predicate
  it('B7: computed filter activates named predicate', () => {
    const computedFilters: Record<string, ComputedFilterConfig<TestDoc>> = {
      highBudget: {
        label: 'High Budget',
        predicate: (row) => row.budget >= 2000,
      },
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: [],
        computedFilters,
      }),
    )

    act(() => {
      result.current.setComputedFilter('highBudget')
    })

    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(2)
    expect(filtered.map((d) => d._id)).toEqual(['2', '3'])
  })

  // T1-2.B8: setComputedFilter(null) clears computed filter
  it('B8: setComputedFilter(null) clears computed filter', () => {
    const computedFilters: Record<string, ComputedFilterConfig<TestDoc>> = {
      highBudget: {
        label: 'High Budget',
        predicate: (row) => row.budget >= 2000,
      },
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: [],
        computedFilters,
      }),
    )

    act(() => {
      result.current.setComputedFilter('highBudget')
    })

    // Verify it's active
    expect(result.current.computedFilter).toBe('highBudget')

    act(() => {
      result.current.setComputedFilter(null)
    })

    expect(result.current.computedFilter).toBeNull()
    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(5) // All rows returned
  })

  // T1-2.B9: clearAll clears range filters + computed filter
  it('B9: clearAll clears range filters + computed filter', () => {
    const computedFilters: Record<string, ComputedFilterConfig<TestDoc>> = {
      highBudget: {
        label: 'High Budget',
        predicate: (row) => row.budget >= 2000,
      },
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
        computedFilters,
      }),
    )

    act(() => {
      result.current.setFilter('plannedPublishDate', '2026-03-28..2026-04-04')
      result.current.setComputedFilter('highBudget')
    })

    // Verify both are active
    expect(result.current.hasActiveFilters).toBe(true)

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.computedFilter).toBeNull()
    expect(result.current.hasActiveFilters).toBe(false)
    const filtered = result.current.applyFilters(testData)
    expect(filtered).toHaveLength(5)
  })

  // T1-2.B10: hasActiveFilters includes range and computed filters
  it('B10: hasActiveFilters includes range and computed filters', () => {
    const computedFilters: Record<string, ComputedFilterConfig<TestDoc>> = {
      highBudget: {
        label: 'High Budget',
        predicate: (row) => row.budget >= 2000,
      },
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
        computedFilters,
      }),
    )

    // Initially no active filters
    expect(result.current.hasActiveFilters).toBe(false)

    // Range filter makes it active
    act(() => {
      result.current.setFilter('plannedPublishDate', '2026-03-28..2026-04-04')
    })
    expect(result.current.hasActiveFilters).toBe(true)

    // Clear range, set computed
    act(() => {
      result.current.clearFilter('plannedPublishDate')
    })
    act(() => {
      result.current.setComputedFilter('highBudget')
    })
    expect(result.current.hasActiveFilters).toBe(true)
  })

  // T1-2.B11: Range filter value persists in URL as ?filter.field=min..max
  it('B11: range filter value persists in URL as ?filter.field=min..max', async () => {
    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: ['plannedPublishDate'],
        columns: [{id: 'plannedPublishDate', filterMode: 'range'}],
      }),
    )

    act(() => {
      result.current.setFilter('plannedPublishDate', '2026-03-28..2026-04-04')
    })

    // The filter value should be stored in the nuqs query state
    const nuqs = (await import('nuqs')) as unknown as {
      __getQueryStates: () => Record<string, string | null>
    }
    const queryStates = nuqs.__getQueryStates()
    expect(queryStates['filter.plannedPublishDate']).toBe('2026-03-28..2026-04-04')
  })

  // T1-2.B12: Computed filter persists in URL as ?computed=name
  it('B12: computed filter persists in URL as ?computed=name', async () => {
    const computedFilters: Record<string, ComputedFilterConfig<TestDoc>> = {
      highBudget: {
        label: 'High Budget',
        predicate: (row) => row.budget >= 2000,
      },
    }

    const {result} = renderHook(() =>
      useTableFilters<TestDoc>({
        filterableColumns: [],
        computedFilters,
      }),
    )

    act(() => {
      result.current.setComputedFilter('highBudget')
    })

    // The computed filter should be stored in the nuqs single state
    const nuqs = (await import('nuqs')) as unknown as {
      __getSingleStates: () => Record<string, string | null>
    }
    const singleStates = nuqs.__getSingleStates()
    expect(singleStates['computed']).toBe('highBudget')
  })
})
