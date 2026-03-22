import {screen, within, fireEvent} from '@testing-library/react'
import React from 'react'
import {describe, expect, it} from 'vitest'

import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

// Mock icon component
function MockIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg data-testid="mock-icon" {...props} />
}

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'First', status: 'draft', _updatedAt: '2026-01-01'},
  {_id: 'doc-2', _type: 'article', title: 'Second', status: 'published', _updatedAt: '2026-01-02'},
]

describe('Column header icons', () => {
  // Behavior 1 (tracer): column.title({icon: MockIcon}) produces a ColumnDef with icon property
  it('Behavior 1: column helper stores icon in ColumnDef', () => {
    const col = column.title({icon: MockIcon})
    expect(col.icon).toBe(MockIcon)
  })

  // Behavior 2: Header renders icon component inline-flex left of text when icon is provided
  it('Behavior 2: header renders icon left of text when icon is provided', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title({icon: MockIcon})]} />)

    const table = screen.getByRole('table')
    const header = within(table).getByRole('columnheader', {name: /title/i})
    const icon = within(header).getByTestId('mock-icon')
    expect(icon).toBeInTheDocument()

    // Icon should appear before the text
    const headerContent = header.innerHTML
    const iconPos = headerContent.indexOf('mock-icon')
    const textPos = headerContent.indexOf('Title')
    expect(iconPos).toBeLessThan(textPos)
  })

  // Behavior 3: Header renders text only (no extra wrapper) when icon is not provided
  it('Behavior 3: header renders text only when no icon', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title()]} />)

    const table = screen.getByRole('table')
    const header = within(table).getByRole('columnheader', {name: /title/i})
    expect(within(header).queryByTestId('mock-icon')).not.toBeInTheDocument()
  })

  // Behavior 4: Icon is 16x16 and uses currentColor
  it('Behavior 4: icon is 16x16', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title({icon: MockIcon})]} />)

    const icon = screen.getByTestId('mock-icon')
    expect(icon.style.width).toBe('16px')
    expect(icon.style.height).toBe('16px')
  })

  // Behavior 5: Sortable column with icon — clicking icon area still triggers sort
  it('Behavior 5: clicking icon triggers sort on sortable column', async () => {
    renderWithTheme(<DocumentTable data={mockData} columns={[column.title({icon: MockIcon})]} />)

    const icon = screen.getByTestId('mock-icon')
    // Click the icon — should bubble up to th onClick handler
    fireEvent.click(icon)

    // After click, header should show sort indicator (▲ or ▼)
    const table = screen.getByRole('table')
    const header = within(table).getByRole('columnheader', {name: /title/i})
    expect(header.textContent).toMatch(/[↑↓]/)
  })

  // Bonus: icon works on all column types
  it('Behavior 6: icon works on badge, date, type, updatedAt, custom', () => {
    const badgeCol = column.badge({field: 'status', icon: MockIcon})
    const dateCol = column.date({field: 'dueDate', icon: MockIcon})
    const typeCol = column.type({icon: MockIcon})
    const updatedCol = column.updatedAt({icon: MockIcon})
    const customCol = column.custom({field: 'notes', header: 'Notes', icon: MockIcon})

    expect(badgeCol.icon).toBe(MockIcon)
    expect(dateCol.icon).toBe(MockIcon)
    expect(typeCol.icon).toBe(MockIcon)
    expect(updatedCol.icon).toBe(MockIcon)
    expect(customCol.icon).toBe(MockIcon)
  })
})
