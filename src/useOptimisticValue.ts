import {useState, useEffect, useRef, useCallback} from 'react'

/**
 * Hook for optimistic UI with race-condition protection.
 *
 * Tracks an "edit generation" counter. Each call to setOptimistic bumps the generation.
 * The optimistic override only clears when:
 * 1. The server value matches the optimistic value
 * 2. No newer edits are pending (editGen === patchedGen)
 *
 * This prevents stale server responses from clearing optimistic state prematurely.
 *
 * @param serverValue - The real value from the server/subscription
 * @param debounceMs - How long to wait before marking a generation as "patched" (default: 350)
 * @returns [displayValue, setOptimistic, clearOptimistic]
 */
export function useOptimisticValue<T>(
  serverValue: T,
  debounceMs = 350,
): [T, (value: T) => void, () => void] {
  const [optimistic, setOptimisticState] = useState<T | undefined>(undefined)
  const editGenRef = useRef(0)
  const patchedGenRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only clear optimistic when server catches up AND no newer edits pending
  useEffect(() => {
    const shouldClear =
      optimistic !== undefined &&
      serverValue === optimistic &&
      editGenRef.current === patchedGenRef.current
    if (shouldClear) {
      setOptimisticState(undefined)
    }
  }, [serverValue, optimistic])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const setOptimistic = useCallback(
    (value: T) => {
      editGenRef.current += 1
      setOptimisticState(value)
      const gen = editGenRef.current

      // Mark generation as patched after debounce window
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (editGenRef.current === gen) {
          patchedGenRef.current = gen
        }
        timerRef.current = null
      }, debounceMs)
    },
    [debounceMs],
  )

  const clearOptimistic = useCallback(() => {
    setOptimisticState(undefined)
  }, [])

  const displayed = optimistic !== undefined ? optimistic : serverValue

  return [displayed, setOptimistic, clearOptimistic]
}
