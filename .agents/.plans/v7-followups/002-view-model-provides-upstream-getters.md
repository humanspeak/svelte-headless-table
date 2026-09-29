# Plan 002: The view model hands each plugin its upstream rows instead of plugins capturing them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-followups/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 317a8c8..HEAD -- src/lib/types/TablePlugin.ts src/lib/createViewModel.svelte.ts src/lib/plugins/`
> Plan 001 of this batch changes `createViewModel.svelte.ts` (hook binding)
> and `addDataExport.svelte.ts`; that is expected. For everything else,
> compare the "Current state" excerpts against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (plugin-author contract; must land before 7.0 is published)
- **Effort**: M
- **Risk**: LOW–MED (additive to the contract; six plugins change how they read their input)
- **Depends on**: 001-components-pull-hooks-from-a-binding.md (same file; run after it)
- **Category**: tech-debt (plugin contract)
- **Planned at**: commit `317a8c8`, 2026-09-29

## Why this matters

Several plugins expose "the rows before I transformed them"
(`preSortedRows`, `preFilteredRows`, pagination's item count). The only way
a plugin can know its input today is to capture the getter its own
`deriveRows` receives:

```ts
let upstreamRows: Getter<BodyRow<Item>[]> = () => []
const preSortedRows = readonlyBox(() => upstreamRows())
const deriveRows = (rows) => {
    upstreamRows = rows /* ... */
}
```

Six plugins repeat this. It works only because of an ordering rule that is
written in comments and enforced nowhere: the view model must call
`deriveRows` before anyone reads the plugin's state, otherwise the
placeholder silently returns `[]`. The v7 docs teach third-party authors the
same trick as "rule 3". The view model is the one place that actually knows
each plugin's input, so it should provide it.

## Current state

- `src/lib/types/TablePlugin.ts` lines 40–51:

    ```ts
    export type TablePluginInit<Item, ColumnOptions> = {
        pluginName: string
        tableState: PluginInitTableState<Item>
        columnOptions: Record<string, ColumnOptions>
    }
    ```

- `src/lib/createViewModel.svelte.ts`:
    - 335–348: plugins are instantiated first, each with
      `plugin({ pluginName, tableState: pluginInitTableState, columnOptions })`;
      the result is `pluginEntries: [string, TablePluginInstance][]`.
    - 420–426 (rows) and the matching block for page rows (~465–470): the
      chain folds **only the derive functions**, so the plugin name is lost:

        ```ts
        const deriveRowsFns = pluginInstances.map((p) => p.deriveRows).filter(nonUndefined)
        let rows: Getter<DataBodyRow<Item, Plugins>[]> = () => columnedRows
        for (const fn of deriveRowsFns) rows = fn(rows)
        const rowsFn = rows
        ```

        `deriveFlatColumns` is folded the same way at ~400–407.
- Capture sites (line numbers at `317a8c8`):
    - `addSortBy.svelte.ts` 297–303 — `upstreamRows`, `preSortedRows`
    - `addTableFilter.svelte.ts` 244–251 — `upstreamRows`, `preFilteredRows`
      (plus `tableCellMatches`, the plugin's own output, which is **not**
      upstream and stays)
    - `addColumnFilters.svelte.ts` 234–241 and 270 — `upstreamRows`,
      `preFilteredRows`, and the per-column value lists read
      `upstreamRows()`; `filteredRows` is the plugin's own output and stays
    - `addPagination.svelte.ts` 169–184 — `upstreamRows` feeds
      `createPageState({ items: () => upstreamRows(), ... })`; captured in
      `derivePageRows`
    - `addVirtualScroll.svelte.ts` 196, 204, 860 — a plugin-scope
      `box<Getter<BodyRow<Item>[]>>` written in `derivePageRows` under
      `untrack`, because the plugin's state outlives a view model and must
      follow the most recent one
    - `addGroupBy.svelte.ts` ~314 captures `cellFlags`, its own output — not
      upstream; leave it
- `readonlyBox(get)` in `src/lib/reactivity.svelte.ts` wraps a getter as a
  `ReadonlyBox`.
- Docs that teach the capture trick:
  `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` lines 360–370
  (the worked plugin) and 407 (rule 3),
  `docs/src/routes/docs/plugins/overview/+page.svx` line 111, and
  `.agents/.plans-closed/v7-runes-core/RELEASE-NOTES-v7.md` line 67.
- Conventions: 4-space indent, no semicolons, single quotes;
  `// trunk-ignore(eslint/<rule>)`; library files are checked with
  `tsconfig.lib.json`. Never write `$state` while a getter or derivation
  evaluates.

## Commands you will need

| Purpose       | Command                                                                                         | Expected on success                |
| ------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                                                     | two `COMPLETED ... 0 ERRORS` lines |
| Unit tests    | `npx -y pnpm@11.24.0 test`                                                                      | all pass, coverage thresholds met  |
| Package       | `npx -y pnpm@11.24.0 package`                                                                   | publint `All good!`                |
| e2e           | `PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line` | `36 passed`, `2 skipped`           |
| Docs          | `(cd docs && npx -y pnpm@11.24.0 check)` after `package`                                        | `0 ERRORS`                         |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                                                       | `✔ No issues`                      |

`pnpm` is not on PATH; always use `npx -y pnpm@11.24.0`. Put
`/tmp/pnpm-shim` first on PATH for Playwright. After any docs command run
`git checkout -- docs/src/lib/demo-loaders.ts` from the repo root.

## Scope

**In scope**:

- `src/lib/types/TablePlugin.ts` (`TablePluginInit`)
- `src/lib/createViewModel.svelte.ts` (plugin instantiation and the three folds)
- `src/lib/plugins/addSortBy.svelte.ts`, `addTableFilter.svelte.ts`, `addColumnFilters.svelte.ts`, `addPagination.svelte.ts`, `addVirtualScroll.svelte.ts`
- Tests: a new `src/lib/createViewModel.upstream.test.ts`; existing plugin tests only if they construct a plugin by hand with an init object
- Hosts and tests that build a plugin inline (`src/lib/CurrentHost.test.svelte`, `VmCurrentHost.test.svelte`, `publicApi.types.test.ts`) only if the new required init member breaks them
- `docs/src/routes/docs/guides/migrating-to-v7/+page.svx`, `docs/src/routes/docs/plugins/overview/+page.svx`, `.agents/.plans-closed/v7-runes-core/RELEASE-NOTES-v7.md`

**Out of scope** (do NOT touch):

- The derive function signatures: `deriveRows(rows)` still receives its
  input getter. This plan adds a second, earlier way to reach it.
- Plugins' own derived outputs (`filteredRows`, `tableCellMatches`,
  `cellFlags`): they are produced inside the plugin's derivation and are
  not "upstream".
- `src/lib/tableComponent.svelte.ts` and hook binding — plan 001.

## Git workflow

- Branch: `feat/v7-runes-core` (already checked out; PR #335 is open on it).
- Commits: `feat(plugins)!: the view model provides each plugin's upstream rows`
  and `docs: plugin authors read upstream rows from init`. End messages with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing test that pins the new contract

Create `src/lib/createViewModel.upstream.test.ts`:

```ts
import { createTable } from './createTable.js'
import { addPagination } from './plugins/addPagination.svelte.js'
import { addSortBy } from './plugins/addSortBy.svelte.js'
import type { TablePlugin } from './types/TablePlugin.js'

interface Item {
    name: string
    age: number
}
const items: Item[] = [
    { name: 'b', age: 2 },
    { name: 'a', age: 1 },
    { name: 'c', age: 3 }
]
const names = (rows: { isData(): boolean }[]) =>
    rows.map((row) => (row.isData() ? (row as { original: Item }).original.name : '?'))

it('gives a plugin the rows that enter its position in the chain', () => {
    let seen: (() => unknown[]) | undefined
    const spy: TablePlugin<Item, Record<string, never>, Record<string, never>> = ({ upstream }) => {
        seen = upstream.rows
        return { pluginState: {}, deriveRows: (rows) => rows }
    }
    const table = createTable(items, {
        sort: addSortBy({ initialSortKeys: [{ id: 'age', order: 'asc' }] }),
        spy
    })
    const vm = table.createViewModel([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    // The spy sits after sort, so its upstream is the sorted rows.
    expect(names(seen?.() as never)).toEqual(['a', 'b', 'c'])
    expect(names(vm.pluginStates.sort.preSortedRows.current)).toEqual(['b', 'a', 'c'])
})

it('is readable as soon as the plugin is created, before anything reads the view model', () => {
    /* read upstream.rows() inside the plugin factory's returned pluginState getter and assert it is not [] once the view model exists */
})

it('gives page-row plugins the rows entering derivePageRows', () => {
    /* a spy after addPagination({ initialPageSize: 2 }) sees 2 rows through upstream.pageRows */
})

it('a plugin with no deriveRows still sees the rows at its position', () => {
    /* spy without deriveRows, placed after sort: upstream.rows() is sorted */
})
```

Fill in the three sketched tests. Use plain arrays as data.

**Verify**: `npx -y pnpm@11.24.0 check` → FAILS: `Property 'upstream' does
not exist on type 'TablePluginInit<…>'`. If it passes, STOP.

### Step 2: The contract

In `src/lib/types/TablePlugin.ts` add to `TablePluginInit`:

```ts
/**
 * The values entering this plugin's position in each derivation chain:
 * what its own `deriveRows` / `derivePageRows` / `deriveFlatColumns`
 * receives, available from the moment the plugin is created. Read them
 * inside a getter, a `$derived` or a hook so the read is tracked.
 */
upstream: PluginUpstream<Item>
```

```ts
export interface PluginUpstream<Item> {
    /** The rows before this plugin's `deriveRows`. */
    rows: Getter<BodyRow<Item>[]>
    /** The rows before this plugin's `derivePageRows`. */
    pageRows: Getter<BodyRow<Item>[]>
    /** The columns before this plugin's `deriveFlatColumns`. */
    flatColumns: Getter<FlatColumn<Item>[]>
}
```

Export `PluginUpstream` from the same file (it is re-exported through
`src/lib/plugins/index.ts`; update the snapshot in
`src/lib/index.exports.test.ts` only if type exports appear in it — they
should not, it lists runtime keys).

**Verify**: `npx -y pnpm@11.24.0 check` → errors now only where an init
object is built (the view model, tests that construct one by hand).

### Step 3: The view model records each plugin's input

In `src/lib/createViewModel.svelte.ts`:

1. Before instantiating plugins, create one record per chain of _slots_
   the fold will fill:

    ```ts
    const emptyRows: Getter<DataBodyRow<Item, Plugins>[]> = () => []
    const upstreamRowsFor = new Map<string, Getter<DataBodyRow<Item, Plugins>[]>>()
    /* likewise upstreamPageRowsFor, upstreamFlatColumnsFor */
    ```

    and pass each plugin getters that look the slot up when called:

    ```ts
    upstream: {
        rows: () => (upstreamRowsFor.get(pluginName) ?? emptyRows)(),
        pageRows: () => (upstreamPageRowsFor.get(pluginName) ?? emptyRows)(),
        flatColumns: () => (upstreamFlatColumnsFor.get(pluginName) ?? (() => flatColumns))()
    }
    ```

    These maps are plain lookups filled once while the view model is built
    (not rune state, never written during a derivation). Add the repo's
    usual `// trunk-ignore(eslint/svelte/prefer-svelte-reactivity)` with a
    one-line reason if the lint rule fires.

2. Fold over `pluginEntries` (name + instance) instead of the bare function
   lists, recording the input for **every** plugin, whether or not it
   defines the derive function:

    ```ts
    let rows: Getter<DataBodyRow<Item, Plugins>[]> = () => columnedRows
    for (const [name, instance] of pluginEntries) {
        upstreamRowsFor.set(name, rows)
        if (instance.deriveRows !== undefined) rows = instance.deriveRows(rows)
    }
    const rowsFn = rows
    ```

    Do the same for page rows (seed `() => injectedRows`) and flat columns
    (seed `() => flatColumns`). Keep `derivedCount` in `_debug` reporting the
    same numbers (count the plugins that define each function).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/createViewModel.upstream`
→ the first and fourth tests pass; the `preSortedRows` assertion still
passes (sort has not been changed yet).

### Step 4: Plugins read `upstream` instead of capturing

For each plugin, destructure `upstream` from the init argument and delete
the `let upstreamRows` placeholder, its comment and the assignment inside
the derive function:

- `addSortBy`: `const preSortedRows = readonlyBox(upstream.rows)`.
- `addTableFilter`: `const preFilteredRows = readonlyBox(upstream.rows)`.
- `addColumnFilters`: `preFilteredRows = readonlyBox(upstream.rows)`; the
  per-column value lists read `upstream.rows()`.
- `addPagination`: `createPageState({ items: upstream.pageRows, ... })`.
- `addVirtualScroll`: its state is created in the factory closure and must
  follow the latest view model, so the plugin function (called once per
  view model) assigns `upstreamRows.current = upstream.pageRows` where it
  currently does so inside `derivePageRows`; keep the `untrack` and the
  comment explaining why a box is used. `derivePageRows` no longer writes
  anything.

Inside each derive function keep using the `rows` parameter for the
computation (it is the same getter).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib` → all pass;
`grep -rn "let upstreamRows" src/lib/plugins` → no output.

### Step 5: Docs teach the new rule

- Migration guide: in the worked plugin (lines ~355–375) replace the
  captured `let upstream` with `({ upstream }) =>` and
  `preFilteredRows: readonlyBox(upstream.rows)` — and because `readonlyBox`
  is not exported from the package, write it out as
  `{ get current() { return upstream.rows() } }` in the docs example.
  Rewrite rule 3 (line ~407): "**Read pre-transform rows from
  `upstream`.** The init argument's `upstream.rows`, `upstream.pageRows` and
  `upstream.flatColumns` are the values entering your plugin's position in
  each chain."
- `docs/src/routes/docs/plugins/overview/+page.svx`: the same rule in the
  "three rules" sentence (line ~111) and document `upstream` next to
  `tableState` and `columnOptions`.
- `RELEASE-NOTES-v7.md`: rule 3 in "For plugin authors".
- The guide's example plugin must still type-check: paste it into a
  temporary `.svelte.ts` file under `src/lib/test/`, run
  `npx -y pnpm@11.24.0 check`, then delete the file.

**Verify**: `npx -y pnpm@11.24.0 package && (cd docs && npx -y pnpm@11.24.0 check)`
→ 0 errors; `git checkout -- docs/src/lib/demo-loaders.ts`;
`grep -rn "capturing the upstream getter" docs/src .agents/.plans-closed/v7-runes-core/RELEASE-NOTES-v7.md` → no output.

### Step 6: Full gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line | tail -3
(cd docs && npx playwright test --reporter=line | tail -2) && git checkout -- docs/src/lib/demo-loaders.ts
```

## Test plan

- Red first: Step 1 fails to type-check on `upstream`; green after Step 3.
- New tests: the four in `createViewModel.upstream.test.ts` (position in
  the chain, available at creation, page rows, plugins without a derive
  function).
- Characterization: every plugin suite and `interactions.test.ts` pass
  unchanged — `preSortedRows`, `preFilteredRows`, `pageCount` and the
  virtual-scroll rebuild tests (`addVirtualScroll.test.ts`, "survives a view
  model rebuild") are the ones that would catch a wrong slot.

## Done criteria

- [ ] `grep -rn "let upstreamRows" src/lib/plugins` → no output
- [ ] `TablePluginInit` has `upstream`; `PluginUpstream` is exported from `src/lib/types/TablePlugin.ts`
- [ ] The four new tests pass; `npx -y pnpm@11.24.0 test` exits 0 with thresholds met
- [ ] `npx -y pnpm@11.24.0 check` exits 0; docs `check` 0 errors
- [ ] Playwright Chromium + Firefox: 36 passed, 2 skipped; docs smoke tests pass
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `.agents/.plans/v7-followups/README.md` status row updated

## STOP conditions

- Reading `upstream.rows()` from a plugin creates a cycle
  (`derived_references_self`, a stack overflow, or an infinite loop): a
  plugin reads its own upstream inside the derivation that produces it.
  Report the plugin and line.
- The virtual-scroll "survives a view model rebuild" tests fail after Step
  4: the geometry is following the wrong view model. Report; do not change
  the tests.
- A third-party-shaped plugin in the repo (hosts, docs examples) cannot be
  typed without `upstream` being optional. Do not make it optional to get
  past a type error; report which file builds an init object by hand.

## Maintenance notes

- `upstream` is additive: `deriveRows(rows)` still receives the same
  getter. A plugin may use either; `upstream` exists for state that must be
  readable before the chain runs.
- The slot maps are filled once per view model in plugin order. If plugins
  ever become reorderable at runtime, the slots have to be recomputed with
  the chain.
- Update item 3 in this folder's README when this lands.
