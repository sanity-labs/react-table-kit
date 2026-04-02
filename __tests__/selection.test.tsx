import {screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {renderWithTheme} from './helpers'

const MOCK_DOCUMENTS = [
  {_id: 'doc-1', _type: 'article', _updatedAt: '2026-03-01T12:00:00Z', title: 'First Article'},
  {_id: 'doc-2', _type: 'product', _updatedAt: '2026-03-02T12:00:00Z', title: 'Second Product'},
  {_id: 'doc-3', _type: 'article', _updatedAt: '2026-03-03T12:00:00Z', title: 'Third Article'},
]

describe('Row Selection', () => {
  // Behavior 1 — Tracer bullet
  it('clicking a row checkbox selects that row and shows the bulk action bar with "1 document selected"', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.select(), column.title()]} />,
    )

    // Find all checkboxes in the table body (not header)
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is the header "select all", rest are row checkboxes
    expect(checkboxes.length).toBeGreaterThanOrEqual(4) // 1 header + 3 rows

    // Click the first row checkbox
    await userEvent.click(checkboxes[1])

    // Bulk action bar should appear with selection count
    expect(screen.getByText('1 document selected')).toBeInTheDocument()
  })

  // Behavior 2 — Header checkbox selects all visible rows
  it('clicking the header checkbox selects all visible rows', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.select(), column.title()]} />,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const headerCheckbox = checkboxes[0]

    // Click header checkbox to select all
    await userEvent.click(headerCheckbox)

    // All row checkboxes should be checked
    const rowCheckboxes = checkboxes.slice(1)
    for (const cb of rowCheckboxes) {
      expect(cb).toBeChecked()
    }

    // Bulk action bar should show count for all rows
    expect(screen.getByText('3 documents selected')).toBeInTheDocument()
  })

  // Behavior 3 — Group header checkbox selects all rows in that group
  it('clicking a group header checkbox selects all rows in that group', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.select(), column.title(), column.type()]}
      />,
    )

    // Group by _type
    const groupBySelect = screen.getByTestId('group-by-select')
    await userEvent.selectOptions(groupBySelect, '_type')

    // Find group headers
    const groupHeaders = await screen.findAllByTestId('group-header')
    expect(groupHeaders.length).toBe(2) // article and product

    // Find the "article" group header (has 2 docs)
    const articleHeader = groupHeaders.find((h) => h.textContent?.includes('article'))!
    expect(articleHeader).toBeDefined()

    // Click the checkbox in the article group header
    const articleCheckbox = within(articleHeader).getByRole('checkbox')
    await userEvent.click(articleCheckbox)

    // Bulk action bar should show 2 documents selected (only the article group)
    expect(screen.getByText('2 documents selected')).toBeInTheDocument()

    // The product row checkbox should NOT be checked
    const productHeader = groupHeaders.find((h) => h.textContent?.includes('product'))!
    const productCheckbox = within(productHeader).getByRole('checkbox')
    expect(productCheckbox).not.toBeChecked()
  })

  // Behavior 4 — Selection count updates as rows are selected/deselected
  it('selection count in bulk action bar updates as rows are selected/deselected', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.select(), column.title()]} />,
    )

    const checkboxes = screen.getAllByRole('checkbox')

    // Select first row
    await userEvent.click(checkboxes[1])
    expect(screen.getByText('1 document selected')).toBeInTheDocument()

    // Select second row
    await userEvent.click(checkboxes[2])
    expect(screen.getByText('2 documents selected')).toBeInTheDocument()

    // Deselect first row
    await userEvent.click(checkboxes[1])
    expect(screen.getByText('1 document selected')).toBeInTheDocument()

    // Deselect second row — bar should disappear
    await userEvent.click(checkboxes[2])
    expect(screen.queryByText(/document.*selected/)).not.toBeInTheDocument()
  })

  // Behavior 5 — Selection persists when sort order changes
  it('selection persists when sort order changes', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.select(), column.title()]} />,
    )

    const checkboxes = screen.getAllByRole('checkbox')

    // Select first row (First Article)
    await userEvent.click(checkboxes[1])
    expect(screen.getByText('1 document selected')).toBeInTheDocument()

    // Click the Title header to sort
    const titleHeader = screen.getByText('Title')
    await userEvent.click(titleHeader)

    // Selection should still be active
    expect(screen.getByText('1 document selected')).toBeInTheDocument()
  })

  // Behavior 6 — Selection clears when a filter changes (data changes)
  it('selection clears when data changes (simulating filter change)', async () => {
    function FilterableTable() {
      const [showAll, setShowAll] = useState(true)
      const data = showAll ? MOCK_DOCUMENTS : MOCK_DOCUMENTS.filter((d) => d._type === 'article')

      return (
        <>
          <button data-testid="toggle-filter" onClick={() => setShowAll((v) => !v)}>
            Toggle Filter
          </button>
          <DocumentTable data={data} columns={[column.select(), column.title()]} />
        </>
      )
    }

    renderWithTheme(<FilterableTable />)

    const checkboxes = screen.getAllByRole('checkbox')
    // Select first row
    await userEvent.click(checkboxes[1])
    expect(screen.getByText('1 document selected')).toBeInTheDocument()

    // Apply filter (changes data)
    await userEvent.click(screen.getByTestId('toggle-filter'))

    // Selection should be cleared
    expect(screen.queryByText(/document.*selected/)).not.toBeInTheDocument()
  })

  // Behavior 7 — Developer-provided bulk action buttons receive the selected rows
  it('developer-provided bulk action buttons receive the selected rows', async () => {
    const bulkActionFn = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.select(), column.title()]}
        bulkActions={(selection) => (
          <button data-testid="bulk-delete" onClick={() => bulkActionFn(selection.selectedRows)}>
            Delete ({selection.selectedCount})
          </button>
        )}
      />,
    )

    const checkboxes = screen.getAllByRole('checkbox')

    // Select two rows
    await userEvent.click(checkboxes[1])
    await userEvent.click(checkboxes[2])

    // Bulk action button should be visible with count
    const deleteBtn = screen.getByTestId('bulk-delete')
    expect(deleteBtn).toHaveTextContent('Delete (2)')

    // Click the bulk action button
    await userEvent.click(deleteBtn)

    // The callback should receive the selected rows
    expect(bulkActionFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({_id: 'doc-1'}),
        expect.objectContaining({_id: 'doc-2'}),
      ]),
    )
  })
})
