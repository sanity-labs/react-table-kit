import {useCallback, useState} from 'react'
import {useQueryState, parseAsString} from 'nuqs'

export interface GroupedData<T> {
  groupName: string
  rows: T[]
}

export interface UseTableGroupingResult<T> {
  groupBy: string | null
  setGroupBy: (field: string | null) => void
  collapsedGroups: Set<string>
  toggleGroup: (groupName: string) => void
  computeGroups: (data: T[]) => GroupedData<T>[]
}

export function useTableGrouping<T extends Record<string, unknown>>(): UseTableGroupingResult<T> {
  const [groupBy, setGroupByParam] = useQueryState(
    'groupBy',
    parseAsString.withOptions({history: 'replace'}),
  )
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const setGroupBy = useCallback(
    (field: string | null) => {
      setGroupByParam(field)
      setCollapsedGroups(new Set())
    },
    [setGroupByParam],
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

  const computeGroups = useCallback(
    (data: T[]): GroupedData<T>[] => {
      if (!groupBy) return []
      const groupMap = new Map<string, T[]>()
      for (const item of data) {
        const key = String(item[groupBy] ?? '')
        if (!groupMap.has(key)) {
          groupMap.set(key, [])
        }
        groupMap.get(key)!.push(item)
      }
      return Array.from(groupMap.entries()).map(([groupName, rows]) => ({groupName, rows}))
    },
    [groupBy],
  )

  return {groupBy, setGroupBy, collapsedGroups, toggleGroup, computeGroups}
}
