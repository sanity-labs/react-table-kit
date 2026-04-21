import {describe, expect, it} from 'vitest'

import {column} from '../src/helpers/table/columns'

/**
 * Width prop on column helpers.
 *
 * All column helpers that produce visible columns should accept an optional
 * `width` prop to set a fixed column width in pixels.
 */
describe('Column width prop', () => {
  // ── column.string ─────────────────────────────────────────────────────

  it('Behavior 1: column.string accepts width', () => {
    const col = column.string({field: 'title', width: 200})

    expect(col.width).toBe(200)
  })

  it('Behavior 2: column.string without width has no width property', () => {
    const col = column.string({field: 'title'})

    expect(col.width).toBeUndefined()
  })

  it('Behavior 3: column.string with field override accepts width and derives a header', () => {
    const col = column.string({field: 'profile.displayName', width: 180})

    expect(col.field).toBe('profile.displayName')
    expect(col.header).toBe('Display Name')
    expect(col.width).toBe(180)
  })

  it('Behavior 4: deprecated column.title() still accepts width', () => {
    const col = column.title({width: 160})

    expect(col.field).toBe('title')
    expect(col.width).toBe(160)
  })

  // ── column.type ───────────────────────────────────────────────────────

  it('Behavior 5: column.type accepts width', () => {
    const col = column.type({width: 120})

    expect(col.width).toBe(120)
  })

  it('Behavior 6: column.type without config has no width', () => {
    const col = column.type()

    expect(col.width).toBeUndefined()
  })

  // ── column.updatedAt ──────────────────────────────────────────────────

  it('Behavior 7: column.updatedAt accepts width', () => {
    const col = column.updatedAt({width: 150})

    expect(col.width).toBe(150)
  })

  // ── column.badge ──────────────────────────────────────────────────────

  it('Behavior 8: column.badge accepts width via config', () => {
    const col = column.badge({field: 'status', colorMap: {draft: 'caution'}, width: 100})

    expect(col.width).toBe(100)
  })

  // ── column.date ───────────────────────────────────────────────────────

  it('Behavior 9: column.date accepts width', () => {
    const col = column.date({field: 'dueDate', width: 130})

    expect(col.width).toBe(130)
  })

  // ── column.custom ─────────────────────────────────────────────────────

  it('Behavior 10: column.custom accepts width', () => {
    const col = column.custom({field: 'notes', header: 'Notes', width: 250})

    expect(col.width).toBe(250)
  })

  // ── column.select ─────────────────────────────────────────────────────

  it('Behavior 11: column.select defaults to 44px width', () => {
    const col = column.select()

    expect(col.width).toBe(44)
  })

  it('Behavior 12: column.select accepts width override', () => {
    const col = column.select({width: 32})

    expect(col.width).toBe(32)
  })

  // ── column.openInStudio ───────────────────────────────────────────────

  it('Behavior 13: column.openInStudio accepts width override', () => {
    const col = column.openInStudio({width: 36})

    expect(col.width).toBe(36)
  })
})
