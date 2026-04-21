---
'@sanity-labs/react-table-kit': minor
---

Add a generic `column.string()` helper for text columns with explicit field-based configuration and neutral header defaults derived from the field name when possible.

`column.title()` remains available as a deprecated compatibility preset so existing title-based tables keep working while new code can adopt the more general string helper.
