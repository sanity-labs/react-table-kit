import {CloseIcon, SearchIcon} from '@sanity/icons'
import {
  Button,
  Card,
  Flex,
  Label,
  Menu,
  MenuButton,
  MenuItem,
  Select,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui'
import {format} from 'date-fns'

import type {ColumnDef, DocumentBase} from './types'
import {parseRangeValue} from './useTableFilters'
import type {UseTableFiltersResult} from './useTableFilters'

interface FilterBarProps<T extends DocumentBase> {
  filters: UseTableFiltersResult<T>
  data: T[]
  filterableColumns: string[]
  columns?: ColumnDef<T>[]
  groupableColumns?: string[]
  groupBy?: string | null
  onGroupByChange?: (value: string | null) => void
}

/**
 * FilterBar — renders filter dropdowns, search input, and active filter chips.
 * Uses Sanity UI components exclusively.
 */
export function FilterBar<T extends DocumentBase>({
  filters,
  data,
  filterableColumns,
  columns,
  groupableColumns,
  groupBy,
  onGroupByChange,
}: FilterBarProps<T>) {
  const {
    filters: activeFilters,
    searchInputValue,
    setFilter,
    clearFilter,
    clearAll,
    setSearchInput,
    hasActiveFilters,
    getFilterOptions,
  } = filters

  const hasFilters = filterableColumns.length > 0 || filters.searchQuery !== undefined
  const hasGroupBy = groupableColumns && groupableColumns.length > 0

  return (
    <Stack space={3}>
      <Flex gap={4} wrap="wrap" align="center">
        {/* Filter dropdowns */}
        {hasFilters && (
          <Stack space={2} className="max-w-sm">
            <Label size={2} muted>
              Filter By
            </Label>
            <Flex gap={2} wrap="wrap" align="center">
              {filterableColumns.map((columnId) => {
                const colDef = columns?.find((c) => (c.field ?? c.id) === columnId)
                const isRange = colDef?.filterMode === 'range'
                const label = colDef?.header ?? capitalize(columnId)

                if (isRange) {
                  return (
                    <DateRangeFilter
                      key={columnId}
                      columnId={columnId}
                      label={label}
                      value={activeFilters[columnId]}
                      onFilterChange={setFilter}
                    />
                  )
                }

                const options = getFilterOptions(columnId, data)
                const currentValue = activeFilters[columnId]

                return (
                  <FilterDropdown
                    key={columnId}
                    columnId={columnId}
                    label={label}
                    options={options}
                    value={currentValue}
                    onSelect={(value) => setFilter(columnId, value)}
                  />
                )
              })}
            </Flex>
          </Stack>
        )}

        {/* Group by */}
        {hasGroupBy && onGroupByChange && (
          <Stack space={2} className="pr-auto max-w-md">
            <Label size={2} muted>
              Group by:
            </Label>
            <Select
              data-testid="group-by-select"
              value={groupBy ?? ''}
              onChange={(e) => {
                const value = e.currentTarget.value
                onGroupByChange(value || null)
              }}
              fontSize={1}
              padding={3}
            >
              <option value="">None</option>
              {groupableColumns!.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </Select>
          </Stack>
        )}

        {/* Search input */}
        {filters.searchQuery !== undefined && (
          <Stack space={2} className="max-w-sm">
            <Label size={2} muted>
              Search
            </Label>
            <TextInput
              icon={SearchIcon}
              placeholder="Search..."
              value={searchInputValue}
              onChange={(e) => setSearchInput(e.currentTarget.value)}
              fontSize={1}
              padding={3}
              style={{minWidth: 200, flex: '1 1 200px'}}
            />
          </Stack>
        )}
      </Flex>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <Flex gap={2} wrap="wrap" align="center">
          {Object.entries(activeFilters).map(([columnId, value]) => {
            if (value === undefined) return null
            const colDef = columns?.find((c) => (c.field ?? c.id) === columnId)
            const label = colDef?.header ?? capitalize(columnId)

            // Format range values nicely
            const isRangeValue = value?.includes('..')
            let chipText: string
            if (isRangeValue) {
              const {min, max} = parseRangeValue(value)
              const formatDate = (d: string) => {
                const date = new Date(d + 'T00:00:00') // local time
                return format(date, 'MMM d')
              }
              const rangeText =
                min && max
                  ? `${formatDate(min)} → ${formatDate(max)}`
                  : min
                    ? `≥ ${formatDate(min)}`
                    : max
                      ? `≤ ${formatDate(max)}`
                      : value
              chipText = `${label}: ${rangeText}`
            } else {
              chipText = `${label}: ${value}`
            }

            return (
              <Card
                key={columnId}
                data-testid={`filter-chip-${columnId}`}
                padding={2}
                radius={2}
                tone="primary"
              >
                <Flex align="center" gap={2}>
                  <Text size={1}>{chipText}</Text>
                  <Button
                    data-testid={`filter-chip-remove-${columnId}`}
                    icon={CloseIcon}
                    mode="bleed"
                    onClick={() => clearFilter(columnId)}
                    padding={1}
                    fontSize={0}
                  />
                </Flex>
              </Card>
            )
          })}

          {/* Computed filter chip */}
          {filters.computedFilter && filters.computedFilters && (
            <Card data-testid="filter-chip-computed" padding={2} radius={2} tone="primary">
              <Flex align="center" gap={2}>
                <Text size={1}>
                  {filters.computedFilters[filters.computedFilter]?.label ??
                    filters.computedFilter}
                </Text>
                <Button
                  data-testid="filter-chip-remove-computed"
                  icon={CloseIcon}
                  mode="bleed"
                  onClick={() => filters.setComputedFilter(null)}
                  padding={1}
                  fontSize={0}
                />
              </Flex>
            </Card>
          )}

          <Button
            fontSize={1}
            mode="bleed"
            onClick={clearAll}
            padding={2}
            text="Clear all"
            tone="critical"
          />
        </Flex>
      )}
    </Stack>
  )
}

/** Helper to capitalize a column ID for display */
function capitalize(str: string): string {
  const cleaned = str.replace(/^_/, '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/** Date range filter with two native date inputs */
function DateRangeFilter({
  columnId,
  label,
  value,
  onFilterChange,
}: {
  columnId: string
  label: string
  value: string | undefined
  onFilterChange: (columnId: string, value: string | undefined) => void
}) {
  const {min, max} = value ? parseRangeValue(value) : {min: undefined, max: undefined}

  const handleFromChange = (from: string) => {
    if (!from && !max) {
      onFilterChange(columnId, undefined)
    } else {
      onFilterChange(columnId, `${from || ''}..${max || ''}`)
    }
  }

  const handleToChange = (to: string) => {
    if (!min && !to) {
      onFilterChange(columnId, undefined)
    } else {
      onFilterChange(columnId, `${min || ''}..${to || ''}`)
    }
  }

  return (
    <Stack space={2}>
      <Label size={1} muted>
        {label}
      </Label>
      <Flex gap={2} align="center">
        <input
          type="date"
          data-testid={`filter-range-from-${columnId}`}
          value={min || ''}
          onChange={(e) => handleFromChange(e.target.value)}
        />
        <Text size={1} muted>
          →
        </Text>
        <input
          type="date"
          data-testid={`filter-range-to-${columnId}`}
          value={max || ''}
          onChange={(e) => handleToChange(e.target.value)}
        />
      </Flex>
    </Stack>
  )
}

/** Individual filter dropdown using Sanity UI MenuButton */
function FilterDropdown({
  columnId,
  label,
  options,
  value,
  onSelect,
}: {
  columnId: string
  label: string
  options: string[]
  value: string | undefined
  onSelect: (value: string | undefined) => void
}) {
  return (
    <MenuButton
      id={`filter-${columnId}`}
      button={
        <Button
          fontSize={1}
          mode={value ? 'default' : 'ghost'}
          padding={3}
          text={value ? `${label}: ${value}` : label}
          tone={value ? 'primary' : 'default'}
          aria-label={label}
        />
      }
      menu={
        <Menu>
          {value && <MenuItem text="All" onClick={() => onSelect(undefined)} />}
          {options.map((option) => (
            <MenuItem
              key={option}
              text={option}
              pressed={option === value}
              tone={option === value ? 'primary' : 'default'}
              onClick={() => onSelect(option)}
            />
          ))}
        </Menu>
      }
      popover={{portal: false}}
    />
  )
}
