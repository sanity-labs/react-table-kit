import {screen, within, fireEvent} from '@testing-library/react'
import React from 'react'
import {describe, it, expect, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {renderWithTheme} from './helpers'

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'Alpha', featured: true},
  {_id: 'doc-2', _type: 'article', title: 'Beta', featured: false},
  {_id: 'doc-3', _type: 'article', title: 'Gamma', featured: null},
]

describe('column.boolean()', () => {
  it('Behavior 1 [TRACER]: renders switch checked when value is true', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[column.title(), column.boolean({field: 'featured'})]}
      />,
    )

    const table = screen.getByRole('table')
    const cells = within(table).getAllByRole('cell')
    // Boolean column is the second data column (after title)
    const boolCell = cells[cells.length - 1]
    const toggle = within(boolCell).getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('Behavior 2: renders switch unchecked when value is false', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[1]]}
        columns={[column.title(), column.boolean({field: 'featured'})]}
      />,
    )

    const table = screen.getByRole('table')
    const cells = within(table).getAllByRole('cell')
    const boolCell = cells[cells.length - 1]
    const toggle = within(boolCell).getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('Behavior 3: uses custom header when provided', () => {
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[column.title(), column.boolean({field: 'featured', header: 'Featured'})]}
      />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('Featured')).toBeInTheDocument()
  })

  it('Behavior 4: clicking switch triggers onSave with toggled value when edit is configured', () => {
    const onSave = vi.fn()
    renderWithTheme(
      <DocumentTable
        data={[mockData[0]]}
        columns={[column.title(), column.boolean({field: 'featured', edit: {onSave}})]}
      />,
    )

    const table = screen.getByRole('table')
    const cells = within(table).getAllByRole('cell')
    const boolCell = cells[cells.length - 1]
    const toggle = within(boolCell).getByRole('switch')
    fireEvent.click(toggle)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({_id: 'doc-1', featured: true}),
      false, // toggled from true to false
    )
  })
})
