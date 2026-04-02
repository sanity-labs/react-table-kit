import {fireEvent, screen, within, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {renderWithTheme} from './helpers'

const MOCK_DOCUMENTS = [
  {
    _id: 'doc-1',
    _type: 'article',
    _updatedAt: '2026-03-03T12:00:00Z',
    title: 'Climate Summit Agreement',
    status: 'published',
  },
  {
    _id: 'doc-2',
    _type: 'product',
    _updatedAt: '2026-03-02T12:00:00Z',
    title: 'Tech Earnings Report',
    status: 'draft',
  },
  {
    _id: 'doc-3',
    _type: 'article',
    _updatedAt: '2026-03-01T12:00:00Z',
    title: 'Championship Thriller',
    status: 'published',
  },
  {
    _id: 'doc-4',
    _type: 'opinion',
    _updatedAt: '2026-02-28T12:00:00Z',
    title: 'Remote Work Future',
    status: 'in-review',
  },
  {
    _id: 'doc-5',
    _type: 'article',
    _updatedAt: '2026-02-27T12:00:00Z',
    title: 'Mediterranean Diet Study',
    status: 'draft',
  },
]

describe('Filtering', () => {
  it('filters rows when a filter value is selected', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(6)

    const filterButton = screen.getByRole('button', {name: /type/i})
    fireEvent.click(filterButton)
    const articleOption = await screen.findByRole('menuitem', {hidden: true, name: /article/i})
    fireEvent.click(articleOption)

    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(4)
    })
    expect(screen.getByText('Climate Summit Agreement')).toBeInTheDocument()
    expect(screen.getByText('Championship Thriller')).toBeInTheDocument()
    expect(screen.getByText('Mediterranean Diet Study')).toBeInTheDocument()
    expect(screen.queryByText('Tech Earnings Report')).not.toBeInTheDocument()
    expect(screen.queryByText('Remote Work Future')).not.toBeInTheDocument()
  })

  it('populates filter dropdown options from actual data', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
    )

    const filterButton = screen.getByRole('button', {name: /type/i})
    fireEvent.click(filterButton)

    expect(
      await screen.findByRole('menuitem', {hidden: true, name: /article/i}),
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', {hidden: true, name: /product/i})).toBeInTheDocument()
    expect(screen.getByRole('menuitem', {hidden: true, name: /opinion/i})).toBeInTheDocument()
  })

  it('composes multiple filters with AND logic', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[
          column.title(),
          column.type(),
          column.custom({field: 'status', header: 'Status', filterable: true}),
        ]}
      />,
    )

    const typeFilter = screen.getByRole('button', {name: /type/i})
    fireEvent.click(typeFilter)
    fireEvent.click(await screen.findByRole('menuitem', {hidden: true, name: /article/i}))

    const table = screen.getByRole('table')
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(4)
    })

    const statusFilter = screen.getByRole('button', {name: /status/i})
    fireEvent.click(statusFilter)
    fireEvent.click(await screen.findByRole('menuitem', {hidden: true, name: /published/i}))

    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(3)
    })
    expect(screen.getByText('Climate Summit Agreement')).toBeInTheDocument()
    expect(screen.getByText('Championship Thriller')).toBeInTheDocument()
  })

  it('shows active filters as removable chips', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
    )

    const filterButton = screen.getByRole('button', {name: /type/i})
    await userEvent.click(filterButton)
    await userEvent.click(screen.getByRole('menuitem', {hidden: true, name: /article/i}))

    const chip = screen.getByTestId('filter-chip-_type')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent(/article/i)
  })

  it('removes a filter when its chip is clicked', async () => {
    renderWithTheme(
      <DocumentTable data={MOCK_DOCUMENTS} columns={[column.title(), column.type()]} />,
    )

    const filterButton = screen.getByRole('button', {name: /type/i})
    await userEvent.click(filterButton)
    await userEvent.click(screen.getByRole('menuitem', {hidden: true, name: /article/i}))

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)

    const removeButton = screen.getByTestId('filter-chip-remove-_type')
    await userEvent.click(removeButton)

    expect(within(table).getAllByRole('row')).toHaveLength(6)
  })

  it('clears all filters when clear all is clicked', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[
          column.title(),
          column.type(),
          column.custom({field: 'status', header: 'Status', filterable: true}),
        ]}
      />,
    )

    const typeFilter = screen.getByRole('button', {name: /type/i})
    await userEvent.click(typeFilter)
    await userEvent.click(screen.getByRole('menuitem', {hidden: true, name: /article/i}))

    const statusFilter = screen.getByRole('button', {name: /status/i})
    await userEvent.click(statusFilter)
    await userEvent.click(screen.getByRole('menuitem', {hidden: true, name: /published/i}))

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3)

    const clearAll = screen.getByRole('button', {name: /clear all/i})
    await userEvent.click(clearAll)

    expect(within(table).getAllByRole('row')).toHaveLength(6)
  })
})

describe('Search', () => {
  it('filters rows by case-insensitive title search', async () => {
    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title({searchable: true}), column.type()]}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchInput, 'climate')

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('row')).toHaveLength(2)
    })

    expect(screen.getByText('Climate Summit Agreement')).toBeInTheDocument()
  })

  it('debounces search input', async () => {
    vi.useFakeTimers({shouldAdvanceTime: true})

    renderWithTheme(
      <DocumentTable
        data={MOCK_DOCUMENTS}
        columns={[column.title({searchable: true}), column.type()]}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    const table = screen.getByRole('table')

    await userEvent.type(searchInput, 'cli', {delay: 50})

    expect(within(table).getAllByRole('row')).toHaveLength(6)

    await vi.advanceTimersByTimeAsync(350)

    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(2)
    })

    vi.useRealTimers()
  })
})
