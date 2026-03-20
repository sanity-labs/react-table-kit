import {describe, expect, it, vi} from 'vitest'

import {column} from '../src/columns'

/**
 * Built-in column helpers — opinionated edit modes.
 *
 * Each helper constrains inline editing to the mode that makes sense
 * for its data type. The consumer never specifies `mode` directly.
 *
 * | Helper        | Edit mode | Why                          |
 * |---------------|-----------|------------------------------|
 * | column.title  | text      | It's a string field          |
 * | column.type   | select    | Finite set of document types |
 * | column.updatedAt | date   | It's a timestamp             |
 * | column.badge  | select    | Maps to finite values        |
 * | column.date   | date      | It's a date                  |
 */
describe('Built-in column edit modes', () => {
  const mockSave = vi.fn()

  // ── column.title ──────────────────────────────────────────────────────

  it('Behavior 1: column.title({ edit }) produces mode "text" automatically', () => {
    const col = column.title({edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('text')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 2: column.title with field override accepts edit config', () => {
    const col = column.title({field: 'name', edit: {onSave: mockSave}})

    expect(col.field).toBe('name')
    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('text')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 3: column.title without edit has no edit property', () => {
    const col = column.title({searchable: true})

    expect(col.edit).toBeUndefined()
    expect(col.searchable).toBe(true)
  })

  // ── column.type ───────────────────────────────────────────────────────

  it('Behavior 4: column.type({ edit }) produces mode "select" with options', () => {
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

  it('Behavior 5: column.type without edit preserves defaults', () => {
    const col = column.type()

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
    expect(col.filterable).toBe(true)
    expect(col.groupable).toBe(true)
  })

  // ── column.updatedAt ──────────────────────────────────────────────────

  it('Behavior 6: column.updatedAt({ edit }) produces mode "date"', () => {
    const col = column.updatedAt({edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('date')
    expect(col.edit!.onSave).toBe(mockSave)
  })

  it('Behavior 7: column.updatedAt without edit has no edit property', () => {
    const col = column.updatedAt()

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
  })

  // ── column.badge ──────────────────────────────────────────────────────

  it('Behavior 8: column.badge with edit produces mode "select" with options', () => {
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

  it('Behavior 9: column.badge without edit has no edit property', () => {
    const col = column.badge({field: 'status', colorMap: {draft: 'caution'}})

    expect(col.edit).toBeUndefined()
    expect(col.filterable).toBe(true)
  })

  // ── column.date ───────────────────────────────────────────────────────

  it('Behavior 10: column.date with edit produces mode "date"', () => {
    const col = column.date({field: 'dueDate', header: 'Due Date', edit: {onSave: mockSave}})

    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('date')
    expect(col.edit!.onSave).toBe(mockSave)
    expect(col.header).toBe('Due Date')
  })

  it('Behavior 11: column.date without edit has no edit property', () => {
    const col = column.date({field: 'dueDate', header: 'Due Date'})

    expect(col.edit).toBeUndefined()
    expect(col.sortable).toBe(true)
  })

  // ── column.custom still accepts full ColumnEditConfig ─────────────────

  it('Behavior 12: column.custom still accepts explicit mode (unrestricted)', () => {
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
