# Plan 001: `getRowHeight` is honoured after the virtual-scroll container remounts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-review-fixes/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 411e6d4..HEAD -- src/lib/plugins/addVirtualScroll.svelte.ts src/lib/plugins/addVirtualScroll.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1 (regression from v6, found in review of PR #335 before release)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `411e6d4`, 2026-09-29

## Why this matters

`addVirtualScroll({ getRowHeight })` lets a consumer declare a row's height
instead of trusting the DOM measurement. After the scroll container
unmounts and mounts again (a route transition, an `{#if}` toggle, a keyed
block), the plugin stops honouring `getRowHeight`: `measureRow` cannot find
the row and stores the measured DOM height. With 10 rows,
`getRowHeight: () => 60`, a remount and one 100 px measurement, the total
height becomes 800 instead of 600, so the spacers and scroll range are
wrong. v6 did not have this problem because its row cache was refilled when
the store was re-subscribed; v7's `$derived` is memoised and does not re-run
when the rows have not changed.

## Current state

- `src/lib/plugins/addVirtualScroll.svelte.ts` — the plugin. State lives in
  the factory closure so it survives view-model rebuilds.
    - Lines 214–216, the cache and its (now false) premise:

        ```ts
        // Cache for row lookup in `measureRow`. A plain variable assigned while
        // `synced` derives: it is not reactive state.
        let allRowsCache: BodyRow<Item>[] = []
        ```

    - Lines 228–246, the memoised derivation that fills it as a side effect:

        ```ts
        const synced: SyncedRows<Item> = $derived.by(() => {
            const rows = upstreamRows.current()
            /* builds `index: Map<id, position>` and `ids` */
            allRowsCache = rows
            return { rows, ids: previousIds, index }
        })
        ```

    - Line 263: `const rowIndexById: Getter<Map<string, number>> = () => synced.index`
    - Lines 632–664, the scroll-container action's `destroy()`; when no other
      container is mounted it ends with

        ```ts
        // ... drop the row cache — it is only read by `measureRow`, which
        // cannot fire without a container, and `synced` rebuilds it on the way
        // back in. ...
        rangeRequest?.abort()
        rangeRequest = undefined
        allRowsCache = []
        ```

        "`synced` rebuilds it on the way back in" was true for v6's store and is
        false for a `$derived`: nothing invalidates `synced` on remount.

    - Lines 775–793, `measureRow`:

        ```ts
        if (getRowHeight) {
            const rowIndex = rowIndexById().get(rowId)
            const row = rowIndex === undefined ? undefined : allRowsCache[rowIndex]
            if (row?.isData() && row.original) {
                const specifiedHeight = getRowHeight(row.original)
                if (specifiedHeight !== height) {
                    height = specifiedHeight
                }
            }
        }
        ```

        `rowIndexById()` reads `synced.index` (still correct after a remount);
        `allRowsCache` is empty, so `row` is `undefined` and the DOM height wins.

- `src/lib/plugins/addVirtualScroll.test.ts` — the suite (jsdom, mocked
  `ResizeObserver`). Exemplars to copy:
    - "measureRow with getRowHeight prefers getRowHeight" (line 382) — builds a
      table with `getRowHeight: () => 60`, calls `state.measureRow('0', 100)`,
      expects `state.totalHeight.current` to be `600`.
    - "re-attaching the action restores the scroll position onto the new node"
      (line 1103) — uses the file's `attach(state)` helper, which mounts the
      `virtualScroll` action on a fake scroll node and returns
      `{ node, destroy }`.
- Conventions: 4-space indent, no semicolons, single quotes; suppressions
  are `// trunk-ignore(eslint/<rule>)`; never write `$state` inside a
  `$derived`; library files are checked with `tsconfig.lib.json`
  (`noUncheckedIndexedAccess`).

## Commands you will need

| Purpose       | Command                                                                | Expected on success                |
| ------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| Focused tests | `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addVirtualScroll` | all pass                           |
| Full tests    | `npx -y pnpm@11.24.0 test`                                             | all pass, coverage thresholds met  |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                            | two `COMPLETED ... 0 ERRORS` lines |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                              | `✔ No issues`                      |

`pnpm` is not on PATH; always use `npx -y pnpm@11.24.0`.

## Scope

**In scope**:

- `src/lib/plugins/addVirtualScroll.svelte.ts`
- `src/lib/plugins/addVirtualScroll.test.ts`

**Out of scope** (do NOT touch):

- `src/lib/utils/HeightManager.ts`, any other plugin, `src/routes/**`, `docs/**`.
- The range, spacer and height arithmetic — this plan changes where
  `measureRow` finds a row, nothing else.

## Git workflow

- Branch: `feat/v7-runes-core` (already checked out; PR #335 is open on it).
- One commit: `fix(virtual-scroll): honour getRowHeight after the container remounts`.
  End the message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing test that reproduces the issue

In `src/lib/plugins/addVirtualScroll.test.ts`, next to "measureRow with
getRowHeight prefers getRowHeight", add:

```ts
test('getRowHeight still wins after the scroll container remounts', () => {
    const data = box(createTestData(10))
    const table = createTable(() => data.current, {
        virtualScroll: addVirtualScroll({ estimatedRowHeight: 40, getRowHeight: () => 60 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const state = table.createViewModel(columns).pluginStates.virtualScroll

    // Read once so the rows are synced, then mount, unmount and mount again.
    expect(state.totalHeight.current).toBe(400)
    const first = attach(state)
    first.destroy()
    attach(state)

    state.measureRow('0', 100)
    expect(state.totalHeight.current).toBe(600)
})
```

Use the file's existing `attach` helper (if it is defined inside a
`describe` block that this test cannot see, place the test inside that
block). Adjust only the setup needed to make the file compile.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addVirtualScroll -t "after the scroll container remounts"`
→ the new test FAILS with `expected 800 to be 600` (or the equivalent
"expected 640/… to be 600" if the estimate applies to unmeasured rows — the
point is a value other than 600). If it passes, the reproduction is wrong:
STOP and report.

### Step 2: Read the row from the derivation instead of a side-effect cache

In `src/lib/plugins/addVirtualScroll.svelte.ts`:

1. Delete `let allRowsCache` and its comment (lines 214–216), the
   `allRowsCache = rows` assignment inside `synced`, and the
   `allRowsCache = []` line in `destroy()`.
2. In `measureRow`, resolve the row from the same derivation that produced
   the index, so the two can never disagree:

    ```ts
    if (getRowHeight) {
        const { index, rows } = synced
        const rowIndex = index.get(rowId)
        const row = rowIndex === undefined ? undefined : rows[rowIndex]
        /* unchanged from here */
    }
    ```

    `measureRow` is called from a `ResizeObserver` callback and from tests,
    outside any reactive context; reading a `$derived` there returns its
    current value.

3. Rewrite the `destroy()` comment so it no longer mentions the row cache:
   keep the sentences about cancelling the range request and about scroll
   position, viewport height and measured heights surviving.
4. Search the file for any other reader of `allRowsCache`
   (`grep -n allRowsCache src/lib/plugins/addVirtualScroll.svelte.ts`) and
   convert it the same way.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addVirtualScroll`
→ all pass, including the Step 1 test; `grep -c allRowsCache src/lib/plugins/addVirtualScroll.svelte.ts` → `0`.

### Step 3: Full gate

```sh
trunk fmt src/lib/plugins/addVirtualScroll.svelte.ts src/lib/plugins/addVirtualScroll.test.ts
trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
```

**Verify**: lint clean; both type-check lines `0 ERRORS`; the full suite
passes with coverage thresholds met.

## Test plan

- Red first: the Step 1 test fails on `411e6d4` with a total height other
  than 600 and passes after Step 2.
- No other new tests; the existing 82 virtual-scroll tests guard the
  arithmetic this plan must not change.

## Done criteria

- [ ] The Step 1 test exists and passes
- [ ] `grep -c allRowsCache src/lib/plugins/addVirtualScroll.svelte.ts` → `0`
- [ ] `npx -y pnpm@11.24.0 check` exits 0 (both tsconfigs)
- [ ] `npx -y pnpm@11.24.0 test` exits 0 with thresholds met
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `git status` lists only the two in-scope files
- [ ] `.agents/.plans/v7-review-fixes/README.md` status row updated

## STOP conditions

- The Step 1 test passes before the fix.
- Reading `synced` inside `measureRow` throws or logs a Svelte warning
  (`state_unsafe_mutation`, `derived_inert`) in any existing test.
- Any existing virtual-scroll test changes its expected numbers.

## Maintenance notes

- The rule this restores: plugin code must not depend on a `$derived`
  re-running as a side channel. If something needs data the derivation
  produced, read the derivation.
- Reviewers: check that `destroy()` still aborts the pending range request.
