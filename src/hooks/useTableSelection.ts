import {useCallback, useMemo} from 'react'

import type {DocumentBase} from '../types/tableTypes'

export interface SelectionState {
  /** Map of row id to boolean */
  [key: string]: boolean
}

export interface TableSelection<T extends DocumentBase = DocumentBase> {
  /** Number of selected rows */
  selectedCount: number
  /** The selected row documents */
  selectedRows: T[]
  /** Clear all selections */
  clearSelection: () => void
  /** Whether all rows are selected */
  isAllSelected: boolean
  /** Toggle a single row by id */
  toggleRow: (rowId: string) => void
  /** Toggle all rows */
  toggleAll: () => void
}

function normalizeRowId(id: string) {
  return id.replace(/^drafts\./, '')
}

export function useTableSelection<T extends DocumentBase>(
  rowSelection: SelectionState,
  setRowSelection: (updater: SelectionState | ((prev: SelectionState) => SelectionState)) => void,
  data: T[],
): TableSelection<T> {
  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length
  const rowsById = useMemo(() => {
    const map = new Map<string, T>()
    data.forEach((row) => {
      map.set(normalizeRowId(row._id), row)
    })
    return map
  }, [data])

  const selectedRows = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => rowsById.get(k) ?? data[parseInt(k, 10)])
      .filter(Boolean)
  }, [rowSelection, rowsById, data])

  const isAllSelected = data.length > 0 && selectedCount === data.length

  const clearSelection = useCallback(() => {
    setRowSelection({})
  }, [setRowSelection])

  const toggleRow = useCallback(
    (rowId: string) => {
      setRowSelection((prev: SelectionState) => {
        const next = {...prev}
        next[rowId] = !next[rowId]
        if (!next[rowId]) delete next[rowId]
        return next
      })
    },
    [setRowSelection],
  )

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setRowSelection({})
    } else {
      const next: SelectionState = {}
      data.forEach((row, i) => {
        next[normalizeRowId(row._id) || String(i)] = true
      })
      setRowSelection(next)
    }
  }, [isAllSelected, data, setRowSelection])

  return {
    selectedCount,
    selectedRows,
    clearSelection,
    isAllSelected,
    toggleRow,
    toggleAll,
  }
}
