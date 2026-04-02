import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {AddIcon} from '@sanity/icons'
import {Button, Card, Checkbox, Stack, Text} from '@sanity/ui'
import {
  type PaginationState as TanStackPaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {motion, LayoutGroup} from 'framer-motion'
import {useQueryState, parseAsString, parseAsInteger} from 'nuqs'
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {toTanStackColumns} from '../../helpers/table/toTanStackColumns'
import type {useTableGrouping} from '../../hooks/useTableGrouping'
import {useTableSelection} from '../../hooks/useTableSelection'
import type {ColumnDef, DocumentBase, DocumentTableProps} from '../../types/tableTypes'
import {BulkActionBar} from './BulkActionBar'
import {GroupSection} from './GroupSection'
import {Pagination} from './Pagination'
import {SelectAllBanner} from './SelectAllBanner'

function getPlaceholderWidth(columnId: string) {
  if (columnId === 'select' || columnId === '_select') return '16px'
  if (columnId === 'openInStudio') return '20px'
  if (columnId === '_status') return '24px'
  return '70%'
}

/** Inner component — only renders when we have data */
function LoadingRow({
  gridTemplateColumns,
  columnIds,
  columnPositionMap,
}: {
  gridTemplateColumns: string
  columnIds: string[]
  columnPositionMap: Record<string, number>
}) {
  return (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns,
        borderBottom: '1px solid var(--card-border-color)',
      }}
    >
      {columnIds.map((columnId) => (
        <div
          key={columnId}
          role="cell"
          style={{
            padding: '10px 16px',
            borderRight: '1px solid var(--card-border-color)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gridColumn: columnPositionMap[columnId],
          }}
        >
          {columnId === 'select' || columnId === '_select' ? (
            <Checkbox aria-label="Loading selection" checked={false} disabled />
          ) : columnId === '_status' || columnId === 'openInStudio' ? null : (
            <div className="loading-row-skeleton" style={{width: getPlaceholderWidth(columnId)}} />
          )}
        </div>
      ))}
    </div>
  )
}

export function DocumentTableInner<T extends DocumentBase>({
  data,
  columns,
  defaultSort,
  serverSort,
  showPlaceholderRows,
  placeholderRowCount,
  grouping,
  stripedRows,
  bulkActions,
  onSelectionChange,
  pageSize,
  reorderable,
  columnOrder: controlledColumnOrder,
  onColumnOrderChange,
  onCreateDocument,
  createButtonText,
  isCreating,
}: {
  data: T[]
  columns: ColumnDef<T>[]
  defaultSort?: {field: string; direction: 'asc' | 'desc'}
  serverSort?: DocumentTableProps<T>['serverSort']
  showPlaceholderRows?: boolean
  placeholderRowCount?: number
  grouping: ReturnType<typeof useTableGrouping<T>>
  stripedRows?: boolean
  bulkActions?: DocumentTableProps<T>['bulkActions']
  onSelectionChange?: (selectedRows: T[]) => void
  pageSize?: number
  reorderable?: boolean
  columnOrder?: string[]
  onColumnOrderChange?: (newOrder: string[]) => void
  onCreateDocument?: () => void
  createButtonText?: string
  isCreating?: boolean
}) {
  const hasSelection = columns.some((c) => c._isSelectColumn)
  const tanstackColumns = useMemo(
    () => toTanStackColumns(columns, hasSelection),
    [columns, hasSelection],
  )

  // Sort state — URL params take priority over defaultSort
  const [sortParam, setSortParam] = useQueryState(
    'sort',
    parseAsString.withOptions({history: 'replace'}),
  )
  const [dirParam, setDirParam] = useQueryState(
    'dir',
    parseAsString.withOptions({history: 'replace'}),
  )

  const initialSorting: SortingState = sortParam
    ? [{id: sortParam, desc: dirParam === 'desc'}]
    : defaultSort
      ? [{id: defaultSort.field, desc: defaultSort.direction === 'desc'}]
      : []
  const controlledSorting: SortingState =
    serverSort?.sort == null
      ? []
      : [{id: serverSort.sort.field, desc: serverSort.sort.direction === 'desc'}]

  const [clientSorting, setClientSortingRaw] = useState<SortingState>(initialSorting)

  const setSorting = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const applyNextSort = (prev: SortingState) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (next.length > 0) {
          setSortParam(next[0].id)
          setDirParam(next[0].desc ? 'desc' : 'asc')
        } else {
          setSortParam(null)
          setDirParam(null)
        }
        return next
      }

      if (serverSort) {
        const next = applyNextSort(controlledSorting)
        serverSort.onSortChange(
          next.length > 0
            ? {
                field: next[0].id,
                direction: next[0].desc ? 'desc' : 'asc',
              }
            : null,
        )
        return
      }

      setClientSortingRaw((prev) => applyNextSort(prev))
    },
    [controlledSorting, serverSort, setSortParam, setDirParam],
  )
  const sorting = serverSort ? controlledSorting : clientSorting
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [selectAllMode, setSelectAllMode] = useState(false)

  const [pageParam, setPageParam] = useQueryState(
    'page',
    parseAsInteger.withOptions({history: 'replace'}),
  )

  const [paginationState, setPaginationStateRaw] = useState<TanStackPaginationState>({
    pageIndex: pageParam ? Math.max(0, pageParam - 1) : 0,
    pageSize: pageSize ?? data.length,
  })

  const setPaginationState = useCallback(
    (
      updater:
        | TanStackPaginationState
        | ((prev: TanStackPaginationState) => TanStackPaginationState),
    ) => {
      setPaginationStateRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (next.pageIndex > 0) {
          setPageParam(next.pageIndex + 1)
        } else {
          setPageParam(null)
        }
        return next
      })
    },
    [setPageParam],
  )

  // Use our pagination hook for the UI
  const hasPagination = pageSize !== undefined

  // Clear selection when data reference changes (e.g., filter applied)
  const [prevData, setPrevData] = useState(data)
  if (data !== prevData) {
    setPrevData(data)
    if (Object.keys(rowSelection).length > 0) {
      setRowSelection({})
    }
    if (selectAllMode) {
      setSelectAllMode(false)
    }
    // Reset pagination to page 1 when data changes
    if (hasPagination && paginationState.pageIndex !== 0) {
      setPaginationState((prev) => ({...prev, pageIndex: 0}))
    }
  }

  // Column order state — controlled or uncontrolled
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([])
  const columnOrder = controlledColumnOrder ?? internalColumnOrder
  const setColumnOrder = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater
      if (controlledColumnOrder) {
        onColumnOrderChange?.(newOrder)
      } else {
        setInternalColumnOrder(newOrder)
        onColumnOrderChange?.(newOrder)
      }
    },
    [columnOrder, controlledColumnOrder, onColumnOrderChange],
  )

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    ...(!serverSort ? {getSortedRowModel: getSortedRowModel()} : {}),
    ...(hasPagination ? {getPaginationRowModel: getPaginationRowModel()} : {}),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPaginationState,
    state: {
      sorting,
      rowSelection,
      pagination: paginationState,
      ...(columnOrder.length > 0 && {columnOrder}),
    },
    manualSorting: !!serverSort,
    enableRowSelection: hasSelection,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  })

  // Auto-size columns — refs declared here, effect runs after sortedRows
  const tableRef = useRef<HTMLDivElement>(null)

  // Track which column is being dragged (for live reorder)
  const draggingColumnRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const {columnSizing, columnSizingInfo} = table.getState()
  const isResizing = !!columnSizingInfo.isResizingColumn

  // Pragmatic drag-and-drop monitor for column reordering
  useEffect(() => {
    if (!reorderable) return

    return monitorForElements({
      canMonitor: ({source}) => source.data.type === 'column-header',
      onDragStart: ({source}) => {
        draggingColumnRef.current = source.data.columnId as string
        setIsDragging(true)
      },
      onDrag: ({location}) => {
        const sourceId = draggingColumnRef.current
        if (!sourceId || !tableRef.current) return

        const cursorX = location.current.input.clientX
        const displayOrder = table.getHeaderGroups()[0]?.headers.map((h) => h.id) ?? []
        const sourceIndex = displayOrder.indexOf(sourceId)
        if (sourceIndex === -1) return

        const headers = Array.from(
          tableRef.current.querySelectorAll<HTMLElement>('[data-column-id]'),
        )

        for (const th of headers) {
          const columnId = th.getAttribute('data-column-id')
          if (!columnId || columnId === sourceId) continue
          if (columnId === 'select' || columnId === 'openInStudio' || columnId === '_select')
            continue

          const rect = th.getBoundingClientRect()
          if (cursorX < rect.left || cursorX > rect.right) continue

          const targetIndex = displayOrder.indexOf(columnId)
          if (targetIndex === -1) continue

          const midpoint = rect.left + rect.width / 2
          const isMovingRight = sourceIndex < targetIndex
          const shouldSwap = isMovingRight ? cursorX > midpoint : cursorX < midpoint

          if (shouldSwap) {
            const newOrder = [...displayOrder]
            newOrder.splice(sourceIndex, 1)
            // After removing source, insert at targetIndex.
            // Removal shifts indices >= sourceIndex left by 1, which naturally
            // places the source at the target's original position.
            newOrder.splice(targetIndex, 0, sourceId)
            setColumnOrder(newOrder)
          }
          break
        }
      },
      onDrop: () => {
        draggingColumnRef.current = null
        setIsDragging(false)
      },
    })
  }, [reorderable, table, setColumnOrder])

  // Register draggable + drop target on each column header
  const headerGroupsKey = table
    .getHeaderGroups()
    .map((g) => g.headers.map((h) => h.id).join(','))
    .join('|')
  useEffect(() => {
    if (!reorderable || !tableRef.current) return

    const headers = tableRef.current.querySelectorAll<HTMLElement>('[data-column-id]')
    const cleanups: (() => void)[] = []

    headers.forEach((th) => {
      const columnId = th.getAttribute('data-column-id')
      if (!columnId) return
      // Don't make pinned columns draggable
      if (columnId === 'select' || columnId === 'openInStudio' || columnId === '_select') return

      const handle = th.querySelector<HTMLElement>('[data-testid="drag-handle"]')
      if (!handle) return

      const cleanupDraggable = draggable({
        element: th,
        dragHandle: handle,
        getInitialData: () => ({columnId, type: 'column-header'}),
      })

      const cleanupDropTarget = dropTargetForElements({
        element: th,
        canDrop: ({source}) => source.data.type === 'column-header',
        getData: () => ({columnId, type: 'column-header'}),
      })

      cleanups.push(cleanupDraggable, cleanupDropTarget)
    })

    return () => cleanups.forEach((fn) => fn())
  }, [reorderable, headerGroupsKey])
  const prevHasVisibleRows = useRef(false)

  const {groupBy, collapsedGroups, toggleGroup} = grouping

  const sortedRows = table.getRowModel().rows
  const loadingRows = useMemo(
    () => Array.from({length: (placeholderRowCount ?? paginationState.pageSize) || 0}),
    [paginationState.pageSize, placeholderRowCount],
  )

  // Auto-size columns on first render and when data reappears after being empty
  // (e.g., clearing filters that previously showed 0 results in grouped mode)
  const hasVisibleRows = sortedRows.length > 0
  useEffect(() => {
    if (!tableRef.current || !hasVisibleRows) {
      prevHasVisibleRows.current = hasVisibleRows
      return
    }
    // Only re-measure when rows first appear or reappear after being empty
    if (prevHasVisibleRows.current) {
      prevHasVisibleRows.current = hasVisibleRows
      return
    }
    prevHasVisibleRows.current = hasVisibleRows

    const tableEl = tableRef.current
    const headerCells = tableEl.querySelectorAll('[role="columnheader"]')
    // Skip group header rows — find the first actual data row
    const dataRow = tableEl.querySelector(
      '[role="rowgroup"]:last-child [role="row"]:not([data-testid="group-header"])',
    )
    const bodyCells = dataRow ? dataRow.querySelectorAll('[role="cell"]') : []

    const newSizing: Record<string, number> = {}
    headerCells.forEach((th, i) => {
      const header = table.getHeaderGroups()[0]?.headers[i]
      if (header) {
        const colDef = header.column.columnDef
        const explicitSize = colDef.size
        // If column has an explicit size smaller than default min, respect it
        const minWidth = explicitSize && explicitSize < 80 ? explicitSize : 80
        const naturalWidth = Math.max(
          th.getBoundingClientRect().width,
          bodyCells[i]?.getBoundingClientRect().width ?? 0,
          minWidth,
        )
        newSizing[header.id] = Math.ceil(naturalWidth)
      }
    })

    // Apply measured sizes
    table.setColumnSizing(newSizing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVisibleRows])

  // Compute groups from sorted data
  const groups = useMemo(() => {
    if (!groupBy) return null
    const groupMap = new Map<string, typeof sortedRows>()
    for (const row of sortedRows) {
      const key = String(row.original[groupBy] ?? '')
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(row)
    }
    return Array.from(groupMap.entries()).map(([name, rows]) => ({name, rows}))
  }, [groupBy, sortedRows])

  const headerGroups = table.getHeaderGroups()
  const visibleColumnIds = useMemo(
    () => (headerGroups[0]?.headers ?? []).map((header) => header.id),
    [headerGroups],
  )

  const gridTemplateColumns = useMemo(() => {
    const headers = headerGroups[0]?.headers ?? []
    const hasFlex = headers.some((h) => h.column.columnDef.meta?.flex)

    // Find the last non-utility column (not select/openInStudio) to make it flexible
    // when no column explicitly has flex — ensures the grid always fills the container
    let lastDataColIndex = -1
    if (!hasFlex) {
      for (let i = headers.length - 1; i >= 0; i--) {
        const id = headers[i].id
        if (id !== 'select' && id !== '_select' && id !== 'openInStudio') {
          lastDataColIndex = i
          break
        }
      }
    }

    return (
      headers
        .map((h, i) => {
          const flex = h.column.columnDef.meta?.flex
          if (flex) return `minmax(${h.getSize()}px, ${flex}fr)`
          const size = h.getSize()
          // Last data column gets 1fr fallback to fill remaining space
          if (i === lastDataColIndex) return `minmax(${size}px, 1fr)`
          return `${size}px`
        })
        .join(' ') ?? ''
    )
    // Column sizing / order deps keep grid template in sync with TanStack column state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerGroups, columnSizing, columnSizingInfo, columnOrder])

  // Map column IDs to their display position (1-based for CSS grid-column)
  // Used to render cells in fixed DOM order while controlling visual position via grid-column
  const columnPositionMap = useMemo(() => {
    const headers = headerGroups[0]?.headers ?? []
    const map: Record<string, number> = {}
    headers.forEach((h, i) => {
      map[h.id] = i + 1 // CSS grid-column is 1-based
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerGroups, columnOrder, columnSizing])

  // Use our selection hook
  const rawSelection = useTableSelection(rowSelection, setRowSelection, data)

  // When selectAllMode is active, override counts to reflect all data
  const selection = selectAllMode
    ? {
        ...rawSelection,
        selectedCount: data.length,
        selectedRows: data,
      }
    : rawSelection

  const allPageRowsSelected =
    hasSelection && sortedRows.length > 0 && sortedRows.every((row) => rowSelection[row.id])
  const showSelectAllBanner =
    allPageRowsSelected && hasPagination && data.length > (pageSize ?? data.length)

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selection.selectedRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.selectedRows])

  return (
    <Stack space={0}>
      <style>{`
        @keyframes sanity-table-row-skeleton-pulse {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            opacity: 0.55;
          }
        }
        .sanity-table .editable-text:focus-within {
          outline: 2px solid var(--card-focus-ring-color, #2276fc);
          outline-offset: -2px;
        }
        .sanity-table .editable-text [data-ui="TextArea"],
        .sanity-table .editable-text [data-ui="TextArea"] *  {
          background: transparent !important;
          background-color: transparent !important;
        }
        .sanity-table .loading-row-skeleton {
          height: 24px;
          border-radius: 6px;
          background: var(--card-code-bg-color, var(--card-bg2-color));
          animation: sanity-table-row-skeleton-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
      {showSelectAllBanner && (
        <SelectAllBanner
          pageCount={sortedRows.length}
          totalCount={data.length}
          isAllSelected={selectAllMode}
          onSelectAll={() => setSelectAllMode(true)}
          onClearSelection={() => {
            setRowSelection({})
            setSelectAllMode(false)
          }}
        />
      )}
      <div style={{position: 'relative'}}>
        <Card
          border
          radius={2}
          className="sanity-table"
          style={{
            overflow: 'hidden',
            paddingBottom: hasSelection && selection.selectedCount > 0 ? 56 : undefined,
          }}
        >
          <div
            style={{
              overflowX: 'auto',
              maxHeight: 'var(--sanity-table-max-height, none)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <LayoutGroup>
              <div
                ref={tableRef}
                role="table"
                style={{
                  minWidth: 600,
                  color: 'var(--card-fg-color)',
                }}
              >
                <div
                  role="rowgroup"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: 'var(--card-bg2-color)',
                  }}
                >
                  {table.getHeaderGroups().map((headerGroup) => (
                    <div
                      role="row"
                      key={headerGroup.id}
                      style={{display: 'grid', gridTemplateColumns}}
                    >
                      {headerGroup.headers.map((header) => {
                        const canSort =
                          header.column.getCanSort() &&
                          (!serverSort ||
                            !serverSort.sortableColumnIds ||
                            serverSort.sortableColumnIds.includes(header.id))
                        const sorted = header.column.getIsSorted()
                        const ariaSort =
                          sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'

                        return (
                          <motion.div
                            layout={isDragging && !isResizing ? 'position' : undefined}
                            layoutId={reorderable ? `col-${header.id}` : undefined}
                            transition={
                              isDragging && !isResizing
                                ? {type: 'spring', stiffness: 500, damping: 35}
                                : {duration: 0}
                            }
                            key={header.id}
                            data-column-id={header.id}
                            aria-sort={canSort ? ariaSort : undefined}
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={(e) => {
                              if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                header.column.getToggleSortingHandler()?.(e)
                              }
                            }}
                            role="columnheader"
                            tabIndex={canSort ? 0 : undefined}
                            style={{
                              borderBottom: '2px solid var(--card-border-color)',
                              borderRight: '1px solid var(--card-border-color)',
                              padding: '8px 16px',
                              textAlign: 'left',
                              userSelect: 'none',
                              cursor: canSort ? 'pointer' : undefined,
                              minWidth:
                                header.column.columnDef.size && header.column.columnDef.size < 80
                                  ? header.column.columnDef.size
                                  : 80,
                              position: 'relative',
                              gridColumn: reorderable ? columnPositionMap[header.id] : undefined,
                            }}
                          >
                            {header.id === 'select'
                              ? flexRender(header.column.columnDef.header, header.getContext())
                              : (() => {
                                  const Icon = header.column.columnDef.meta?.icon
                                  const isPinned =
                                    header.id === 'select' || header.id === 'openInStudio'
                                  const showDragHandle = reorderable && !isPinned
                                  return (
                                    <div
                                      style={{display: 'flex', alignItems: 'center', gap: '4px'}}
                                    >
                                      {showDragHandle && (
                                        <span
                                          data-testid="drag-handle"
                                          aria-roledescription="sortable column"
                                          tabIndex={0}
                                          role="button"
                                          style={{
                                            cursor: 'grab',
                                            fontSize: '16px',
                                            flexShrink: 0,
                                            userSelect: 'none',
                                          }}
                                        >
                                          ⠿
                                        </span>
                                      )}
                                      <Text
                                        size={1}
                                        weight="semibold"
                                        style={{
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}
                                      >
                                        {Icon && (
                                          <Icon style={{width: 16, height: 16, flexShrink: 0}} />
                                        )}
                                        {flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                        )}
                                        {sorted === 'asc' ? ' ↑' : ''}
                                        {sorted === 'desc' ? ' ↓' : ''}
                                      </Text>
                                    </div>
                                  )
                                })()}
                            {/* Column resize handle */}
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                height: '100%',
                                width: '6px',
                                cursor: 'col-resize',
                                userSelect: 'none',
                                touchAction: 'none',
                                background: header.column.getIsResizing()
                                  ? 'var(--card-focus-ring-color, #2276fc)'
                                  : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!header.column.getIsResizing()) {
                                  e.currentTarget.style.background = 'var(--card-border-color)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!header.column.getIsResizing()) {
                                  e.currentTarget.style.background = 'transparent'
                                }
                              }}
                              data-testid={`resize-handle-${header.id}`}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div role="rowgroup">
                  {showPlaceholderRows
                    ? loadingRows.map((_, index) => (
                        <LoadingRow
                          key={`loading-row-${index}`}
                          gridTemplateColumns={gridTemplateColumns}
                          columnIds={visibleColumnIds}
                          columnPositionMap={columnPositionMap}
                        />
                      ))
                    : groups
                      ? // Grouped rendering
                        groups.map((group) => {
                          const isCollapsed = collapsedGroups.has(group.name)
                          return (
                            <GroupSection
                              key={group.name}
                              columnIds={visibleColumnIds}
                              groupName={group.name}
                              rows={group.rows}
                              isCollapsed={isCollapsed}
                              onToggle={() => toggleGroup(group.name)}
                              gridTemplateColumns={gridTemplateColumns}
                              reorderable={reorderable}
                              columnPositionMap={columnPositionMap}
                              isDragging={isDragging}
                              isResizing={isResizing}
                              hasSelection={hasSelection}
                              rowSelection={rowSelection}
                              onSelectGroup={(groupRows) => {
                                const allSelected = groupRows.every((row) => rowSelection[row.id])
                                setRowSelection((prev) => {
                                  const next = {...prev}
                                  groupRows.forEach((row) => {
                                    if (allSelected) {
                                      delete next[row.id]
                                    } else {
                                      next[row.id] = true
                                    }
                                  })
                                  return next
                                })
                              }}
                            />
                          )
                        })
                      : // Flat rendering
                        sortedRows.map((row, i) => (
                          <Suspense
                            key={row.id}
                            fallback={
                              <LoadingRow
                                gridTemplateColumns={gridTemplateColumns}
                                columnIds={visibleColumnIds}
                                columnPositionMap={columnPositionMap}
                              />
                            }
                          >
                            <div
                              role="row"
                              style={{
                                display: 'grid',
                                gridTemplateColumns,
                                borderBottom: '1px solid var(--card-border-color)',
                                backgroundColor: stripedRows
                                  ? i % 2 === 1
                                    ? 'var(--card-code-bg-color, var(--card-bg2-color))'
                                    : undefined
                                  : undefined,
                              }}
                            >
                              {row.getAllCells().map((cell) => {
                                const isEditable = cell.column.columnDef.meta?.editable
                                const isTextEdit = cell.column.columnDef.meta?.editMode === 'text'
                                return (
                                  <motion.div
                                    layout={isDragging && !isResizing ? 'position' : undefined}
                                    layoutId={reorderable ? `cell-${cell.id}` : undefined}
                                    transition={
                                      isDragging && !isResizing
                                        ? {type: 'spring', stiffness: 500, damping: 35}
                                        : {duration: 0}
                                    }
                                    key={cell.id}
                                    role="cell"
                                    className={isTextEdit ? 'editable-text' : undefined}
                                    style={{
                                      padding: isTextEdit ? 0 : '10px 16px',
                                      cursor: isEditable ? 'pointer' : undefined,
                                      borderRight: '1px solid var(--card-border-color)',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gridColumn: reorderable
                                        ? columnPositionMap[cell.column.id]
                                        : undefined,
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </motion.div>
                                )
                              })}
                            </div>
                          </Suspense>
                        ))}
                </div>
              </div>
              {/* Add Document button */}
              {onCreateDocument && (
                <div
                  role="row"
                  data-testid="add-document-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns,
                  }}
                >
                  <div role="cell" style={{gridColumn: '1 / -1'}}>
                    <Button
                      icon={AddIcon}
                      text={isCreating ? 'Adding…' : createButtonText || 'Add Document'}
                      tone="neutral"
                      disabled={isCreating}
                      onClick={onCreateDocument}
                      fontSize={2}
                      padding={4}
                      mode="ghost"
                      width="fill"
                      radius={0}
                    />
                  </div>
                </div>
              )}
            </LayoutGroup>
          </div>
        </Card>
        {hasSelection && selection.selectedCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 2,
            }}
          >
            <BulkActionBar selectedCount={selection.selectedCount}>
              {bulkActions?.({
                selectedCount: selection.selectedCount,
                selectedRows: selection.selectedRows,
                clearSelection: () => {
                  selection.clearSelection()
                  setSelectAllMode(false)
                },
              })}
            </BulkActionBar>
          </div>
        )}
      </div>
      {hasPagination && (
        <Pagination
          pagination={{
            page: paginationState.pageIndex + 1,
            pageSize: paginationState.pageSize,
            startIndex: paginationState.pageIndex * paginationState.pageSize,
            endIndex: Math.min(
              (paginationState.pageIndex + 1) * paginationState.pageSize,
              data.length,
            ),
            totalItems: data.length,
            totalPages: Math.max(1, Math.ceil(data.length / paginationState.pageSize)),
            hasNextPage:
              paginationState.pageIndex < Math.ceil(data.length / paginationState.pageSize) - 1,
            hasPreviousPage: paginationState.pageIndex > 0,
            nextPage: () => table.nextPage(),
            previousPage: () => table.previousPage(),
            goToPage: (p: number) => table.setPageIndex(p - 1),
          }}
        />
      )}
    </Stack>
  )
}
