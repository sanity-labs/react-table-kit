import {screen, within, fireEvent, waitFor} from '@testing-library/react'
import React from 'react'
import {describe, it, expect, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {renderWithTheme} from './helpers'

// Use dates far from "now" (March 5, 2026) for predictable formatting
const mockData = [
  {
    _id: 'doc-1',
    _type: 'article',
    title: 'Alpha',
    dueDate: '2026-06-15T00:00:00Z',
    _updatedAt: '2026-01-01',
  },
  {
    _id: 'doc-2',
    _type: 'article',
    title: 'Beta',
    dueDate: '2026-01-15T00:00:00Z',
    _updatedAt: '2026-01-02',
  },
  {
    _id: 'doc-3',
    _type: 'article',
    title: 'Gamma',
    dueDate: null as unknown as string,
    _updatedAt: '2026-01-03',
  },
  {_id: 'doc-4', _type: 'article', title: 'Delta', dueDate: '', _updatedAt: '2026-01-04'},
]

describe('column.date() — display formatting', () => {
  it('Behavior 1 [TRACER]: renders formatted date string, not raw ISO', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[column.title(), column.date({field: 'dueDate', header: 'Due Date'})]}
      />,
    )

    const table = screen.getByRole('table')
    // Should NOT show raw ISO string
    expect(within(table).queryByText('2026-06-15T00:00:00Z')).not.toBeInTheDocument()
    // Should show a formatted date (dd/MM/yy)
    expect(within(table).getByText('15/06/26')).toBeInTheDocument()
  })

  it('Behavior 2: shows dd/MM/yy format for all dates', () => {
    const recentData = [
      {
        _id: 'doc-1',
        _type: 'article',
        title: 'Test',
        dueDate: '2026-03-03T12:00:00Z',
        _updatedAt: '2026-01-01',
      },
    ]

    renderWithTheme(
      <DocumentTable
        data={recentData}
        columns={[column.title(), column.date({field: 'dueDate', header: 'Due Date'})]}
      />,
    )

    const table = screen.getByRole('table')
    // All dates use dd/MM/yy format
    expect(within(table).getByText('03/03/26')).toBeInTheDocument()
  })

  it('Behavior 3: shows short date for dates older than 7 days', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[1]]}
        columns={[column.title(), column.date({field: 'dueDate', header: 'Due Date'})]}
      />,
    )

    const table = screen.getByRole('table')
    // All dates use dd/MM/yy format
    expect(within(table).getByText('15/01/26')).toBeInTheDocument()
  })

  it('Behavior 4: showOverdue renders past dates in red/critical tone', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[1]]}
        columns={[
          column.title(),
          column.date({field: 'dueDate', header: 'Due Date', showOverdue: true}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const dateCell = within(table).getByText('15/01/26')
    // Should have critical color styling
    expect(dateCell.style.color).toBe('var(--card-badge-critical-fg-color, #e03e2f)')
  })

  it('Behavior 5: showOverdue does NOT highlight future dates', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[
          column.title(),
          column.date({field: 'dueDate', header: 'Due Date', showOverdue: true}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const dateCell = within(table).getByText('15/06/26')
    // Future date should NOT have critical styling
    expect(dateCell.style.color).not.toBe('var(--card-badge-critical-fg-color, #e03e2f)')
  })

  it('Behavior 6: shows + Add... empty state for null/empty values', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[2], mockData[3]]}
        columns={[column.title(), column.date({field: 'dueDate', header: 'Due Date'})]}
      />,
    )

    const table = screen.getByRole('table')
    const emptyStates = within(table).getAllByTestId('date-empty-state')
    expect(emptyStates.length).toBe(2)
    emptyStates.forEach((state) => {
      expect(state).toHaveAttribute('data-state', 'empty')
      expect(state).toHaveAttribute('data-border', 'false')
    })
    expect(within(table).getAllByText('Add...')).toHaveLength(2)
  })

  it('Behavior 6.1: wraps non-empty date values in shared table chrome', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[column.title(), column.date({field: 'dueDate', header: 'Due Date'})]}
      />,
    )

    const table = screen.getByRole('table')
    const filledShell = within(table).getByTestId('date-cell-shell')
    expect(filledShell).toBeInTheDocument()
    expect(filledShell).toHaveAttribute('data-state', 'filled')
    expect(filledShell).toHaveAttribute('data-border', 'true')
  })
})

describe('column.date() — date picker edit mode', () => {
  it('Behavior 7: edit mode opens calendar popover on click', () => {
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[
          column.title(),
          column.date({field: 'dueDate', header: 'Due Date', edit: {onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // Click the date cell to open the picker
    const dateCell = within(table).getByText('15/06/26')
    fireEvent.click(dateCell)

    // Calendar popover should be visible with day buttons
    // react-day-picker renders day cells as buttons with the day number
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('Behavior 8: selecting a date calls onSave and closes popover', async () => {
    const onSave = vi.fn()

    // Use a date far in the future so it always shows as formatted date, not relative
    const futureData = [
      {
        _id: 'doc-1',
        _type: 'article',
        title: 'Alpha',
        dueDate: '2027-06-15T00:00:00Z',
        _updatedAt: '2026-01-01',
      },
    ]

    renderWithTheme(
      <DocumentTable
        data={futureData}
        columns={[
          column.title(),
          column.date({field: 'dueDate', header: 'Due Date', edit: {onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // Click to open picker
    const dateCell = within(table).getByText('15/06/27')
    fireEvent.click(dateCell)

    // Calendar should be open
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    // In react-day-picker v9, days are buttons with aria-labels like "Saturday, June 20th, 2027"
    const day20Button = within(grid).getByRole('button', {name: /June 20th/})
    fireEvent.click(day20Button)

    // onSave should be called with the document and new date string
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: 'doc-1'}), '2027-06-20')

    // Popover should close
    await waitFor(() => {
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    })
  })

  it('Behavior 9: pressing Escape closes the popover without saving', async () => {
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[
          column.title(),
          column.date({field: 'dueDate', header: 'Due Date', edit: {onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // Click to open picker
    const dateCell = within(table).getByText('15/06/26')
    fireEvent.click(dateCell)

    // Calendar should be open
    expect(screen.getByRole('grid')).toBeInTheDocument()

    // Press Escape
    fireEvent.keyDown(screen.getByRole('grid'), {key: 'Escape'})

    // Popover should close
    await waitFor(() => {
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    })

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('column.date() — edit: true shorthand', () => {
  it('Behavior 10: edit: true creates date edit config with _autoSave marker', () => {
    const col = column.date({field: 'dueDate', header: 'Due Date', edit: true})
    expect(col.edit).toBeDefined()
    expect(col.edit?.mode).toBe('date')
    expect(col.edit?._autoSave).toBe(true)
    expect(col.edit?._field).toBe('dueDate')
  })
})
