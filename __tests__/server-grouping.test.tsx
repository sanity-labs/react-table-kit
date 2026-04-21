import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {DocumentTable} from '../src/components/table/DocumentTable'
import {column} from '../src/helpers/table/columns'
import {renderWithTheme} from './helpers'

const SERVER_GROUPED_ROWS = [
  {_id: 'doc-1', _type: 'article', title: 'Draft A', status: 'draft'},
  {_id: 'doc-2', _type: 'article', title: 'Published A', status: 'published'},
  {_id: 'doc-3', _type: 'article', title: 'Draft B', status: 'draft'},
]

describe('Server-aware grouping', () => {
  it('keeps non-grouped editable title cells vertically centered', () => {
    renderWithTheme(
      <DocumentTable
        data={[{_id: 'flat-doc-1', _type: 'article', title: 'Flat Draft', status: 'draft'}]}
        columns={[
          column.string({field: 'title', edit: {onSave: vi.fn()}}),
          column.custom({field: 'status', header: 'Status'}),
        ]}
      />,
    )

    const textbox = screen.getByDisplayValue('Flat Draft')

    expect(textbox.closest('label')).toHaveStyle({alignItems: 'center'})
    expect(textbox.closest('[role="cell"]')).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
    })
  })

  it('uses the controlled serverGroup callback from the filter bar', async () => {
    const onGroupByChange = vi.fn()

    renderWithTheme(
      <DocumentTable
        data={SERVER_GROUPED_ROWS}
        columns={[
          column.string({field: 'title'}),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
        serverGroup={{groupBy: null, onGroupByChange}}
      />,
    )

    expect(screen.getByText('Group by')).toBeInTheDocument()
    expect(screen.queryByText('Group by:')).not.toBeInTheDocument()

    const groupBySelect = screen.getByTestId('group-by-select')
    await userEvent.selectOptions(groupBySelect, 'status')

    expect(onGroupByChange).toHaveBeenCalledWith('status')
  })

  it('preserves server row order when rendering grouped sections', () => {
    renderWithTheme(
      <DocumentTable
        data={SERVER_GROUPED_ROWS}
        columns={[
          column.string({field: 'title'}),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    const groupHeaders = screen.getAllByTestId('group-header')
    expect(groupHeaders).toHaveLength(3)
    expect(groupHeaders[0]).toHaveTextContent('draft')
    expect(groupHeaders[1]).toHaveTextContent('published')
    expect(groupHeaders[2]).toHaveTextContent('draft')
  })

  it('keeps grouped editable title cells vertically centered', () => {
    renderWithTheme(
      <DocumentTable
        data={SERVER_GROUPED_ROWS}
        columns={[
          column.string({field: 'title', edit: {onSave: vi.fn()}}),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    const textbox = screen.getByDisplayValue('Draft A')

    expect(textbox.closest('label')).toHaveStyle({alignItems: 'center'})
    expect(textbox.closest('[role="cell"]')).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
    })
  })

  it('does not stripe grouped rows when stripedRows is disabled', () => {
    renderWithTheme(
      <DocumentTable
        data={SERVER_GROUPED_ROWS}
        columns={[
          column.string({field: 'title'}),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    const row = screen.getByText('Draft A').closest('[role="row"]')
    expect(row?.getAttribute('style') ?? '').not.toContain('background-color')
  })

  it('collapses duplicate server-group sections independently', async () => {
    renderWithTheme(
      <DocumentTable
        data={SERVER_GROUPED_ROWS}
        columns={[
          column.string({field: 'title'}),
          column.custom({field: 'status', header: 'Status', groupable: true}),
        ]}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    const groupHeaders = screen.getAllByTestId('group-header')
    await userEvent.click(groupHeaders[0])

    expect(screen.queryByText('Draft A')).not.toBeInTheDocument()
    expect(screen.getByText('Draft B')).toBeInTheDocument()
  })

  it('clears collapsed groups when page data changes and keeps editable titles visible', async () => {
    const editableColumns = [
      column.string({field: 'title', edit: {onSave: vi.fn()}}),
      column.custom({field: 'status', header: 'Status', groupable: true}),
    ]
    const {rerender} = renderWithTheme(
      <DocumentTable
        data={[
          {_id: 'page-1-doc-1', _type: 'article', title: 'Page 1 Draft', status: 'draft'},
          {_id: 'page-1-doc-2', _type: 'article', title: 'Page 1 Published', status: 'published'},
        ]}
        columns={editableColumns}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    await userEvent.click(screen.getAllByTestId('group-header')[0])

    rerender(
      <DocumentTable
        data={[{_id: 'page-2-doc-1', _type: 'article', title: 'Page 2 Draft', status: 'draft'}]}
        columns={editableColumns}
        serverGroup={{groupBy: 'status', onGroupByChange: vi.fn()}}
      />,
    )

    expect(screen.getByDisplayValue('Page 2 Draft')).toBeInTheDocument()
  })
})
