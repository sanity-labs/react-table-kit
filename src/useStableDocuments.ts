import {useEffect, useRef, useState} from 'react'

import type {DocumentBase} from './types'

const DEFAULT_GRACE_PERIOD = 3000 // 3 seconds

/**
 * useStableDocuments — keeps removed documents visible for a grace period.
 * Prevents rows from vanishing during bulk mutations when documents
 * temporarily disappear from query results.
 *
 * Uses refs to track previous documents. When a document is removed from
 * the input array, the hook keeps the last known version for the grace period.
 */
export function useStableDocuments<T extends DocumentBase>(
  documents: T[],
  gracePeriod: number = DEFAULT_GRACE_PERIOD,
): T[] {
  // Track documents that were removed but are still in grace period
  const [ghostDocs, setGhostDocs] = useState<Map<string, T>>(new Map())
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const prevDocsRef = useRef<Map<string, T>>(new Map())

  // Build a set of current document IDs for fast lookup
  const currentIds = new Set(documents.map((d) => d._id))

  // Check for removed documents
  const prevDocs = prevDocsRef.current
  const newGhosts = new Map(ghostDocs)
  let ghostsChanged = false

  // Find documents that were in previous set but not in current
  for (const [id, doc] of prevDocs) {
    if (!currentIds.has(id) && !ghostDocs.has(id)) {
      newGhosts.set(id, doc)
      ghostsChanged = true

      // Set a timeout to remove the ghost after grace period
      const timeout = setTimeout(() => {
        setGhostDocs((prev) => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        timeoutsRef.current.delete(id)
      }, gracePeriod)

      timeoutsRef.current.set(id, timeout)
    }
  }

  // Remove ghosts that have reappeared in the live data
  for (const [id] of ghostDocs) {
    if (currentIds.has(id)) {
      newGhosts.delete(id)
      ghostsChanged = true
      const timeout = timeoutsRef.current.get(id)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(id)
      }
    }
  }

  // Update prev docs ref for next render comparison
  const newPrevDocs = new Map<string, T>()
  for (const doc of documents) {
    newPrevDocs.set(doc._id, doc)
  }
  prevDocsRef.current = newPrevDocs

  // Combine current documents with ghost documents
  const result = [...documents]
  for (const [id, doc] of ghostDocs) {
    if (!currentIds.has(id)) {
      result.push(doc)
    }
  }

  // Schedule ghost state updates via effect (can't setState during render)
  // Intentionally syncs ghost state after render; deps omitted to mirror render-time ghost recomputation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ghostsChanged) {
      setGhostDocs(newGhosts)
    }
  })

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Snapshot the map at cleanup time (timeouts may have been added during the hook lifetime).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timeouts = timeoutsRef.current
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout)
      }
    }
  }, [])

  return result
}
