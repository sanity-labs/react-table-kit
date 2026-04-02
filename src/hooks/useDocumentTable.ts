import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {ReactNode} from 'react'
import {useMemo, useState} from 'react'

import type {ColumnDef, DocumentBase, SortConfig} from '../types/tableTypes'
import type {PaginationState} from './usePagination'
import type {TableSelection} from './useTableSelection'

/**
 * Our own table instance type — consumers use this, not TanStack's Table type.
 * This is the abstraction boundary for custom composition.
 */
export interface DocumentTableInstance<T extends DocumentBase = DocumentBase> {
  /** All data rows (sorted) */
  rows: DocumentRow<T>[]
  /** Column definitions */
  columns: ColumnDef<T>[]
  /** Header groups for rendering */
  headerGroups: DocumentHeaderGroup[]
  /** Current sort state */
  sorting: SortConfig | null
  /** Toggle sort on a column */
  toggleSort: (columnId: string) => void
  /** Selection state (when selection column is present) */
  selection?: TableSelection<T>
  /** Pagination state (when pageSize is configured) */
  pagination?: PaginationState
}

export interface DocumentHeaderGroup {
  id: string
  headers: DocumentHeader[]
}

export interface DocumentHeader {
  id: string
  renderHeader: () => ReactNode
  canSort: boolean
  isSorted: false | 'asc' | 'desc'
  toggleSort: () => void
}

export interface DocumentRow<T extends DocumentBase = DocumentBase> {
  id: string
  original: T
  cells: DocumentCell[]
}

export interface DocumentCell {
  id: string
  renderCell: () => ReactNode
}

interface UseDocumentTableConfig<T extends DocumentBase = DocumentBase> {
  data: T[] | undefined
  columns: ColumnDef<T>[]
  defaultSort?: SortConfig
}

/**
 * Convert our ColumnDef to TanStack ColumnDef.
 * Shared with DocumentTable component.
 */
function toTanStackColumns<T extends DocumentBase>(columns: ColumnDef<T>[]) {
  const helper = createColumnHelper<T>()

  return columns.map((col) => {
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
            if (col.cell) return col.cell(info.getValue(), info.row.original)
            return String(info.getValue() ?? '')
          },
          enableSorting: col.sortable !== false,
        },
      )
    }

    return helper.display({
      id: col.id,
      header: col.header || undefined,
      cell: col.cell ? (info) => col.cell!(undefined, info.row.original) : () => null,
      enableSorting: false,
    })
  })
}

/**
 * useDocumentTable — composable hook for custom table layouts.
 * Returns our own DocumentTableInstance type, not TanStack's.
 *
 * Use this when you need full control over rendering but want
 * the table engine handled for you.
 */
export function useDocumentTable<T extends DocumentBase>(
  config: UseDocumentTableConfig<T>,
): DocumentTableInstance<T> {
  const {data = [], columns, defaultSort} = config

  const tanstackColumns = useMemo(() => toTanStackColumns(columns), [columns])

  const initialSorting: SortingState = defaultSort
    ? [{id: defaultSort.field, desc: defaultSort.direction === 'desc'}]
    : []

  const [sorting, setSorting] = useState<SortingState>(initialSorting)

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {sorting},
  })

  // Map TanStack types to our own types
  const headerGroups: DocumentHeaderGroup[] = table.getHeaderGroups().map((hg) => ({
    id: hg.id,
    headers: hg.headers.map((h) => ({
      id: h.id,
      renderHeader: () => flexRender(h.column.columnDef.header, h.getContext()),
      canSort: h.column.getCanSort(),
      isSorted: h.column.getIsSorted(),
      toggleSort: () => h.column.toggleSorting(),
    })),
  }))

  const rows: DocumentRow<T>[] = table.getRowModel().rows.map((row) => ({
    id: row.id,
    original: row.original,
    cells: row.getVisibleCells().map((cell) => ({
      id: cell.id,
      renderCell: () => flexRender(cell.column.columnDef.cell, cell.getContext()),
    })),
  }))

  const currentSort: SortConfig | null =
    sorting.length > 0 ? {field: sorting[0].id, direction: sorting[0].desc ? 'desc' : 'asc'} : null

  return {
    rows,
    columns,
    headerGroups,
    sorting: currentSort,
    toggleSort: (columnId: string) => {
      const col = table.getColumn(columnId)
      col?.toggleSorting()
    },
  }
}
