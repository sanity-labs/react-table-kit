import React from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange?: () => void
  readOnly?: boolean
  /** Width in px (default: 54) */
  width?: number
  /** Height in px (default: 30) */
  height?: number
}

/**
 * Custom toggle switch sized for table cells.
 * Uses Sanity UI theme tokens for colors.
 * Sanity UI's Switch component can't be resized.
 */
export function ToggleSwitch({
  checked,
  onChange,
  readOnly,
  width = 54,
  height = 30,
}: ToggleSwitchProps) {
  const thumbSize = height - 4
  const translateX = checked ? width - thumbSize - 2 : 2

  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={readOnly ? undefined : onChange}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width,
        height,
        borderRadius: height / 2,
        border: 'none',
        padding: 0,
        cursor: readOnly ? 'default' : 'pointer',
        opacity: readOnly ? 0.5 : 1,
        backgroundColor: checked
          ? 'var(--card-badge-positive-dot-color, #43b888)'
          : 'var(--card-border-color, #ccc)',
        transition: 'background-color 150ms ease',
        outline: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          width: thumbSize,
          height: thumbSize,
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transform: `translateX(${translateX}px)`,
          transition: 'transform 150ms ease',
        }}
      />
    </button>
  )
}
