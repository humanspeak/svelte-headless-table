# Plan 003: Port the four DOM-driven plugins to the v7 contract and un-park them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Read first**: `.agents/.plans/v7-runes-core/001-v7-design-spike.report.md`
> (mechanism decisions) and `src/lib/plugins/addSortBy.svelte.ts`,
> `addPagination.svelte.ts`, `addTableFilter.svelte.ts` as landed by plan 002
> — they are the exemplars for the patterns named below.
>
> **Drift check (run first)**: `git diff --stat 61c36ee..HEAD -- src/lib/plugins/_parked/ src/lib/utils/HeightManager.ts src/lib/utils/scrollAlign.ts`
> Plan 002 only _moved_ the parked files. If their content differs from the
> excerpts below, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH (virtual scroll is the most stateful code in the library)
- **Depends on**: 002-runes-core-and-contract.md
- **Category**: migration (major, v7)
- **Planned at**: commit `61c36ee`, 2026-09-28

## Why this matters

Plan 002 parked the four plugins whose state is driven by the DOM or by
side channels between derivation and hooks: `addGroupBy`,
`addSelectedRows`, `addResizedColumns`, `addVirtualScroll`. Until they are
ported the library is incomplete, the routes and Playwright suites stay
parked, and the `interactions.test.ts` characterization tests cannot run.
After this plan the whole plugin set compiles against the v7 contract with
no `svelte/store` import left anywhere in the library.

## Current state

All four live under `src/lib/plugins/_parked/` (moved verbatim by plan 002;
line numbers below are from the pre-move files at commit `61c36ee`).

### The v7 contract (from plan 002, `src/lib/types/TablePlugin.ts`)

```ts
type Getter<T> = () => T
type DeriveRowsFn<Item> = <Row extends BodyRow<Item>>(_rows: Getter<Row[]>) => Getter<Row[]>
type ElementHook<Props, Attributes> = { props?: Getter<Props>; attrs?: Getter<Attributes> }
interface PluginInitTableState<Item> {
    data: Getter<Item[]>
    rows: Getter<BodyRow<Item>[]>
    pageRows: Getter<BodyRow<Item>[]>
    visibleColumns: Getter<FlatColumn<Item>[]> /* ... */
}
```

Primitives from `src/lib/reactivity.svelte.ts`: `box<T>()` (`Box<T>` with
`current` get/set), `derivedBox(fn)` (`ReadonlyBox<T>`), `keyedBox(recordBox, key)`,
`RecordSet<K>` (`current`, `has`, `add`, `addAll`, `remove`, `removeAll`,
`toggle`, `clear`), `ArraySet<T>` (`current`, `has`, `add`, `remove`,
`toggle(item, { clearOthers })`, `clear`).

Rules every plugin follows (plan 002 Step 10): never assign `$state` while a
getter or `$derived` is being evaluated; allocate handler functions once per
cell, outside the props getter; expose "pre-X rows" by capturing the
upstream getter when `deriveRows` is called.

### addGroupBy (`addGroupBy.ts`, 380 lines)

Lines 287–311: `groupByIds = arraySetStore(initialGroupByIds)`, three hidden
`writable<Record<string, boolean>>` maps (`repeatCellIds`,
`aggregateCellIds`, `groupCellIds`), and

```ts
const deriveRows: DeriveRowsFn<Item> = (rows) => {
    return derived([rows, groupByIds], ([$rows, $groupByIds]) => {
        const $repeatCellIds: Record<string, boolean> = {}
        /* ...aggregate, group... */
        const $groupedRows = getGroupedRows($rows, $groupByIds, columnOptions, {
            repeatCellIds: $repeatCellIds,
            aggregateCellIds: $aggregateCellIds,
            groupCellIds: $groupCellIds,
            allGroupByIds: $groupByIds
        })
        repeatCellIds.set($repeatCellIds) // side channel written inside derived
        aggregateCellIds.set($aggregateCellIds)
        groupCellIds.set($groupCellIds)
        return $groupedRows
    })
}
```

The `tbody.tr.td` hook (lines 343–356) reads the three maps by
`cell.rowColId()`. `getGroupedRows` (exported, pure apart from filling the
maps it is handed) stays as is.

### addSelectedRows (`addSelectedRows.ts`, 400 lines)

- `getRowIsSelectedStore` (136–178): a writable facade whose `subscribe`
  is a `derived(selectedDataIds, ...)` and whose `update` rewrites
  `selectedDataIds` for the row, its sub-rows and its parent
  (`writeSelectedDataIds`, `isAllSubRowsSelectedForRow`, pure helpers above
  line 136 — keep them).
- `getRowState` (219–243) caches `{ isSelected, isSomeSubRowsSelected, isAllSubRowsSelected }`
  per `row.id` in a `MemoryCache`; a manual `selectedDataIds.subscribe`
  clears the cache when the set empties; `invalidate()` unsubscribes.
- `allRowsSelected` / `allPageRowsSelected` (254–336): facades whose
  `subscribe` comes from `derived([tableState.rows | pageRows, selectedDataIds])`
  and whose `set` calls `get(tableState.rows)` then `selectedDataIds.addAll` / `clear` / `removeAll`.
- `someRowsSelected`, `somePageRowsSelected`: plain deriveds.
- Hook `tbody.tr` (363): `{ props: derived(selectedDataIds, ...) }` → `{ selected, someSubRowsSelected, allSubRowsSelected }`.

### addResizedColumns (`addResizedColumns.ts`, 400 lines)

- State (178–189): `columnsWidthState = writable<{ current, start }>`,
  `columnWidths = keyedProp(columnsWidthState, 'current')` (public),
  `dragStartXPosForId: Map`, `nodeForId: Map<string, Element>`.
- Hook `thead.tr.th` (191–389): `dblClick`, `checkDoubleTap` (300 ms
  `setTimeout` flag), `dragStart` (window `mousemove`/`mouseup` or
  `touchmove`/`touchend` listeners), `dragMove` (updates `current` widths
  from `start` + delta, group columns proportionally), `dragEnd`
  (re-measures `getBoundingClientRect().width` into `columnWidths`), then

    ```ts
    const $props = (node: Element) => { nodeForId.set(cell.id, node); if (cell.isFlat()) columnWidths.update(...measure...); return { destroy() { nodeForId.delete(cell.id) } } }
    $props.drag = (node) => { /* mousedown/touchstart → dragStart */ }
    $props.reset = (node) => { /* dblclick → dblClick; touchend → checkDoubleTap */ }   // note: removeEventListener('dblckick') typo at line 362 — fix it
    $props.disabled = isCellDisabled(cell, disabledResizeIds)
    const props = derived([], () => $props)
    const attrs = derived(columnWidths, ($columnWidths) => width ? { style: { width, 'min-width', 'max-width', 'box-sizing' } } : {})
    return { props, attrs }
    ```

- Hook `tbody.tr.td` (390–): `{ attrs: derived(columnWidths, ...) }` same style object.
- Helpers `withWidth`, `groupWidth`, `isCellDisabled`, `getDragXPos` above line 160 are pure — keep.

### addVirtualScroll (`addVirtualScroll.ts`, 880 lines; types in `addVirtualScroll.types.ts`)

The only plugin whose state lives in the **factory** closure (lines
130–846) so it survives view-model rebuilds; `addVirtualScroll(config)`
returns `(init) => instance` where `instance` is built once (867–876) and
`warnIfShared(init.tableState.data)` (853–863) warns if reused across tables.

Stores: `scrollTop`, `viewportHeight`, `rowIds`, `isLoading`,
`hasMoreStore` (adopts a user `Writable` via `isWritable`, 151),
`rowIndexById` (a `Map` in a writable), `contentOffset`, `headerOverlap`;
`datasetRows` / `dataOffset` from config via `toStore` (146–147);
`rowViewport` derived (214); geometry deriveds (`createDenseGeometry` 317,
`createSparseGeometry` 355) producing `visibleRange`, `viewportRange`,
`renderRange`, `totalHeight`, `topSpacerHeight`, `bottomSpacerHeight`;
`totalRows`, `renderedRows` (428–436).

Non-reactive internals: `HeightManager` (`src/lib/utils/HeightManager.ts`,
pure class: `setHeight`, `getHeight`, `getTotalHeight`, `getOffsetForIndex`,
`getViewportRange`, `bufferRange`, sparse helpers, `clear`, `remove`),
`loadMorePending`, `scrollContainer`, `attachedNodes`, `allRowsCache`,
`firstRenderedRowId`, `headerNode`, `rangeRequest: AbortController`.

Side effects: `dedupedRange` (298–315) is a `derived(source, (v, set) => ...)`
that emits only on change and calls `onChange` → `notifyRangeChange` (253)
which `queueMicrotask`s the user's `onRangeChange(range, { signal })` and
aborts the previous request. Actions: `virtualScroll` (485: scroll
listener + `ResizeObserver` → `scrollTop`/`viewportHeight`),
`measureHeaderAction` (646), `measureRowAction` (719: `ResizeObserver` →
`measureRow` → `heightManager.setHeight` then `rowIds.update((v) => v)` to
force re-derivation, 685–690). `scrollToIndex` (565) reads several stores
with `get()`. `derivePageRows` (774–819): an inner `derived(rows)` that
**writes** `rowIds` / `rowIndexById` / `allRowsCache` inside the callback,
then the outer derived slices by `renderRange` and `dataOffset`.

`pluginState` (750–768) exposes read-only `{ subscribe }` facades for the
writables plus the deriveds, three actions, `scrollToIndex`, `measureRow`,
`totalRows`, `renderedRows`, `dataOffset`.

Tests: `addVirtualScroll.test.ts` (~1,600 lines, jsdom with mocked
`ResizeObserver` and `getBoundingClientRect`; look at its `beforeEach` for
the mocks), `addGroupBy.test.ts`, `addSelectedRows.test.ts`,
`addResizedColumns.test.ts`, and `interactions.test.ts` (uses group-by +
pagination and selected-rows + pagination; note its comment that
`allPageRowsSelected` needed a subscribed `pageRows` — in v7 the getter
makes that moot; remove the workaround subscription from the test).

## Commands you will need

| Purpose       | Command                                                      | Expected on success                |
| ------------- | ------------------------------------------------------------ | ---------------------------------- |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                  | two `COMPLETED ... 0 ERRORS` lines |
| Plugin tests  | `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/<name>` | all pass                           |
| Full gate     | `npx -y pnpm@11.24.0 test`                                   | all pass, thresholds met           |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                    | `✔ No issues`                      |
| Package       | `npx -y pnpm@11.24.0 package`                                | publint `All good!`                |

`pnpm` runs as `npx -y pnpm@11.24.0`; put the `/tmp/pnpm-shim/pnpm` wrapper
on PATH before committing (see plan 001).

## Scope

**In scope**:

- `src/lib/plugins/_parked/*` → moved back to `src/lib/plugins/` as
  `addGroupBy.svelte.ts`, `addSelectedRows.svelte.ts`,
  `addResizedColumns.svelte.ts`, `addVirtualScroll.svelte.ts`,
  `addVirtualScroll.types.ts`, their `*.test.ts`, `interactions.test.ts`
- `src/lib/plugins/index.ts` (restore the four exports)
- `tsconfig.lib.json`, `vite.config.ts` (remove the `_parked` excludes), `.agents/.plans/v7-runes-core/PARKED.md` (update)
- `src/lib/plugins/cacheConfig.ts` (delete if no longer imported)
- `src/lib/utils/HeightManager.ts` only if a signature must change (unlikely)

**Out of scope** (do NOT touch):

- `src/routes/**`, `playwright.config.ts`, `tsconfig.json` route exclude — plan 004.
- `docs/**`, `README.md` — plan 005.
- Any plugin ported by plan 002, except to fix a bug you can prove with a test.

## Git workflow

- Branch: `feat/v7-runes-core`. One commit per plugin plus one for un-parking,
  e.g. `feat(virtual-scroll)!: port to the runes plugin contract`. End
  messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Un-park one plugin at a time

For each plugin in the order below: `git mv src/lib/plugins/_parked/addX.ts src/lib/plugins/addX.svelte.ts`
(and its test), restore its export line in `src/lib/plugins/index.ts`, port,
make its test green, commit. Keep the other three parked until their turn so
`pnpm check` stays meaningful.

### Step 2: addGroupBy

- `groupByIds: ArraySet<string>` with `initialGroupByIds`.
- `deriveRows`: one `$derived.by` that runs `getGroupedRows` and returns
  `{ rows, repeatCellIds, aggregateCellIds, groupCellIds }`; `deriveRows`
  returns `() => grouped.rows`; the `tbody.tr.td` hook's `props` getter reads
  `grouped.repeatCellIds[cell.rowColId()] === true` etc. No hidden state is
  written during derivation (it is _produced_ by it).
- `thead.tr.th` props: `toggle` / `clear` allocated once per cell;
  `grouped: groupByIds.has(cell.id)`.
- Test: port `addGroupBy.test.ts` (`get(vm.rows)` → `vm.current.rows`,
  `groupByIds.set([...])` → `groupByIds.current = [...]` or `.add`).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addGroupBy` → all pass.

### Step 3: addSelectedRows

- `selectedDataIds: RecordSet<string>`.
- `getRowState(row)` returns a plain object of views (no cache, no `invalidate`):
  `isSelected: Box<boolean>` whose getter is the v6 `derived` body and whose
  setter is the v6 `update` body applied to `selectedDataIds.current`;
  `isSomeSubRowsSelected`, `isAllSubRowsSelected: ReadonlyBox<boolean>`.
  Delete `invalidate` and the `MemoryCache` (plan 005 documents the removal).
- `allRowsSelected: Box<boolean>` — getter over `tableState.rows()` and
  `selectedDataIds.current`; setter runs the v6 `setAllRowsSelected` body
  reading `tableState.rows()` directly (no `get`). `allPageRowsSelected`
  likewise over `tableState.pageRows()`. `someRowsSelected`,
  `somePageRowsSelected: ReadonlyBox<boolean>`.
- Hook `tbody.tr` props getter: the three booleans, computed per read.
- Tests: `addSelectedRows.test.ts` and the selected-rows cases in
  `interactions.test.ts`; delete the `vm.pageRows.subscribe(() => {})`
  workaround and its comment (the getter reads live).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addSelectedRows` → all pass.

### Step 4: addResizedColumns

- `columnsWidthState = box<{ current: Record<string, number>; start: Record<string, number> }>(...)`;
  public `columnWidths = keyedBox`-style view: `{ get current() { return columnsWidthState.current.current }, set current(v) { columnsWidthState.current = { ...columnsWidthState.current, current: v } } }`.
- The handlers (`dblClick`, `checkDoubleTap`, `dragStart`, `dragMove`,
  `dragEnd`) are unchanged in logic; every `store.update(fn)` becomes
  `b.current = fn(b.current)`. All of them run from DOM events, so writing
  state there is allowed.
- `$props` (the action object with `.drag`, `.reset`, `.disabled`) is built
  once per cell; the hook returns `{ props: () => $props, attrs: () => styleFor(columnWidths.current) }`.
  Fix the `'dblckick'` typo while here (line 362) and add a test that the
  `dblclick` listener is removed on destroy.
- Tests: `addResizedColumns.test.ts` (`columnWidths.set` → `.current =`).
  The existing `CurrentHost.test.svelte` case "updates current.attrs when
  plugin state changes outside the template" (plan 002 migrated it) must
  pass again once this plugin is back — run `src/lib/tableComponent.current.test.ts`.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addResizedColumns src/lib/tableComponent.current` → all pass.

### Step 5: addVirtualScroll

Keep the factory-closure structure and every algorithm; change the
reactive substrate only:

- Writables → `box`: `scrollTop`, `viewportHeight`, `rowIds`, `isLoading`,
  `contentOffset`, `headerOverlap`, `rowIndexById` (box of `Map`).
  `hasMore`: accept `boolean | Box<boolean>` (a user-supplied box is adopted;
  drop the `isWritable` branch). `totalRows` / `dataOffset` config: accept
  `number | Getter<number> | ReadonlyBox<number>`; normalise to a getter in
  a local `toGetter` helper (replaces `toStore`).
- Deriveds → `$derived.by` in the same closure; `dedupedRange` becomes a
  `$derived.by` that returns the previous object when `start`/`end` are
  unchanged (so downstream deriveds see the same reference and skip) —
  **without** calling `onChange` inside it. The range-change notification
  moves into the `virtualScroll` action: create `const stop = $effect.root(() => { $effect(() => { const range = viewportRange(); untrack(() => notifyRangeChange(range)) }) })`
  when the action mounts and call `stop()` in `destroy`. This is the one
  legitimate effect in the library (it is tied to a DOM node's lifetime).
  `notifyRangeChange` keeps `queueMicrotask` and the `AbortController`.
- `measureRow`: after `heightManager.setHeight`, bump a `heightsVersion`
  box (`heightsVersion.current += 1`) instead of `rowIds.update((v) => v)`;
  every derived that reads heights also reads `heightsVersion.current`.
- `derivePageRows`: the inner `syncedRows` derived wrote `rowIds` and
  `rowIndexById` during derivation. In v7 compute
  `const synced = $derived.by(() => { /* build ids + index from rows() */ return { rows: rows(), ids, index } })`
  and have `rowIds` / `rowIndexById` become getters over `synced`
  (`() => synced.ids`) rather than boxes. `allRowsCache` and
  `firstRenderedRowId` stay plain variables assigned inside `$derived.by`
  (they are not reactive state).
- `scrollToIndex`: replace every `get(store)` with the box/getter read.
- `pluginState`: every former store becomes `ReadonlyBox` (`{ get current() }`)
  or `Box` (`isLoading` stays internal-write only → ReadonlyBox);
  actions and functions unchanged; `dataOffset` is a `ReadonlyBox`.
- Hook `tbody.tr`: `props: () => rowPropsById().get(row.id) ?? FALLBACK_ROW_PROPS`
  where `rowPropsById` is a `$derived.by` over `synced.index` and the offset.
- Tests: port `addVirtualScroll.test.ts`. Its `beforeEach` mocks
  `ResizeObserver` and `getBoundingClientRect`; keep them. Reactivity
  assertions that subscribed to stores use `withEffectRoot` from
  `src/lib/test/effectRoot.svelte.ts` (plan 002) or read boxes directly.
  The `onRangeChange` tests must mount the `virtualScroll` action on a node
  (they do today) because the notifier now lives there.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addVirtualScroll` → all pass.

### Step 6: Un-park the rest and run the full gate

- Move `interactions.test.ts` back; remove the `_parked` excludes from
  `tsconfig.lib.json` and `vite.config.ts`; `rmdir src/lib/plugins/_parked`;
  update `PARKED.md` (only the routes remain parked).
- Delete `src/lib/plugins/cacheConfig.ts` and `@humanspeak/memory-cache`
  usages if nothing imports them any more (`grep -rn "memory-cache\|MemoryCache" src/lib`); if the dependency is
  unused, remove it from `package.json` `dependencies` and run
  `npx -y pnpm@11.24.0 install` (lockfile update is in scope for that one line).

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
grep -rn "svelte/store" src/lib --include=*.ts --include=*.svelte   # no output
ls src/lib/plugins/_parked 2>&1                                       # No such file or directory
```

## Test plan

- The existing four plugin suites plus `interactions.test.ts` are the
  characterization tests; port idioms, keep assertions.
- New tests: resized-columns `reset` action removes its `dblclick` listener
  on destroy (pins the typo fix); virtual-scroll `onRangeChange` fires once
  per distinct range and is aborted by the next range (existing tests cover
  this — confirm they still assert it through the action-mounted effect);
  group-by td props are `false` (not `undefined`) for unflagged cells.
- Verification: `npx -y pnpm@11.24.0 test` → all pass, thresholds met.

## Done criteria

- [ ] `src/lib/plugins/_parked/` no longer exists; `PARKED.md` lists only route/e2e items
- [ ] `npx -y pnpm@11.24.0 check` exits 0 (both tsconfigs)
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `npx -y pnpm@11.24.0 test` exits 0 with coverage thresholds met, including `interactions.test.ts`
- [ ] `grep -rn "svelte/store" src/lib --include=*.ts --include=*.svelte` returns nothing
- [ ] `grep -rn "\$effect" src/lib --include=*.ts` lists only the `virtualScroll` action in `addVirtualScroll.svelte.ts` (and the test helper)
- [ ] `.agents/.plans/v7-runes-core/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A parked file's content differs from the excerpts (drift).
- A virtual-scroll test can only be made green by changing the range or
  spacer arithmetic; report the test and the numbers.
- `$effect.root` inside the `virtualScroll` action throws under jsdom or
  SSR (`src/lib/ssr.test.ts` renders a virtual-scroll table on the server
  — check it), which would mean the notifier needs a different home.
- The `selectedDataIds` setter path (`isSelected.current = true` on a row
  with sub-rows) cannot reproduce the v6 parent/child linking exactly.

## Maintenance notes

- Reviewers: check that no `$derived.by` body in these four files assigns
  to a box; the only writes are in DOM handlers, actions, setters and the
  effect inside `virtualScroll`.
- The `heightsVersion` counter is the one place v7 still "nudges" a derived;
  a future `HeightManager` could be a `$state`-backed class instead.
- `getRowState` no longer caches: if profiling shows per-row object churn
  on selection-heavy tables, add a `WeakMap<BodyRow, state>` keyed by the
  row object (not by id, which is what forced the invalidation dance in v6).
