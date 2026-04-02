import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {fireEvent, screen, within, waitFor} from '@testing-library/react'
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {NuqsTestingAdapter, type UrlUpdateEvent} from 'nuqs/adapters/testing'
import {describe, expect, it, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'

const theme = buildTheme()

const MOCK_DOCUMENTS = [
  {
    _id: 'doc-1',
    _type: 'article',
    _updatedAt: '2026-03-03T12:00:00Z',
    title: 'Climate Summit',
    status: 'published',
    section: 'News',
  },
  {
    _id: 'doc-2',
    _type: 'product',
    _updatedAt: '2026-03-02T12:00:00Z',
    title: 'Tech Report',
    status: 'draft',
    section: 'Business',
  },
  {
    _id: 'doc-3',
    _type: 'article',
    _updatedAt: '2026-03-01T12:00:00Z',
    title: 'Championship',
    status: 'published',
    section: 'Sports',
  },
  {
    _id: 'doc-4',
    _type: 'opinion',
    _updatedAt: '2026-02-28T12:00:00Z',
    title: 'Remote Work',
    status: 'in-review',
    section: 'Business',
  },
  {
    _id: 'doc-5',
    _type: 'article',
    _updatedAt: '2026-02-27T12:00:00Z',
    title: 'Diet Study',
    status: 'draft',
    section: 'News',
  },
]

function renderWithNuqs(
  ui: React.ReactElement,
  opts?: {
    searchParams?: Record<string, string>
    onUrlUpdate?: (event: UrlUpdateEvent) => void
  },
) {
  const onUrlUpdate = opts?.onUrlUpdate ?? vi.fn()
  return {
    onUrlUpdate,
    ...render(
      <ThemeProvider theme={theme}>
        <NuqsTestingAdapter searchParams={opts?.searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
          {ui}
        </NuqsTestingAdapter>
      </ThemeProvider>,
    ),
  }
}

function latestParams(spy: ReturnType<typeof vi.fn>): URLSearchParams {
  const calls = spy.mock.calls
  if (calls.length === 0) return new URLSearchParams()
  return calls[calls.length - 1][0].searchParams
}

describe('URL param persistence', () => {
  it('persists filter selection to URL params', async () => {
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
      {onUrlUpdate},
    )
    const filterButton = screen.getByRole('button', {name: /type/i})
    fireEvent.click(filterButton)
    fireEvent.click(await screen.findByRole('menuitem', {hidden: true, name: /article/i}))
    await waitFor(() => {
      expect(latestParams(onUrlUpdate).get('filter._type')).toBe('article')
    })
  })

  it('removes filter param from URL when filter is cleared', async () => {
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
      {onUrlUpdate},
    )
    fireEvent.click(screen.getByRole('button', {name: /type/i}))
    fireEvent.click(await screen.findByRole('menuitem', {hidden: true, name: /article/i}))
    fireEvent.click(screen.getByRole('button', {name: /clear/i}))
    expect(latestParams(onUrlUpdate).has('filter._type')).toBe(false)
  })

  it('restores filters from URL on mount', async () => {
    renderWithNuqs(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
      {searchParams: {'filter._type': 'article'}},
    )
    expect(screen.getByText('Climate Summit')).toBeInTheDocument()
    expect(screen.getByText('Championship')).toBeInTheDocument()
    expect(screen.getByText('Diet Study')).toBeInTheDocument()
    expect(screen.queryByText('Tech Report')).not.toBeInTheDocument()
    expect(screen.queryByText('Remote Work')).not.toBeInTheDocument()
  })

  it('persists search query to URL params', async () => {
    const user = userEvent.setup()
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title({searchable: true}), column.type()]}
      />,
      {onUrlUpdate},
    )
    await user.type(screen.getByPlaceholderText(/search/i), 'Climate')
    await waitFor(() => {
      expect(latestParams(onUrlUpdate).get('search')).toBe('Climate')
    })
  })

  it('restores search from URL on mount', async () => {
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title({searchable: true}), column.type()]}
      />,
      {searchParams: {search: 'Climate'}},
    )
    expect(screen.getByPlaceholderText(/search/i)).toHaveValue('Climate')
    expect(screen.getByText('Climate Summit')).toBeInTheDocument()
    expect(screen.queryByText('Tech Report')).not.toBeInTheDocument()
  })

  it('clears search param from URL when search is cleared', async () => {
    const user = userEvent.setup()
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title({searchable: true}), column.type()]}
      />,
      {onUrlUpdate},
    )
    await user.type(screen.getByPlaceholderText(/search/i), 'Climate')
    await waitFor(() => {
      expect(latestParams(onUrlUpdate).get('search')).toBe('Climate')
    })
    await user.click(screen.getByRole('button', {name: /clear/i}))
    expect(latestParams(onUrlUpdate).has('search')).toBe(false)
  })

  it('persists sort state to URL params', async () => {
    const user = userEvent.setup()
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
      {onUrlUpdate},
    )
    const headers = screen.getAllByRole('columnheader')
    const titleHeader = headers.find((h) => h.textContent?.includes('Title'))!
    await user.click(titleHeader)
    expect(latestParams(onUrlUpdate).get('sort')).toBe('title')
    expect(latestParams(onUrlUpdate).get('dir')).toBe('asc')
    await user.click(titleHeader)
    expect(latestParams(onUrlUpdate).get('sort')).toBe('title')
    expect(latestParams(onUrlUpdate).get('dir')).toBe('desc')
  })

  it('restores sort from URL on mount', async () => {
    renderWithNuqs(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
      {searchParams: {sort: 'title', dir: 'asc'}},
    )
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const firstDataRow = rows[1]
    expect(within(firstDataRow).getByText('Championship')).toBeInTheDocument()
  })

  it('persists page number to URL params', async () => {
    const user = userEvent.setup()
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title(), column.type()]}
        pageSize={2}
      />,
      {onUrlUpdate},
    )
    await user.click(screen.getByRole('button', {name: /next/i}))
    expect(latestParams(onUrlUpdate).get('page')).toBe('2')
  })

  it('restores page from URL on mount', async () => {
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title(), column.type()]}
        pageSize={2}
      />,
      {searchParams: {page: '2'}},
    )
    const table = screen.getByRole('table')
    const dataRows = within(table)
      .getAllByRole('row')
      .filter((r) => r.querySelector('[role=cell]'))
    expect(dataRows).toHaveLength(2)
  })

  it('resets page param when filters change', async () => {
    const user = userEvent.setup()
    const onUrlUpdate = vi.fn()
    renderWithNuqs(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title(), column.type()]}
        pageSize={2}
      />,
      {onUrlUpdate},
    )
    await user.click(screen.getByRole('button', {name: /next/i}))
    expect(latestParams(onUrlUpdate).get('page')).toBe('2')
    await user.click(screen.getByRole('button', {name: /type/i}))
    await user.click(screen.getByRole('menuitem', {hidden: true, name: /article/i}))
    expect(latestParams(onUrlUpdate).has('page')).toBe(false)
  })
})
