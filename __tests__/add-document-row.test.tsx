import {screen, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi} from 'vitest'

import {DocumentTable} from '../src/DocumentTable'
import type {DocumentBase, ColumnDef} from '../src/types'
import {renderWithTheme} from './helpers'

const mockData: DocumentBase[] = [
  {_id: 'doc-1', _type: 'article', title: 'First Article'},
  {_id: 'doc-2', _type: 'article', title: 'Second Article'},
]

const columns: ColumnDef[] = [
  {id: 'title', header: 'Title', field: 'title'},
  {id: 'type', header: 'Type', field: '_type'},
]

describe('AddDocumentRow', () => {
  it('Behavior 1: renders "Add Document" button when onCreateDocument is provided', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={columns} onCreateDocument={() => {}} />)
    expect(screen.getByTestId('add-document-row')).toBeDefined()
    expect(screen.getByText('Add Document')).toBeDefined()
  })

  it('Behavior 2: does not render button when onCreateDocument is not provided', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={columns} />)
    expect(screen.queryByTestId('add-document-row')).toBeNull()
  })

  it('Behavior 3: calls onCreateDocument when button is clicked', () => {
    const onCreate = vi.fn()
    renderWithTheme(<DocumentTable data={mockData} columns={columns} onCreateDocument={onCreate} />)
    fireEvent.click(screen.getByText('Add Document'))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('Behavior 4: shows custom button text via createButtonText prop', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={columns}
        onCreateDocument={() => {}}
        createButtonText="Add Article"
      />,
    )
    expect(screen.getByText('Add Article')).toBeDefined()
  })

  it('Behavior 5: shows "Adding…" and disables button when isCreating is true', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={columns}
        onCreateDocument={() => {}}
        isCreating={true}
      />,
    )
    expect(screen.getByText('Adding…')).toBeDefined()
    const button = screen.getByText('Adding…').closest('button')
    expect(button?.disabled).toBe(true)
  })

  it('Behavior 6: button row spans full grid width', () => {
    renderWithTheme(<DocumentTable data={mockData} columns={columns} onCreateDocument={() => {}} />)
    const addRow = screen.getByTestId('add-document-row')
    const cell = addRow.querySelector('[role="cell"]')
    expect(cell?.style.gridColumn).toBe('1 / -1')
  })
})
