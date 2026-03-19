import React, {useState, useCallback} from 'react'
import {useOptimisticValue} from './useOptimisticValue'
import {DayPicker} from 'react-day-picker'
import 'react-day-picker/style.css'
// date-fns not needed — we parse dates manually to avoid UTC timezone issues
import {Button, Popover, useClickOutsideEvent, useGlobalKeyDown} from '@sanity/ui'
import {CalendarIcon} from '@sanity/icons'
import type {DocumentBase} from './types'

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
  columnId,
  toneByDateRange = false,
}: {
  value: unknown
  row: T
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  columnId: string
  toneByDateRange?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [displayValue, setOptimistic] = useOptimisticValue(value)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return
      // Use local date parts directly to avoid timezone shifts.
      // react-day-picker creates Date at midnight local time;
      // format() also uses local time but can drift at day boundaries.
      // Extracting year/month/day directly is timezone-safe.
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const formatted = `${y}-${m}-${d}`
      console.log('[DatePickerCell] onSave called with:', {
        documentId: row._id,
        field: columnId,
        value: formatted,
      })
      setOptimistic(formatted)
      setOpen(false)
      onEdit?.(row, formatted)
    },
    [row, onEdit, columnId, setOptimistic],
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

  // Parse current value for calendar selection.
  // IMPORTANT: Use local date parsing, not parseISO.
  // parseISO('2026-03-11') creates midnight UTC, which in negative UTC offsets
  // (e.g., Montreal UTC-5) becomes the previous day in local time.
  // new Date(y, m, d) creates midnight LOCAL time — matching what the user sees.
  const selectedDate = (() => {
    const str = String(displayValue ?? '')
    if (!str) return undefined
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return undefined
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  })()

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
        <div
          onKeyDown={handleKeyDown}
          ref={popoverRef}
          style={{
            background: 'var(--card-bg-color, #fff)',
            border: '1px solid var(--card-border-color, #e0e0e0)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
            padding: '12px',
          }}
        >
          <style>{`
            .sanity-date-picker .rdp-root {
              --rdp-accent-color: var(--card-focus-ring-color, #2276fc);
              --rdp-accent-background-color: color-mix(in srgb, var(--card-focus-ring-color, #2276fc) 10%, transparent);
              --rdp-day-height: 36px;
              --rdp-day-width: 36px;
              --rdp-day_button-height: 32px;
              --rdp-day_button-width: 32px;
              --rdp-day_button-border-radius: 6px;
              --rdp-today-color: var(--card-focus-ring-color, #2276fc);
              --rdp-selected-border: 2px solid var(--rdp-accent-color);
              --rdp-outside-opacity: 0.4;
              font-family: inherit;
              font-size: 13px;
              color: var(--card-fg-color, #101112);
            }
            .sanity-date-picker .rdp-month_caption {
              font-weight: 600;
              font-size: 14px;
              padding: 4px 0 8px;
            }
            .sanity-date-picker .rdp-weekday {
              font-size: 12px;
              font-weight: 500;
              color: var(--card-muted-fg-color, #6e7683);
            }
            .sanity-date-picker .rdp-day_button:hover {
              background: var(--card-bg2-color, #f2f3f5);
              border-radius: 6px;
            }
            .sanity-date-picker .rdp-selected .rdp-day_button {
              background: var(--card-focus-ring-color, #2276fc);
              color: #fff;
              font-weight: 600;
            }
            .sanity-date-picker .rdp-today:not(.rdp-selected) .rdp-day_button {
              font-weight: 700;
              color: var(--card-focus-ring-color, #2276fc);
            }
            .sanity-date-picker .rdp-nav button {
              color: var(--card-fg-color, #101112);
              border-radius: 6px;
            }
            .sanity-date-picker .rdp-nav button:hover {
              background: var(--card-bg2-color, #f2f3f5);
            }
          `}</style>
          <div className="sanity-date-picker">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate}
              showOutsideDays
            />
          </div>
        </div>
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
          <div className="flex items-center gap-2 justify-between">
            {cellRenderer(displayValue, row)}
            <CalendarIcon className="text-3xl" />
          </div>
        </Button>
      </div>
    </Popover>
  )
}
