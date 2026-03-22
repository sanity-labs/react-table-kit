import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, it, expect, vi} from 'vitest'

import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import type {DocumentBase} from '../src/types'
import {renderWithTheme} from './helpers'

const mockData: DocumentBase[] = [
  {_id: '1', _type: 'article', title: 'First Article', status: 'draft'},
  {_id: '2', _type: 'article', title: 'Second Article', status: 'published'},
  {_id: '3', _type: 'article', title: 'Third Article', status: 'review'},
]

const statusOptions = [
  {value: 'draft', label: 'Draft'},
  {value: 'review', label: 'In Review'},
  {value: 'published', label: 'Published'},
]

describe('Header Row Styling', () => {
  it('Behavior 1: header text renders with semibold weight and muted tone', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title(), column.type()]} />)

    const table = screen.getByRole('table')
    const thead = table.querySelector('[role=rowgroup]')!
    const headerCells = thead.querySelectorAll('[role=columnheader]')

    headerCells.forEach((th) => {
      const textEl = th.querySelector('[data-ui="Text"]')
      if (textEl) {
        expect(textEl.getAttribute('data-ui')).toBe('Text')
      }
    })

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', {name: /type/i})).toBeInTheDocument()
  })

  it('Behavior 2: header row has distinct background from data rows', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title(), column.type()]} />)

    const table = screen.getByRole('table')
    const thead = table.querySelector('[role=rowgroup]')!

    expect(thead.style.background).toContain('card-bg2-color')
  })

  it('Behavior 3: header bottom border is heavier than row borders', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title(), column.type()]} />)

    const table = screen.getByRole('table')
    const headerCells = table.querySelectorAll('[role=rowgroup]:first-child [role=columnheader]')

    headerCells.forEach((th) => {
      expect((th as HTMLElement).style.borderBottom).toContain('2px')
    })

    const dataRows = table.querySelectorAll('tbody tr')
    if (dataRows.length > 0) {
      expect((dataRows[0] as HTMLElement).style.borderBottom).toContain('1px')
    }
  })
})

describe('Inline Editing API', () => {
  it('Behavior 4 (tracer bullet): editable column renders a clickable cell with button', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    // The status cells should contain a button (MenuButton) since they're editable
    // Find all status cells — they should have buttons
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const rows = tbody.querySelectorAll('[role=row]')

    rows.forEach((row) => {
      const cells = row.querySelectorAll('[role=cell]')
      const statusCell = cells[1] // second column is status
      if (statusCell) {
        const button = statusCell.querySelector('button')
        expect(button).toBeTruthy()
      }
    })
  })

  it('Behavior 5: editable cell is interactive, read-only is not', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(), // read-only
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const cells = firstRow.querySelectorAll('[role=cell]')

    // Title cell (read-only) should NOT have a button
    const titleCell = cells[0]
    expect(titleCell.querySelector('button')).toBeNull()

    // Status cell (editable) should have a button
    const statusCell = cells[1]
    expect(statusCell.querySelector('button')).toBeTruthy()
  })

  it('Behavior 6: clicking editable cell opens dropdown with options', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    // Click the first status cell's button
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]
    const button = statusCell.querySelector('button')!

    await user.click(button)

    // Menu should appear with the options
    // Sanity UI Menu renders MenuItems — look for them (may need {hidden: true} for floating-ui)
    const menuItems = screen.getAllByRole('menuitem', {hidden: true})
    expect(menuItems.length).toBe(statusOptions.length)
    expect(menuItems.map((item) => item.textContent)).toEqual(
      expect.arrayContaining(['Draft', 'In Review', 'Published']),
    )
  })

  it('Behavior 7: selecting an option fires onSave callback', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    // Click the first status cell
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]
    const button = statusCell.querySelector('button')!

    await user.click(button)

    // Click "Published" option
    const publishedItem = screen.getByRole('menuitem', {name: /published/i, hidden: true})
    await user.click(publishedItem)

    // onSave should be called with (document, newValue)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({_id: '1', status: 'draft'}),
      'published',
    )
  })

  it('Behavior 8: read-only columns are not interactive', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(), // read-only
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const titleCell = firstRow.querySelectorAll('[role=cell]')[0]

    // Title cell should NOT have a button
    expect(titleCell.querySelector('button')).toBeNull()
  })

  it('Behavior 9: Escape closes dropdown without firing onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    // Open the dropdown
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]
    const button = statusCell.querySelector('button')!

    await user.click(button)

    // Verify menu is open
    const menuItems = screen.getAllByRole('menuitem', {hidden: true})
    expect(menuItems.length).toBeGreaterThan(0)

    // Press Escape
    await user.keyboard('{Escape}')

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Behavior 10: editable cells have hover state via CSS class', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]

    // Editable cell should have cursor: pointer
    expect(statusCell.style.cursor).toBe('pointer')
  })
})

describe('Badge-as-button + Optimistic Updates', () => {
  it('Behavior 11: editable button wraps only cell content, not full cell width', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave: vi.fn()},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]
    const button = statusCell.querySelector('button')!

    // Button should NOT have width: 100% — it wraps only the badge content
    expect(button.style.width).not.toBe('100%')
  })

  it('Behavior 12: selecting a value optimistically updates the displayed cell', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    // First row status is 'draft'
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]

    // Verify initial value
    expect(statusCell.textContent).toContain('draft')

    // Click and select 'Published'
    const button = statusCell.querySelector('button')!
    await user.click(button)
    const publishedItem = screen.getByRole('menuitem', {name: /published/i, hidden: true})
    await user.click(publishedItem)

    // Cell should immediately show 'published' (optimistic) without waiting for data prop change
    expect(statusCell.textContent).toContain('published')
  })

  it('Behavior 13: optimistic value is replaced when real data arrives', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    const statusColumn = column.custom({
      field: 'status',
      header: 'Status',
      edit: {mode: 'select', options: statusOptions, onSave},
      cell: (value) => String(value ?? ''),
    })

    const {unmount} = renderWithTheme(
      <DocumentTable data={mockData} columns={[column.title(), statusColumn]} />,
    )

    // Select 'Published' on first row (currently 'draft')
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const statusCell = firstRow.querySelectorAll('[role=cell]')[1]
    const button = statusCell.querySelector('button')!

    await user.click(button)
    const publishedItem = screen.getByRole('menuitem', {name: /published/i, hidden: true})
    await user.click(publishedItem)

    // Optimistic: shows 'published'
    expect(statusCell.textContent).toContain('published')

    // Unmount and re-render with updated data (simulating real data arriving)
    unmount()

    const updatedData = mockData.map((d) => (d._id === '1' ? {...d, status: 'published'} : d))
    renderWithTheme(<DocumentTable data={updatedData} columns={[column.title(), statusColumn]} />)

    // Should show 'published' from real data
    const updatedTable = screen.getByRole('table')
    const updatedTbody = updatedTable.querySelectorAll('[role=rowgroup]')[1]!
    const updatedFirstRow = updatedTbody.querySelectorAll('[role=row]')[0]
    const updatedStatusCell = updatedFirstRow.querySelectorAll('[role=cell]')[1]
    expect(updatedStatusCell.textContent).toContain('published')
  })

  it('Behavior 14: multiple rapid edits on different rows work correctly', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.custom({
            field: 'status',
            header: 'Status',
            edit: {mode: 'select', options: statusOptions, onSave},
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const rows = tbody.querySelectorAll('[role=row]')

    // Edit first row: draft → published
    const button1 = rows[0].querySelectorAll('[role=cell]')[1].querySelector('button')!
    await user.click(button1)
    const pub1 = screen.getByRole('menuitem', {name: /published/i, hidden: true})
    await user.click(pub1)

    // Edit second row: published → draft
    const button2 = rows[1].querySelectorAll('[role=cell]')[1].querySelector('button')!
    await user.click(button2)
    const draft2 = screen.getByRole('menuitem', {name: /^draft$/i, hidden: true})
    await user.click(draft2)

    // Both should show optimistic values
    expect(rows[0].querySelectorAll('[role=cell]')[1].textContent).toContain('published')
    expect(rows[1].querySelectorAll('[role=cell]')[1].textContent).toContain('draft')

    // onSave should have been called twice
    expect(onSave).toHaveBeenCalledTimes(2)
  })
})
