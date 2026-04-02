import {ThemeProvider, studioTheme} from '@sanity/ui'
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeAll, describe, it, expect, vi} from 'vitest'

import {FilterBar} from '../src/components/filters/FilterBar'
import type {UseTableFiltersResult} from '../src/hooks/useTableFilters'
import type {ColumnDef, DocumentBase} from '../src/types/tableTypes'

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
  {
    _id: '2',
    _type: 'article',
    title: 'Beta',
    status: 'published',
    plannedPublishDate: '2026-03-28',
  },
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
  // T1-3.B1: Range column renders a popover trigger instead of dropdown
  it('B1: range column renders a popover trigger instead of dropdown', () => {
    const mockFilters = createMockFilters()

    renderWithTheme(
      <FilterBar
        filters={mockFilters}
        data={testData}
        filterableColumns={['status', 'plannedPublishDate']}
        columns={testColumns}
      />,
    )

    expect(screen.getByTestId('filter-range-trigger-plannedPublishDate')).toBeInTheDocument()
    expect(screen.queryByTestId('filter-range-from-plannedPublishDate')).not.toBeInTheDocument()
    expect(screen.queryByTestId('filter-range-to-plannedPublishDate')).not.toBeInTheDocument()
  })

  // T1-3.B2: Opening the trigger shows a calendar popover
  it('B2: clicking the trigger opens a calendar popover', async () => {
    const mockFilters = createMockFilters()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))

    try {
      renderWithTheme(
        <FilterBar
          filters={mockFilters}
          data={testData}
          filterableColumns={['plannedPublishDate']}
          columns={testColumns}
        />,
      )

      fireEvent.click(screen.getByTestId('filter-range-trigger-plannedPublishDate'))

      expect(screen.getByRole('grid', {hidden: true})).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  // T1-3.B3: Range selection commits only after the second click
  it('B3: selecting start and end dates creates from..to filter', async () => {
    const mockFilters = createMockFilters({
      filters: {},
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))

    try {
      renderWithTheme(
        <FilterBar
          filters={mockFilters}
          data={testData}
          filterableColumns={['plannedPublishDate']}
          columns={testColumns}
        />,
      )

      fireEvent.click(screen.getByTestId('filter-range-trigger-plannedPublishDate'))
      const grid = screen.getByRole('grid', {hidden: true})
      fireEvent.click(within(grid).getByRole('button', {name: /March 20/i, hidden: true}))

      expect(mockFilters.setFilter).not.toHaveBeenCalled()

      fireEvent.click(within(grid).getByRole('button', {name: /March 25/i, hidden: true}))

      expect(mockFilters.setFilter).toHaveBeenCalledWith(
        'plannedPublishDate',
        '2026-03-20..2026-03-25',
      )
    } finally {
      vi.useRealTimers()
    }
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
