import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {NuqsTestingAdapter} from 'nuqs/adapters/testing'
import {afterEach, describe, expect, it} from 'vitest'

import {filter} from '../filters'
import {useFilterUrlState} from '../useFilterUrlState'

const defs = [
  filter.search({label: 'Search', fields: ['title']}),
  filter.date({field: 'plannedPublishDate', label: 'Planned Publish'}),
  filter.string({field: 'status', label: 'Status', operator: 'in'}),
  filter.boolean({field: 'featured', label: 'Featured'}),
]

afterEach(() => {
  cleanup()
})

function Harness() {
  const state = useFilterUrlState(defs)

  return (
    <div>
      <button onClick={() => state.setFilterValue(defs[0], 'climate')}>set-search</button>
      <button onClick={() => state.setFilterValue(defs[1], {from: '2026-04-01', to: '2026-04-30'})}>
        set-date
      </button>
      <button onClick={() => state.setFilterValue(defs[2], ['draft', 'review'])}>set-status</button>
      <button onClick={() => state.setFilterValue(defs[3], true)}>set-boolean</button>
      <button onClick={() => state.clearAll()}>clear-all</button>
      <pre data-testid="values">{JSON.stringify(state.values)}</pre>
      <pre data-testid="has-active">{String(state.hasActiveFilters)}</pre>
    </div>
  )
}

describe('useFilterUrlState', () => {
  it('round-trips typed values through shared url-backed filter state', async () => {
    const user = userEvent.setup()

    render(
      <NuqsTestingAdapter>
        <Harness />
      </NuqsTestingAdapter>,
    )

    await user.click(screen.getByText('set-search'))
    await user.click(screen.getByText('set-date'))
    await user.click(screen.getByText('set-status'))
    await user.click(screen.getByText('set-boolean'))

    expect(screen.getByTestId('values').textContent).toContain('"search":"climate"')
    expect(screen.getByTestId('values').textContent).toContain(
      '"plannedPublishDate":{"from":"2026-04-01","to":"2026-04-30"}',
    )
    expect(screen.getByTestId('values').textContent).toContain('"status":["draft","review"]')
    expect(screen.getByTestId('values').textContent).toContain('"featured":true')
    expect(screen.getByTestId('has-active').textContent).toBe('true')
  })

  it('clears all committed filter values together', async () => {
    const user = userEvent.setup()

    render(
      <NuqsTestingAdapter>
        <Harness />
      </NuqsTestingAdapter>,
    )

    await user.click(screen.getByText('set-search'))
    await user.click(screen.getByText('clear-all'))

    expect(screen.getByTestId('values').textContent).not.toContain('climate')
    expect(screen.getByTestId('has-active').textContent).toBe('false')
  })
})
