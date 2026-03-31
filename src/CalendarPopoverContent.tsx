import 'react-day-picker/style.css'

export function CalendarPopoverContent({
  children,
  onKeyDown,
  popoverRef,
}: {
  children: React.ReactNode
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  popoverRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      onKeyDown={onKeyDown}
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
        .sanity-date-picker .rdp-range_start .rdp-day_button,
        .sanity-date-picker .rdp-range_end .rdp-day_button {
          background: var(--card-focus-ring-color, #2276fc);
          color: #fff;
          font-weight: 600;
        }
        .sanity-date-picker .rdp-range_middle {
          background: color-mix(in srgb, var(--card-focus-ring-color, #2276fc) 12%, transparent);
        }
        .sanity-date-picker .rdp-range_middle .rdp-day_button {
          color: var(--card-fg-color, #101112);
          font-weight: 500;
        }
        .sanity-date-picker .rdp-today:not(.rdp-selected):not(.rdp-range_start):not(.rdp-range_end) .rdp-day_button {
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
      <div className="sanity-date-picker">{children}</div>
    </div>
  )
}

export function parseDateOnlyString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function formatDateOnlyString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
