---
name: migrate-from-svelte-headless-table
description:
    Move a project from the unmaintained svelte-headless-table package (bryanmylee, 0.17.x / 0.18.x,
    Svelte 3/4) to @humanspeak/svelte-headless-table v7 on Svelte 5. Use when package.json or imports
    reference 'svelte-headless-table' without the @humanspeak scope.
metadata:
    type: lifecycle
    library: '@humanspeak/svelte-headless-table'
    library_version: '7.0.1'
requires:
    - core
    - migrate-v6-to-v7
sources:
    - humanspeak/svelte-headless-table:docs/src/routes/docs/guides/migrating-from-svelte-headless-table/+page.svx
---

# Migrate from svelte-headless-table (0.17 / 0.18) → @humanspeak v7

`svelte-headless-table` (no scope) last published 0.18.3 on 2024-10-28 and only supports Svelte 3/4. `@humanspeak/svelte-headless-table` is its maintained Svelte 5 successor. Its 6.x line has the same API as original 0.17.7–0.18.3; v7 then removes the store API.

## Steps

1. **Svelte 5 first.** If `svelte` is below `^5.30`, run `npx sv migrate svelte-5` and fix that separately before touching tables.
2. **Swap the package.**

    ```sh
    npm uninstall svelte-headless-table
    npm install @humanspeak/svelte-headless-table
    ```

3. **Rename every import**, including the `/plugins` entry point: replace `'svelte-headless-table` with `'@humanspeak/svelte-headless-table` across the project. Do not keep both packages installed; duplicate types confuse TypeScript.
4. **Apply the v7 changes.** The code is now 6.x-shaped (stores, `Subscribe`, `$pageRows`). Follow the `migrate-v6-to-v7` skill: run its inventory greps and convert every hit.
5. **Server-side pagination from 0.17.6 or earlier.** Those versions exposed a writable `serverItemCount` (or `serverItemsCount`) on plugin state that the app `.set()` after each fetch. In v7 the app owns the count and passes a getter:

<!-- legacy-snippet -->

```ts
// 0.17.0–0.17.6
const table = createTable(data, { page: addPagination({ serverSide: true }) })
const { serverItemCount } = table.createViewModel(columns).pluginStates.page
serverItemCount.set(res.totalItems)
```

```ts
// @humanspeak/svelte-headless-table 7
let total = $state(0)
const table = createTable(() => rows, {
    page: addPagination({ serverSide: true, serverItemCount: () => total })
})
total = res.totalItems
```

6. **Verify.** `grep -rn "from 'svelte-headless-table" src` returns nothing, `svelte-check` passes, and table pages sort, filter, paginate and select as before.

## Gained in the move

`addDataExport` (JSON / CSV / objects), `addFlatten` and `addVirtualScroll` are new; all 12 original plugins keep their names.

Full guide: `https://table.svelte.page/docs/guides/migrating-from-svelte-headless-table.md`.
