import {describe, it, expect} from 'vitest'
import {screen, within, fireEvent} from '@testing-library/react'
import React from 'react'
import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'Alpha', status: 'active', _updatedAt: '2026-01-01'},
  {_id: 'doc-2', _type: 'article', title: 'Beta', status: 'draft', _updatedAt: '2026-01-02'},
  {
    _id: 'doc-3',
    _type: 'article',
    title: 'Gamma',
    status: 'pending_review',
    _updatedAt: '2026-01-03',
  },
  {_id: 'doc-4', _type: 'article', title: 'Delta', status: 'approved', _updatedAt: '2026-01-04'},
]

const colorMap = {
  draft: {tone: 'neutral', label: '1 - Draft'},
  pending_review: {tone: 'primary', label: '2 - Pending Review'},
  approved: {tone: 'suggest', label: '3 - Approved'},
  active: {tone: 'suggest', label: '4 - Active'},
}

describe('Badge sort by label', () => {
  it('Behavior 1: badge column with labels sorts by label, not raw value', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.badge({field: 'status', colorMap})]}
        defaultSort={{field: 'status', direction: 'asc'}}
      />,
    )

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    // Skip header row (index 0)
    const cellTexts = rows.slice(1).map((row) => {
      const cells = within(row).getAllByRole('cell')
      return cells[0].textContent // title column
    })

    // Sorted by label: 1-Draft, 2-Pending Review, 3-Approved, 4-Active
    // So title order should be: Beta (draft), Gamma (pending_review), Delta (approved), Alpha (active)
    expect(cellTexts).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha'])
  })

  it('Behavior 2: badge column with string tones sorts by auto-capitalized label', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.badge({
            field: 'status',
            colorMap: {
              active: 'positive',
              approved: 'suggest',
              draft: 'neutral',
              pending_review: 'primary',
            },
          }),
        ]}
        defaultSort={{field: 'status', direction: 'asc'}}
      />,
    )

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const cellTexts = rows.slice(1).map((row) => {
      const cells = within(row).getAllByRole('cell')
      return cells[0].textContent
    })

    // String tones auto-capitalize: Active, Approved, Draft, Pending_review
    // Alphabetical label sort: Active, Approved, Draft, Pending_review
    expect(cellTexts).toEqual(['Alpha', 'Delta', 'Beta', 'Gamma'])
  })

  it('Behavior 3: badge column without colorMap sorts by auto-capitalized raw value', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.title(), column.badge({field: 'status'})]}
        defaultSort={{field: 'status', direction: 'asc'}}
      />,
    )

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const cellTexts = rows.slice(1).map((row) => {
      const cells = within(row).getAllByRole('cell')
      return cells[0].textContent
    })

    // No colorMap: capitalize raw values → Active, Approved, Draft, Pending_review
    expect(cellTexts).toEqual(['Alpha', 'Delta', 'Beta', 'Gamma'])
  })
})
