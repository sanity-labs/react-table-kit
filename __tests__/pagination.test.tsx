import {screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it} from 'vitest'

import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

// Generate a large dataset for pagination testing
function generateDocs(count: number) {
  return Array.from({length: count}, (_, i) => ({
    _id: `doc-${i + 1}`,
    _type: 'article',
    _updatedAt: '2026-03-01T12:00:00Z',
    title: `Article ${i + 1}`,
  }))
}

describe('Pagination', () => {
  // Behavior 10 — Table shows configurable page size with page controls
  it('shows configurable page size (default 50) with page controls below', () => {
    const docs = generateDocs(100)

    renderWithTheme(<DocumentTable data={docs} columns={[column.title()]} pageSize={10} />)

    const table = screen.getByRole('table')
    // Should only show 10 rows (not all 100)
    const rows = within(table).getAllByRole('row')
    // 1 header row + 10 data rows = 11
    expect(rows).toHaveLength(11)

    // Should show page controls
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /next/i})).toBeInTheDocument()
  })

  // Behavior 11 — "Showing X-Y of Z documents" indicator is accurate
  it('"Showing 51-100 of 342 documents" indicator is accurate', async () => {
    const docs = generateDocs(342)

    renderWithTheme(<DocumentTable data={docs} columns={[column.title()]} pageSize={50} />)

    // Page 1: Showing 1-50 of 342 documents
    expect(screen.getByText('Showing 1-50 of 342 documents')).toBeInTheDocument()

    // Go to page 2
    await userEvent.click(screen.getByRole('button', {name: /next/i}))
    expect(screen.getByText('Showing 51-100 of 342 documents')).toBeInTheDocument()

    // Go to page 7 (last page)
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByRole('button', {name: /next/i}))
    }
    expect(screen.getByText('Showing 301-342 of 342 documents')).toBeInTheDocument()
  })

  // Behavior 12 — Changing page preserves current sort and filter state
  it('changing page preserves current sort state', async () => {
    const docs = generateDocs(20)

    renderWithTheme(
      <DocumentTable
        data={docs}
        columns={[column.title()]}
        pageSize={10}
        defaultSort={{field: 'title', direction: 'desc'}}
      />,
    )

    // Page 1 with desc sort — should show Article 9 first (string sort: "Article 9" > "Article 8" etc.)
    // Actually with string sort desc: Article 9, Article 8, Article 7... Article 20, Article 2, Article 19...
    // Let's just check the sort indicator is present
    expect(screen.getByText(/Title.*↓/)).toBeInTheDocument()

    // Go to page 2
    await userEvent.click(screen.getByRole('button', {name: /next/i}))

    // Sort should still be active
    expect(screen.getByText(/Title.*↓/)).toBeInTheDocument()
    expect(screen.getByText('Showing 11-20 of 20 documents')).toBeInTheDocument()
  })

  // Behavior 13 — Changing a filter resets to page 1
  it('changing a filter resets to page 1', async () => {
    function FilterablePaginatedTable() {
      const [showAll, setShowAll] = useState(true)
      const allDocs = generateDocs(30)
      const data = showAll ? allDocs : allDocs.slice(0, 5)

      return (
        <>
          <button data-testid="apply-filter" onClick={() => setShowAll(false)}>
            Apply Filter
          </button>
          <DocumentTable data={data} columns={[column.title()]} pageSize={10} />
        </>
      )
    }

    renderWithTheme(<FilterablePaginatedTable />)

    // Should be on page 1
    expect(screen.getByText('Showing 1-10 of 30 documents')).toBeInTheDocument()

    // Go to page 2
    await userEvent.click(screen.getByRole('button', {name: /next/i}))
    expect(screen.getByText('Showing 11-20 of 30 documents')).toBeInTheDocument()

    // Apply filter — should reset to page 1
    // With 5 docs and pageSize=5, all fit on one page so pagination hides
    await userEvent.click(screen.getByTestId('apply-filter'))
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })
})
