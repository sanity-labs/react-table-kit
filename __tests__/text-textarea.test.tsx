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
  {
    _id: '3',
    _type: 'article',
    title:
      'Third Article With A Much Longer Title That Should Cause The Cell To Expand Vertically When Editing',
    status: 'review',
  },
]

describe('Text Cell — Auto-expanding Textarea', () => {
  it('Behavior 1: text cell renders as a textarea that auto-sizes', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave: vi.fn()}}),
        ]}
      />,
    )

    // Should render textareas, not inputs
    const textareas = screen.getAllByRole('textbox')
    expect(textareas.length).toBe(3)
    expect(textareas[0].tagName.toLowerCase()).toBe('textarea')
    expect(textareas[0]).toHaveValue('First Article')
  })

  it('Behavior 2: textarea fills the entire cell', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave: vi.fn()}}),
        ]}
      />,
    )

    const textareas = screen.getAllByRole('textbox')
    const td = textareas[0].closest('[role=cell]')!
    // td should have no padding (textarea handles its own spacing)
    expect(td.style.padding).toBe('0px')
  })

  it('Behavior 3: Enter saves, Shift+Enter inserts newline', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const textareas = screen.getAllByRole('textbox')

    // Enter should save
    await user.clear(textareas[0])
    await user.type(textareas[0], 'New Title{Enter}')
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: '1'}), 'New Title')
  })

  it('Behavior 4: Escape cancels and reverts', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave}})]}
      />,
    )

    const textareas = screen.getAllByRole('textbox')
    await user.clear(textareas[0])
    await user.type(textareas[0], 'Changed{Escape}')

    expect(onSave).not.toHaveBeenCalled()
    expect(textareas[0]).toHaveValue('First Article')
  })

  it('Behavior 5: blur saves', async () => {
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
    const textareas = within(table).getAllByRole('textbox')
    await user.clear(textareas[0])
    await user.type(textareas[0], 'Blur Title')
    await user.tab()

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({_id: '1'}), 'Blur Title')
  })

  it('Behavior 6: textarea has rows=1 and resize=none for single-line appearance', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({field: 'title', header: 'Title', edit: {mode: 'text', onSave: vi.fn()}}),
        ]}
      />,
    )

    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(textareas[0].rows).toBe(1)
    expect(textareas[0].style.resize).toBe('none')
  })
})
