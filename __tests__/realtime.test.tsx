import {describe, expect, it, vi} from 'vitest'
import {screen} from '@testing-library/react'
import {DocumentTable} from '../src/DocumentTable'
import {column} from '../src/columns'
import {renderWithTheme} from './helpers'
import {useState} from 'react'
import userEvent from '@testing-library/user-event'
import {renderHook, act} from '@testing-library/react'
import {useStableDocuments} from '../src/useStableDocuments'

const MOCK_DOCUMENTS = [
  {_id: 'doc-1', _type: 'article', _updatedAt: '2026-03-01T12:00:00Z', title: 'First Article'},
  {_id: 'doc-2', _type: 'product', _updatedAt: '2026-03-02T12:00:00Z', title: 'Second Product'},
  {_id: 'doc-3', _type: 'article', _updatedAt: '2026-03-03T12:00:00Z', title: 'Third Article'},
]

describe('Real-Time Updates', () => {
  // Behavior 8 — When a document changes externally, the row updates in place
  it('when data prop changes, the corresponding row updates in place', async () => {
    function LiveTable() {
      const [docs, setDocs] = useState(MOCK_DOCUMENTS)

      return (
        <>
          <button
            data-testid="update-doc"
            onClick={() =>
              setDocs((prev) =>
                prev.map((d) => (d._id === 'doc-1' ? {...d, title: 'Updated Article'} : d)),
              )
            }
          >
            Update
          </button>
          <DocumentTable data={docs} columns={[column.title()]} />
        </>
      )
    }

    renderWithTheme(<LiveTable />)

    // Initial state
    expect(screen.getByText('First Article')).toBeInTheDocument()

    // Simulate external document change
    await userEvent.click(screen.getByTestId('update-doc'))

    // Row should update in place
    expect(screen.getByText('Updated Article')).toBeInTheDocument()
    expect(screen.queryByText('First Article')).not.toBeInTheDocument()

    // Other rows should still be there
    expect(screen.getByText('Second Product')).toBeInTheDocument()
    expect(screen.getByText('Third Article')).toBeInTheDocument()
  })

  // Behavior 9 — During a bulk mutation, rows that are being mutated remain visible
  it('useStableDocuments keeps removed documents for a grace period', () => {
    vi.useFakeTimers()

    const {result, rerender} = renderHook(({docs}) => useStableDocuments(docs), {
      initialProps: {docs: MOCK_DOCUMENTS},
    })

    // Initially returns all documents
    expect(result.current).toHaveLength(3)

    // Remove doc-2 (simulating it disappearing during a mutation)
    const withoutDoc2 = MOCK_DOCUMENTS.filter((d) => d._id !== 'doc-2')
    rerender({docs: withoutDoc2})

    // Doc-2 should still be in the stable result (grace period)
    expect(result.current).toHaveLength(3)
    expect(result.current.find((d) => d._id === 'doc-2')).toBeDefined()

    // After grace period, doc-2 should be removed
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Re-render to pick up the timeout effect
    rerender({docs: withoutDoc2})

    expect(result.current).toHaveLength(2)
    expect(result.current.find((d) => d._id === 'doc-2')).toBeUndefined()

    vi.useRealTimers()
  })
})
