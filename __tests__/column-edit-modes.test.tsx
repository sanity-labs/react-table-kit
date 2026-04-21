import {describe, expect, it, vi} from 'vitest'

import {column} from '../src/helpers/table/columns'

/**
 * Built-in column helpers — opinionated edit modes.
 *
 * Each helper constrains inline editing to the mode that makes sense
 * for its data type. The consumer never specifies `mode` directly.
 *
 * | Helper        | Edit mode | Why                          |
 * |---------------|-----------|------------------------------|
 * | column.string | text      | It's a string field          |
 * | column.title  | text      | Deprecated compatibility preset |
 * | column.type   | select    | Finite set of document types |
 * | column.updatedAt | date   | It's a timestamp             |
 * | column.badge  | select    | Maps to finite values        |
 * | column.date   | date      | It's a date                  |
 */
describe('Built-in column edit modes', () => {
  const mockSave = vi.fn()

  // ── column.string ─────────────────────────────────────────────────────

  it('Behavior 1: column.string({ edit }) produces mode "text" automatically', () => {
    const col = column.string({field: 'title', edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('text')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 2: column.string with field override accepts edit config and derives a header', () => {
    const col = column.string({field: 'web.authorName', edit: {onSave: mockSave}})

    expect(col.field).toBe('web.authorName')
    expect(col.header).toBe('Author Name')
    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('text')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 3: deprecated column.title() remains a compatibility preset', () => {
    const col = column.title({edit: {onSave: mockSave}})

    expect(col.field).toBe('title')
    expect(col.header).toBe('Title')
    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('text')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 4: column.string without edit has no edit property', () => {
    const col = column.string({field: 'title', searchable: true})

    expect(col.edit).toBeUndefined()
    expect(col.searchable).toBe(true)
  })

  // ── column.type ───────────────────────────────────────────────────────

  it('Behavior 5: column.type({ edit }) produces mode "select" with options', () => {
    const options = [
      {value: 'article', label: 'Article'},
      {value: 'page', label: 'Page'},
    ]
    const col = column.type({edit: {options, onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('select')
    expect(col.edit!.options).toEqual(options)
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 6: column.type without edit preserves defaults', () => {
    const col = column.type()

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
    expect(col.filterable).toBe(true)
    expect(col.groupable).toBe(true)
  })

  // ── column.updatedAt ──────────────────────────────────────────────────

  it('Behavior 7: column.updatedAt({ edit }) produces mode "date"', () => {
    const col = column.updatedAt({edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('date')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 8: column.updatedAt without edit has no edit property', () => {
    const col = column.updatedAt()

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
  })

  // ── column.badge ──────────────────────────────────────────────────────

  it('Behavior 9: column.badge with edit produces mode "select" with options', () => {
    const colorMap = {draft: 'caution', published: 'positive'}
    const options = [
      {value: 'draft', label: 'Draft'},
      {value: 'published', label: 'Published'},
    ]
    const col = column.badge({field: 'status', colorMap, edit: {options, onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('select')
    expect(col.edit!.options).toEqual(options)
    expect(col.edit!.onSave).toBe(mockSave)
    // Badge cell renderer still works
    expect(col.cell).toBeDefined()
  })

  it('Behavior 10: column.badge without edit has no edit property', () => {
    const col = column.badge({field: 'status', colorMap: {draft: 'caution'}})

    expect(col.edit).toBeUndefined()
    expect(col.filterable).toBe(true)
  })

  // ── column.date ───────────────────────────────────────────────────────

  it('Behavior 11: column.date with edit produces mode "date"', () => {
    const col = column.date({field: 'dueDate', header: 'Due Date', edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('date')
    expect(col.edit!.onSave).toBe(mockSave)
    expect(col.header).toBe('Due Date')
  })

  it('Behavior 12: column.date without edit has no edit property', () => {
    const col = column.date({field: 'dueDate', header: 'Due Date'})

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
  })

  // ── column.custom still accepts full ColumnEditConfig ─────────────────

  it('Behavior 13: column.custom still accepts explicit mode (unrestricted)', () => {
    const col = column.custom({
      field: 'priority',
      header: 'Priority',
      edit: {
        mode: 'select',
        options: [
          {value: 'low', label: 'Low'},
          {value: 'high', label: 'High'},
        ],
        onSave: mockSave,
      },
    })

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('select')
  })
})
