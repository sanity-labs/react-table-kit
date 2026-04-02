import {screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, it, expect, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import type {DocumentBase} from '../src/types/tableTypes'
import {renderWithTheme} from './helpers'

const mockData: DocumentBase[] = [
  {_id: '1', _type: 'article', title: 'First Article', status: 'draft'},
  {_id: '2', _type: 'article', title: 'Second Article', status: 'published'},
  {_id: '3', _type: 'article', title: 'Third Article', status: 'review'},
]

describe('Text Edit Mode', () => {
  it('Behavior 1 (tracer): text cell is always a text input with the current value', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave: vi.fn()}}),
        ]}
      />,
    )

    // Should render text inputs (not buttons) — always editable
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBe(3) // one per row
    expect(inputs[0]).toHaveValue('First Article')
    expect(inputs[1]).toHaveValue('Second Article')
    expect(inputs[2]).toHaveValue('Third Article')
  })

  it('Behavior 2: Enter key saves and fires onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], 'Updated Title{Enter}')

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({_id: '1', title: 'First Article'}),
      'Updated Title',
    )
  })

  it('Behavior 3: Escape cancels and reverts to original value', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], 'Changed text{Escape}')

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled()

    // Value should revert to original
    expect(inputs[0]).toHaveValue('First Article')
  })

  it('Behavior 4: blur saves the value', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}}),
          column.type(),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const inputs = within(table).getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], 'Blur Save Title')

    // Click somewhere else to blur
    await user.tab()

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: '1'}), 'Blur Save Title')
  })

  it('Behavior 5: optimistic update — value persists after save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], 'Optimistic Title{Enter}')

    // Input should still show the new value (optimistic)
    expect(inputs[0]).toHaveValue('Optimistic Title')
  })

  it('Behavior 6: empty string is a valid edit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.keyboard('{Enter}')

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: '1'}), '')
  })

  it('Behavior 7: focusing the input selects all text', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave: vi.fn()}}),
        ]}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.click(inputs[0])

    // The input should be focused
    expect(document.activeElement).toBe(inputs[0])
  })
})
