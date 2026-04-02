import {CalendarIcon} from '@sanity/icons'
import {Button, Popover, useClickOutsideEvent, useGlobalKeyDown} from '@sanity/ui'
import React, {useState, useCallback} from 'react'
import {DayPicker} from 'react-day-picker'

import {useOptimisticValue} from '../../hooks/useOptimisticValue'
import type {DocumentBase} from '../../types/tableTypes'
import {
  CalendarPopoverContent,
  formatDateOnlyString,
  parseDateOnlyString,
} from '../filters/CalendarPopoverContent'

/**
 * DatePickerCell — renders a date cell that opens a calendar popover for editing.
 * Uses react-day-picker for the calendar and Sanity UI Popover for the container.
 * Trigger is a Sanity UI Button with calendar icon.
 */
export function DatePickerCell<T extends DocumentBase>({
  value,
  row,
  onEdit,
  cellRenderer,
  toneByDateRange = false,
}: {
  value: unknown
  row: T
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  toneByDateRange?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [displayValue, setOptimistic] = useOptimisticValue(value)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return
      const formatted = formatDateOnlyString(date)
      setOptimistic(formatted)
      setOpen(false)
      onEdit?.(row, formatted)
    },
    [row, onEdit, setOptimistic],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }, [])

  useClickOutsideEvent(open ? () => setOpen(false) : undefined, () => [
    popoverRef.current,
    triggerRef.current,
  ])

  useGlobalKeyDown((event) => {
    if (!open || event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    setOpen(false)
  })

  const selectedDate = parseDateOnlyString(String(displayValue ?? '') || undefined)

  const buttonTone = (() => {
    if (!toneByDateRange) return 'default'
    if (!selectedDate) return 'default'
    const now = new Date()
    const diffMs = selectedDate.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 48)
    if (diffDays < 0) return 'critical'
    if (diffDays <= 1) return 'caution'
    return 'primary'
  })()

  return (
    <Popover
      animate
      content={
        <CalendarPopoverContent onKeyDown={handleKeyDown} popoverRef={popoverRef}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            showOutsideDays
          />
        </CalendarPopoverContent>
      }
      open={open}
      placement="bottom-start"
      portal
    >
      <div ref={triggerRef}>
        <Button
          className="w-full"
          mode="ghost"
          onClick={() => setOpen((current) => !current)}
          padding={2}
          paddingLeft={4}
          tone={buttonTone}
        >
          <div className="flex items-center justify-between gap-2">
            {cellRenderer(displayValue, row)}
            <CalendarIcon className="text-3xl" />
          </div>
        </Button>
      </div>
    </Popover>
  )
}
