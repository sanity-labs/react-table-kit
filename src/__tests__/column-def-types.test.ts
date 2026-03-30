import {describe, expect, it} from 'vitest'

import type {ColumnDef, DocumentBase} from '../types'

/**
 * T1-1: ColumnDef type extensions for filterMode and filterFn.
 * These are compile-time tests — if the file compiles, the types are correct.
 * We use runtime assertions on object shapes to make vitest happy.
 */
describe('T1-1: ColumnDef type extensions', () => {
  // T1-1.B1: ColumnDef accepts filterMode: 'exact' without type error
  it("T1-1.B1: ColumnDef accepts filterMode: 'exact'", () => {
    const col: ColumnDef = {
      id: 'status',
      header: 'Status',
      field: 'status',
      filterable: true,
      filterMode: 'exact',
    }
    expect(col.filterMode).toBe('exact')
  })

  // T1-1.B2: ColumnDef accepts filterMode: 'range' without type error
  it("T1-1.B2: ColumnDef accepts filterMode: 'range'", () => {
    const col: ColumnDef = {
      id: 'publishDate',
      header: 'Publish Date',
      field: 'publishDate',
      filterable: true,
      filterMode: 'range',
    }
    expect(col.filterMode).toBe('range')
  })

  // T1-1.B3: ColumnDef accepts filterFn callback without type error
  it('T1-1.B3: ColumnDef accepts filterFn callback', () => {
    const predicate = (row: DocumentBase, _val: string) => row._id !== ''
    const col: ColumnDef = {
      id: 'risk',
      header: 'Risk',
      field: 'risk',
      filterFn: predicate,
    }
    expect(col.filterFn).toBe(predicate)
  })

  // T1-1.B4: filterMode defaults to undefined (backward compatible)
  it('T1-1.B4: filterMode defaults to undefined (backward compatible)', () => {
    const col: ColumnDef = {
      id: 'section',
      header: 'Section',
      field: 'section',
      filterable: true,
    }
    expect(col.filterMode).toBeUndefined()
    expect(col.filterFn).toBeUndefined()
  })
})
