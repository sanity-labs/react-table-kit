import {useCallback, useMemo} from 'react'

import type {DocumentBase} from './types'

export interface SelectionState {
  /** Map of row index to boolean */
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
  /** Toggle a single row by index */
  toggleRow: (rowIndex: string) => void
  /** Toggle all rows */
  toggleAll: () => void
}

export function useTableSelection<T extends DocumentBase>(
  rowSelection: SelectionState,
  setRowSelection: (updater: SelectionState | ((prev: SelectionState) => SelectionState)) => void,
  data: T[],
): TableSelection<T> {
  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length

  const selectedRows = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => data[parseInt(k, 10)])
      .filter(Boolean)
  }, [rowSelection, data])

  const isAllSelected = data.length > 0 && selectedCount === data.length

  const clearSelection = useCallback(() => {
    setRowSelection({})
  }, [setRowSelection])

  const toggleRow = useCallback(
    (rowIndex: string) => {
      setRowSelection((prev: SelectionState) => {
        const next = {...prev}
        next[rowIndex] = !next[rowIndex]
        if (!next[rowIndex]) delete next[rowIndex]
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
      data.forEach((_, i) => {
        next[String(i)] = true
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
