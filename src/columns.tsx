import {Badge, Button, Text} from '@sanity/ui'
import {format, isPast} from 'date-fns'
import React, {type ReactNode} from 'react'

import {ToggleSwitch} from './ToggleSwitch'
import type {ColumnDef, ColumnEditConfig, DocumentBase, EditOption} from './types'

/** Capitalize first letter of a string */
function capitalize(str: string | undefined): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getDateRangeTone(date: Date, enabled: boolean): 'primary' | 'caution' | 'critical' {
  if (!enabled) return 'primary'
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 48)
  if (diffDays < 0) return 'critical'
  if (diffDays <= 1) return 'caution'
  return 'primary'
}

// ─── Narrowed edit configs per helper ────────────────────────────────────────

/**
 * Edit config for text-based columns (title).
 * Mode is always 'text' — omitted from the consumer API.
 */
interface TextEditConfig<T extends DocumentBase = DocumentBase> {
  /** Called when the user commits an edit. */
  onSave: (document: T, newValue: string) => void
}

/**
 * Edit config for select-based columns (type, badge).
 * Mode is always 'select' — omitted from the consumer API.
 */
interface SelectEditConfig<T extends DocumentBase = DocumentBase> {
  /** Available options for the select dropdown. */
  options: EditOption[]
  /** Called when the user commits an edit. */
  onSave: (document: T, newValue: string) => void
}

/**
 * Edit config for date-based columns (updatedAt, date).
 * Mode is always 'date' — omitted from the consumer API.
 */
interface DateEditConfig<T extends DocumentBase = DocumentBase> {
  /** Called when the user commits an edit. */
  onSave: (document: T, newValue: string) => void
  /** Color editable date buttons based on proximity to today. */
  toneByDateRange?: boolean
}

// ─── Shared base config ──────────────────────────────────────────────────────

/**
 * Common options available on all column helpers.
 */
interface BaseColumnConfig {
  /** Display header text. Overrides the auto-generated header. */
  header?: string
  /** Icon component to render left of header text. */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Whether this column appears in the filter UI. */
  filterable?: boolean
  /** Whether rows can be grouped by this column's values. */
  groupable?: boolean
  /** Whether this column's values are included in full-text search. */
  searchable?: boolean
  /** Flex grow — column takes remaining space (like CSS flex: 1). */
  flex?: number
  /** Fixed column width in pixels. */
  width?: number
}

// ─── Column config interfaces ────────────────────────────────────────────────

/**
 * Valid badge tones accepted by Sanity UI's Badge component.
 */
export type BadgeTone =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'suggest'
  | 'positive'
  | 'caution'
  | 'critical'

/**
 * Color map entry — either a tone string or an object with tone and display label.
 */
export type BadgeColorMapEntry = BadgeTone | {tone: BadgeTone; label: string}

/**
 * Maps field values to badge tones and optional display labels.
 */
export type BadgeColorMap = Record<string, BadgeColorMapEntry>

/**
 * Configuration accepted by `column.title()`.
 */
interface TitleColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** Document field path. Defaults to `'title'`. */
  field?: string
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Inline text editing. Pass `true` for SDK auto-save. */
  edit?: true | TextEditConfig<T>
}

/**
 * Configuration accepted by `column.type()`.
 */
interface TypeColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Inline select editing. Pass `true` for SDK auto-save. */
  edit?: true | SelectEditConfig<T>
}

/**
 * Configuration accepted by `column.updatedAt()`.
 */
interface UpdatedAtColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Inline date editing. Pass `true` for SDK auto-save. */
  edit?: true | DateEditConfig<T>
}

/**
 * Configuration accepted by `column.badge()`.
 */
interface BadgeColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** The document field path or GROQ expression. Required. */
  field: string
  /** Maps field values to badge tones and optional display labels. */
  colorMap?: BadgeColorMap
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Inline select editing (pick from badge values). Pass `true` for SDK auto-save. */
  edit?: true | SelectEditConfig<T>
}

/**
 * Configuration accepted by `column.date()`.
 */
interface DateColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** The document field path or GROQ expression. Required. */
  field: string
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Highlight overdue dates. */
  showOverdue?: boolean
  /** Color editable date buttons based on proximity to today. Defaults to `false`. */
  toneByDateRange?: boolean
  /** Inline date editing. Pass `true` for SDK auto-save. */
  edit?: true | DateEditConfig<T>
  /** Filter mode override. Defaults to 'range' when filterable is true. */
  filterMode?: 'exact' | 'range'
}

/**
 * Configuration accepted by `column.boolean()`.
 */
interface BooleanColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** The document field path. Required. */
  field: string
  /** Whether this column can be sorted. Defaults to `true`. */
  sortable?: boolean
  /** Inline boolean editing. Pass `true` for SDK auto-save, or an object with onSave. */
  edit?: true | {onSave: (doc: T, newValue: boolean) => void}
}

/**
 * Configuration accepted by `column.custom()`.
 */
interface CustomColumnConfig<T extends DocumentBase = DocumentBase> extends BaseColumnConfig {
  /** The document field path. Required. */
  field: string
  /** Custom cell renderer. */
  cell?: (value: unknown, row: T) => ReactNode
  /** Whether this column can be sorted. */
  sortable?: boolean
  /** Optional transform used when sorting this custom column. */
  sortValue?: (rawValue: unknown, row: T) => string | number
  /**
   * Inline edit configuration.
   * Full ColumnEditConfig — any mode is available on custom columns.
   */
  edit?: ColumnEditConfig<T>
  /** Custom filter predicate. */
  filterFn?: (row: T, filterValue: string) => boolean
  /** Filter mode override. */
  filterMode?: 'exact' | 'range'
}

// ─── Helpers to widen narrowed configs into full ColumnEditConfig ─────────────

function textEdit<T extends DocumentBase>(config: TextEditConfig<T>): ColumnEditConfig<T> {
  return {mode: 'text', onSave: config.onSave}
}

function selectEdit<T extends DocumentBase>(config: SelectEditConfig<T>): ColumnEditConfig<T> {
  return {mode: 'select', options: config.options, onSave: config.onSave}
}

function dateEdit<T extends DocumentBase>(config: DateEditConfig<T>): ColumnEditConfig<T> {
  return {mode: 'date', onSave: config.onSave, _toneByDateRange: config.toneByDateRange}
}

// ─── Column helpers ──────────────────────────────────────────────────────────

/**
 * Pre-built column helpers for common table patterns.
 * All helpers accept a single keyed config object.
 *
 * @example
 * ```ts
 * const cols = [
 *   column.select({width: 24}),
 *   column.title({edit: true, searchable: true}),
 *   column.type(),
 *   column.badge({field: 'status', colorMap: {draft: 'caution'}, edit: true}),
 *   column.date({field: 'dueDate', header: 'Due Date'}),
 *   column.updatedAt(),
 *   column.openInStudio(),
 * ]
 * ```
 */
export const column = {
  /**
   * Title column — sortable by default. Edit mode: `text`.
   *
   * @example
   * ```ts
   * column.title()
   * column.title({searchable: true, edit: true})
   * column.title({field: 'name', header: 'Name', edit: true})
   * ```
   */
  title<T extends DocumentBase = DocumentBase>(config?: TitleColumnConfig<T>): ColumnDef<T> {
    const field = config?.field ?? 'title'
    const header = config?.header ?? 'Title'

    return {
      id: field === 'title' ? 'title' : field,
      header,
      field,
      ...(config?.icon && {icon: config.icon}),
      sortable: config?.sortable ?? true,
      ...(config?.flex != null && {flex: config.flex}),
      ...(config?.width != null && {width: config.width}),
      ...(config?.searchable != null && {searchable: config.searchable}),
      ...(config?.filterable != null && {filterable: config.filterable}),
      ...(config?.groupable != null && {groupable: config.groupable}),
      ...(config?.edit != null && config.edit !== true && {edit: textEdit(config.edit)}),
      ...(config?.edit === true && {edit: {mode: 'text' as const, _autoSave: true, _field: field}}),
    } as ColumnDef<T>
  },

  /**
   * Document type column — sortable, filterable, and groupable by default.
   * Edit mode: `select`.
   *
   * @example
   * ```ts
   * column.type()
   * column.type({header: 'Document Type', groupable: false})
   * ```
   */
  type<T extends DocumentBase = DocumentBase>(config?: TypeColumnConfig<T>): ColumnDef<T> {
    return {
      id: 'type',
      header: config?.header ?? 'Type',
      field: '_type',
      ...(config?.icon && {icon: config.icon}),
      sortable: config?.sortable ?? true,
      filterable: config?.filterable ?? true,
      groupable: config?.groupable ?? true,
      ...(config?.searchable != null && {searchable: config.searchable}),
      ...(config?.flex != null && {flex: config.flex}),
      ...(config?.width != null && {width: config.width}),
      ...(config?.edit != null && config?.edit !== true && {edit: selectEdit(config.edit)}),
      ...(config?.edit === true && {
        edit: {mode: 'select' as const, _autoSave: true, _field: '_type'},
      }),
    } as ColumnDef<T>
  },

  /**
   * Last-updated timestamp column — sortable by default. Edit mode: `date`.
   *
   * @example
   * ```ts
   * column.updatedAt()
   * column.updatedAt({header: 'Last Modified'})
   * ```
   */
  updatedAt<T extends DocumentBase = DocumentBase>(
    config?: UpdatedAtColumnConfig<T>,
  ): ColumnDef<T> {
    return {
      id: 'updatedAt',
      header: config?.header ?? 'Updated',
      field: '_updatedAt',
      ...(config?.icon && {icon: config.icon}),
      sortable: config?.sortable ?? true,
      ...(config?.filterable != null && {filterable: config.filterable}),
      ...(config?.groupable != null && {groupable: config.groupable}),
      ...(config?.searchable != null && {searchable: config.searchable}),
      ...(config?.flex != null && {flex: config.flex}),
      ...(config?.width != null && {width: config.width}),
      ...(config?.edit != null && config?.edit !== true && {edit: dateEdit(config.edit)}),
      ...(config?.edit === true && {
        edit: {mode: 'date' as const, _autoSave: true, _field: '_updatedAt'},
      }),
    } as ColumnDef<T>
  },

  /**
   * Boolean column — renders a checkbox for true/false values.
   * Edit mode: toggle on click.
   *
   * @example
   * ```ts
   * column.boolean({field: 'featured'})
   * column.boolean({field: 'featured', header: 'Featured', edit: true})
   * column.boolean({field: 'featured', edit: {onSave: (doc, val) => save(doc._id, val)}})
   * ```
   */
  boolean<T extends DocumentBase = DocumentBase>(config: BooleanColumnConfig<T>): ColumnDef<T> {
    const {field, header, icon, sortable, filterable, groupable, width, flex, edit} = config

    let editOnSave: ((doc: T, newValue: boolean) => void) | undefined
    if (edit === true) {
      // SDK auto-save — marker only, resolved at render time
    } else if (edit != null) {
      editOnSave = edit.onSave
    }

    return {
      id: field,
      header: header ?? capitalize(field),
      field,
      ...(icon && {icon}),
      sortable: sortable ?? true,
      ...(filterable != null && {filterable}),
      ...(groupable != null && {groupable}),
      ...(width != null && {width}),
      ...(flex != null && {flex}),
      ...(edit === true && {edit: {mode: 'custom' as const, _autoSave: true, _field: field}}),
      cell: (value: unknown, row: T) => {
        const checked = !!value
        if (editOnSave) {
          return (
            <ToggleSwitch
              checked={checked}
              onChange={() => {
                editOnSave(row, !checked)
              }}
            />
          )
        }
        return <ToggleSwitch checked={checked} readOnly />
      },
    } as ColumnDef<T>
  },

  /**
   * Narrow action column for an "open in Studio" button.
   * Not sortable, fixed 44px width. Not editable.
   */
  openInStudio(config?: {width?: number}): ColumnDef {
    return {
      id: 'openInStudio',
      header: '',
      sortable: false,
      width: config?.width ?? 44,
    }
  },

  /**
   * Fully custom column with all options available.
   *
   * @example
   * ```ts
   * column.custom({field: 'priority', header: 'Priority', filterable: true})
   * column.custom({
   *   field: 'notes',
   *   header: 'Notes',
   *   edit: {mode: 'text', onSave: (doc, val) => updateNotes(doc._id, val)},
   * })
   * ```
   */
  custom<T extends DocumentBase = DocumentBase>(config: CustomColumnConfig<T>): ColumnDef<T> {
    const {
      field,
      header,
      cell,
      sortable,
      sortValue,
      filterable,
      groupable,
      searchable,
      flex,
      width,
      edit,
      filterFn,
      filterMode,
    } = config

    return {
      id: field,
      header: header ?? capitalize(field),
      field,
      ...(config.icon && {icon: config.icon}),
      ...(cell && {cell}),
      ...(sortable != null && {sortable}),
      ...(sortValue && {sortValue}),
      ...(filterable != null && {filterable}),
      ...(groupable != null && {groupable}),
      ...(searchable != null && {searchable}),
      ...(flex != null && {flex}),
      ...(width != null && {width}),
      ...(edit && {edit}),
      ...(filterFn && {filterFn}),
      ...(filterMode != null && {filterMode}),
    }
  },

  /**
   * Badge column — renders the field value as a colored badge.
   * Edit mode: `select`.
   *
   * @example
   * ```ts
   * column.badge({field: 'status', colorMap: {draft: 'caution', published: 'positive'}})
   * column.badge({
   *   field: 'status',
   *   header: 'Status',
   *   colorMap: {pending_review: {tone: 'caution', label: 'Pending Review'}},
   *   edit: true,
   *   groupable: true,
   * })
   * ```
   */
  badge<T extends DocumentBase = DocumentBase>(config: BadgeColumnConfig<T>): ColumnDef<T> {
    const {
      field,
      header,
      icon,
      colorMap,
      sortable,
      filterable,
      groupable,
      searchable,
      flex,
      width,
      edit,
    } = config

    // Build options from colorMap when edit: true
    const autoOptions = colorMap
      ? Object.entries(colorMap)
          .map(([key, val]) => {
            const isRich = typeof val === 'object'
            return {
              value: key,
              label: isRich ? val.label : capitalize(key),
              tone: isRich ? val.tone : val,
            }
          })
          .sort((a, b) => a.label.localeCompare(b.label))
      : undefined

    // Resolve edit config
    let editDef: ColumnEditConfig<T> | undefined
    if (edit === true) {
      editDef = {
        mode: 'select' as const,
        _autoSave: true,
        _field: field,
        ...(autoOptions && {options: autoOptions}),
      }
    } else if (edit != null) {
      editDef = selectEdit(edit)
    }

    return {
      id: field,
      header: header ?? capitalize(field),
      field,
      ...(icon && {icon}),
      cell: (value: unknown) => {
        const str = String(value ?? '')
        const entry = colorMap?.[str]
        const tone = entry ? (typeof entry === 'object' ? entry.tone : entry) : undefined
        const label = entry && typeof entry === 'object' ? entry.label : capitalize(str)
        return (
          <Badge fontSize={1} padding={2} tone={tone}>
            {label}
          </Badge>
        )
      },
      sortValue: (rawValue: unknown) => {
        const str = String(rawValue ?? '')
        const entry = colorMap?.[str]
        return entry && typeof entry === 'object' ? entry.label : capitalize(str)
      },
      sortable: sortable ?? true,
      filterable: filterable ?? true,
      ...(groupable != null && {groupable}),
      ...(searchable != null && {searchable}),
      ...(flex != null && {flex}),
      ...(width != null && {width}),
      ...(editDef && {edit: editDef}),
    } as ColumnDef<T>
  },

  /**
   * Date column with optional overdue highlighting. Edit mode: `date`.
   *
   * @example
   * ```ts
   * column.date({field: 'dueDate', header: 'Due Date'})
   * column.date({field: 'dueDate', header: 'Due Date', edit: true, showOverdue: true})
   * ```
   */
  date<T extends DocumentBase = DocumentBase>(config: DateColumnConfig<T>): ColumnDef<T> {
    const {
      field,
      header,
      icon,
      sortable,
      showOverdue,
      toneByDateRange,
      filterable,
      groupable,
      searchable,
      flex,
      width,
      edit,
    } = config

    return {
      id: field,
      header: header ?? capitalize(field),
      field,
      ...(icon && {icon}),
      sortable: sortable ?? true,
      cell: (value: unknown) => {
        if (!value)
          return (
            <Text size={1} muted>
              —
            </Text>
          )
        const dateStr = String(value)
        // Parse date-only strings as local time, not UTC.
        // new Date('2026-03-11') creates midnight UTC, which in negative UTC offsets
        // becomes the previous day locally. Manual parsing avoids this.
        const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
        const date = dateMatch
          ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))
          : new Date(dateStr)
        if (isNaN(date.getTime()))
          return (
            <Text size={1} muted>
              —
            </Text>
          )

        const displayText = format(date, 'dd/MM/yy')
        const dateTone = getDateRangeTone(date, toneByDateRange ?? false)

        // Overdue highlighting
        if (showOverdue && isPast(date)) {
          return (
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <span
                style={{color: 'var(--card-badge-critical-fg-color, #e03e2f)', fontSize: 'inherit'}}
              >
                {displayText}
              </span>
              <Badge fontSize={0} tone="critical">
                Overdue
              </Badge>
            </span>
          )
        }

        if (toneByDateRange) {
          return (
            <Button
              tone={dateTone}
              mode="ghost"
              padding={2}
              text={displayText}
              style={{cursor: 'default'}}
            />
          )
        }

        return <Text size={1}>{displayText}</Text>
      },
      ...(filterable != null && {filterable}),
      ...(filterable && {filterMode: config.filterMode ?? 'range'}),
      ...(groupable != null && {groupable}),
      ...(searchable != null && {searchable}),
      ...(flex != null && {flex}),
      ...(width != null && {width}),
      ...(edit != null && edit !== true && {edit: dateEdit(edit)}),
      ...(edit === true && {
        edit: {
          mode: 'date' as const,
          _autoSave: true,
          _field: field,
          _toneByDateRange: config.toneByDateRange ?? false,
        },
      }),
    } as ColumnDef<T>
  },

  /**
   * Checkbox selection column.
   * Place this first in the columns array to enable row selection.
   *
   * @example
   * ```ts
   * column.select({width: 24})
   * ```
   */
  select(config?: {width?: number}): ColumnDef {
    return {
      id: '_select',
      header: '',
      sortable: false,
      width: config?.width ?? 44,
      _isSelectColumn: true,
    }
  },
}
