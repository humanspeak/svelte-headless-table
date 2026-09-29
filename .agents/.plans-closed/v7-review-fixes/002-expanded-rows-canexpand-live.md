# Plan 002: `getRowState(row).canExpand` reflects sub-rows added after the view was created

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-review-fixes/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 411e6d4..HEAD -- src/lib/plugins/addExpandedRows.svelte.ts src/lib/plugins/addExpandedRows.test.ts docs/src/routes/docs/plugins/add-expanded-rows/ docs/src/routes/docs/guides/migrating-to-v7/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1 (found in review of PR #335 before release)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of plan 001)
- **Category**: bug
- **Planned at**: commit `411e6d4`, 2026-09-29

## Why this matters

`addExpandedRows` caches one state object per row in a `WeakMap`, and
`canExpand` on that object is a boolean computed once, when the object is
created. `addSubRows` attaches `subRows` to the same row objects in place
when it re-derives, so a row whose children arrive later (lazy loading:
`items[0].children = [...]`) keeps its identity, gains `subRows`, and still
reports `canExpand === false` — the row can never be expanded. The v7
migration guide and release notes say per-row views "never go stale"; this
field is the exception that makes the statement false.

## Current state

- `src/lib/plugins/addExpandedRows.svelte.ts`
    - Lines 34–41, the public type (the JSDoc documents the staleness):

        ```ts
        export interface ExpandedRowsRowState {
            /** Whether the row is expanded. Writing adds or removes the row's ID in `expandedIds`. */
            isExpanded: Box<boolean>
            /** Whether the row can be expanded (it had sub-rows when the view was created). */
            canExpand: boolean
            /** Whether every expandable sub-row is expanded. */
            isAllSubRowsExpanded: ReadonlyBox<boolean>
        }
        ```

    - Lines 93–139, `getRowState`: `isExpanded` and `isAllSubRowsExpanded` are
      objects with `current` getters that read live; then

        ```ts
        const state: ExpandedRowsRowState = {
            isExpanded,
            canExpand: (row.subRows?.length ?? 0) > 0,
            isAllSubRowsExpanded
        }
        rowStates.set(row, state)
        return state
        ```

    - Line 90: the plugin factory is `() => { ... }` — it does not currently
      destructure `tableState` from its init argument. `TablePluginInit`
      (`src/lib/types/TablePlugin.ts`) provides
      `{ pluginName, tableState, columnOptions }`, and `tableState.rows` is a
      getter `() => BodyRow<Item>[]` over the view model's rows derivation.
- `src/lib/plugins/addSubRows.svelte.ts` lines 35–46, `withSubRows` mutates
  the incoming row: `row.subRows = subRows.map(...)`.
- `src/lib/plugins/addExpandedRows.test.ts` — exemplar "getRowState canExpand
  reflects subRows presence" (line 95) builds a table with
  `addSubRows({ children: 'children' })` + `addExpandedRows()` and asserts
  `getRowState(rows[0]).canExpand` / `rows[2]`.
- The reactive primitives are in `src/lib/reactivity.svelte.ts`: `box(initial)`
  returns `{ current }` backed by `$state.raw` — replace the value, never
  mutate it in place.
- Docs that describe the field:
    - `docs/src/routes/docs/plugins/add-expanded-rows/+page.svx:91` —
      "`canExpand: boolean`: whether the row had sub-rows when the view was created"
    - `docs/src/routes/docs/guides/migrating-to-v7/+page.svx:78` — "`canExpand`
      is a plain `boolean`"; line 291 — "Per-row views read the plugin's set
      directly…" (the "never stale" statement).
- Conventions: 4-space indent, no semicolons, single quotes;
  `// trunk-ignore(eslint/<rule>)` for suppressions; library files are
  checked with `tsconfig.lib.json`.

## Commands you will need

| Purpose       | Command                                                                 | Expected on success                |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Focused tests | `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addExpandedRows`   | all pass                           |
| Full tests    | `npx -y pnpm@11.24.0 test`                                              | all pass, coverage thresholds met  |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                             | two `COMPLETED ... 0 ERRORS` lines |
| Docs check    | `npx -y pnpm@11.24.0 package && (cd docs && npx -y pnpm@11.24.0 check)` | `0 ERRORS`                         |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                               | `✔ No issues`                      |

`pnpm` is not on PATH; always use `npx -y pnpm@11.24.0`. After any docs
command, run `git checkout -- docs/src/lib/demo-loaders.ts` from the repo
root (the docs tooling rewrites that generated file).

## Scope

**In scope**:

- `src/lib/plugins/addExpandedRows.svelte.ts`
- `src/lib/plugins/addExpandedRows.test.ts`
- `docs/src/routes/docs/plugins/add-expanded-rows/+page.svx` (the one
  sentence at line 91)
- `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` (only if a
  sentence about `canExpand` needs correcting after the fix)

**Out of scope** (do NOT touch):

- The type of `canExpand`: it stays `boolean`. Changing it to a
  `ReadonlyBox<boolean>` would touch the route helpers, five docs demos and
  the migration guide for the same observable result.
- `src/lib/plugins/addSubRows.svelte.ts`, `addSelectedRows.svelte.ts`
  (its per-row views are all `current` getters already), `src/routes/**`,
  the docs demos.

## Git workflow

- Branch: `feat/v7-runes-core` (already checked out; PR #335 is open on it).
- One commit: `fix(expanded-rows): canExpand reads the row's sub-rows on access`.
  End the message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing test that reproduces the issue

In `src/lib/plugins/addExpandedRows.test.ts` add a test that gives a row its
children after its state was first read:

```ts
test('canExpand follows sub-rows that arrive after the view was created', () => {
    interface Node {
        name: string
        children?: Node[]
    }
    const items = box<Node[]>([{ name: 'parent' }, { name: 'other' }])
    const table = createTable(() => items.current, {
        sub: addSubRows({ children: 'children' }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([table.column({ header: 'Name', accessor: 'name' })])
    const vm = table.createViewModel(columns)
    const { getRowState } = vm.pluginStates.expand

    const before = vm.current.rows[0]
    expect(getRowState(before).canExpand).toBe(false)

    // Children arrive later, in place, as lazy loading does.
    const [parent, other] = items.current
    parent.children = [{ name: 'child' }]
    items.current = [parent, other]

    const after = vm.current.rows[0]
    expect(after.subRows).toHaveLength(1)
    expect(getRowState(after).canExpand).toBe(true)
    // The state a caller is already holding must agree.
    expect(getRowState(before).canExpand).toBe(getRowState(after).canExpand)
})
```

Import `box` from `'../reactivity.svelte.js'` if the file does not already.
If `vm.current.rows[0]` is a _new_ row object after the data change (so
`getRowState(after)` builds a fresh state and the test passes on the current
code), mutate the row the way `addSubRows` does instead —
`before.subRows = [ /* a row from another table is fine */ ]` is not
acceptable; rather keep the same data array identity so the row is reused:
`parent.children = [...]` followed by reading `vm.current.rows` again
without reassigning `items.current`, with `items` created via
`$state`-backed deep state in a `.svelte.ts` helper. The test must
demonstrate a row that keeps its identity and gains `subRows`.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addExpandedRows -t "arrive after the view"`
→ the new test FAILS with `expected false to be true` on the
`getRowState(...).canExpand` assertion. If it passes, the reproduction is
wrong: STOP and report what identity the row had.

### Step 2: Compute `canExpand` on access

In `getRowState`, replace the snapshot with an accessor on the state object
and update the JSDoc on the interface:

```ts
/** Whether the row can be expanded: `true` while it has sub-rows. Read on access. */
canExpand: boolean
```

```ts
const state: ExpandedRowsRowState = {
    isExpanded,
    get canExpand() {
        return (row.subRows?.length ?? 0) > 0
    },
    isAllSubRowsExpanded
}
```

Update the comment above `rowStates` ("Views read `expandedIds` on access
and own no reactive state, so they cannot go stale") to say that every
member, including `canExpand`, is read on access.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addExpandedRows`
→ all pass, including the Step 1 test and "getRowState returns memoized
instances".

### Step 3: Make a template re-read it when the rows re-derive

`row.subRows` is a plain field, so a template that reads
`getRowState(row).canExpand` has nothing to subscribe to. Give the accessor
a dependency on the rows derivation: change the plugin factory from `() =>`
to `({ tableState }) =>` and read the getter before returning:

```ts
get canExpand() {
    // Tracks the rows derivation, so a template re-reads this when
    // sub-rows are attached by a re-derive.
    tableState.rows()
    return (row.subRows?.length ?? 0) > 0
},
```

Add a test using `withEffectRoot` from
`src/lib/test/effectRoot.test.svelte.ts` (see its use in
`src/lib/createViewModel.performance.test.ts`): observe
`getRowState(row).canExpand` inside the effect, attach children as in Step
1, `flushSync()`, and assert the effect ran again with `true`.

**Verify**: the new effect test passes; `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins`
→ all pass (no `state_unsafe_mutation` or `derived_references_self`
warnings in the output).

### Step 4: Docs

- `docs/src/routes/docs/plugins/add-expanded-rows/+page.svx:91` →
  "`canExpand: boolean`: whether the row currently has sub-rows. Read it
  from the state object (`getRowState(row).canExpand`) when you render; a
  value you destructured earlier is a snapshot."
- In `docs/src/routes/docs/guides/migrating-to-v7/+page.svx`, keep
  "`canExpand` is a plain `boolean`" (still true) and leave the rest
  unless a sentence contradicts the behaviour above.

**Verify**: `npx -y pnpm@11.24.0 package && (cd docs && npx -y pnpm@11.24.0 check)` → `0 ERRORS`; then `git checkout -- docs/src/lib/demo-loaders.ts`.

### Step 5: Full gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
```

## Test plan

- Red first: the Step 1 test fails on `411e6d4` (`expected false to be true`)
  and passes after Step 2.
- New: the Step 3 effect test (template-level reactivity).
- Existing expanded-rows tests (memoised instances, distinct instances,
  isolation) must pass unchanged.

## Done criteria

- [ ] The Step 1 and Step 3 tests exist and pass
- [ ] `grep -n "canExpand: (row.subRows" src/lib/plugins/addExpandedRows.svelte.ts` → no match
- [ ] `npx -y pnpm@11.24.0 check` exits 0; docs `check` 0 errors
- [ ] `npx -y pnpm@11.24.0 test` exits 0 with thresholds met
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `git status` lists only in-scope files (and not `docs/src/lib/demo-loaders.ts`)
- [ ] `.agents/.plans/v7-review-fixes/README.md` status row updated

## STOP conditions

- The Step 1 test cannot be made to fail because rows never keep their
  identity across a data change in v7 (then the finding does not reproduce
  as described: report the identity behaviour you observed).
- Reading `tableState.rows()` inside the accessor throws
  `derived_references_self` or causes an infinite loop in any test (it
  would mean `getRowState` is called during the rows derivation).
- Fixing this appears to require changing `canExpand`'s type.

## Maintenance notes

- A consumer who destructures `const { canExpand } = getRowState(row)` holds
  a snapshot; that is inherent to a `boolean` member and is why the docs
  sentence in Step 4 exists. If this keeps confusing users, the next major
  can make it a `ReadonlyBox<boolean>` like its siblings.
- v6 had the same staleness (`canExpand` was `readable(constant)`), so this
  is a fix, not a behaviour regression to explain in release notes.
