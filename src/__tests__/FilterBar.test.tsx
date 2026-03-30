import {ThemeProvider, studioTheme} from '@sanity/ui'
import {cleanup, render, screen, fireEvent} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeAll, describe, it, expect, vi} from 'vitest'

import type {ColumnDef, DocumentBase} from '../types'
import {FilterBar} from '../FilterBar'
import type {UseTableFiltersResult} from '../useTableFilters'

// Sanity UI's Popover uses window.matchMedia which jsdom doesn't provide
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
})

const theme = studioTheme

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

interface TestDoc extends DocumentBase {
  _id: string
  _type: string
  title: string
  status: string
  plannedPublishDate: string
}

const testData: TestDoc[] = [
  {_id: '1', _type: 'article', title: 'Alpha', status: 'draft', plannedPublishDate: '2026-03-25'},
  {_id: '2', _type: 'article', title: 'Beta', status: 'published', plannedPublishDate: '2026-03-28'},
  {_id: '3', _type: 'article', title: 'Gamma', status: 'draft', plannedPublishDate: '2026-04-01'},
]

const testColumns: ColumnDef<TestDoc>[] = [
  {id: 'title', header: 'Title', field: 'title'},
  {id: 'status', header: 'Status', field: 'status', filterable: true},
  {
    id: 'plannedPublishDate',
    header: 'Publish Date',
    field: 'plannedPublishDate',
    filterable: true,
    filterMode: 'range',
  },
]

function createMockFilters(
  overrides?: Partial<UseTableFiltersResult<TestDoc>>,
): UseTableFiltersResult<TestDoc> {
  return {
    filters: {},
    searchQuery: '',
    searchInputValue: '',
    setFilter: vi.fn(),
    clearFilter: vi.fn(),
    clearAll: vi.fn(),
    setSearchInput: vi.fn(),
    hasActiveFilters: false,
    getFilterOptions: vi.fn(() => ['draft', 'published', 'review']),
    applyFilters: vi.fn((data) => data),
    computedFilter: null,
    setComputedFilter: vi.fn(),
    computedFilters: undefined,
    ...overrides,
  }
}

describe('T1-3: FilterBar range columns and computed filter chips', () => {
  // T1-3.B1: Range column renders two date inputs instead of dropdown
  it('B1: range column renders two date inputs instead of dropdown', () => {
    const mockFilters = createMockFilters()

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['status', 'plannedPublishDate']}
        columns={testColumns}
      />,
    )

    // Should have date range inputs for plannedPublishDate
    expect(screen.getByTestId('filter-range-from-plannedPublishDate')).toBeInTheDocument()
    expect(screen.getByTestId('filter-range-to-plannedPublishDate')).toBeInTheDocument()

    // The date inputs should be type="date"
    expect(screen.getByTestId('filter-range-from-plannedPublishDate')).toHaveAttribute(
      'type',
      'date',
    )
    expect(screen.getByTestId('filter-range-to-plannedPublishDate')).toHaveAttribute(
      'type',
      'date',
    )
  })

  // T1-3.B2: Setting from date creates `from..` filter
  it('B2: setting from date creates from.. filter', () => {
    const mockFilters = createMockFilters()

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['plannedPublishDate']}
        columns={testColumns}
      />,
    )

    const fromInput = screen.getByTestId('filter-range-from-plannedPublishDate')
    fireEvent.change(fromInput, {target: {value: '2026-03-28'}})

    expect(mockFilters.setFilter).toHaveBeenCalledWith('plannedPublishDate', '2026-03-28..')
  })

  // T1-3.B3: Setting both dates creates `from..to` filter
  it('B3: setting both dates creates from..to filter', () => {
    const mockFilters = createMockFilters({
      filters: {plannedPublishDate: '2026-03-28..'},
    })

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['plannedPublishDate']}
        columns={testColumns}
      />,
    )

    // The from input should already have the value
    const fromInput = screen.getByTestId(
      'filter-range-from-plannedPublishDate',
    ) as HTMLInputElement
    expect(fromInput.value).toBe('2026-03-28')

    // Set the to date
    const toInput = screen.getByTestId('filter-range-to-plannedPublishDate')
    fireEvent.change(toInput, {target: {value: '2026-04-04'}})

    expect(mockFilters.setFilter).toHaveBeenCalledWith(
      'plannedPublishDate',
      '2026-03-28..2026-04-04',
    )
  })

  // T1-3.B4: Range filter chip shows formatted date range
  it('B4: range filter chip shows formatted date range', () => {
    const mockFilters = createMockFilters({
      filters: {plannedPublishDate: '2026-03-28..2026-04-04'},
      hasActiveFilters: true,
    })

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['plannedPublishDate']}
        columns={testColumns}
      />,
    )

    const chip = screen.getByTestId('filter-chip-plannedPublishDate')
    expect(chip).toBeInTheDocument()
    // Should show formatted dates, not raw min..max
    expect(chip.textContent).toContain('Mar 28')
    expect(chip.textContent).toContain('Apr 4')
    expect(chip.textContent).toContain('→')
  })

  // T1-3.B5: Clearing range filter chip removes both dates
  it('B5: clearing range filter chip removes both dates', async () => {
    const user = userEvent.setup()
    const mockFilters = createMockFilters({
      filters: {plannedPublishDate: '2026-03-28..2026-04-04'},
      hasActiveFilters: true,
    })

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['plannedPublishDate']}
        columns={testColumns}
      />,
    )

    const removeButton = screen.getByTestId('filter-chip-remove-plannedPublishDate')
    await user.click(removeButton)

    expect(mockFilters.clearFilter).toHaveBeenCalledWith('plannedPublishDate')
  })

  // T1-3.B6: Computed filter chip shows with label from config
  it('B6: computed filter chip shows with label from config', () => {
    const mockFilters = createMockFilters({
      computedFilter: 'highBudget',
      computedFilters: {
        highBudget: {
          label: 'High Budget',
          predicate: () => true,
        },
      },
      hasActiveFilters: true,
    })

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={[]}
        columns={testColumns}
      />,
    )

    const chip = screen.getByTestId('filter-chip-computed')
    expect(chip).toBeInTheDocument()
    expect(chip.textContent).toContain('High Budget')
  })
})
