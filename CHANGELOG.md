# @sanity-labs/react-table-kit

## 1.2.0

### Minor Changes

- c1700b9: Add a generic `column.string()` helper for text columns with explicit field-based configuration and neutral header defaults derived from the field name when possible.

  `column.title()` remains available as a deprecated compatibility preset so existing title-based tables keep working while new code can adopt the more general string helper.

## 1.1.0

### Minor Changes

- aa9f84d: Add new filter bar composition APIs so release and perspective controls can render beside search and visually dock to the table surface.

  This release adds `filterBarSearchLeading`, filter surface tone and style props, docking support, and consistent default-toned animated filter popovers with bottom-start placement.
