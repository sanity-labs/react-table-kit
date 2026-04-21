import {useQueryState, parseAsString} from 'nuqs'
import {useCallback, useEffect, useRef, useState} from 'react'

interface UseTableGroupingOptions {
  groupBy?: string | null
  onGroupByChange?: (field: string | null) => void
}

export interface GroupedData<T> {
  groupName: string
  rows: T[]
}

export interface UseTableGroupingResult<T> {
  groupBy: string | null
  setGroupBy: (field: string | null) => void
  collapsedGroups: Set<string>
  toggleGroup: (groupId: string) => void
  clearCollapsedGroups: () => void
  computeGroups: (data: T[]) => GroupedData<T>[]
}

export function useTableGrouping<T extends Record<string, unknown>>(
  options?: UseTableGroupingOptions,
): UseTableGroupingResult<T> {
  const [groupBy, setGroupByParam] = useQueryState(
    'groupBy',
    parseAsString.withOptions({history: 'replace'}),
  )
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const effectiveGroupBy = options?.groupBy ?? groupBy
  const previousGroupByRef = useRef<string | null>(effectiveGroupBy ?? null)

  useEffect(() => {
    if (previousGroupByRef.current !== (effectiveGroupBy ?? null)) {
      previousGroupByRef.current = effectiveGroupBy ?? null
      setCollapsedGroups(new Set())
    }
  }, [effectiveGroupBy])

  const setGroupBy = useCallback(
    (field: string | null) => {
      if (options?.onGroupByChange) {
        options.onGroupByChange(field)
      } else {
        setGroupByParam(field)
      }
      setCollapsedGroups(new Set())
    },
    [options, setGroupByParam],
  )

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }, [])

  const clearCollapsedGroups = useCallback(() => {
    setCollapsedGroups(new Set())
  }, [])

  const computeGroups = useCallback(
    (data: T[]): GroupedData<T>[] => {
      if (!effectiveGroupBy) return []
      const groupMap = new Map<string, T[]>()
      for (const item of data) {
        const key = String(item[effectiveGroupBy] ?? '')
        if (!groupMap.has(key)) {
          groupMap.set(key, [])
        }
        groupMap.get(key)!.push(item)
      }
      return Array.from(groupMap.entries()).map(([groupName, rows]) => ({groupName, rows}))
    },
    [effectiveGroupBy],
  )

  return {
    groupBy: effectiveGroupBy ?? null,
    setGroupBy,
    collapsedGroups,
    toggleGroup,
    clearCollapsedGroups,
    computeGroups,
  }
}
