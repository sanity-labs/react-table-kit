import {screen, within} from '@testing-library/react'
import React from 'react'
import {describe, it, expect, vi} from 'vitest'

import {column} from '../src/columns'
import {DocumentTable} from '../src/DocumentTable'
import {renderWithTheme} from './helpers'

const mockData = [
  {_id: 'doc-1', _type: 'article', title: 'First', status: 'draft', _updatedAt: '2026-01-01'},
  {
    _id: 'doc-2',
    _type: 'article',
    title: 'Second',
    status: 'pending_review',
    _updatedAt: '2026-01-02',
  },
]

/**
 * Badge column DX and edit behavior fixes:
 * 1. badge(field, config) should work without requiring colorMap
 * 2. colorMap values can be string (tone) or {tone, label} for display names
 * 3. badge with edit: true + colorMap should auto-derive select options
 * 4. badge cell should use label from colorMap for display
 */
describe('Badge column improvements', () => {
  // ── Overloaded signature ──────────────────────────────────────────────

  it('Behavior 1: column.badge(field, { edit: true }) works without colorMap', () => {
    const col = column.badge({field: 'status', edit: true})

    expect(col.id).toBe('status')
    expect(col.edit).toBeDefined()
    expect(col.edit!.mode).toBe('select')
    expect(col.edit!._autoSave).toBe(true)
  })

  it('Behavior 2: column.badge(field, { filterable: false }) applies config without colorMap', () => {
    const col = column.badge({field: 'status', filterable: false})

    expect(col.filterable).toBe(false)
    expect(col.edit).toBeUndefined()
  })

  // ── Rich colorMap with labels ─────────────────────────────────────────

  it('Behavior 3: colorMap with {tone, label} objects auto-derives labeled options sorted by label', () => {
    const col = column.badge({
      field: 'status',
      colorMap: {
        pending_review: {tone: 'caution', label: 'Pending Review'},
        approved: {tone: 'positive', label: 'Approved'},
        draft: 'default',
      },
      edit: true,
    })

    expect(col.edit!.options).toEqual([
      {value: 'approved', label: 'Approved', tone: 'positive'},
      {value: 'draft', label: 'Draft', tone: 'default'},
      {value: 'pending_review', label: 'Pending Review', tone: 'caution'},
    ])
  })

  it('Behavior 4: colorMap with string tones auto-capitalizes labels', () => {
    const col = column.badge({
      field: 'status',
      colorMap: {
        draft: 'caution',
        published: 'positive',
      },
      edit: true,
    })

    expect(col.edit!.options).toEqual([
      {value: 'draft', label: 'Draft', tone: 'caution'},
      {value: 'published', label: 'Published', tone: 'positive'},
    ])
  })

  // ── Badge cell display ────────────────────────────────────────────────

  it('Behavior 5: badge cell uses label from colorMap for display', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.badge({
            field: 'status',
            colorMap: {
              pending_review: {tone: 'caution', label: 'Pending Review'},
              draft: {tone: 'default', label: 'Draft'},
            },
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('Pending Review')).toBeInTheDocument()
    expect(within(table).getByText('Draft')).toBeInTheDocument()
  })

  it('Behavior 6: badge cell with string tone auto-capitalizes value', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.badge({field: 'status', colorMap: {draft: 'caution', pending_review: 'default'}}),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // String tone = auto-capitalize the raw value
    expect(within(table).getByText('Draft')).toBeInTheDocument()
    expect(within(table).getByText('Pending_review')).toBeInTheDocument()
  })

  // ── Edit menu with options ────────────────────────────────────────────

  it('Behavior 7: badge with edit: true and colorMap renders editable cell with button', () => {
    renderWithTheme(
      <DocumentTable
        data={mockData}
        columns={[
          column.title(),
          column.badge({
            field: 'status',
            colorMap: {
              draft: {tone: 'default', label: 'Draft'},
              pending_review: {tone: 'caution', label: 'Pending Review'},
            },
            edit: true,
          }),
        ]}
      />,
    )

    const table = screen.getByRole('table')
    // The badge should be wrapped in a clickable button (EditableSelectCell)
    const draftBadge = within(table).getByText('Draft')
    const editButton = draftBadge.closest('button')
    expect(editButton).toBeTruthy()
  })

  // ── Backward compatibility ────────────────────────────────────────────

  it('Behavior 8: column.badge(field, colorMap) without config still works', () => {
    const col = column.badge({field: 'status', colorMap: {draft: 'caution', published: 'positive'}})

    expect(col.id).toBe('status')
    expect(col.filterable).toBe(true)
    expect(col.edit).toBeUndefined()
  })

  it('Behavior 9: column.badge(field) with no args still works', () => {
    const col = column.badge({field: 'status'})

    expect(col.id).toBe('status')
    expect(col.filterable).toBe(true)
    expect(col.edit).toBeUndefined()
  })
})
