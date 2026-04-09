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
  column.title({field: 'title'}),
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
