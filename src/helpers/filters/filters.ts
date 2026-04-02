import type {PreviewConfig} from '@sanity/types'
import type {ReactNode} from 'react'

import type {DocumentBase} from '../../types/tableTypes'

/**
 * Supported operators for each built-in filter kind.
 *
 * These unions intentionally stay narrow so the common builders remain easy for
 * both humans and LLMs to use correctly.
 */
export type FilterOperatorByKind = {
  string: 'is' | 'in'
  date: 'is' | 'before' | 'after' | 'range'
  number: 'is' | 'gt' | 'gte' | 'lt' | 'lte' | 'range'
  boolean: 'is'
  reference: 'is' | 'in'
  search: 'contains' | 'match'
  custom: never
}

/**
 * Canonical committed value shape for each filter kind.
 *
 * These types model filter state after it has been deserialized from URL/query
 * state and before it is compiled into query predicates.
 */
export type FilterValueByKind = {
  string: string | string[]
  date: string | {from?: string; to?: string}
  number: number | {from?: number; to?: number}
  boolean: boolean
  reference: string | string[]
  search: string
  custom: unknown
}

/**
 * Top-level discriminant for every filter definition.
 */
export type FilterKind =
  | 'string'
  | 'date'
  | 'number'
  | 'boolean'
  | 'reference'
  | 'search'
  | 'custom'

/**
 * Value-shape classification for custom filters.
 *
 * Used by higher-level UI/rendering layers to decide how a custom filter should
 * behave even when its query semantics are app-specific.
 */
export type CustomFilterValueType = 'scalar' | 'array' | 'range' | 'custom'

/**
 * Supported UI control families for custom filters.
 *
 * Built-in filters infer this automatically; custom filters declare it
 * explicitly so SDK renderers can choose an appropriate interaction pattern.
 */
export type CustomFilterControl =
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'dateRange'
  | 'searchInput'
  | 'toggle'
  | 'custom'

type BivariantCallback<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn
}['bivarianceHack']

/**
 * Label/value pair used by option-backed filters.
 *
 * @typeParam TValue - The raw value written into filter state when selected.
 */
export interface FilterOption<TValue extends string | number = string> {
  /** Human-readable option label shown in menus, popovers, or lists. */
  label: string
  /** Raw committed value stored in filter state and compiled into queries. */
  value: TValue
}

/**
 * Shared metadata for every filter definition.
 *
 * @typeParam TKind - Filter discriminant.
 * @typeParam TOperator - Allowed operator union for the filter kind.
 * @typeParam TValue - Canonical committed value shape for the filter kind.
 */
export interface BaseFilterDef<TKind extends FilterKind, TOperator, TValue> {
  /** Discriminant that identifies the filter kind at runtime. */
  kind: TKind
  /**
   * Optional stable identity used for URL/query-state keys.
   *
   * Field-backed built-ins can usually infer this automatically; custom filters
   * and presets should prefer explicit keys.
   */
  key?: string
  /** Human-readable label displayed above the control and in chips. */
  label: string
  /**
   * Optional operator override.
   *
   * When omitted, each builder applies its documented default operator.
   */
  operator?: TOperator
  /** Optional default committed value applied when the filter is first initialized. */
  defaultValue?: TValue
  /** Hide the filter control from the toolbar while still allowing state/preset use. */
  hidden?: boolean
  /**
   * Optional opt-in mapping from committed filter state to a create-document initial value.
   * When omitted, the filter does not contribute to inline document creation defaults.
   */
  toInitialValue?: BivariantCallback<[TValue], unknown>
}

/**
 * Shared base contract for field-backed built-in filters.
 *
 * The `field` should reflect the source query path the filter acts on.
 */
export interface FieldFilterDef<
  TKind extends Exclude<FilterKind, 'search' | 'custom'>,
  TOperator,
  TValue,
> extends BaseFilterDef<TKind, TOperator, TValue> {
  /**
   * Source field/path this filter acts on.
   *
   * This should align conceptually with `column.*({field})` and may be a
   * GROQ-aware path when the filter kind supports it.
   */
  field: string
}

/**
 * Structured categorical string filter.
 *
 * Use this for exact-match style data such as status, type, market, category,
 * locale, or stage. Use `filter.search()` instead for free-text query.
 */
export interface StringFilterDef extends FieldFilterDef<
  'string',
  FilterOperatorByKind['string'],
  FilterValueByKind['string']
> {
  /**
   * Optional explicit options for exact-match UI controls.
   *
   * When omitted, higher-level UIs may source options dynamically or leave the
   * filter unrendered until options are provided.
   */
  options?: Array<FilterOption<string>>
}

/**
 * Date/date-time filter.
 */
export interface DateFilterDef extends FieldFilterDef<
  'date',
  FilterOperatorByKind['date'],
  FilterValueByKind['date']
> {
  /** Use date-only semantics by default even for datetime-backed fields. */
  granularity?: 'date' | 'datetime'
  /** Reserved for future richer datetime UIs. */
  includeTime?: boolean
}

/**
 * Numeric filter definition.
 */
export interface NumberFilterDef extends FieldFilterDef<
  'number',
  FilterOperatorByKind['number'],
  FilterValueByKind['number']
> {
  /** Optional explicit options for discrete numeric filters. */
  options?: Array<FilterOption<number>>
}

/**
 * Exact boolean filter definition.
 */
export interface BooleanFilterDef extends FieldFilterDef<
  'boolean',
  FilterOperatorByKind['boolean'],
  FilterValueByKind['boolean']
> {}

/**
 * Reference filter backed by selectable documents.
 */
export interface ReferenceFilterDef extends FieldFilterDef<
  'reference',
  FilterOperatorByKind['reference'],
  FilterValueByKind['reference']
> {
  /** Document type used when sourcing selectable reference options. */
  referenceType: string
  /**
   * Whether the reference field stores one reference or an array of references.
   *
   * This affects how the query compiler generates GROQ predicates.
   */
  relation?: 'single' | 'array'
  /**
   * Optional explicit preview contract for rendering selected/available options.
   *
   * When omitted, SDK consumers may infer preview metadata from a matching
   * `column.reference(...)` definition if available.
   */
  preview?: Required<Pick<PreviewConfig, 'select' | 'prepare'>>
  /** Optional option-source configuration for document-backed reference selection. */
  options?: {
    /** Source strategy for loading reference options. Defaults to `'documents'`. */
    source?: 'documents'
    /** Whether the option source should expose a search box. */
    searchable?: boolean
    /** Maximum number of options requested per fetch. */
    pageSize?: number
    /** Optional additional GROQ filter applied when sourcing options. */
    filter?: string
    /** Optional GROQ params for the option-source query. */
    params?: Record<string, unknown>
    /** Optional sort order for document-backed options. */
    sort?: {field: string; direction: 'asc' | 'desc'}
  }
}

/**
 * Explicit GROQ-aware search field descriptor.
 *
 * Use object form when a search target needs extra metadata such as a UI label.
 */
export interface SearchFieldPath {
  /** GROQ-aware source query path searched by the filter. */
  path: string
  /** Optional human-readable description used by docs or future UIs. */
  label?: string
}

/**
 * Free-text search filter spanning one or more query fields.
 */
export interface SearchFilterDef extends BaseFilterDef<
  'search',
  FilterOperatorByKind['search'],
  FilterValueByKind['search']
> {
  /**
   * Source query fields searched by this filter.
   *
   * Strings are shorthand for direct fields; object form allows explicit
   * GROQ-aware paths such as `section->title`.
   */
  fields: Array<string | SearchFieldPath>
  /**
   * Search strategy hint for the query compiler.
   *
   * `contains` is the default, user-friendly mode. `match` is a more
   * GROQ-native option when token matching is preferred.
   */
  mode?: 'contains' | 'match'
  /** Optional placeholder shown in the search input control. */
  placeholder?: string
  /** Debounce duration in milliseconds before committed state updates. */
  debounceMs?: number
}

/**
 * Context passed to a custom filter query compiler.
 */
export interface CustomFilterQueryContext {
  /** Current table document type or types. */
  documentType: string | string[]
  /** Additional static GROQ params already in scope for the table. */
  params?: Record<string, unknown>
}

/**
 * Standard output shape returned by custom filter query compilers.
 */
export interface CustomFilterQueryResult {
  /** GROQ predicate fragment contributed by the custom filter. */
  groq: string
  /** GROQ params referenced by the predicate fragment. */
  params?: Record<string, unknown>
}

/**
 * Props passed to an optional custom filter UI component.
 */
export interface CustomFilterComponentProps<TValue> {
  /** Currently committed value for the custom filter. */
  value: TValue | null
  /** Update the committed value for the custom filter. */
  onChange: BivariantCallback<[TValue | null], void>
  /** Optional explicit apply callback for multi-step custom controls. */
  onApply?: () => void
  /** Clear the committed value for the custom filter. */
  onClear: () => void
  /** Whether the control should render as disabled. */
  disabled?: boolean
  /** Whether the control should render a loading state. */
  loading?: boolean
}

/**
 * Advanced escape hatch for domain-specific filters.
 *
 * Mirrors the spirit of `column.custom()`: stay inside the filter system while
 * bringing your own UI and/or query behavior where built-ins are not a good fit.
 */
export interface CustomFilterDef<TValue = unknown> extends Omit<
  BaseFilterDef<'custom', never, TValue>,
  'key'
> {
  /** Explicit stable identity required for custom filters. */
  key: string
  /** Optional source field/path when the custom filter still maps to a known field. */
  field?: string
  /** Declares the general UI control family used to render the filter. */
  control: CustomFilterControl
  /** Declares the committed value-shape family used by the filter. */
  valueType: CustomFilterValueType
  /** Optional custom component that renders the filter’s editing surface. */
  component?: BivariantCallback<[CustomFilterComponentProps<TValue>], ReactNode>
  /** Serialize committed value into URL/query-state form. */
  serialize: BivariantCallback<[TValue | null], string | string[] | null>
  /** Deserialize URL/query-state back into the committed custom value. */
  deserialize: BivariantCallback<[string | string[] | null], TValue | null>
  /** Format the active filter chip text for the committed value. */
  formatChip: BivariantCallback<[TValue], string>
  /** Optional client-side fallback predicate for non-SDK consumers. */
  clientPredicate?: BivariantCallback<[DocumentBase, TValue], boolean>
  /** Optional SDK/server-side query contract for the custom filter. */
  query?: {
    /** Compile committed value into a GROQ predicate fragment. */
    toGroq: BivariantCallback<[TValue, CustomFilterQueryContext], CustomFilterQueryResult>
    /** Optional count-query variant when stats/count semantics differ. */
    toCountGroq?: BivariantCallback<[TValue, CustomFilterQueryContext], CustomFilterQueryResult>
  }
}

/**
 * Union of all currently supported filter definitions.
 */
export type FilterDef =
  | StringFilterDef
  | DateFilterDef
  | NumberFilterDef
  | BooleanFilterDef
  | ReferenceFilterDef
  | SearchFilterDef
  | CustomFilterDef<unknown>

/**
 * Shared config surface written by consumers when defining a filter.
 *
 * This is intentionally separate from the normalized `*FilterDef` runtime
 * shapes so IDE hover can explain what authors are expected to write.
 */
export interface BaseFilterOptions<TValue, TOperator> {
  /**
   * Optional stable identity used for URL/query-state keys.
   *
   * Field-backed built-ins can usually infer this automatically; custom filters
   * and presets should prefer explicit keys.
   */
  key?: string
  /** Human-readable label displayed above the control and in chips. */
  label: string
  /**
   * Optional operator override.
   *
   * When omitted, each builder applies its documented default operator.
   */
  operator?: TOperator
  /** Optional default committed value applied when the filter is first initialized. */
  defaultValue?: TValue
  /** Hide the filter control from the toolbar while still allowing state/preset use. */
  hidden?: boolean
  /**
   * Optional opt-in mapping from committed filter state to a create-document initial value.
   * When omitted, the filter does not contribute to inline document creation defaults.
   */
  toInitialValue?: BivariantCallback<[TValue], unknown>
}

/**
 * Shared config surface for field-backed built-in filters.
 */
export interface FieldFilterOptions<TValue, TOperator> extends BaseFilterOptions<
  TValue,
  TOperator
> {
  /**
   * Source field/path this filter acts on.
   *
   * This should align conceptually with `column.*({field})` and may be a
   * GROQ-aware path when the filter kind supports it.
   */
  field: string
}

/** Options accepted by `filter.string(...)`. */
export interface StringFilterOptions extends FieldFilterOptions<
  FilterValueByKind['string'],
  FilterOperatorByKind['string']
> {
  /**
   * Optional explicit options for exact-match UI controls.
   *
   * When omitted, higher-level UIs may source options dynamically or leave the
   * filter unrendered until options are provided.
   */
  options?: Array<FilterOption<string>>
}

/** Options accepted by `filter.date(...)`. */
export interface DateFilterOptions extends FieldFilterOptions<
  FilterValueByKind['date'],
  FilterOperatorByKind['date']
> {
  /** Use date-only semantics by default even for datetime-backed fields. */
  granularity?: 'date' | 'datetime'
  /** Reserved for future richer datetime UIs. */
  includeTime?: boolean
}

/** Options accepted by `filter.number(...)`. */
export interface NumberFilterOptions extends FieldFilterOptions<
  FilterValueByKind['number'],
  FilterOperatorByKind['number']
> {
  /** Optional explicit options for discrete numeric filters. */
  options?: Array<FilterOption<number>>
}

/** Options accepted by `filter.boolean(...)`. */
export interface BooleanFilterOptions extends FieldFilterOptions<
  FilterValueByKind['boolean'],
  FilterOperatorByKind['boolean']
> {}

/**
 * Option-source configuration for document-backed reference selection.
 */
export interface ReferenceFilterSourceOptions {
  /** Source strategy for loading reference options. Defaults to `'documents'`. */
  source?: 'documents'
  /** Whether the option source should expose a search box. */
  searchable?: boolean
  /** Maximum number of options requested per fetch. */
  pageSize?: number
  /** Optional additional GROQ filter applied when sourcing options. */
  filter?: string
  /** Optional GROQ params for the option-source query. */
  params?: Record<string, unknown>
  /** Optional sort order for document-backed options. */
  sort?: {field: string; direction: 'asc' | 'desc'}
}

/** Options accepted by `filter.reference(...)`. */
export interface ReferenceFilterOptions extends FieldFilterOptions<
  FilterValueByKind['reference'],
  FilterOperatorByKind['reference']
> {
  /** Document type used when sourcing selectable reference options. */
  referenceType: string
  /**
   * Whether the reference field stores one reference or an array of references.
   *
   * This affects how the query compiler generates GROQ predicates.
   */
  relation?: 'single' | 'array'
  /**
   * Optional explicit preview contract for rendering selected/available options.
   *
   * When omitted, SDK consumers may infer preview metadata from a matching
   * `column.reference(...)` definition if available.
   */
  preview?: Required<Pick<PreviewConfig, 'select' | 'prepare'>>
  /** Optional option-source configuration for document-backed reference selection. */
  options?: ReferenceFilterSourceOptions
}

/** Options accepted by `filter.search(...)`. */
export interface SearchFilterOptions extends BaseFilterOptions<
  FilterValueByKind['search'],
  FilterOperatorByKind['search']
> {
  /**
   * Source query fields searched by this filter.
   *
   * Strings are shorthand for direct fields; object form allows explicit
   * GROQ-aware paths such as `section->title`.
   */
  fields: Array<string | SearchFieldPath>
  /**
   * Search strategy hint for the query compiler.
   *
   * `contains` is the default, user-friendly mode. `match` is a more
   * GROQ-native option when token matching is preferred.
   */
  mode?: 'contains' | 'match'
  /** Optional placeholder shown in the search input control. */
  placeholder?: string
  /** Debounce duration in milliseconds before committed state updates. */
  debounceMs?: number
}

/** Options accepted by `filter.custom(...)`. */
export interface CustomFilterOptions<TValue> extends Omit<BaseFilterOptions<TValue, never>, 'key'> {
  /** Explicit stable identity required for custom filters. */
  key: string
  /** Optional source field/path when the custom filter still maps to a known field. */
  field?: string
  /** Declares the general UI control family used to render the filter. */
  control: CustomFilterControl
  /** Declares the committed value-shape family used by the filter. */
  valueType: CustomFilterValueType
  /** Optional custom component that renders the filter’s editing surface. */
  component?: BivariantCallback<[CustomFilterComponentProps<TValue>], ReactNode>
  /** Serialize committed value into URL/query-state form. */
  serialize: BivariantCallback<[TValue | null], string | string[] | null>
  /** Deserialize URL/query-state back into the committed custom value. */
  deserialize: BivariantCallback<[string | string[] | null], TValue | null>
  /** Format the active filter chip text for the committed value. */
  formatChip: BivariantCallback<[TValue], string>
  /** Optional client-side fallback predicate for non-SDK consumers. */
  clientPredicate?: BivariantCallback<[DocumentBase, TValue], boolean>
  /** Optional SDK/server-side query contract for the custom filter. */
  query?: {
    /** Compile committed value into a GROQ predicate fragment. */
    toGroq: BivariantCallback<[TValue, CustomFilterQueryContext], CustomFilterQueryResult>
    /** Optional count-query variant when stats/count semantics differ. */
    toCountGroq?: BivariantCallback<[TValue, CustomFilterQueryContext], CustomFilterQueryResult>
  }
}

/**
 * Named preset that applies shared filter URL state.
 *
 * Presets are a thin layer over normal filters: they do not introduce a second
 * source of truth, they only write normal filter values into shared state.
 */
export interface FilterPreset {
  /** Stable preset identity used by higher-level UIs such as stats cards. */
  key: string
  /** Human-readable preset label. */
  label: string
  /** Static preset values written into filter state when applied. */
  values?: Record<string, unknown>
  /** Optional dynamic preset factory used for date-relative or runtime-aware presets. */
  getValues?: () => Record<string, unknown>
}

function inferKeyFromField(field: string): string {
  return field.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}

function ensureFilterKey<T extends FilterDef>(filterDef: T): T {
  if (filterDef.key) return filterDef
  if ('field' in filterDef && typeof filterDef.field === 'string') {
    return {...filterDef, key: inferKeyFromField(filterDef.field)} as T
  }
  if (filterDef.kind === 'search') {
    return {...filterDef, key: 'search'} as T
  }
  throw new Error(`Filter "${filterDef.label}" requires an explicit key`)
}

/**
 * Create an exact/categorical string filter.
 *
 * Prefer this for exact-match categorical data such as status, type, market,
 * locale, or stage. Use `filter.search()` instead for free-text query.
 *
 * Defaults to `operator: 'is'`.
 *
 * @param config - String filter options including the source `field`,
 * user-facing `label`, optional operator override, and optional explicit
 * `options` for select-style UIs.
 * @returns A normalized string filter definition with default operator and key
 * inference applied.
 *
 * @example
 * ```ts
 * filter.string({field: 'status', label: 'Status'})
 * filter.string({
 *   field: 'status',
 *   label: 'Status',
 *   operator: 'in',
 *   options: [
 *     {label: 'Draft', value: 'draft'},
 *     {label: 'Published', value: 'published'},
 *   ],
 * })
 * ```
 */
function string(config: StringFilterOptions): StringFilterDef {
  return ensureFilterKey({
    kind: 'string',
    operator: 'is',
    ...config,
  })
}

/**
 * Create a date filter.
 *
 * Prefer this for calendar/date filtering. Range is the default because most
 * dashboard/table use cases are bounded date windows rather than exact
 * single-date matches.
 *
 * Defaults to `operator: 'range'` and `granularity: 'date'`.
 *
 * @param config - Date filter options including the source `field`,
 * user-facing `label`, optional operator override, and optional granularity
 * controls for `date` vs `datetime` semantics.
 * @returns A normalized date filter definition with default operator,
 * granularity, and key inference applied.
 *
 * @example
 * ```ts
 * filter.date({field: 'plannedPublishDate', label: 'Planned Publish'})
 * filter.date({
 *   field: 'publishedAt',
 *   label: 'Published At',
 *   granularity: 'datetime',
 *   operator: 'after',
 * })
 * ```
 */
function date(config: DateFilterOptions): DateFilterDef {
  return ensureFilterKey({
    kind: 'date',
    operator: 'range',
    granularity: 'date',
    includeTime: false,
    ...config,
  })
}

/**
 * Create a numeric filter.
 *
 * Defaults to `operator: 'range'`.
 *
 * @param config - Number filter options including the source `field`,
 * user-facing `label`, optional operator override, and optional discrete
 * `options` for select-style UIs.
 * @returns A normalized number filter definition with default operator and key
 * inference applied.
 *
 * @example
 * ```ts
 * filter.number({field: 'budget', label: 'Budget'})
 * ```
 */
function number(config: NumberFilterOptions): NumberFilterDef {
  return ensureFilterKey({
    kind: 'number',
    operator: 'range',
    ...config,
  })
}

/**
 * Create a boolean filter.
 *
 * This is intentionally minimal: it models exact `true` / `false` filtering
 * only. More advanced nullability or existence logic belongs in
 * `filter.custom()`.
 *
 * Defaults to `operator: 'is'`.
 *
 * @param config - Boolean filter options including the source `field`,
 * user-facing `label`, and any shared base filter metadata such as `hidden` or
 * `toInitialValue`.
 * @returns A normalized boolean filter definition with default operator and key
 * inference applied.
 *
 * @example
 * ```ts
 * filter.boolean({field: 'featured', label: 'Featured'})
 * ```
 */
function boolean(config: BooleanFilterOptions): BooleanFilterDef {
  return ensureFilterKey({
    kind: 'boolean',
    operator: 'is',
    ...config,
  })
}

/**
 * Create a reference filter.
 *
 * Use this for document references where the selected value should be one or
 * more referenced document IDs, while the UI resolves human-friendly labels.
 *
 * Defaults to `operator: 'in'`, `relation: 'single'`, and
 * document-backed searchable options.
 *
 * @param config - Reference filter options including the source `field`,
 * `referenceType`, user-facing `label`, and optional preview or option-source
 * settings.
 * @returns A normalized reference filter definition with default operator,
 * relation, searchable document-backed options, and key inference applied.
 *
 * @example
 * ```ts
 * filter.reference({
 *   field: 'section',
 *   label: 'Section',
 *   referenceType: 'section',
 * })
 * ```
 */
function reference(config: ReferenceFilterOptions): ReferenceFilterDef {
  return ensureFilterKey({
    kind: 'reference',
    operator: 'in',
    relation: 'single',
    options: {source: 'documents', searchable: true, ...config.options},
    ...config,
  })
}

/**
 * Create a GROQ-aware search filter.
 *
 * Search fields are source query paths, not just projected row aliases. Use
 * object form when you need an explicit GROQ-aware path such as
 * `section->title`.
 *
 * Defaults to `mode: 'contains'`, `placeholder: 'Search...'`, and
 * `debounceMs: 300`.
 *
 * @param config - Search filter options including the user-facing `label`,
 * one or more source query `fields`, and optional UX/compiler hints such as
 * `mode`, `placeholder`, and `debounceMs`.
 * @returns A normalized search filter definition with default mode,
 * placeholder, debounce, and key inference applied.
 *
 * @example
 * ```ts
 * filter.search({
 *   label: 'Search',
 *   fields: ['title', {path: 'section->title', label: 'Section'}],
 * })
 * ```
 */
function search(config: SearchFilterOptions): SearchFilterDef {
  return ensureFilterKey({
    kind: 'search',
    mode: 'contains',
    placeholder: 'Search...',
    debounceMs: 300,
    ...config,
  })
}

/**
 * Create a custom filter definition.
 *
 * This is the primary advanced escape hatch for domain-specific filters.
 * Prefer built-ins first; reach for `filter.custom()` when the desired
 * semantics are app-specific or cannot be expressed by the normal builders.
 *
 * @param config - Custom filter options including an explicit `key`, chosen
 * `control`/`valueType`, URL serialization functions, chip formatting, and
 * optional client/server query behavior.
 * @returns A normalized custom filter definition. Unlike field-backed
 * built-ins, custom filters require an explicit key.
 *
 * @example
 * ```ts
 * filter.custom<string[]>({
 *   key: 'reporter',
 *   label: 'Reporter',
 *   control: 'multiSelect',
 *   valueType: 'array',
 *   serialize: (value) => value,
 *   deserialize: (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []),
 *   formatChip: (value) => `${value.length} selected`,
 *   query: {
 *     toGroq: (value) => ({
 *       groq: 'count(assignments[assignmentType == "reporter" && userId in $reporterIds]) > 0',
 *       params: {reporterIds: value},
 *     }),
 *   },
 * })
 * ```
 */
function custom<TValue>(config: CustomFilterOptions<TValue>): CustomFilterDef<TValue> {
  return ensureFilterKey({
    kind: 'custom',
    ...config,
  })
}

/**
 * Public filter builder namespace.
 *
 * Conceptual split:
 * - `filter.string()` for categorical exact-match filtering
 * - `filter.search()` for free-text query
 * - `filter.custom()` as the advanced escape hatch
 * - presets apply shared filter state rather than bypassing it
 */
export interface FilterBuilderNamespace {
  /**
   * Create an exact/categorical string filter.
   *
   * Use this for exact-match categorical data such as status, type, market,
   * locale, category, or stage.
   *
   * @param config - String filter options including the source `field`,
   * user-facing `label`, optional operator override, and optional explicit
   * `options` for select-style UIs.
   * @returns A normalized string filter definition.
   */
  string: (config: StringFilterOptions) => StringFilterDef
  /**
   * Create a date filter.
   *
   * Use this for calendar/date filtering. Range is the default because most
   * dashboard/table use cases are bounded date windows rather than exact
   * single-date matches.
   *
   * @param config - Date filter options including the source `field`,
   * user-facing `label`, optional operator override, and optional granularity
   * controls.
   * @returns A normalized date filter definition.
   */
  date: (config: DateFilterOptions) => DateFilterDef
  /**
   * Create a numeric filter.
   *
   * Use this for discrete numeric values or numeric ranges.
   *
   * @param config - Number filter options including the source `field`,
   * user-facing `label`, optional operator override, and optional discrete
   * options.
   * @returns A normalized number filter definition.
   */
  number: (config: NumberFilterOptions) => NumberFilterDef
  /**
   * Create an exact boolean filter.
   *
   * This intentionally models only `true` / `false`; advanced nullability or
   * existence logic should use `filter.custom()`.
   *
   * @param config - Boolean filter options including the source `field`,
   * user-facing `label`, and shared base filter metadata.
   * @returns A normalized boolean filter definition.
   */
  boolean: (config: BooleanFilterOptions) => BooleanFilterDef
  /**
   * Create a reference filter.
   *
   * Use this for document references where the selected value should be one or
   * more referenced document IDs while the UI resolves human-friendly labels.
   *
   * @param config - Reference filter options including the source `field`,
   * `referenceType`, and optional preview/option-source settings.
   * @returns A normalized reference filter definition.
   *
   * @example
   * ```ts
   * filter.reference({
   *   field: 'section',
   *   label: 'Section',
   *   referenceType: 'section',
   * })
   * ```
   */
  reference: (config: ReferenceFilterOptions) => ReferenceFilterDef
  /**
   * Create a GROQ-aware free-text search filter.
   *
   * Search fields are source query paths, not just projected row aliases. Use
   * object form when you need an explicit GROQ-aware path such as
   * `section->title`.
   *
   * @param config - Search filter options including the user-facing `label`,
   * one or more source query fields, and optional UX/compiler hints.
   * @returns A normalized search filter definition.
   */
  search: (config: SearchFilterOptions) => SearchFilterDef
  /**
   * Create a custom filter definition.
   *
   * This is the primary advanced escape hatch for domain-specific filters that
   * cannot be expressed cleanly with the built-in builders.
   *
   * @param config - Custom filter options including an explicit `key`, chosen
   * `control`/`valueType`, serialization, chip formatting, and optional
   * client/server query behavior.
   * @returns A normalized custom filter definition.
   */
  custom: <TValue>(config: CustomFilterOptions<TValue>) => CustomFilterDef<TValue>
}

export const filter: FilterBuilderNamespace = {
  string,
  date,
  number,
  boolean,
  reference,
  search,
  custom,
}

/**
 * Resolve the stable key used for URL/query-state storage for a filter.
 *
 * @param filterDef - Filter definition whose explicit or inferred key should be resolved.
 * @returns The stable key used by URL/query-state and preset logic.
 */
export function getFilterKey(filterDef: FilterDef): string {
  return ensureFilterKey(filterDef).key!
}

/**
 * Infer the broad UI control family for a filter definition.
 *
 * @param filterDef - Filter definition to map to a control family.
 * @returns The control family higher-level UI layers should render.
 */
export function getFilterControl(filterDef: FilterDef): CustomFilterControl {
  switch (filterDef.kind) {
    case 'string':
      return filterDef.operator === 'in' ? 'multiSelect' : 'select'
    case 'date':
      return filterDef.operator === 'range' ? 'dateRange' : 'date'
    case 'number':
      return filterDef.operator === 'range' ? 'dateRange' : 'select'
    case 'boolean':
      return 'select'
    case 'reference':
      return filterDef.operator === 'in' ? 'multiSelect' : 'select'
    case 'search':
      return 'searchInput'
    case 'custom':
      return filterDef.control
  }
}

/**
 * Serialize a committed filter value into a stable URL-safe representation.
 *
 * @param filterDef - Filter definition that owns the value semantics.
 * @param value - Canonical committed filter value to serialize.
 * @returns A string suitable for URL/query-state storage, or `null` when the
 * value should be treated as inactive.
 */
export function serializeFilterValue(filterDef: FilterDef, value: unknown): string | null {
  if (value == null) return null

  if (filterDef.kind === 'custom') {
    const serialized = filterDef.serialize(value)
    if (serialized == null) return null
    return Array.isArray(serialized) ? serialized.map(encodeURIComponent).join(',') : serialized
  }

  switch (filterDef.kind) {
    case 'string':
    case 'reference':
      return Array.isArray(value)
        ? value.map((v) => encodeURIComponent(String(v))).join(',')
        : String(value)
    case 'date':
    case 'number':
      if (typeof value === 'object' && value !== null && ('from' in value || 'to' in value)) {
        const range = value as {from?: string | number; to?: string | number}
        return `${range.from ?? ''}..${range.to ?? ''}`
      }
      return String(value)
    case 'boolean':
      return value === true ? 'true' : value === false ? 'false' : null
    case 'search':
      return String(value)
  }
}

/**
 * Deserialize URL/query-state back into the canonical committed filter value.
 *
 * @param filterDef - Filter definition that owns the value semantics.
 * @param raw - Raw URL/query-state string for the filter, or `null` when unset.
 * @returns The canonical typed filter value, or `null` when no committed value
 * is present.
 */
export function deserializeFilterValue(filterDef: FilterDef, raw: string | null): unknown {
  if (raw == null || raw === '') return null

  if (filterDef.kind === 'custom') {
    return filterDef.deserialize(raw)
  }

  switch (filterDef.kind) {
    case 'string':
    case 'reference':
      return filterDef.operator === 'in'
        ? raw
            .split(',')
            .filter(Boolean)
            .map((part) => decodeURIComponent(part))
        : decodeURIComponent(raw)
    case 'date': {
      if (filterDef.operator === 'range') {
        const [from, to] = raw.split('..')
        return {from: from || undefined, to: to || undefined}
      }
      return raw
    }
    case 'number': {
      if (filterDef.operator === 'range') {
        const [from, to] = raw.split('..')
        return {
          from: from ? Number(from) : undefined,
          to: to ? Number(to) : undefined,
        }
      }
      return Number(raw)
    }
    case 'boolean':
      return raw === 'true'
    case 'search':
      return raw
  }
}

/**
 * Determine whether a committed filter value should count as active.
 *
 * @param value - Canonical committed filter value to inspect.
 * @returns `true` when the value should contribute to chips/query state;
 * otherwise `false`.
 */
export function isFilterActiveValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.length > 0
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.values(record).some((entry) => entry != null && entry !== '')
  }
  return true
}

/**
 * Format the human-readable active chip text for a committed filter value.
 *
 * @param filterDef - Filter definition that owns the display semantics.
 * @param value - Canonical committed filter value to summarize.
 * @returns Human-readable chip text including the filter label.
 */
export function formatFilterChip(filterDef: FilterDef, value: unknown): string {
  if (value == null) return filterDef.label

  if (filterDef.kind === 'custom') {
    return `${filterDef.label}: ${filterDef.formatChip(value)}`
  }

  if (filterDef.kind === 'date' && typeof value === 'object' && value !== null) {
    const range = value as {from?: string; to?: string}
    if (range.from && range.to) return `${filterDef.label}: ${range.from} → ${range.to}`
    if (range.from) return `${filterDef.label}: ≥ ${range.from}`
    if (range.to) return `${filterDef.label}: ≤ ${range.to}`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return filterDef.label
    if (value.length === 1) return `${filterDef.label}: ${String(value[0])}`
    return `${filterDef.label}: ${String(value[0])} +${value.length - 1}`
  }

  return `${filterDef.label}: ${String(value)}`
}

/**
 * Map committed filter state into explicit create-document initial values.
 *
 * Only filters that declare both a backing `field` and a `toInitialValue` mapper
 * contribute to the result.
 *
 * @param filterDefs - Filter definitions that may opt into create-document
 * mapping.
 * @param values - Current committed filter values keyed by filter key.
 * @returns A record of document field values suitable for merging into inline
 * document creation defaults.
 */
export function mapFilterValuesToInitialValues(
  filterDefs: FilterDef[] | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (!filterDefs || filterDefs.length === 0) return {}

  const entries: Array<[string, unknown]> = []

  for (const filterDef of filterDefs) {
    if (!('field' in filterDef) || typeof filterDef.field !== 'string') continue
    if (typeof filterDef.toInitialValue !== 'function') continue

    const value = values[getFilterKey(filterDef)]
    if (!isFilterActiveValue(value)) continue

    entries.push([filterDef.field, filterDef.toInitialValue(value as never)])
  }

  return Object.fromEntries(entries)
}
