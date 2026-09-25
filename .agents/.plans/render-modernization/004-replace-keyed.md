# Plan 004: Replace `@humanspeak/svelte-keyed` with a first-party single-key store, fixing the dotted-column-id filter crash

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/render-modernization/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- src/lib/utils/store.ts src/lib/plugins/addColumnFilters.ts src/lib/plugins/addResizedColumns.ts src/lib/plugins/addExpandedRows.ts package.json`
> Plan 003 may have added `derivedKeys` to `store.ts` (expected). Anything
> else must match the excerpts; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (pure TypeScript; does not need the jsdom harness)
- **Category**: bug + migration
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

Three plugins use `keyed(store, key)` from `@humanspeak/svelte-keyed` to get
a writable view of one property of a record store. That package is a
general **path** helper: it tokenises the key on `.` and `[...]`. Every call
site in this repo passes a flat key (a column id, a row id, or the literal
`'current'`), so the path machinery is dead weight — and it is a live bug:
column ids default to `String(header)`, so a column whose header contains a
dot (`'U.S. Sales'`, `'Avg. Score'`, `'v1.2'`) and has a column filter
crashes the moment its filter value is set. Verified against the installed
package on 2026-09-25:

```
keyed(writable({}), 'U.S. Sales').set('x')
→ TypeError: Cannot set properties of undefined (setting ' Sales')
```

Replacing it with a ~20-line `keyedProp` in `src/lib/utils/store.ts` fixes
the crash, removes the last of the legacy helper packages except
`memory-cache` (which the sibling `svelte-markdown` still uses and is not a
target), and drops the transitive `type-fest` type dependency.

## Current state

- Dependency: `@humanspeak/svelte-keyed@5.0.1` (`package.json` dependencies).
  Its `keyed(parent, path)` returns `{ subscribe, set, update }` where
  `subscribe` derives `getNested($parent, tokens)` and `set`/`update`
  shallow-clone the parent (preserving prototype for objects, spreading
  for arrays) and assign the leaf.
- Call sites (the only three):

```ts
// src/lib/plugins/addColumnFilters.ts:212 (inside hooks['thead.tr.th'])
const filterValue = keyed(filterValues, headerCell.id)
```

```ts
// src/lib/plugins/addResizedColumns.ts:151-155
const columnsWidthState = writable<ColumnsWidthState>({
    current: initialWidths,
    start: {}
})
const columnWidths = keyed(columnsWidthState, 'current')
```

```ts
// src/lib/plugins/addExpandedRows.ts:106
const isExpanded = keyed(expandedIds, row.id) as Writable<boolean>
```

- Filter values are read back flat: `src/lib/plugins/addColumnFilters.ts:141`
  `const filterValue = filterValues[columnId]` — so a nested write from the
  tokeniser would never be read even if it did not throw.
- Column id derivation: `src/lib/columns.ts:274`
  `this.id = (id ?? accessorKeyId ?? String(header)) as Id`.
- Row ids used in `addExpandedRows` are index-based (`'0'`, `'0>1'`, from
  `src/lib/bodyRows.ts:306`), so that call site is not currently affected by
  the bug — it still moves to `keyedProp` for consistency.
- Test conventions: `src/lib/plugins/addColumnFilters.test.ts` builds a table
  with `createTable(readable(sampleData), { colFilter: addColumnFilters() })`,
  calls `table.createViewModel(columns)`, and drives state via
  `vm.pluginStates.colFilter.filterValues.set({...})`. Header-cell props are
  reached via `get(vm.headerRows)[0].cells[i].props()`; see
  `src/lib/plugins/addResizedColumns.test.ts:78` (`'thead.tr.th attrs ...'`)
  for that access pattern.
- `src/lib/utils/store.ts` — home for store helpers; documented with JSDoc
  + `@example` blocks; tests are one file per helper:
  `store.arraySetStore.test.ts`, `store.recordSetStore.test.ts`.

## Commands you will need

| Purpose        | Command                       | Expected on success                   |
| -------------- | ----------------------------- | ------------------------------------- |
| Typecheck      | `pnpm check`                  | exit 0, `svelte-check found 0 errors` |
| One test file  | `pnpm exec vitest run <path>` | see each step                         |
| All unit tests | `pnpm test:only`              | exit 0                                |
| Lint           | `trunk check`                 | no failures                           |
| Format         | `trunk fmt`                   | exit 0/1                              |
| Package        | `pnpm package`                | exit 0, publint clean                 |

## Scope

**In scope**:

- `src/lib/utils/store.ts` (add `keyedProp`)
- `src/lib/utils/store.keyedProp.test.ts` (create)
- `src/lib/plugins/addColumnFilters.ts` (import + line 212)
- `src/lib/plugins/addColumnFilters.test.ts` (add the regression test)
- `src/lib/plugins/addResizedColumns.ts` (import + line 155)
- `src/lib/plugins/addExpandedRows.ts` (import + line 106)
- `package.json` (remove `@humanspeak/svelte-keyed`), `pnpm-lock.yaml`

**Out of scope**:

- `src/lib/types/KeyPath.ts` — unrelated type, leave it.
- Any change to plugin state shapes (`filterValues`, `columnWidths`, `expandedIds`) — consumers read them.
- `@humanspeak/memory-cache` — stays.

## Git workflow

- Branch: `fix/keyed-dotted-ids`
- Commit: `fix(plugins): replace svelte-keyed with keyedProp; dotted column ids no longer crash filters`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing regression test for the dotted-id crash

Append to `src/lib/plugins/addColumnFilters.test.ts`:

```ts
describe('column ids containing dots (regression)', () => {
    test('setting a filter on a column whose id contains a dot does not throw and filters', () => {
        const table = createTable(readable(sampleData), { colFilter: addColumnFilters() })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                id: 'status.v1',
                header: 'Status v1',
                plugins: { colFilter: { fn: matchFilter } }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerCell = get(vm.headerRows)[0].cells[0]
        const props = get(headerCell.props()) as { colFilter: { filterValue: { set: (v: unknown) => void } } }

        expect(() => props.colFilter.filterValue.set('active')).not.toThrow()
        expect(get(vm.pluginStates.colFilter.filterValues)).toEqual({ 'status.v1': 'active' })
        expect(get(vm.rows).map((r) => r.original.status)).toEqual(['active', 'active'])
    })
})
```

Adjust the `props` typing/path if the header-cell prop set is shaped
differently in this file's existing tests (look at how `addResizedColumns.test.ts:78`
reads `thead.tr.th` props); the assertions themselves must stay.

**Verify**: `pnpm exec vitest run src/lib/plugins/addColumnFilters.test.ts` →
this test FAILS with `TypeError: Cannot set properties of undefined (setting 'v1')`
(or, if your prop path differs, with the filter value landing at
`{ status: { v1: 'active' } }` instead of `{ 'status.v1': 'active' }`).
If it passes, the reproduction is wrong: STOP and report.

### Step 2: Add `keyedProp` to `src/lib/utils/store.ts`

```ts
/**
 * Creates a writable view of a single top-level property of a record store.
 * Unlike a path-based helper, the key is used verbatim — keys containing
 * `.` or `[` are ordinary keys.
 *
 * Writes replace the parent with a shallow copy so subscribers of the
 * parent are notified.
 *
 * @example
 * ```typescript
 * const widths = writable<{ current: Record<string, number> }>({ current: {} })
 * const current = keyedProp(widths, 'current')
 * current.set({ a: 10 }) // widths → { current: { a: 10 } }
 * ```
 */
export const keyedProp = <Parent extends object, Key extends keyof Parent & string>(
    parent: Writable<Parent>,
    key: Key
): Writable<Parent[Key]> => {
    const { subscribe } = derived(parent, ($parent) => $parent[key])
    const set = (value: Parent[Key]) => {
        parent.update(($parent) => ({ ...$parent, [key]: value }))
    }
    const update = (fn: Updater<Parent[Key]>) => {
        parent.update(($parent) => ({ ...$parent, [key]: fn($parent[key]) }))
    }
    return { subscribe, set, update }
}
```

`derived` and `Updater` are already imported in this file (check the top
of the file; add `derived` to the `svelte/store` import if missing).
For `Record<string, T>` parents, `Key` is `string` and `Parent[Key]` is `T`,
which is what the three call sites need.

Create `src/lib/utils/store.keyedProp.test.ts` (model on
`store.arraySetStore.test.ts`): reads the property; `set` replaces it and
notifies the parent; `update` uses the previous value; a key with a dot
(`'a.b'`) is stored flat; unrelated keys survive a `set`.

**Verify**: `pnpm exec vitest run src/lib/utils/store.keyedProp.test.ts` → 5 tests pass.

### Step 3: Switch the three call sites

- `addColumnFilters.ts`: `import { keyedProp } from '../utils/store.js'` (match the
  file's relative-import style); line 212 → `const filterValue = keyedProp(filterValues, headerCell.id)`.
- `addResizedColumns.ts`: line 155 → `const columnWidths = keyedProp(columnsWidthState, 'current')`.
- `addExpandedRows.ts`: line 106 → `const isExpanded = keyedProp(expandedIds, row.id)`
  (drop the `as Writable<boolean>` cast if the inferred type is already
  `Writable<boolean>`; keep it if `expandedIds` is `Record<string, boolean>`
  and TypeScript still needs the hint).
- Remove the `import { keyed } from '@humanspeak/svelte-keyed'` line from each.

**Verify**: Step 1 test now PASSES; `pnpm exec vitest run src/lib/plugins/` →
all plugin tests pass (`addResizedColumns.test.ts` and `addExpandedRows.test.ts`
cover `columnWidths` and `isExpanded`).

### Step 4: Remove the dependency

`pnpm remove @humanspeak/svelte-keyed`.

**Verify**: `grep -rn "svelte-keyed" src/ package.json` → no matches;
`pnpm install` → exit 0; `pnpm check` → 0 errors.

### Step 5: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`, `pnpm package`.

**Verify**: all exit 0.

## Test plan

- Red-first anchor: Step 1, failing today with the `TypeError` shown, green after Step 3.
- New: `store.keyedProp.test.ts` (5 cases) + 1 regression case in `addColumnFilters.test.ts`.
- Existing coverage relied on: `addResizedColumns.test.ts` (`columnWidths` init/initialWidth/attrs),
  `addExpandedRows.test.ts` (`getRowState isExpanded reflects expansion state`).

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; the dotted-id regression test exists and passes
- [ ] `grep -rn "svelte-keyed\|from '@humanspeak/svelte-keyed'" src/ package.json` → no matches
- [ ] `grep -rn "keyedProp(" src/lib/plugins/` → exactly 3 matches
- [ ] `git status --porcelain` lists only in-scope files
- [ ] README status row for 004 updated

## STOP conditions

- Excerpts don't match the live code.
- The Step 1 test passes before the fix.
- `addExpandedRows.test.ts` or `addResizedColumns.test.ts` fails after
  Step 3 — would indicate a semantic difference from `keyed` (e.g. prototype
  preservation) that a consumer test depends on; report the failing assertion.
- A fourth `keyed(` call site exists that this plan did not list.

## Maintenance notes

- `keyedProp` is intentionally single-level. If a future plugin needs nested
  paths, add a separate helper rather than re-introducing tokenisation.
- Reviewer focus: `update` must call `fn` with the *current* value inside
  `parent.update` (not a captured one) — the test "update uses the previous value" guards it.
