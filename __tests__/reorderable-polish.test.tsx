import {describe, it, expect, vi} from 'vitest'
import {screen, within} from '@testing-library/react'
import React from 'react'
import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

// Mock icon for testing
function MockIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg data-testid="mock-icon" {...props} />
}

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'First', status: 'draft', _updatedAt: '2026-01-01'},
  {_id: 'doc-2', _type: 'article', title: 'Second', status: 'published', _updatedAt: '2026-01-02'},
]

describe('Reorderable columns — polish', () => {
  // Behavior 1: Drag handle shows column header content in ghost
  it('Behavior 1: drag handle has aria-roledescription for accessibility', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.type(), column.updatedAt()]}
        reorderable
      />,
    )

    const handles = screen.getAllByTestId('drag-handle')
    handles.forEach((handle) => {
      expect(handle.getAttribute('aria-roledescription')).toBe('sortable column')
    })
  })

  // Behavior 2: Drop indicator area exists on each reorderable header
  it('Behavior 2: reorderable headers have drop target data attributes', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.type(), column.updatedAt()]}
        reorderable
      />,
    )

    const table = screen.getByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    headers.forEach((header) => {
      // Each reorderable header should have a data attribute for DnD targeting
      expect(header.getAttribute('data-column-id')).toBeTruthy()
    })
  })

  // Behavior 3: Keyboard accessibility — drag handles are focusable
  it('Behavior 3: drag handles are focusable with tabIndex', () => {
    renderWithTheme(
      <DocumentTable data={mockData} columns={[column.title(), column.type()]} reorderable />,
    )

    const handles = screen.getAllByTestId('drag-handle')
    handles.forEach((handle) => {
      expect(handle.tabIndex).toBe(0)
    })
  })

  // Behavior 4: Reordering preserves sort state
  it('Behavior 4: columnOrder change preserves sort indicator', () => {
    const {rerender} = renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.type(), column.updatedAt()]}
        defaultSort={{field: 'title', direction: 'asc'}}
      />,
    )

    const table = screen.getByRole('table')
    // Title should have sort indicator
    const titleHeader = within(table).getByRole('columnheader', {name: /title/i})
    expect(titleHeader.textContent).toContain('↑')

    // Re-render with different column order
    rerender(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.type(), column.updatedAt()]}
        defaultSort={{field: 'title', direction: 'asc'}}
        columnOrder={['updatedAt', 'type', 'title']}
      />,
    )

    // Title should still have sort indicator even though it moved
    const reorderedTable = screen.getByRole('table')
    const headers = within(reorderedTable).getAllByRole('columnheader')
    const titleAfterReorder = headers.find((h) => h.textContent?.includes('Title'))
    expect(titleAfterReorder?.textContent).toContain('↑')
  })
})
