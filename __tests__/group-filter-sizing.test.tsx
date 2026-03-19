import {describe, expect, it} from 'vitest'
import {screen, within, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {DocumentTable} from '../src/DocumentTable'
import {column} from '../src/columns'
import {renderWithTheme} from './helpers'

const MOCK_DOCUMENTS = [
  {
    _id: 'doc-1',
    _type: 'article',
    _updatedAt: '2026-03-03T12:00:00Z',
    title: 'Climate Summit',
    status: 'published',
  },
  {
    _id: 'doc-2',
    _type: 'product',
    _updatedAt: '2026-03-02T12:00:00Z',
    title: 'Tech Report',
    status: 'draft',
  },
  {
    _id: 'doc-3',
    _type: 'article',
    _updatedAt: '2026-03-01T12:00:00Z',
    title: 'Championship',
    status: 'published',
  },
  {
    _id: 'doc-4',
    _type: 'opinion',
    _updatedAt: '2026-02-28T12:00:00Z',
    title: 'Remote Work',
    status: 'in-review',
  },
  {
    _id: 'doc-5',
    _type: 'article',
    _updatedAt: '2026-02-27T12:00:00Z',
    title: 'Diet Study',
    status: 'draft',
  },
]

describe('Grouped + filter clear column sizing', () => {
  it('preserves column layout after filtering to zero results and clearing in grouped mode', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[
          column.custom({field: 'title', header: 'Title', searchable: true}),
          column.custom({field: 'status', header: 'Status', filterable: true, groupable: true}),
          column.type(),
        ]}
      />,
    )

    const table = screen.getByRole('table')

    // Step 1: Enable grouping by status
    const groupSelect = screen.getByRole('combobox')
    await user.selectOptions(groupSelect, 'status')

    // Verify groups are showing
    const groupHeaders = screen.getAllByTestId('group-header')
    expect(groupHeaders.length).toBeGreaterThan(0)

    // Verify all docs visible
    expect(screen.getByText('Climate Summit')).toBeInTheDocument()

    // Step 2: Search for something that matches nothing → 0 visible rows
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'xyznonexistent')

    // Search is debounced, so wait for it to take effect
    await waitFor(() => {
      expect(screen.queryByText('Climate Summit')).not.toBeInTheDocument()
    })

    // Step 3: Clear the search to bring data back
    await user.clear(searchInput)

    // Step 4: Verify all data rows are back with correct structure
    await waitFor(() => {
      expect(screen.getByText('Climate Summit')).toBeInTheDocument()
    })
    expect(screen.getByText('Tech Report')).toBeInTheDocument()
    expect(screen.getByText('Championship')).toBeInTheDocument()
    expect(screen.getByText('Remote Work')).toBeInTheDocument()
    expect(screen.getByText('Diet Study')).toBeInTheDocument()

    // The bug: after clearing filters in grouped mode, the first column
    // becomes extremely wide, pushing other columns off-screen.
    // Verify each data row still has the correct number of cells (3 columns).
    const allCells = table.querySelectorAll('[role="rowgroup"]:last-child [role="cell"]')
    const groupHeaderCells = table.querySelectorAll(
      '[role="row"][data-testid="group-header"] [role="cell"]',
    )
    const dataCells = allCells.length - groupHeaderCells.length

    // 5 documents × 3 columns = 15 data cells
    expect(dataCells).toBe(15)
  })
})
