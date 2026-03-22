import {Checkbox, Text} from '@sanity/ui'
import {createColumnHelper} from '@tanstack/react-table'
import type {ComponentType, SVGProps} from 'react'

import {DatePickerCell} from './DatePickerCell'
import {EditableCustomCell} from './EditableCustomCell'
import {EditableSelectCell} from './EditableSelectCell'
import {EditableTextCell} from './EditableTextCell'
import type {ColumnDef, DocumentBase} from './types'
import {DEFAULT_CELL_RENDERERS} from './utils'

// Augment TanStack's ColumnMeta to include all custom properties used by this table
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    width?: number | string
    flex?: number
    editable?: boolean
    editMode?: 'text' | 'select' | 'date' | 'custom'
    icon?: ComponentType<SVGProps<SVGSVGElement>>
  }
}

/**
 * Convert our ColumnDef to TanStack ColumnDef.
 * This is the abstraction boundary — TanStack types stay internal.
 */
export function toTanStackColumns<T extends DocumentBase>(
  columns: ColumnDef<T>[],
  _hasSelection: boolean,
) {
  const helper = createColumnHelper<T>()

  return columns.map((col) => {
    // Handle select column specially
    if (col._isSelectColumn) {
      return helper.display({
        id: 'select',
        size: col.width ?? 44,
        minSize: col.width ?? 44,
        header: ({table}) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all on this page"
          />
        ),
        cell: ({row}) => {
          const title = row.original.title ?? row.id
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`Select ${title}`}
            />
          )
        },
        enableSorting: false,
      })
    }

    if (col.field) {
      return helper.accessor(
        (row) => {
          if (col.accessor) return col.accessor(row)
          return row[col.field!]
        },
        {
          id: col.id,
          header: col.header,
          cell: (info) => {
            const value = info.getValue()
            const row = info.row.original

            // Editable select column — wrap in MenuButton
            if (col.edit != null && col.edit?.mode === 'select' && col.edit?.options) {
              const renderer = col.cell
                ? col.cell
                : DEFAULT_CELL_RENDERERS[col.id]
                  ? (v: unknown) => DEFAULT_CELL_RENDERERS[col.id](v)
                  : (v: unknown) => <Text size={1}>{String(v ?? '')}</Text>

              return (
                <EditableSelectCell
                  value={value}
                  row={row}
                  options={col.edit?.options}
                  onEdit={col.edit?.onSave}
                  cellRenderer={renderer}
                  columnId={col.id}
                />
              )
            }

            // Editable text column — inline TextInput
            if (col.edit != null && col.edit?.mode === 'text') {
              const renderer = col.cell
                ? col.cell
                : DEFAULT_CELL_RENDERERS[col.id]
                  ? (v: unknown) => DEFAULT_CELL_RENDERERS[col.id](v)
                  : (v: unknown) => <Text size={1}>{String(v ?? '')}</Text>

              return (
                <EditableTextCell
                  value={value}
                  row={row}
                  onEdit={col.edit?.onSave}
                  cellRenderer={renderer}
                  columnId={col.id}
                />
              )
            }

            // Editable date column — inline date input
            if (col.edit != null && col.edit?.mode === 'date') {
              const renderer = col.cell
                ? col.cell
                : (v: unknown) => {
                    if (!v)
                      return (
                        <Text size={1} muted>
                          —
                        </Text>
                      )
                    return <Text size={1}>{String(v)}</Text>
                  }

              return (
                <DatePickerCell
                  value={value}
                  row={row}
                  onEdit={col.edit?.onSave}
                  cellRenderer={renderer}
                  columnId={col.id}
                  toneByDateRange={col.edit?._toneByDateRange}
                />
              )
            }

            // Editable custom column — developer-provided editor
            if (col.edit != null && col.edit?.mode === 'custom' && col.edit?.component) {
              const renderer = col.cell
                ? col.cell
                : DEFAULT_CELL_RENDERERS[col.id]
                  ? (v: unknown) => DEFAULT_CELL_RENDERERS[col.id](v)
                  : (v: unknown) => <Text size={1}>{String(v ?? '')}</Text>

              return (
                <EditableCustomCell
                  value={value}
                  row={row}
                  onEdit={col.edit?.onSave}
                  cellRenderer={renderer}
                  columnId={col.id}
                  editComponent={col.edit?.component}
                />
              )
            }

            if (col.cell) return col.cell(value, row)
            // Use built-in renderer if available for this column type
            const defaultRenderer = DEFAULT_CELL_RENDERERS[col.id]
            if (defaultRenderer) return defaultRenderer(value)
            // Fallback: plain text
            return <Text size={1}>{String(value ?? '')}</Text>
          },
          enableSorting: col.sortable !== false,
          ...(col.sortValue && {
            sortingFn: (rowA, rowB) => {
              const aRaw = rowA.original[col.field!]
              const bRaw = rowB.original[col.field!]
              const aSort = col.sortValue!(aRaw, rowA.original)
              const bSort = col.sortValue!(bRaw, rowB.original)

              if (typeof aSort === 'number' && typeof bSort === 'number') {
                return aSort - bSort
              }

              return String(aSort).localeCompare(String(bSort))
            },
          }),
          size: col.width,
          minSize: col.width ?? 80,
          meta: {
            editable: col.edit != null,
            editMode: col.edit?.mode,
            icon: col.icon,
            flex: col.flex,
          },
        },
      )
    }

    // Display column (no accessor)
    return helper.display({
      id: col.id,
      header: col.header,
      cell: col.cell ? (info) => col.cell!(undefined, info.row.original) : () => null,
      enableSorting: false,
      size: col.width,
      minSize: col.width ?? 80,
      meta: {
        icon: col.icon,
        flex: col.flex,
      },
    })
  })
}
