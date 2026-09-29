# Follow-ups from the v7 quality review

Recorded on 2026-09-29 from a four-angle quality review (reuse,
simplification, efficiency, altitude) of `feat/v7-runes-core` against
`main`. These are findings, not yet plans: each needs an improve-style plan
before it is dispatched. The safe cleanups from the same review were applied
directly on the branch.

## Decide before 7.0 is published (they change a public contract)

| #   | Item                                                                                                                                                       | Why now                                                                                                                                           | Size |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `applyHook`, `injectState` and `state` are public on exported components although marked `@internal` (`src/lib/tableComponent.svelte.ts`)                  | 7.0 is the release where hiding them costs nothing extra                                                                                          | S    |
| 2   | Pull model for hooks: a component runs each plugin's hook factory lazily on first `current` read instead of the view model pushing hooks into it           | removes the once-per-row `WeakSet`, the header/body difference and the "page rows are the same objects" assumption; changes the component surface | M    |
| 3   | The view model owns the upstream getter each plugin captures today (`let upstreamRows = () => []` in six plugins) and exposes it through `TablePluginInit` | the ordering rule lives in one place; changes the plugin-author contract                                                                          | M    |

## Performance (after 7.0; measure each against `scripts/perf-baseline.json`)

| #   | Item                                                                                                                                | Where                                                                                                  | Expected effect                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 4   | `current.props` runs every plugin's getter and subscribes the reader to all of them                                                 | `tableComponent.svelte.ts`                                                                             | per-plugin lazy getters: fewer allocations, no unrelated re-renders |
| 5   | Hooks are applied to every row, not just rendered ones                                                                              | `createViewModel.svelte.ts` (`injectedRows`)                                                           | first paint at 10k rows                                             |
| 6   | `current.attrs` allocates and re-stringifies styles on every read, even with no attrs hooks                                         | `tableComponent.svelte.ts`, `utils/attributes.ts`                                                      | per-cell cost on every render                                       |
| 7   | Every component allocates an empty hook record; `columnedRows` clones every row and cell even when no column is hidden or reordered | `tableComponent.svelte.ts`, `bodyRows.ts`                                                              | first paint at 10k rows                                             |
| 8   | Dense virtual scroll walks O(rows) per scroll event and per range change; one `ResizeObserver` per row                              | `addVirtualScroll.svelte.ts`, `utils/HeightManager.ts`                                                 | prefix sums + one shared observer                                   |
| 9   | Per-read scans and allocations in hook getters                                                                                      | `addSortBy`, `addGroupBy`, `addTableFilter`, `addSelectedRows`, `addResizedColumns`, `addExpandedRows` | precomputed maps, hoisted constant objects                          |
| 10  | `RecordSet.addAll` and the row-selection setter copy the record several times                                                       | `reactivity.svelte.ts`, `addSelectedRows.svelte.ts`                                                    | select-all over 10k rows                                            |

## Architecture and typing (after 7.0)

| #   | Item                                                                                                                                     | Size |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 11  | `HeightManager` owns its own version signal (`HeightManager.svelte.ts`), removing the `heightsVersion` counter and the dummy reads       | S    |
| 12  | `noUncheckedIndexedAccess` repo-wide, deleting `tsconfig.lib.json`, the second `svelte-check` pass and the explicit ESLint project block | M    |
| 13  | Pass the column `Value` type through plugin column options, retiring about ten `any` suppressions                                        | L    |
| 14  | `firstRenderedRowId` is assigned as a side effect inside a derivation in `addVirtualScroll.svelte.ts`                                    | S    |
| 15  | Ship attachments (`{@attach}`) alongside the `use:` actions                                                                              | M    |

## Considered and not pursued

- Removing the always-zero `rows` / `pageRows` debug counters: the perf
  bench's JSON and a test read those keys.
- Passing virtual-scroll's writable boxes straight into `pluginState`: the
  read-only wrappers are what stop a consumer writing `scrollTop`.
- `$state` assigned in constructors instead of field initialisers: needs a
  newer Svelte than the `^5.30.0` peer range guarantees.
- `isAllSubRowsExpanded` counting direct children only: it changes which
  descendants are counted, so it is a behaviour change, not a cleanup.
- The `tbody.tr` selection hook reading `getRowState(row)`: the two differ
  on `someSubRowsSelected` for a selected row; aligning them is a behaviour
  change.
