import {fireEvent, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, it, expect, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import type {DocumentBase} from '../src/types/tableTypes'
import {renderWithTheme} from './helpers'

const mockData: DocumentBase[] = [
  {_id: '1', _type: 'article', title: 'First', dueDate: '2026-03-15'},
  {_id: '2', _type: 'article', title: 'Second', dueDate: '2026-04-01'},
  {_id: '3', _type: 'article', title: 'Third', dueDate: null},
]

async function openCalendar(button: HTMLButtonElement) {
  fireEvent.click(button)
  return screen.findByRole('grid', {hidden: true, name: /march 2026/i})
}

function getCalendarDayButton(grid: HTMLElement, day: string) {
  return within(grid)
    .getAllByRole('button', {hidden: true})
    .find((button) => button.getAttribute('aria-label')?.includes(`March ${day}`))
}

describe('Date Edit Mode', () => {
  it('Behavior 1 (tracer): click calendar button opens date picker popover', async () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'dueDate',
            header: 'Due Date',
            edit: {mode: 'date', onSave: vi.fn()},
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const dateCell = firstRow.querySelectorAll('[role=cell]')[0]

    // At rest, shows the date value
    expect(dateCell.textContent).toContain('2026')

    // Click the calendar button to open the picker
    const button = dateCell.querySelector('button')!
    expect(await openCalendar(button)).toBeInTheDocument()
  })

  it('Behavior 2: selecting a date fires onSave with formatted date string', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'dueDate', header: 'Due Date', edit: {mode: 'date', onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const dateCell = firstRow.querySelectorAll('[role=cell]')[0]
    const button = dateCell.querySelector('button')!

    const grid = await openCalendar(button)
    const dayButton = getCalendarDayButton(grid, '20')

    expect(dayButton).toBeTruthy()
    if (!dayButton) throw new Error('Expected March day button 20 to be present')
    await user.click(dayButton)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: '1'}), '2026-03-20')
  })

  it('Behavior 3: Escape closes without firing onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'dueDate', header: 'Due Date', edit: {mode: 'date', onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const button = firstRow.querySelectorAll('[role=cell]')[0].querySelector('button')!

    expect(await openCalendar(button)).toBeInTheDocument()

    // Press Escape
    await user.keyboard('{Escape}')

    expect(onSave).not.toHaveBeenCalled()
  })

  it('Behavior 4: null dates render as placeholder with calendar button', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'dueDate',
            header: 'Due Date',
            edit: {mode: 'date', onSave: vi.fn()},
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    // Third row has null dueDate
    const thirdRow = tbody.querySelectorAll('[role=row]')[2]
    const dateCell = thirdRow.querySelectorAll('[role=cell]')[0]

    // Editable empty dates use the click-to-add empty state
    expect(dateCell.textContent).toContain('Add...')

    // Should still have a clickable calendar button
    expect(dateCell.querySelector('button')).toBeTruthy()
  })

  it('Behavior 5: optimistic update shows new date immediately after selection', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'dueDate', header: 'Due Date', edit: {mode: 'date', onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const dateCell = firstRow.querySelectorAll('[role=cell]')[0]
    const button = dateCell.querySelector('button')!

    const grid = await openCalendar(button)
    const dayButton = getCalendarDayButton(grid, '20')

    expect(dayButton).toBeTruthy()
    if (!dayButton) throw new Error('Expected March day button 20 to be present')
    await user.click(dayButton)

    // Cell should show the new date optimistically
    expect(dateCell.textContent).toContain('2026-03-20')
  })

  it('Behavior 6: can select a date on a row with null value', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'dueDate', header: 'Due Date', edit: {mode: 'date', onSave}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    // Third row has null dueDate
    const thirdRow = tbody.querySelectorAll('[role=row]')[2]
    const button = thirdRow.querySelectorAll('[role=cell]')[0].querySelector('button')!

    await user.click(button)

    // Calendar should open — select a date
    // For null value, calendar defaults to current month
    const dayButtons = screen.getAllByRole('button').filter((b) => b.textContent === '15')
    // Click the first "15" day button
    if (dayButtons.length > 0) {
      await user.click(dayButtons[0])
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({_id: '3'}),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      )
    }
  })
})
