import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {NuqsTestingAdapter} from 'nuqs/adapters/testing'
import {afterEach, describe, expect, it} from 'vitest'

import {filter, type FilterPreset} from '../src/helpers/filters/filters'
import {useFilterPresets} from '../src/hooks/useFilterPresets'
import {useFilterUrlState} from '../src/hooks/useFilterUrlState'

afterEach(() => {
  cleanup()
})

const defs = [
  filter.string({field: 'status', label: 'Status', operator: 'in'}),
  filter.date({field: 'plannedPublishDate', label: 'Planned Publish'}),
]

const presets: Record<string, FilterPreset> = {
  all: {key: 'all', label: 'All', values: {}},
  dueThisWeek: {
    key: 'dueThisWeek',
    label: 'Due This Week',
    values: {plannedPublishDate: {from: '2026-04-01', to: '2026-04-07'}},
  },
}

const dynamicPresets: Record<string, FilterPreset> = {
  today: {
    key: 'today',
    label: 'Today',
    getValues: () => ({
      plannedPublishDate: {from: '2026-04-02', to: '2026-04-02'},
    }),
  },
}

function Harness() {
  const filterState = useFilterUrlState(defs)
  const presetsState = useFilterPresets(filterState, presets)

  return (
    <div>
      <button onClick={() => presetsState.applyPreset('dueThisWeek')}>apply-preset</button>
      <button onClick={() => filterState.setFilterValue(defs[0], ['draft'])}>tweak-status</button>
      <button onClick={() => presetsState.applyPreset(null)}>clear-preset</button>
      <pre data-testid="active-preset">{presetsState.activePreset ?? 'none'}</pre>
      <pre data-testid="values">{JSON.stringify(filterState.values)}</pre>
    </div>
  )
}

describe('useFilterPresets', () => {
  it('applies preset values into the shared filter url state', async () => {
    const user = userEvent.setup()

    render(
      <NuqsTestingAdapter>
        <Harness />
      </NuqsTestingAdapter>,
    )

    await user.click(screen.getByText('apply-preset'))

    expect(screen.getByTestId('active-preset').textContent).toBe('dueThisWeek')
    expect(screen.getByTestId('values').textContent).toContain('"from":"2026-04-01"')
    expect(screen.getByTestId('values').textContent).toContain('"to":"2026-04-07"')
  })

  it('leaves preset-applied filters editable afterward', async () => {
    const user = userEvent.setup()

    render(
      <NuqsTestingAdapter>
        <Harness />
      </NuqsTestingAdapter>,
    )

    await user.click(screen.getByText('apply-preset'))
    await user.click(screen.getByText('tweak-status'))

    expect(screen.getByTestId('values').textContent).toContain('"status":["draft"]')
    expect(screen.getByTestId('values').textContent).toContain(
      '"plannedPublishDate":{"from":"2026-04-01","to":"2026-04-07"}',
    )
  })

  it('supports dynamic presets via getValues', async () => {
    const user = userEvent.setup()

    function DynamicHarness() {
      const filterState = useFilterUrlState(defs)
      const presetsState = useFilterPresets(filterState, dynamicPresets)

      return (
        <div>
          <button onClick={() => presetsState.applyPreset('today')}>apply-dynamic</button>
          <pre data-testid="dynamic-values">{JSON.stringify(filterState.values)}</pre>
        </div>
      )
    }

    render(
      <NuqsTestingAdapter>
        <DynamicHarness />
      </NuqsTestingAdapter>,
    )

    await user.click(screen.getByText('apply-dynamic'))

    expect(screen.getByTestId('dynamic-values').textContent).toContain('"from":"2026-04-02"')
    expect(screen.getByTestId('dynamic-values').textContent).toContain('"to":"2026-04-02"')
  })
})
