import {describe, expect, it} from 'vitest'

import {
  deserializeFilterValue,
  filter,
  formatFilterChip,
  getFilterControl,
  getFilterKey,
  isFilterActiveValue,
  mapFilterValuesToInitialValues,
  serializeFilterValue,
} from '../src/helpers/filters/filters'

describe('filter builders', () => {
  it('string defaults to exact match and infers key', () => {
    const def = filter.string({field: 'status', label: 'Status'})

    expect(def.kind).toBe('string')
    expect(def.operator).toBe('is')
    expect(getFilterKey(def)).toBe('status')
  })

  it('date defaults to range and date granularity', () => {
    const def = filter.date({field: 'plannedPublishDate', label: 'Planned Publish'})

    expect(def.kind).toBe('date')
    expect(def.operator).toBe('range')
    expect(def.granularity).toBe('date')
  })

  it('boolean defaults to is', () => {
    const def = filter.boolean({field: 'featured', label: 'Featured'})

    expect(def.operator).toBe('is')
  })

  it('reference defaults to in, single relation, and searchable document options', () => {
    const def = filter.reference({field: 'section', label: 'Section', referenceType: 'section'})

    expect(def.operator).toBe('in')
    expect(def.relation).toBe('single')
    expect(def.options?.source).toBe('documents')
    expect(def.options?.searchable).toBe(true)
  })

  it('search defaults to contains and key search', () => {
    const def = filter.search({label: 'Search', fields: ['title']})

    expect(def.mode).toBe('contains')
    expect(def.debounceMs).toBe(300)
    expect(getFilterKey(def)).toBe('search')
  })

  it('custom preserves explicit control config', () => {
    const def = filter.custom<string[]>({
      key: 'reporter',
      label: 'Reporter',
      control: 'multiSelect',
      valueType: 'array',
      serialize: (value) => value,
      deserialize: (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []),
      formatChip: (value) => `${value.length} selected`,
    })

    expect(def.kind).toBe('custom')
    expect(def.control).toBe('multiSelect')
    expect(def.valueType).toBe('array')
  })

  it('custom filters require an explicit key', () => {
    expect(() =>
      filter.custom<string[]>({
        // @ts-expect-error runtime guard coverage
        label: 'Reporter',
        control: 'multiSelect',
        valueType: 'array',
        serialize: (value) => value,
        deserialize: (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []),
        formatChip: (value) => `${value.length} selected`,
      }),
    ).toThrow(/requires an explicit key/i)
  })
})

describe('filter serialization', () => {
  it('serializes and deserializes string multi-select values', () => {
    const def = filter.string({field: 'status', label: 'Status', operator: 'in'})

    const raw = serializeFilterValue(def, ['draft', 'review'])
    expect(raw).toBe('draft,review')
    expect(deserializeFilterValue(def, raw)).toEqual(['draft', 'review'])
  })

  it('serializes and deserializes date ranges', () => {
    const def = filter.date({field: 'plannedPublishDate', label: 'Planned Publish'})

    const raw = serializeFilterValue(def, {from: '2026-04-01', to: '2026-04-30'})
    expect(raw).toBe('2026-04-01..2026-04-30')
    expect(deserializeFilterValue(def, raw)).toEqual({from: '2026-04-01', to: '2026-04-30'})
  })

  it('serializes booleans to true/false strings', () => {
    const def = filter.boolean({field: 'featured', label: 'Featured'})

    expect(serializeFilterValue(def, true)).toBe('true')
    expect(deserializeFilterValue(def, 'false')).toBe(false)
  })
})

describe('filter helpers', () => {
  it('returns expected controls for built-in filters', () => {
    expect(getFilterControl(filter.search({label: 'Search', fields: ['title']}))).toBe(
      'searchInput',
    )
    expect(
      getFilterControl(filter.string({field: 'status', label: 'Status', operator: 'in'})),
    ).toBe('multiSelect')
    expect(
      getFilterControl(filter.date({field: 'plannedPublishDate', label: 'Planned Publish'})),
    ).toBe('dateRange')
  })

  it('formats chips for ranges and arrays', () => {
    expect(
      formatFilterChip(filter.date({field: 'plannedPublishDate', label: 'Planned Publish'}), {
        from: '2026-04-01',
        to: '2026-04-30',
      }),
    ).toContain('2026-04-01 → 2026-04-30')

    expect(
      formatFilterChip(filter.string({field: 'status', label: 'Status', operator: 'in'}), [
        'draft',
        'review',
      ]),
    ).toBe('Status: draft +1')
  })

  it('tracks active values across scalar, array, and range types', () => {
    expect(isFilterActiveValue('draft')).toBe(true)
    expect(isFilterActiveValue(['draft'])).toBe(true)
    expect(isFilterActiveValue({from: '2026-04-01'})).toBe(true)
    expect(isFilterActiveValue([])).toBe(false)
    expect(isFilterActiveValue(null)).toBe(false)
  })

  it('maps only explicit create-document filter values into initial values', () => {
    const defs = [
      filter.string({
        field: 'status',
        label: 'Status',
        toInitialValue: (value) => value,
      }),
      filter.date({
        field: 'plannedPublishDate',
        label: 'Planned Publish',
      }),
    ]

    expect(
      mapFilterValuesToInitialValues(defs, {
        status: 'draft',
        plannedPublishDate: {from: '2026-04-01', to: '2026-04-30'},
      }),
    ).toEqual({status: 'draft'})
  })
})
