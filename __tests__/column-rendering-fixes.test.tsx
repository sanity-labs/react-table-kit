import {describe, it, expect, vi, beforeEach} from 'vitest'
import {screen, within} from '@testing-library/react'
import React from 'react'
import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'First', status: 'draft', _updatedAt: '2026-01-01'},
  {_id: 'doc-2', _type: 'article', title: 'Second', status: 'published', _updatedAt: '2026-01-02'},
]

/**
 * Bug fixes for column rendering:
 * 1. column.select({ width }) should apply to the rendered th/td
 * 2. column.badge() should render a Badge component, not a raw object
 */
describe('Column rendering fixes', () => {
  it('Behavior 1: column.select({ width: 32 }) applies width to the select column header', () => {
    renderWithTheme(
      <DocumentTable data={mockData} columns={[column.select({width: 32}), column.title()]} />,
    )

    const table = screen.getByRole('table')
    // With CSS Grid, column widths are in gridTemplateColumns on the row, not individual cells
    const headerRow = table.querySelector('[role="row"]')!
    expect(headerRow.style.gridTemplateColumns).toContain('32px')
  })

  it('Behavior 2: column.badge renders text, not a raw object', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.badge({field: 'status', colorMap: {draft: 'caution', published: 'positive'}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // Badge values should be rendered as text, not throw
    expect(within(table).getByText('Draft')).toBeInTheDocument()
    expect(within(table).getByText('Published')).toBeInTheDocument()
  })

  it('Behavior 3: column.badge renders without colorMap', () => {
    renderWithTheme(
      <DocumentTable data={mockData} columns={[column.title(), column.badge({field: 'status'})]} />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('Draft')).toBeInTheDocument()
    expect(within(table).getByText('Published')).toBeInTheDocument()
  })
})
