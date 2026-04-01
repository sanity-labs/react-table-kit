import type {ComponentType, ReactNode, SVGProps} from 'react'

/**
 * Base document shape for all table rows.
 * Requires `_id` and `_type`; all other fields are allowed via index signature.
 */
export interface DocumentBase {
  _id: string
  _type: string
  _updatedAt?: string
  [key: string]: unknown
}

/**
 * A single option for select-mode inline editing.
 */
export interface EditOption {
  value: string
  label: string
  /** Optional Sanity UI tone applied to the option badge. */
  tone?: string
}

/**
 * Configuration for inline editing on a column.
 * Presence of this object on a column definition implies the column is editable —
 * no separate `editable` boolean is needed.
 *
 * @typeParam T - The document type for the table row.
 */
export interface ColumnEditConfig<T extends DocumentBase = DocumentBase> {
  /** The editing UI to render. */
  mode: 'select' | 'text' | 'date' | 'custom'

  /** Available options when `mode` is `'select'`. */
  options?: EditOption[]

  /**
   * Custom edit component rendered when `mode` is `'custom'`.
   * Receives the current value, the full document, and callbacks.
   */
  component?: (props: {
    value: unknown
    document: T
    onChange: (newValue: string) => void
    onClose: () => void
  }) => ReactNode

  /**
   * Called when the user commits an edit.
   * Replaces the old `onEdit` callback.
   */
  onSave?: (document: T, newValue: string) => void

  /**
   * @internal Marker for SDK auto-save. When true, the SDK layer
   * resolves onSave at render time via useSDKEditHandler.
   */
  _autoSave?: boolean

  /**
   * @internal The document field path for auto-save resolution.
   */
  _field?: string

  /**
   * @internal Whether editable date cells should color their trigger button
   * based on proximity to today.
   */
  _toneByDateRange?: boolean
}

/**
 * Definition for a single table column.
 *
 * @typeParam T - The document type for the table row.
 */
export interface ColumnDef<T extends DocumentBase = DocumentBase> {
  /** Unique column identifier. */
  id: string

  /** Display header text. */
  header: string
  /** Icon component to render left of header text. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>

  /** Dot-path to the document field this column reads from. */
  field?: string

  /** Custom accessor function — use instead of `field` for computed values. */
  accessor?: (row: T) => unknown

  /** Custom cell renderer. */
  cell?: (value: unknown, row: T) => ReactNode

  /**
   * Optional wrapper applied around the rendered cell content.
   * Useful for SDK-level cell affordances that should compose with
   * both default renderers and inline-editing cells.
   */
  cellDecorator?: (props: {
    content: ReactNode
    row: T
    value: unknown
    cellPadding: {x: number; y: number}
  }) => ReactNode

  /** Whether this column can be sorted. */
  sortable?: boolean

  /**
   * Transform the raw value for sorting purposes.
   * When set, sorting compares the transformed values instead of raw field values.
   * Used by badge columns to sort by display label instead of raw slug.
   * @internal
   */
  sortValue?: (rawValue: unknown, row: T) => string | number

  /**
   * Backend field/expression to use when server-side sorting is enabled.
   * Lets display-oriented columns sort by a different GROQ path than their cell value.
   * @internal
   */
  _serverSortField?: string

  /**
   * Whether this column appears in the filter UI.
   * Defaults vary by column helper (e.g. `column.type()` defaults to `true`).
   */
  filterable?: boolean

  /**
   * Filter mode for this column.
   * - `'exact'` (default): exact string match via dropdown.
   * - `'range'`: min..max range comparison for dates and numbers.
   */
  filterMode?: 'exact' | 'range'

  /**
   * Custom filter predicate for cross-field computed conditions.
   * When set, `applyFilters` calls this function instead of the default
   * exact/range comparison. Receives the row and the current filter value.
   */
  filterFn?: (row: T, filterValue: string) => boolean

  /**
   * Whether rows can be grouped by this column's values.
   * Defaults vary by column helper (e.g. `column.type()` defaults to `true`).
   */
  groupable?: boolean

  /**
   * Whether this column's values are included in full-text search.
   * Replaces the old table-level `searchableFields` prop.
   */
  searchable?: boolean

  /** Flex grow — column takes remaining space (like CSS flex: 1). */
  flex?: number
  /** Fixed column width in pixels. */
  width?: number

  /**
   * Inline edit configuration.
   * If present, the column is editable — no separate boolean flag needed.
   */
  edit?: ColumnEditConfig<T>

  /** @internal Marks the checkbox selection column. */
  _isSelectColumn?: boolean
}

/**
 * Sort state for the table.
 */
export interface SortConfig {
  /** The field path to sort by. */
  field: string
  /** Sort direction. */
  direction: 'asc' | 'desc'
}

export interface ServerSortConfig {
  /** Currently active sort from the backing data source. */
  sort: SortConfig | null
  /** Invoked when the user changes sort so the backing data source can re-query. */
  onSortChange: (sort: SortConfig | null) => void
  /** Optional allow-list of sortable column IDs while in server-sort mode. */
  sortableColumnIds?: string[]
}

/**
 * Current selection state, passed to bulk action renderers.
 *
 * @typeParam T - The document type for the table row.
 */
export interface SelectionConfig<T extends DocumentBase = DocumentBase> {
  /** Number of currently selected rows. */
  selectedCount: number
  /** The selected row documents. */
  selectedRows: T[]
  /** Programmatically clear the selection. */
  clearSelection: () => void
}

/**
 * Props for the top-level `<DocumentTable>` component.
 *
 * Filterable, groupable, and searchable columns are now derived from
 * individual column definitions — no table-level arrays needed.
 *
 * @typeParam T - The document type for the table row.
 */
export interface DocumentTableProps<T extends DocumentBase = DocumentBase> {
  /** Row data. Pass `undefined` while loading. */
  data: T[] | undefined

  /** Column definitions. */
  columns: ColumnDef<T>[]

  /** Initial sort state. */
  defaultSort?: SortConfig
  /** Controlled server-side sorting contract. */
  serverSort?: ServerSortConfig

  /** Called when a row is clicked (not on the select checkbox). */
  onRowClick?: (row: T) => void

  /** Show a loading skeleton. */
  loading?: boolean

  /** Number of placeholder rows to render during transition loading states. */
  transitionLoadingRowCount?: number

  /** Message displayed when `data` is an empty array. */
  emptyMessage?: string

  /** Whether alternating row backgrounds should be shown. Defaults to `false`. */
  stripedRows?: boolean

  /** Number of rows per page. */
  pageSize?: number

  /**
   * Render function for bulk-action buttons.
   * Receives the current selection state.
   */
  bulkActions?: (selection: SelectionConfig<T>) => ReactNode

  /** Called whenever the set of selected rows changes. */
  onSelectionChange?: (selectedRows: T[]) => void

  /** Called when the "Add Document" button is clicked. */
  onCreateDocument?: () => void

  /** Custom text for the create button. Defaults to "Add Document". */
  createButtonText?: string

  /** Whether a document creation is currently in flight. */
  isCreating?: boolean

  /** Enable drag-and-drop column reordering. */
  reorderable?: boolean

  /** Controlled column order — array of column IDs. */
  columnOrder?: string[]

  /** Called when column order changes via drag-and-drop. */
  onColumnOrderChange?: (newOrder: string[]) => void

  /** Named computed filters that can be activated externally (e.g., by stats cards). */
  computedFilters?: Record<
    string,
    {
      label: string
      predicate: (row: T) => boolean
    }
  >

  /** Hide the legacy built-in filter bar. */
  hideFilterBar?: boolean
}
