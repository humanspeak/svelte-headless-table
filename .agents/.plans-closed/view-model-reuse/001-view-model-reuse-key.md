# Plan 001: Let `Table#createViewModel` reuse an unchanged view model so plugin state survives a rebuild

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/view-model-reuse/README.md`).
>
> **Drift check (run first)**:
> `git diff --stat 29b4ec0..HEAD -- src/lib/createTable.ts src/lib/createViewModel.ts src/lib/plugins/addPagination.ts src/lib/plugins/addSortBy.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `29b4ec0`, 2026-08-27

## Why this matters

`Table#createViewModel` builds a brand-new view model on every call, and
building a view model instantiates every plugin from scratch. A consumer whose
column array is derived — a new array identity per reactive pass, same columns
in it — therefore gets fresh plugin instances on every rebuild. Because each
plugin's state lives in the instance it just discarded, a same-shape column swap
silently sends a paginated table back to page 1 and drops the user's sort order.
Nothing errors; the user just loses their place.

After this plan, a caller can pass `reuseKey` to declare "these columns are the
same ones you saw last time," and get the previous view model back — plugin
state intact. The option is opt-in, so no existing caller changes behavior.

## Current state

### The files

- `src/lib/createTable.ts` — the `Table` class. Long-lived: created once by
  `createTable()` and kept for the life of the table, which is why it is the
  right place to hold a cache. Its `createViewModel` method (lines 155–160) is
  a bare delegate today.
- `src/lib/createViewModel.ts` — the free `createViewModel` function and the
  `CreateViewModelOptions` interface (lines 183–187). Instantiates every plugin
  (lines 271–287).
- `src/lib/plugins/addPagination.ts` — holds `pageIndex` / `pageSize` per
  instance; the most legible victim of the rebuild.
- `src/lib/plugins/addSortBy.ts` — holds `sortKeys` per instance; the second
  victim.

### `src/lib/createTable.ts:147-160` — the delegate to change

```ts
    /**
     * Creates a reactive view model from the table and columns.
     * The view model provides all the data needed to render the table.
     *
     * @param columns - The column definitions.
     * @param options - Optional configuration for the view model.
     * @returns A TableViewModel with reactive stores for rendering.
     */
    createViewModel(
        columns: Column<Item, Plugins>[],
        options?: CreateViewModelOptions<Item>
    ): TableViewModel<Item, Plugins> {
        return createViewModel(this, columns, options)
    }
```

`getFlatColumnIds` is **already imported** at the top of this file (from
`$lib/columns.js`) — you do not need to add an import for it. Its signature,
at `src/lib/columns.ts:416-418`:

```ts
export const getFlatColumnIds = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columns: Column<Item, Plugins>[]
): string[] => columns.flatMap((c) => (c.isFlat() ? [c.id] : c.isGroup() ? c.ids : []))
```

### `src/lib/createViewModel.ts:183-187` — the options interface to extend

```ts
export interface CreateViewModelOptions<Item> {
    /** Optional function to generate a unique ID for each data item. */
    /* trunk-ignore(eslint/no-unused-vars) */
    rowDataId?: (item: Item, index: number) => string
}
```

Note the `trunk-ignore` comment above `rowDataId`. This repo suppresses lint
warnings with `trunk-ignore`, **never** with `eslint-disable` (see `CLAUDE.md`).
A function-typed field in an interface trips `eslint/no-unused-vars` on its
parameter names; `reuseKey` is a `string`, so it needs no such comment.

### `src/lib/createViewModel.ts:200-205` — the free function that must stay unchanged

```ts
export const createViewModel = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    table: Table<Item, Plugins>,
    columns: Column<Item, Plugins>[],
    { rowDataId }: CreateViewModelOptions<Item> = {}
): TableViewModel<Item, Plugins> => {
    const { data, plugins } = table
```

It destructures only `rowDataId`, so it will ignore `reuseKey` — that is
intended. Reuse is a `Table` concern because only the `Table` instance outlives
the calls. **Do not add caching to this free function.**

### `src/lib/createViewModel.ts:271-287` — why a rebuild costs state

```ts
const pluginInstances = Object.fromEntries(
    Object.entries(plugins).map(([pluginName, plugin]) => {
        const columnOptions = Object.fromEntries(
            $flatColumns
                .map((c) => {
                    const option = c.plugins?.[pluginName]
                    if (option === undefined) return undefined
                    return [c.id, option] as const
                })
                .filter(nonUndefined)
        )
        return [
            pluginName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            plugin({ pluginName, tableState: pluginInitTableState as any, columnOptions })
        ]
    })
) as {
    [K in keyof Plugins]: ReturnType<Plugins[K]>
}
```

Every call runs `plugin(...)` again, minting new stores.

### `src/lib/plugins/addPagination.ts:163-181` — the state that gets lost

```ts
    () => {
        const prePaginatedRows = writable<BodyRow<Item>[]>([])
        const paginatedRows = writable<BodyRow<Item>[]>([])
        const { pageSize, pageIndex, pageCount, hasPreviousPage, hasNextPage } = createPageStore({
            items: prePaginatedRows,
            initialPageIndex,
            initialPageSize,
            serverSide,
            serverItemCount
        })
```

`createPageStore` is called per instance, so `pageIndex` resets to
`initialPageIndex` on every rebuild.

### `src/lib/plugins/addSortBy.ts:274-281` — the same, for sort

```ts
    ({ columnOptions }) => {
        const disabledSortIds = Object.entries(columnOptions)
            .filter(([, option]) => option.disable === true)
            .map(([columnId]) => columnId)

        const sortKeys = createSortKeysStore(initialSortKeys)
```

### Repo conventions you must match

- **Formatting/lint authority is Trunk.** `.trunk/trunk.yaml` exists and enables
  `prettier@3.9.6` and `eslint@10.8.0`. Use `trunk fmt` and `trunk check`.
  `package.json` also has `lint`/`format` scripts; prefer the trunk commands.
- **Suppress lint with `trunk-ignore`, not `eslint-disable`** (from `CLAUDE.md`).
  Note `createViewModel.ts` still contains one legacy `eslint-disable-next-line`
  — do not copy that pattern into new code.
- 4-space indent, no semicolons, single quotes — all enforced by `trunk fmt`.
  Write it roughly right and let the formatter settle it.
- Every exported symbol and public field carries a JSDoc block. Match the
  density of the surrounding code in `createTable.ts`.
- **Warnings use a bare `console.warn`**, not a dev-gated logger. Exemplar:
  `src/lib/plugins/addGroupBy.ts:159-161`.
- Tests are colocated: `src/lib/plugins/addPagination.test.ts` sits beside
  `addPagination.ts`. `test`/`expect` are **globals** (`vite.config.ts` sets
  `test.globals: true`), so tests import only `svelte/store` helpers and the
  units under test. `addPagination.test.ts` uses bare top-level `test(...)`
  calls with no `describe` wrapper — match that.

### Prior art in this batch's initiative

The sibling problem for `addVirtualScroll` was fixed at commit `29b4ec0` by
hoisting that plugin's state up one closure level. **That approach does not
generalize** and you should not attempt it here: `addSortBy` (and
`addTableFilter`, `addGroupBy`, `addResizedColumns`, `addColumnFilters`,
`addSelectedRows`) genuinely consume the per-view-model `columnOptions` /
`tableState` argument, so their state cannot simply move up. Reuse at the
`Table` level is what covers them.

## Commands you will need

| Purpose          | Command                                          | Expected on success                |
| ---------------- | ------------------------------------------------ | ---------------------------------- |
| Install          | `pnpm install`                                   | exit 0                             |
| Typecheck        | `pnpm check`                                     | final line contains `0 ERRORS`     |
| Tests (filtered) | `pnpm exec vitest run <path> --reporter=default` | reported pass/fail per test        |
| Tests (all)      | `pnpm test:only`                                 | exit 0, all tests pass             |
| Lint             | `trunk check`                                    | exit 0                             |
| Format           | `trunk fmt`                                      | exit 0 or 1 (1 = it reformatted)   |
| Package build    | `pnpm build`                                     | ends with `All good!` from publint |

Notes:

- `pnpm check` prints 3 pre-existing warnings from `src/routes/**`. Warnings are
  fine; the final line must report `0 ERRORS` (it looks like
  `COMPLETED 849 FILES 0 ERRORS 3 WARNINGS 2 FILES_WITH_PROBLEMS`).
- Do **not** pass `--reporter=basic` to vitest — this repo is on vitest 4, where
  that reporter was removed and the run dies with a startup error. Use
  `--reporter=default`.

## Scope

**In scope** (the only files you should modify):

- `src/lib/createTable.ts`
- `src/lib/createViewModel.ts` (the `CreateViewModelOptions` interface only)
- `src/lib/createTable.test.ts` (exists — append a nested `describe`)
- `src/lib/plugins/addPagination.test.ts`
- `src/lib/plugins/addSortBy.test.ts`
- `docs/src/routes/docs/api/create-view-model/+page.svx`
- `.agents/.plans/view-model-reuse/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- The free `createViewModel` function body in `src/lib/createViewModel.ts` —
  only its `CreateViewModelOptions` interface changes. It has no place to cache
  and adding one there would leak across tables.
- `src/lib/plugins/addPagination.ts`, `addSortBy.ts`, or any other plugin
  source. This plan changes no plugin. If you find yourself editing a plugin to
  make a test pass, that is a STOP condition.
- `src/lib/plugins/addVirtualScroll.ts` and `addVirtualScroll.test.ts` — already
  fixed by a different mechanism at commit `29b4ec0`. Leave alone.
- `docs/static/**` — docs-kit generates those mirrors from the site pages at
  build time. Hand-editing them is wasted work that gets overwritten.
- `src/routes/**` — demo pages, not library surface.

## Git workflow

- Branch: work on the current branch unless told otherwise; do not create one.
- Commit per logical unit. This repo uses Conventional Commits with a scope —
  recent examples from `git log --oneline`:
    - `feat(virtual-scroll): sparse windowing over server-paged datasets (#295)`
    - `fix(docs): drop the canonical-case redirect hook`
      A reasonable split here is one `test(view-model): ...` commit for Step 2 and
      one `feat(view-model): ...` commit for Steps 3–5.
- A husky `pre-commit` hook runs `trunk fmt`, `trunk check` and `svelte-check`
  and will block a commit that fails them. Committing the red tests from Step 2
  is fine — the hook does not run vitest.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `reuseKey` to `CreateViewModelOptions` (type only, no behavior)

The Step 2 tests cannot compile without this field, and `svelte-check` is part
of the commit gate. So the type lands first, inert.

In `src/lib/createViewModel.ts`, extend the interface at lines 183–187:

```ts
export interface CreateViewModelOptions<Item> {
    /** Optional function to generate a unique ID for each data item. */
    /* trunk-ignore(eslint/no-unused-vars) */
    rowDataId?: (item: Item, index: number) => string
    /**
     * Opt into reusing the previously built view model.
     *
     * Building a view model instantiates every plugin, so a caller that
     * rebuilds on each reactive pass — a derived column array with a new
     * identity but the same columns in it — loses plugin state such as the
     * current page index or sort order. Passing the same `reuseKey` as the
     * previous call declares the columns unchanged and returns that call's view
     * model instead, state intact. A different key, or no key, builds fresh.
     *
     * Honored by `Table#createViewModel` only; the standalone `createViewModel`
     * function has nowhere to cache and ignores it.
     */
    reuseKey?: string
}
```

Change nothing else in this file.

**Verify**: `pnpm check` → final line contains `0 ERRORS`

### Step 2: Write failing tests that reproduce the state loss

Three test files. In each, model the structure on the tests already in the file.

**2a. `src/lib/plugins/addPagination.test.ts`** — append at the end of the file.
Existing tests in this file are bare top-level `test(...)` calls, e.g.:

```ts
test('custom initialPageSize and initialPageIndex', () => {
    const data = readable(createItems(50))
    const table = createTable(data, {
        page: addPagination({ initialPageSize: 20, initialPageIndex: 2 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const { pageSize, pageIndex } = vm.pluginStates.page
    expect(get(pageSize)).toBe(20)
    expect(get(pageIndex)).toBe(2)
})
```

Add these, reusing the file's existing `createItems` helper and its
`import { get, readable } from 'svelte/store'`:

1. `'pageIndex survives a rebuild when reuseKey is unchanged'` — build a table
   with `addPagination()`, build a view model with `{ reuseKey: 'cols' }`, set
   `pageIndex` to `3`, build a **second** view model from a **freshly created,
   structurally identical** column array with the same `{ reuseKey: 'cols' }`,
   and assert `get(second.pluginStates.page.pageIndex)` is `3`.
   Build the columns via a local `const makeColumns = () => table.createColumns([...])`
   called twice, so the two arrays are genuinely distinct objects.
2. `'pageIndex resets on a rebuild without reuseKey'` — same, but pass no
   options to either `createViewModel` call; assert the second `pageIndex` is
   `0`. This documents the unchanged default and **passes today**.
3. `'a different reuseKey rebuilds'` — same, but the second call passes
   `{ reuseKey: 'other' }`; assert the second `pageIndex` is `0`.

**2b. `src/lib/plugins/addSortBy.test.ts`** — append one test,
`'sort keys survive a rebuild when reuseKey is unchanged'`: build a table with
`addSortBy()`, build a view model with `{ reuseKey: 'cols' }`, set
`pluginStates.sort.sortKeys` to `[{ id: 'name', order: 'desc' }]`, rebuild with
a fresh column array and the same key, assert the second view model's
`sortKeys` still holds that one key. This file imports
`{ get, readable } from 'svelte/store'` and has a module-level `data` store —
reuse them; add your own columns inside the test.

**2c. `src/lib/createTable.test.ts`** — this file already exists (~670 lines)
and already contains a `describe('Table.createViewModel method', ...)` block
starting at line 471, with nested `describe('positive cases', ...)` and `it(...)`
calls. **Do not create a new file and do not add bare top-level `test(...)`
calls here** — this file's convention differs from the plugin test files. Add a
new `describe('reuseKey', () => { ... })` block nested inside the existing
`describe('Table.createViewModel method', ...)`, using `it(...)` for each case.
Its existing exemplar, at line 473:

```ts
    describe('positive cases', () => {
        it('creates a view model with all required properties', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' }),
                table.column({ header: 'Age', accessor: 'age' })
            ])

            const vm = table.createViewModel(columns)
```

The file's existing `User` interface and `sampleData` fixture are at the top —
reuse them rather than defining new ones. Cover the mechanism itself:

1. `'the same reuseKey returns the same view model object'` — assert
   `second === first` (identity).
2. `'no reuseKey always builds a new view model'` — assert `second !== first`.
3. `'a reuseKey with different column ids rebuilds and warns'` — same key, but
   the second column array has a different set of accessors (e.g. first call
   `['name']`, second `['name', 'id']`). Assert `second !== first` and that a
   `console.warn` spy was called with a string containing `reuseKey`. Spy with
   `vi.spyOn(console, 'warn').mockImplementation(() => {})` and `mockRestore()`
   at the end — `vi` is available as a global, and
   `src/lib/plugins/addVirtualScroll.test.ts` shows this exact spy pattern in
   its `'one plugin result drives one table'` test.
4. `'changing rowDataId with the same reuseKey rebuilds'` — same key, but the
   second call passes a different `rowDataId` function; assert `second !== first`.

**Verify**:
`pnpm exec vitest run src/lib/createTable.test.ts src/lib/plugins/addPagination.test.ts src/lib/plugins/addSortBy.test.ts --reporter=default`

Expected — these specific failures, and only these:

- `pageIndex survives a rebuild when reuseKey is unchanged` → `expected +0 to be 3`
- `sort keys survive a rebuild when reuseKey is unchanged` → the sort keys array is empty
- `the same reuseKey returns the same view model object` → the two objects are not identical
- `a reuseKey with different column ids rebuilds and warns` → `console.warn` was not called

And these must already PASS: `pageIndex resets on a rebuild without reuseKey`,
`a different reuseKey rebuilds`, `no reuseKey always builds a new view model`,
`changing rowDataId with the same reuseKey rebuilds`.

If a test you expected to fail passes instead, the reproduction is wrong:
STOP and report.

### Step 3: Implement the memo on `Table`

In `src/lib/createTable.ts`, add a private cache field to the `Table` class and
rewrite `createViewModel` (lines 155–160). Target shape:

```ts
    /**
     * The view model returned by the last `createViewModel` call that carried a
     * `reuseKey`, with the inputs it was built from. One slot rather than a map:
     * a table renders one view model at a time, and keeping every key alive
     * would pin an unbounded number of plugin instances for the life of the
     * table.
     */
    private cachedViewModel?: {
        key: string
        columnIds: string[]
        rowDataId: CreateViewModelOptions<Item>['rowDataId']
        viewModel: TableViewModel<Item, Plugins>
    }

    createViewModel(
        columns: Column<Item, Plugins>[],
        options?: CreateViewModelOptions<Item>
    ): TableViewModel<Item, Plugins> {
        const { reuseKey, rowDataId } = options ?? {}
        if (reuseKey === undefined) {
            return createViewModel(this, columns, options)
        }

        const columnIds = getFlatColumnIds(columns)
        const cached = this.cachedViewModel
        if (cached?.key === reuseKey && cached.rowDataId === rowDataId) {
            if (
                cached.columnIds.length === columnIds.length &&
                cached.columnIds.every((id, i) => id === columnIds[i])
            ) {
                return cached.viewModel
            }
            // The key promises the columns are unchanged and they are not.
            // Rebuilding is the safe reading — returning the cached model here
            // would render the previous columns.
            console.warn(
                'The `reuseKey` passed to `createViewModel` matched the previous call but the columns changed. ' +
                    'Rebuilding. Give each distinct set of columns its own `reuseKey`.'
            )
        }

        const viewModel = createViewModel(this, columns, options)
        this.cachedViewModel = { key: reuseKey, columnIds, rowDataId, viewModel }
        return viewModel
    }
```

Points that are load-bearing, not stylistic:

- `getFlatColumnIds` is already imported in this file — do not add the import.
- The `rowDataId` comparison is **identity**, not deep. A caller passing a fresh
  arrow function each pass will never hit the cache. That is correct and
  intended: a different `rowDataId` produces different row identity, and reusing
  across one would hand back rows keyed the old way.
- The column-id check is a **safety net, not the contract**. It cannot detect a
  changed header or accessor function under the same ids — `reuseKey` is the
  caller's assertion and this only catches the loud half of getting it wrong.
- Keep the existing JSDoc block above `createViewModel` and extend it with a
  sentence about `options.reuseKey`.
- A call with no `reuseKey` must not read or clear the cache — just build.

**Verify**:
`pnpm exec vitest run src/lib/createTable.test.ts src/lib/plugins/addPagination.test.ts src/lib/plugins/addSortBy.test.ts --reporter=default`
→ every test in all three files PASSES, including the four that failed in Step 2

### Step 4: Document the option on the API page

Edit `docs/src/routes/docs/api/create-view-model/+page.svx`. After the existing
`#### options.rowDataId?: (item, index) => string` section (it ends with the
line `_Defaults to the item index_.`), add a sibling section for `reuseKey`
matching the surrounding style — an `####` heading naming the type, a short
prose explanation, and a fenced `ts` example. Cover: what it's for (plugin state
surviving a rebuild driven by a derived column array), that it is opt-in, and
that a different key or no key rebuilds.

Do not edit anything under `docs/static/` — that tree is generated.

**Verify**: `trunk check docs/src/routes/docs/api/create-view-model/+page.svx` → exit 0

### Step 5: Full gate

Run, in order, and confirm each:

1. `trunk fmt` → exit 0 or 1
2. `trunk check` → exit 0
3. `pnpm check` → final line contains `0 ERRORS`
4. `pnpm test:only` → exit 0, all tests pass
5. `pnpm build` → ends with `All good!`
6. `git status --short` → only files from the In-scope list appear

## Test plan

The Step 2 reproduction tests are the anchor. Against current code
(`29b4ec0`) they fail as listed in Step 2's Verify block — `pageIndex` reads
`0` instead of `3`, `sortKeys` is empty, the two view models are distinct
objects, and no warning fires. After Step 3 all four go green.

New tests, by file:

- `src/lib/plugins/addPagination.test.ts` — 3 tests: pageIndex survives with a
  stable key (the regression this plan fixes); pageIndex resets with no key
  (unchanged default); a different key rebuilds.
- `src/lib/plugins/addSortBy.test.ts` — 1 test: sort keys survive with a stable
  key.
- `src/lib/createTable.test.ts` — 4 tests on the memo itself, in a new
  `describe('reuseKey', ...)` nested inside the existing
  `describe('Table.createViewModel method', ...)`: identity on reuse; no key
  always rebuilds; changed column ids under the same key rebuild and warn;
  changed `rowDataId` under the same key rebuilds.

Structural patterns to follow — they differ per file, so match the file you are
editing: the plugin test files use bare top-level `test(...)` with vitest
globals and no `describe`; `createTable.test.ts` uses nested `describe` /
`it(...)`. For the `console.warn` spy, follow the
`'one plugin result drives one table'` test in
`src/lib/plugins/addVirtualScroll.test.ts`.

Verification: `pnpm test:only` → exit 0, with 8 new tests passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` final line contains `0 ERRORS`
- [ ] `trunk check` exits 0
- [ ] `pnpm test:only` exits 0
- [ ] `pnpm build` ends with `All good!`
- [ ] The four Step 2 reproduction tests exist and pass (they failed at plan time)
- [ ] `grep -n "reuseKey" src/lib/createViewModel.ts src/lib/createTable.ts` shows
      the field on the interface and its use in the `Table` method
- [ ] `git diff --name-only 29b4ec0..HEAD` lists no file outside the In-scope list
- [ ] `grep -rn "eslint-disable" src/lib/createTable.ts` returns no matches
      (suppressions in this repo use `trunk-ignore`)
- [ ] the batch's `README.md` status row updated
      (`.agents/.plans/view-model-reuse/README.md`)

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift since `29b4ec0`).
- A Step 2 test you expected to fail passes instead — the reproduction is not
  observing the real problem, and building on it would ship a plan-shaped no-op.
- Making a test pass appears to require editing a plugin under
  `src/lib/plugins/` — it should not. This plan changes zero plugins.
- You conclude the memo should live in the free `createViewModel` function
  rather than on `Table`. It must not; report instead.
- `pnpm test:only` surfaces failures in tests you did not write, particularly in
  `src/lib/plugins/addVirtualScroll.test.ts` — that suggests reuse is
  interacting with the Track A fix in a way this plan did not anticipate.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- **`reuseKey` is a promise the caller makes.** Its safety net compares flat
  column **ids** only. Same ids with a changed header renderer or accessor
  function will hand back a stale view model with no warning. If that bites
  someone, the fix is a richer signature, not a deeper cache — and it should be
  weighed against the fact that any signature over closures and components is
  unsound in principle.
- **Single cache slot, last key wins.** Alternating between two keys on one
  `Table` rebuilds every time — correct, but it silently loses the benefit. A
  map would fix it and leak plugin instances; that trade was made deliberately
  here in favor of the leak-free option.
- A reviewer should scrutinize: that no plugin source changed; that the free
  `createViewModel` still ignores `reuseKey`; and that `rowDataId` is compared
  by identity rather than by any attempt at structural equality.
- **Deferred out of this plan**: `addVirtualScroll` needs no reuse — its state
  was hoisted at `29b4ec0` and survives rebuilds already. Reuse and that hoist
  are complementary, not redundant: reuse preserves state when the caller can
  promise sameness, the hoist preserves the DOM binding even when it can't.
