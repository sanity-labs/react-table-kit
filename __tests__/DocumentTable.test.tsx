import {ThemeProvider, studioTheme} from '@sanity/ui'
import {render} from '@testing-library/react'
import {describe, expect, it, vi, beforeEach} from 'vitest'

// Mock useTableFilters to capture config
const mockUseTableFilters = vi.fn()
vi.mock('../src/hooks/useTableFilters', () => ({
  useTableFilters: (...args: unknown[]) => {
    mockUseTableFilters(...args)
    return {
      filters: {},
      searchQuery: '',
      searchInputValue: '',
      setFilter: vi.fn(),
      clearFilter: vi.fn(),
      clearAll: vi.fn(),
      setSearchInput: vi.fn(),
      hasActiveFilters: false,
      getFilterOptions: vi.fn(() => []),
      applyFilters: vi.fn((data: unknown[]) => data),
      computedFilter: null,
      setComputedFilter: vi.fn(),
      computedFilters: undefined,
    }
  },
  parseRangeValue: vi.fn(),
}))

// Mock useTableGrouping
vi.mock('../src/hooks/useTableGrouping', () => ({
  useTableGrouping: () => ({
    groupBy: null,
    setGroupBy: vi.fn(),
    groupData: (data: unknown[]) => [{key: null, label: 'All', rows: data}],
  }),
}))

// Mock child components that have complex rendering dependencies (nuqs, matchMedia)
vi.mock('../src/components/table/DocumentTableInner', () => ({
  DocumentTableInner: () => <div data-testid="mock-table-inner" />,
}))

vi.mock('../src/components/filters/FilterBar', () => ({
  FilterBar: () => <div data-testid="mock-filter-bar" />,
}))

import {DocumentTable} from '../src/components/table/DocumentTable'
import type {ColumnDef, DocumentBase} from '../src/types/tableTypes'

function renderTable(props: Record<string, unknown>) {
  return render(
    <ThemeProvider theme={studioTheme}>
      <DocumentTable {...props} />
    </ThemeProvider>,
  )
}

describe('T1-4: DocumentTable computedFilters prop', () => {
  beforeEach(() => {
    mockUseTableFilters.mockClear()
  })

  it('T1-4.B1: computedFilters prop is forwarded to useTableFilters', () => {
    const computedFilters = {
      atRisk: {
        label: 'At Risk',
        predicate: (row: DocumentBase) => !!(row as {isAtRisk?: boolean}).isAtRisk,
      },
    }

    renderTable({
      data: [{_id: '1', _type: 'article', title: 'Test'}],
      columns: [{id: 'title', header: 'Title', field: 'title'}],
      computedFilters,
    })

    expect(mockUseTableFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        computedFilters,
      }),
    )
  })

  it('T1-4.B2: column filterMode is derived from column definitions', () => {
    const columns: ColumnDef[] = [
      {id: 'title', header: 'Title', field: 'title', filterable: true},
      {id: 'date', header: 'Date', field: 'publishDate', filterable: true, filterMode: 'range'},
    ]

    renderTable({
      data: [{_id: '1', _type: 'article', title: 'Test', publishDate: '2026-03-28'}],
      columns,
    })

    const config = mockUseTableFilters.mock.calls[0][0]
    expect(config.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({id: 'title', filterMode: 'exact'}),
        expect.objectContaining({id: 'publishDate', filterMode: 'range'}),
      ]),
    )
  })

  it('T1-4.B3: existing exact filter behavior unchanged (regression)', () => {
    renderTable({
      data: [{_id: '1', _type: 'article', title: 'Test'}],
      columns: [{id: 'title', header: 'Title', field: 'title', filterable: true}],
    })

    const config = mockUseTableFilters.mock.calls[0][0]
    expect(config.filterableColumns).toEqual(['title'])
    // No computedFilters when not provided
    expect(config.computedFilters).toBeUndefined()
  })
})
