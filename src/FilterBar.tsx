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

import type {DocumentBase} from './types'
import type {UseTableFiltersResult} from './useTableFilters'

interface FilterBarProps<T extends DocumentBase> {
  filters: UseTableFiltersResult<T>
  data: T[]
  filterableColumns: string[]
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
                const options = getFilterOptions(columnId, data)
                const currentValue = activeFilters[columnId]
                const label =
                  columnId.replace(/^_/, '').charAt(0).toUpperCase() +
                  columnId.replace(/^_/, '').slice(1)

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
            const label =
              columnId.replace(/^_/, '').charAt(0).toUpperCase() +
              columnId.replace(/^_/, '').slice(1)
            return (
              <Card
                key={columnId}
                data-testid={`filter-chip-${columnId}`}
                padding={2}
                radius={2}
                tone="primary"
              >
                <Flex align="center" gap={2}>
                  <Text size={1}>
                    {label}: {value}
                  </Text>
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
