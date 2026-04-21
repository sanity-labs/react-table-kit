# `@sanity-labs/react-table-kit`

Composable React table primitives and helpers for Sanity-flavored editorial UIs.

This package is the UI-first foundation for table rendering, filtering, grouping,
selection, inline editing, and comment-thread helper utilities. It does not
fetch data from `@sanity/sdk-react`; use `@sanity-labs/sdk-table-kit` when you
want the SDK-backed integration layer.

## Installation

```bash
pnpm add @sanity-labs/react-table-kit
```

Peer dependencies:

- `@sanity/types`
- `@sanity/ui`
- `react`
- `react-dom`
- `styled-components`

## Quick Start

```tsx
import {DocumentTable, column} from '@sanity-labs/react-table-kit'

const columns = [
  column.string({field: 'title'}),
  column.badge({
    field: 'status',
    colorMap: {
      draft: 'caution',
      published: 'positive',
    },
  }),
]

export function ExampleTable() {
  return (
    <DocumentTable
      data={[
        {_id: 'article-1', _type: 'article', status: 'draft', title: 'First article'},
        {_id: 'article-2', _type: 'article', status: 'published', title: 'Second article'},
      ]}
      columns={columns}
    />
  )
}
```

`column.string()` is the generic text-column helper. `column.title()` remains available as a
deprecated compatibility preset for the common `title` field.

## Server-Backed Grouping

Use controlled `serverGroup` mode when your backing data source already returns rows in grouped order and needs to re-query when the user changes the active group:

```tsx
import {DocumentTable, column} from '@sanity-labs/react-table-kit'

const columns = [
  column.string({field: 'title'}),
  column.custom({
    field: 'status',
    header: 'Status',
    groupable: true,
    groupValue: (rawValue) => String(rawValue ?? '').replace('-', ' '),
    groupField: 'coalesce(status, "draft")',
  }),
]

export function GroupedTable({
  groupBy,
  onGroupByChange,
  rows,
}: {
  groupBy: string | null
  onGroupByChange: (groupBy: string | null) => void
  rows: Array<{_id: string; _type: string; title: string; status: string}>
}) {
  return (
    <DocumentTable
      data={rows}
      columns={columns}
      serverGroup={{
        groupBy,
        onGroupByChange,
        groupableColumnIds: ['status'],
      }}
    />
  )
}
```

Notes:

- `serverGroup.groupBy` is the currently active group key, or `null` for no grouping.
- `serverGroup.onGroupByChange` is called when the user changes the group from the filter bar.
- `groupValue` controls the visible group label for display-oriented columns.
- `groupField` lets custom columns group by a different backend field or expression than the cell
  value.

## Primary Exports

- `DocumentTable`
- `column`
- `filter`
- `FilterBar`
- `useDocumentTable()`
- `useFilterUrlState()`
- `useTableFilters()`
- `TableCellChrome`
- `buildCommentDocument()`
- `buildCommentThreads()`
- `groupUnresolvedCommentsByField()`

## Scripts

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
