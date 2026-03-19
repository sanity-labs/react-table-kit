import {describe, it, expect, vi} from 'vitest'
import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {DocumentTable} from '../src/DocumentTable'
import {column} from '../src/columns'
import type {DocumentBase} from '../src/types'
import {renderWithTheme} from './helpers'

const mockData: DocumentBase[] = [
  {_id: '1', _type: 'article', title: 'First', priority: 'high'},
  {_id: '2', _type: 'article', title: 'Second', priority: 'low'},
]

// A simple custom editor component for testing
function TestEditor({
  value,
  document: doc,
  onChange,
  onClose,
}: {
  value: unknown
  document: DocumentBase
  onChange: (newValue: string) => void
  onClose: () => void
}) {
  return (
    <div data-testid="custom-editor">
      <span data-testid="editor-value">{String(value)}</span>
      <span data-testid="editor-doc-id">{doc._id}</span>
      <button data-testid="editor-save" onClick={() => onChange('new-value')}>
        Save
      </button>
      <button data-testid="editor-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  )
}

describe('Custom Edit Mode', () => {
  it('Behavior 1 (tracer): click cell opens custom editor', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave: vi.fn(),
            },
          }),
        ]}
      />,
    )

    // Custom editor should NOT be visible at rest
    expect(screen.queryByTestId('custom-editor')).not.toBeInTheDocument()

    // Click the cell's button
    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const firstRow = tbody.querySelectorAll('[role=row]')[0]
    const button = firstRow.querySelectorAll('[role=cell]')[0].querySelector('button')!
    await user.click(button)

    // Custom editor should now be visible
    expect(screen.getByTestId('custom-editor')).toBeInTheDocument()
  })

  it('Behavior 2: component receives value, document, onChange, onClose', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave: vi.fn(),
            },
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const button = tbody
      .querySelectorAll('[role=row]')[0]
      .querySelectorAll('[role=cell]')[0]
      .querySelector('button')!
    await user.click(button)

    // Check that the editor received the right props
    expect(screen.getByTestId('editor-value').textContent).toBe('high')
    expect(screen.getByTestId('editor-doc-id').textContent).toBe('1')
  })

  it('Behavior 3: calling onChange fires onSave and closes editor', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave,
            },
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const button = tbody
      .querySelectorAll('[role=row]')[0]
      .querySelectorAll('[role=cell]')[0]
      .querySelector('button')!
    await user.click(button)

    // Click the save button in the custom editor
    await user.click(screen.getByTestId('editor-save'))

    // onSave should have been called
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({_id: '1', priority: 'high'}),
      'new-value',
    )

    // Editor should be closed
    expect(screen.queryByTestId('custom-editor')).not.toBeInTheDocument()
  })

  it('Behavior 4: calling onClose closes without firing onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave,
            },
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const button = tbody
      .querySelectorAll('[role=row]')[0]
      .querySelectorAll('[role=cell]')[0]
      .querySelector('button')!
    await user.click(button)

    // Click the cancel button
    await user.click(screen.getByTestId('editor-cancel'))

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled()

    // Editor should be closed
    expect(screen.queryByTestId('custom-editor')).not.toBeInTheDocument()
  })

  it('Behavior 5: Escape closes the editor (calls onClose path)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave,
            },
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const button = tbody
      .querySelectorAll('[role=row]')[0]
      .querySelectorAll('[role=cell]')[0]
      .querySelector('button')!
    await user.click(button)

    expect(screen.getByTestId('custom-editor')).toBeInTheDocument()

    // Press Escape
    await user.keyboard('{Escape}')

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByTestId('custom-editor')).not.toBeInTheDocument()
  })

  it('Behavior 6: optimistic update works after onChange', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.custom({
            field: 'priority',
            header: 'Priority',
            edit: {
              mode: 'custom',
              component: (props) => <TestEditor {...props} />,
              onSave,
            },
            cell: (value) => String(value ?? ''),
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    const tbody = table.querySelectorAll('[role=rowgroup]')[1]!
    const cell = tbody.querySelectorAll('[role=row]')[0].querySelectorAll('[role=cell]')[0]

    // Initial value
    expect(cell.textContent).toContain('high')

    const button = cell.querySelector('button')!
    await user.click(button)
    await user.click(screen.getByTestId('editor-save'))

    // Should show optimistic value
    expect(cell.textContent).toContain('new-value')
  })
})
