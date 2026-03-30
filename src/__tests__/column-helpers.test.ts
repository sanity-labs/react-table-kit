import {describe, expect, it} from 'vitest'

import {column} from '../columns'
import type {DocumentBase} from '../types'

describe('T1-5: Column helper filterMode and filterFn', () => {
  it("T1-5.B1: column.date({ filterable: true }) defaults filterMode to 'range'", () => {
    const col = column.date({field: 'publishDate', filterable: true})
    expect(col.filterable).toBe(true)
    expect(col.filterMode).toBe('range')
  })

  it("T1-5.B2: column.date({ filterable: true, filterMode: 'exact' }) overrides to exact", () => {
    const col = column.date({field: 'publishDate', filterable: true, filterMode: 'exact'})
    expect(col.filterable).toBe(true)
    expect(col.filterMode).toBe('exact')
  })

  it('T1-5.B3: column.custom({ filterFn }) sets filterFn on the column def', () => {
    const myFn = (row: DocumentBase, val: string) => Number(row.score) > Number(val)
    const col = column.custom({field: 'risk', filterFn: myFn})
    expect(col.filterFn).toBe(myFn)
  })
})
