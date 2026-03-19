import {useEffect, useRef, useState} from 'react'
import {TextArea} from '@sanity/ui'
import {useOptimisticValue} from './useOptimisticValue'
import type {DocumentBase} from './types'

/**
 * EditableTextCell — inline text editing with auto-resize textarea.
 * Enter saves, Escape cancels, blur saves.
 * Supports optimistic updates.
 */
export function EditableTextCell<T extends DocumentBase>({
  value,
  row,
  onEdit,
  cellRenderer,
  columnId,
}: {
  value: unknown
  row: T
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  columnId: string
}) {
  const [displayValue, setOptimistic] = useOptimisticValue(value)
  const [localValue, setLocalValue] = useState(String(value ?? ''))
  const committedRef = useRef(String(value ?? ''))
  const cancellingRef = useRef(false)

  // Sync local value when server data changes
  useEffect(() => {
    const serverStr = String(value ?? '')
    if (serverStr !== committedRef.current) {
      setLocalValue(serverStr)
      committedRef.current = serverStr
    }
  }, [value])

  const handleSave = () => {
    if (cancellingRef.current) {
      cancellingRef.current = false
      return
    }
    const trimmed = localValue
    if (trimmed !== committedRef.current) {
      committedRef.current = trimmed
      setOptimistic(trimmed)
      onEdit?.(row, trimmed)
    }
  }

  const handleCancel = () => {
    cancellingRef.current = true
    setLocalValue(committedRef.current)
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to fit ALL content — on mount and on every change
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  // Resize on mount and whenever value changes
  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current)
  }, [localValue])

  // Also resize on mount after first paint
  useEffect(() => {
    if (textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) autoResize(textareaRef.current)
      })
    }
  }, [])

  return (
    <label
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        cursor: 'text',
        display: 'flex',
        width: '100%',
      }}
    >
      <div style={{flex: 1, minWidth: 0}}>
        <TextArea
          ref={textareaRef}
          role="textbox"
          rows={1}
          value={localValue}
          border={false}
          fontSize={1}
          padding={2}
          radius={0}
          __unstable_disableFocusRing
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setLocalValue(e.target.value)
            if (e.target) autoResize(e.target)
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSave()
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              handleCancel()
              e.currentTarget.blur()
            }
          }}
          onBlur={handleSave}
          style={{
            background: 'transparent',
            resize: 'none',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </label>
  )
}
