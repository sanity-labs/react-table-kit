import {Card, Flex, Stack, Text} from '@sanity/ui'
import {useMemo, useRef} from 'react'

import {useTableFilters} from '../../hooks/useTableFilters'
import {useTableGrouping} from '../../hooks/useTableGrouping'
import type {DocumentBase, DocumentTableProps} from '../../types/tableTypes'
import {FilterBar} from '../filters/FilterBar'
import {DocumentTableInner} from './DocumentTableInner'

/**
 * DocumentTable — the top-level table component.
 * Renders a Sanity-native table from document data + column definitions.
 * TanStack Table is used internally but not exposed in the public API.
 *
 * Data flow: raw data → useTableFilters → filteredData → DocumentTableInner (pagination + selection)
 */
export function DocumentTable<T extends DocumentBase>({
  data,
  columns,
  defaultSort,
  serverSort,
  loading = false,
  transitionLoadingRowCount,
  emptyMessage = 'No documents found',
  stripedRows = false,
  bulkActions,
  onSelectionChange,
  pageSize,
  reorderable,
  columnOrder: controlledColumnOrder,
  onColumnOrderChange,
  onCreateDocument,
  createButtonText,
  isCreating,
  computedFilters,
  hideFilterBar = false,
}: DocumentTableProps<T>) {
  const filterableColumns = useMemo(
    () => columns.filter((c) => c.filterable).map((c) => c.field ?? c.id),
    [columns],
  )
  const searchableFields = useMemo(
    () =>
      columns
        .filter((c) => c.searchable)
        .map((c) => c.field)
        .filter(Boolean) as string[],
    [columns],
  )
  const groupableColumns = useMemo(
    () => columns.filter((c) => c.groupable).map((c) => c.field ?? c.id),
    [columns],
  )
  const columnFilterConfigs = useMemo(
    () =>
      columns
        .filter((c) => c.filterable || c.filterFn || c.filterMode)
        .map((c) => ({
          id: c.field ?? c.id,
          filterMode: c.filterMode ?? 'exact',
          ...(c.filterFn && {filterFn: c.filterFn}),
        })),
    [columns],
  )
  const filters = useTableFilters<T>({
    filterableColumns,
    columns: columnFilterConfigs,
    searchableFields,
    computedFilters,
  })

  const grouping = useTableGrouping<T>()
  const {groupBy, setGroupBy} = grouping

  // Stale-while-revalidate: track the last valid data we received.
  // Once we have data, keep showing it during subsequent loading states
  // instead of flashing the skeleton (e.g., when live query re-fetches after document creation).
  const prevDataRef = useRef<T[] | undefined>(undefined)
  if (data !== undefined) {
    prevDataRef.current = data
  }
  const displayData = data ?? prevDataRef.current
  const isInitialLoad = displayData === undefined
  const showTransitionLoading = !isInitialLoad && loading && (transitionLoadingRowCount ?? 0) > 0

  const filteredData = useMemo(
    () => (displayData ? filters.applyFilters(displayData) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayData, filters.applyFilters],
  )

  const showFilterBar =
    !hideFilterBar &&
    (filterableColumns.length > 0 || searchableFields.length > 0 || groupableColumns.length > 0)

  // Loading skeleton — only on initial load (no data ever received)
  if (isInitialLoad) {
    return (
      <Card padding={4} data-testid="sanity-table-skeleton">
        <Stack space={3}>
          {Array.from({length: 5}).map((_, i) => (
            <Flex key={i} gap={3} align="center">
              <Card
                radius={2}
                style={{height: 16, flex: 1, opacity: 0.1, background: 'currentColor'}}
              />
              <Card
                radius={2}
                style={{height: 16, width: 80, opacity: 0.1, background: 'currentColor'}}
              />
            </Flex>
          ))}
        </Stack>
      </Card>
    )
  }

  // Empty state (no data at all)
  if (displayData.length === 0) {
    return (
      <Card padding={5} radius={2}>
        <Stack space={3} style={{textAlign: 'center'}}>
          <Text muted size={2}>
            {emptyMessage}
          </Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Stack space={3}>
      {showFilterBar && (
        <FilterBar
          filters={filters}
          data={displayData}
          filterableColumns={filterableColumns}
          columns={columns}
          groupableColumns={groupableColumns}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
        />
      )}
      {!showTransitionLoading && filteredData && filteredData.length === 0 ? (
        <Card padding={5} radius={2}>
          <Stack space={3} style={{textAlign: 'center'}}>
            <Text muted size={2}>
              No documents match your filters
            </Text>
          </Stack>
        </Card>
      ) : (
        <DocumentTableInner
          data={filteredData ?? displayData}
          columns={columns}
          defaultSort={defaultSort}
          serverSort={serverSort}
          showPlaceholderRows={showTransitionLoading}
          placeholderRowCount={transitionLoadingRowCount}
          grouping={grouping}
          stripedRows={stripedRows}
          bulkActions={bulkActions}
          onSelectionChange={onSelectionChange}
          pageSize={pageSize}
          reorderable={reorderable}
          columnOrder={controlledColumnOrder}
          onColumnOrderChange={onColumnOrderChange}
          onCreateDocument={onCreateDocument}
          createButtonText={createButtonText}
          isCreating={isCreating}
        />
      )}
    </Stack>
  )
}
