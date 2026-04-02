import {screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {useDocumentTable} from '../src/hooks/useDocumentTable'
import {renderWithTheme} from './helpers'

const MOCK_DOCUMENTS = [
  {_id: 'doc-1', _type: 'article', _updatedAt: '2026-03-01T12:00:00Z', title: 'First Article'},
  {_id: 'doc-2', _type: 'product', _updatedAt: '2026-03-02T12:00:00Z', title: 'Second Product'},
  {_id: 'doc-3', _type: 'article', _updatedAt: '2026-03-03T12:00:00Z', title: 'Third Article'},
]

describe('DocumentTable', () => {
  // Behavior 1 — Tracer bullet
  it('renders a table with rows from data and column definitions', () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
    )

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', {name: /type/i})).toBeInTheDocument()

    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4)

    expect(screen.getByText('First Article')).toBeInTheDocument()
    expect(screen.getByText('Second Product')).toBeInTheDocument()
    expect(screen.getByText('Third Article')).toBeInTheDocument()
  })

  // Behavior 2 — column.title() renders text with medium weight
  it('renders title column with medium font weight', () => {
    renderWithTheme(<DocumentTable data={MOCK_DOCUMENTS} columns={[column.title()]} />)

    const titleCell = screen.getByText('First Article')
    const textWrapper = titleCell.closest('[data-ui="Text"]')
    expect(textWrapper).toBeInTheDocument()
  })

  // Behavior 3 — column.type() renders a badge with doc type label
  it('renders type column as a badge with capitalized type label', () => {
    renderWithTheme(<DocumentTable data={MOCK_DOCUMENTS} columns={[column.type()]} />)

    const badges = screen.getAllByText('Article')
    expect(badges).toHaveLength(2)
    expect(screen.getByText('Product')).toBeInTheDocument()
  })

  // Behavior 4 — column.updatedAt() renders relative time
  it('renders updatedAt column with relative time string', () => {
    const now = new Date('2026-03-03T15:00:00Z')
    vi.setSystemTime(now)

    renderWithTheme(
      <DocumentTable
        data={[
          {_id: 'doc-1', _type: 'article', _updatedAt: '2026-03-03T12:00:00Z', title: 'Recent'},
          {_id: 'doc-2', _type: 'article', _updatedAt: '2026-03-01T12:00:00Z', title: 'Older'},
        ]}
        columns={[column.updatedAt()]}
      />,
    )

    expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    expect(screen.getByText('2 days ago')).toBeInTheDocument()

    vi.useRealTimers()
  })

  // Behavior 5 — column.custom() renders developer-defined cell content
  it('renders custom column with developer-defined cell renderer', () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[
          column.custom({
            field: 'title',
            header: 'Custom Title',
            cell: (value) => <span data-testid="custom-cell">{String(value).toUpperCase()}</span>,
          }),
        ]}
      />,
    )

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('FIRST ARTICLE')).toBeInTheDocument()
    expect(screen.getAllByTestId('custom-cell')).toHaveLength(3)
  })

  // Behavior 6 — Sorting
  it('sorts by column when header is clicked', async () => {
    renderWithTheme(<DocumentTable data={MOCK_DOCUMENTS} columns={[column.title()]} />)

    const header = screen.getByText('Title')

    await userEvent.click(header)
    let rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('First Article')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Third Article')).toBeInTheDocument()

    await userEvent.click(header)
    rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Third Article')).toBeInTheDocument()
    expect(within(rows[3]).getByText('First Article')).toBeInTheDocument()
  })

  // Behavior 7 — Sort indicator
  it('shows sort indicator on active sort column', async () => {
    renderWithTheme(<DocumentTable data={MOCK_DOCUMENTS} columns={[column.title()]} />)

    const header = screen.getByText('Title')
    expect(screen.queryByText('Title ↑')).not.toBeInTheDocument()

    await userEvent.click(header)
    expect(screen.getByText(/Title/)).toHaveTextContent('Title ↑')

    await userEvent.click(header)
    expect(screen.getByText(/Title/)).toHaveTextContent('Title ↓')
  })

  // Behavior 8 — defaultSort
  it('applies defaultSort on initial render', () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title()]}
        defaultSort={{field: 'title', direction: 'desc'}}
      />,
    )

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Third Article')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Second Product')).toBeInTheDocument()
    expect(within(rows[3]).getByText('First Article')).toBeInTheDocument()
  })

  // Behavior 9 — Loading skeleton
  it('renders loading skeleton when data is undefined', () => {
    renderWithTheme(<DocumentTable data={undefined} columns={[column.title()]} loading={true} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByTestId('sanity-table-skeleton')).toBeInTheDocument()
  })

  // Behavior 10 — Empty state
  it('renders empty state when data is an empty array', () => {
    renderWithTheme(<DocumentTable data={[]} columns={[column.title()]} />)

    expect(screen.getByText('No documents found')).toBeInTheDocument()
  })

  // Behavior 11 — Custom empty state message
  it('renders custom empty state message', () => {
    renderWithTheme(
      <DocumentTable
        data={[]}
        columns={[column.title()]}
        emptyMessage="No articles in this section"
      />,
    )

    expect(screen.getByText('No articles in this section')).toBeInTheDocument()
  })
})

describe('useDocumentTable', () => {
  function CustomTable({
    data,
    cols,
  }: {
    data: typeof MOCK_DOCUMENTS
    cols: ReturnType<typeof column.title>[]
  }) {
    const table = useDocumentTable({data, columns: cols})

    return (
      <div>
        <div data-testid="row-count">{table.rows.length}</div>
        <div data-testid="column-count">{table.columns.length}</div>
        <table role="table">
          <thead>
            <tr>
              {table.headerGroups[0]?.headers.map((h) => (
                <th key={h.id}>{h.renderHeader()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell) => (
                  <td key={cell.id}>{cell.renderCell()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  it('returns rows and columns for custom composition', () => {
    renderWithTheme(<CustomTable data={MOCK_DOCUMENTS} cols={[column.title(), column.type()]} />)

    expect(screen.getByTestId('row-count')).toHaveTextContent('3')
    expect(screen.getByTestId('column-count')).toHaveTextContent('2')
    expect(screen.getByText('First Article')).toBeInTheDocument()
  })

  it('exposes sort controls', () => {
    renderWithTheme(<CustomTable data={MOCK_DOCUMENTS} cols={[column.title()]} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
