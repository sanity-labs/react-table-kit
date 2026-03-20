import {screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it} from 'vitest'

import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
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
  {
    _id: 'doc-6',
    _type: 'article',
    _updatedAt: '2026-02-26T12:00:00Z',
    title: 'Space Launch',
    status: 'published',
  },
  {
    _id: 'doc-7',
    _type: 'product',
    _updatedAt: '2026-02-25T12:00:00Z',
    title: 'Market Analysis',
    status: 'draft',
  },
  {
    _id: 'doc-8',
    _type: 'opinion',
    _updatedAt: '2026-02-24T12:00:00Z',
    title: 'AI Ethics',
    status: 'in-review',
  },
]

describe('Gmail-style Select All Banner', () => {
  it('shows "select all" banner when all rows on current page are selected and more exist', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.select(), column.title()]}
        pageSize={3}
      />,
    )

    // Select all on page via header checkbox
    const headerCheckbox = screen.getByLabelText(/select all on this page/i)
    await userEvent.click(headerCheckbox)

    // Banner should appear offering to select all 8
    const banner = screen.getByTestId('select-all-banner')
    expect(banner).toHaveTextContent(/all 3 documents on this page are selected/i)
    expect(banner).toHaveTextContent(/select all 8 documents/i)
  })

  it('does not show banner when all rows on page are selected but no more pages exist', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS.slice(0, 3)}
        columns={[column.select(), column.title()]}
        pageSize={5}
      />,
    )

    const headerCheckbox = screen.getByLabelText(/select all on this page/i)
    await userEvent.click(headerCheckbox)

    expect(screen.queryByTestId('select-all-banner')).not.toBeInTheDocument()
  })

  it('clicking "select all" in banner updates count to total documents', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.select(), column.title()]}
        pageSize={3}
        bulkActions={({selectedCount}) => <span data-testid="selected-count">{selectedCount}</span>}
      />,
    )

    // Select all on page
    const headerCheckbox = screen.getByLabelText(/select all on this page/i)
    await userEvent.click(headerCheckbox)

    // Click "select all" in banner
    const selectAllButton = screen.getByRole('button', {name: /select all 8 documents/i})
    await userEvent.click(selectAllButton)

    // Bulk action bar should show 8
    expect(screen.getByTestId('selected-count')).toHaveTextContent('8')

    // Banner should update
    expect(screen.getByTestId('select-all-banner')).toHaveTextContent(/all 8 documents selected/i)
  })
})

describe('Hide Pagination When Single Page', () => {
  it('hides pagination when all documents fit on one page', () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS.slice(0, 3)} columns={[column.title()]} pageSize={5} />,
    )

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })

  it('shows pagination when documents exceed page size', () => {
    renderWithTheme(<DocumentTable data={MOCK_DOCUMENTS} columns={[column.title()]} pageSize={3} />)

    expect(screen.getByTestId('pagination')).toBeInTheDocument()
  })
})

describe('Collapsed Group Selection Count', () => {
  it('shows selected count on collapsed group header', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[
          column.select(),
          column.title(),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
      />,
    )

    // Group by status
    const groupBySelect = screen.getByTestId('group-by-select')
    await userEvent.selectOptions(groupBySelect, 'status')

    // Find the published group header and select its rows
    let groupHeaders = await screen.findAllByTestId('group-header')
    let publishedHeader = groupHeaders.find((h) => h.textContent?.includes('published'))!

    // Select all in published group via group checkbox
    const groupCheckbox = within(publishedHeader).getByRole('checkbox')
    await userEvent.click(groupCheckbox)

    // Collapse the group by clicking the text (not the checkbox)
    const groupText = within(publishedHeader).getByText(/published/i)
    await userEvent.click(groupText)

    // Re-query the header after state change
    groupHeaders = screen.getAllByTestId('group-header')
    publishedHeader = groupHeaders.find((h) => h.textContent?.includes('published'))!

    // Should show collapsed arrow and selected count
    expect(publishedHeader).toHaveTextContent(/selected/i)
  })
})

describe('Checkbox Aria Labels', () => {
  it('header checkbox has descriptive aria-label', () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.select(), column.title()]} />,
    )

    expect(screen.getByLabelText(/select all on this page/i)).toBeInTheDocument()
  })

  it('row checkboxes have document-specific aria-labels', () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS.slice(0, 2)}
        columns={[column.select(), column.title()]}
      />,
    )

    expect(screen.getByLabelText(/select climate summit/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/select tech report/i)).toBeInTheDocument()
  })
})
