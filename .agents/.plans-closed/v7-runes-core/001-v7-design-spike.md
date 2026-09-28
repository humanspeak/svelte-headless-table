# Plan 001: Prove the v7 runes mechanism on real code before the rewrite (spike + report)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1d80d78..HEAD -- src/lib/tableComponent.svelte.ts src/lib/createViewModel.svelte.ts src/lib/plugins/addSortBy.ts src/lib/plugins/addPagination.ts src/routes/test/perf-bench/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> Revision 2026-09-28: the branch `feat/v7-runes-core` already exists and is
> checked out (cut from `origin/main` at `1d80d78`, v6.5.4, by the guard);
> do not create or switch branches. `Planned at` re-stamped to `1d80d78`;
> the in-scope source is byte-identical to `61c36ee`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (throwaway code under `src/routes/test/v7-spike/`; nothing under `src/lib` changes)
- **Depends on**: none
- **Category**: direction (design spike)
- **Planned at**: commit `1d80d78`, 2026-09-28

## Why this matters

v7 replaces every Svelte store inside `@humanspeak/svelte-headless-table` with
runes (`$state` / `$derived`) and replaces the store-based plugin contract with
a getter-based one. Plans 002–004 rewrite ~3,000 lines on that assumption. Two
things are not yet proven on this codebase and would be very expensive to
discover late:

1. **Ownership.** A `$derived` created inside a short-lived effect goes inert
   when that effect ends (the 2026-09-27 dual-mode work hit exactly this and
   worked around it with `fromStore`). v7 creates its deriveds inside
   `createViewModel(...)` and inside plugin factories, which consumers may call
   from a component `<script>`, from a `+page.ts` load, or from a plain test.
   All three must keep working, including SSR.
2. **Per-cell cost.** v6 builds a store per cell per plugin hook. v7 wants
   _no_ per-cell reactive allocation: `cell.current.props` should call the
   hook getters on every read. That is either free (the getters are tiny and
   the template reads each once per render) or a regression on the rows-10k
   bench. It has to be measured, not guessed.

The output of this plan is a short report that fixes the mechanism plans
002–004 must use. It is written _before_ they run; they cite it.

## Current state

- `src/lib/tableComponent.svelte.ts` (205 lines) — the v6.4 dual-mode
  component. `attrs()` / `props()` return `derived` stores; `current` is a
  lazily created object of getters over `fromStore` handles, invalidated by a
  `#hookVersion` counter bumped in `applyHook`. Excerpt (lines 31–48):

    ```ts
    // Bumped by applyHook so `current.*` re-reads over the new hook set. A
    // plain counter: constructing a row or cell allocates nothing reactive.
    #hookVersion = 0
    #version?: { store: Writable<number>; handle: { readonly current: number } }
    ```

    The comment at lines 41–46 records the constraint the spike must respect:
    "Nothing here is owned by the context that constructed the component, so a
    row built inside a short-lived effect cannot go inert when that effect ends."

- `src/lib/createViewModel.svelte.ts` (621 lines) — the store derivation chain:
  `originalRows` → `columnedRows` → plugin `deriveRows` fns → `injectedRows`
  (hooks applied) → plugin `derivePageRows` fns → `injectedPageRows`;
  `headerRows` from `injectedColumns`. `vm.current.*` (lines 562–600) is
  `fromStore` over the finalized stores.

- `src/lib/plugins/addSortBy.ts` lines 287–351 — `deriveRows` is
  `derived([rows, sortKeys], ...)` and **writes** `preSortedRows.set($rows)`
  inside the derived callback; the `thead.tr.th` hook returns
  `{ props: derived(sortKeys, ...) }`; the `tbody.tr.td` hook shares one
  derived per column id through a `MemoryCache`.

- `src/lib/plugins/addPagination.ts` lines 182–194 — `derivePageRows` writes
  `prePaginatedRows.set($rows)` inside its derived; `pageCount` (lines 75–89)
  is a derived that **clamps `pageIndex` by calling `pageIndex.update` inside
  the derived callback**. Both patterns are illegal in runes
  (`state_unsafe_mutation`), so the spike must show the replacement shape.

- `src/routes/test/perf-bench/+page.svelte` — the bench fixture. Preset
  buttons have `data-testid` (`rows-10k` at line 1341). `?renderer=store`
  (line 51) swaps in `_PerfTableStore.svelte`; the default renderer is
  `_PerfTable.svelte` on `current.*`. `scripts/perf-bench.mjs` drives it
  headlessly (`pnpm perf:bench`, env `PERF_BENCH_URL`,
  `PERF_BENCH_ITERATIONS`, `PERF_BENCH_COLD_ONLY`). The recorded baseline is
  `scripts/perf-baseline.json`; the number that matters is rows-10k first
  paint, ~185 ms median on the maintainer's machine.

- Prior art you must read first:
  `.agents/.plans-closed/runes-core/001-runes-spike.report.md` — the
  2026-09-27 spike. It established: the `current` namespace; that
  `$derived(fromStore(store).current)` tracks in components, in
  `$effect.root`, and under plain reads; and that a `$state` mirror fed by
  `createSubscriber` returns an empty seed outside effects and crashes SSR.

- Test conventions: vitest + jsdom, `@testing-library/svelte`, host
  components named `*Host.test.svelte` next to the test (exemplar:
  `src/lib/tableComponent.current.test.ts` + `src/lib/CurrentHost.test.svelte`).
  Runes are only allowed in `.svelte` and `.svelte.ts` files.

- Repo conventions: 4-space indent, no semicolons, single quotes (Prettier via
  Trunk). Lint suppressions use `// trunk-ignore(eslint/<rule>)`, never
  `eslint-disable`. Library sources are type-checked with
  `tsconfig.lib.json` (`noUncheckedIndexedAccess`); route files are not.

## Commands you will need

| Purpose            | Command                                                                                            | Expected on success                |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Install            | `npx -y pnpm@11.24.0 install --frozen-lockfile`                                                    | exit 0                             |
| Typecheck          | `npx -y pnpm@11.24.0 check`                                                                        | two `COMPLETED ... 0 ERRORS` lines |
| Unit tests (spike) | `npx -y pnpm@11.24.0 exec vitest run src/routes/test/v7-spike`                                     | all pass                           |
| Lint               | `trunk check --no-progress`                                                                        | `✔ No issues`                      |
| Format             | `trunk fmt`                                                                                        | exit 0                             |
| Dev server         | `npx -y pnpm@11.24.0 dev --port 8417`                                                              | serves `/test/perf-bench`          |
| Bench              | `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench > /tmp/after.json` | JSON with per-scenario aggregates  |

`pnpm` is not on PATH on the maintainer's machine; always invoke it as
`npx -y pnpm@11.24.0 ...`. The pre-commit hook calls a bare `pnpm`, so before
committing create a shim: `mkdir -p /tmp/pnpm-shim && printf '#!/bin/sh\nexec npx -y pnpm@11.24.0 "$@"\n' > /tmp/pnpm-shim/pnpm && chmod +x /tmp/pnpm-shim/pnpm` and commit with `PATH=/tmp/pnpm-shim:$PATH`.

## Scope

**In scope** (the only files you should create or modify):

- `src/routes/test/v7-spike/reactivity.svelte.ts` (create) — the `box` /
  `derivedBox` primitives under test
- `src/routes/test/v7-spike/spikeComponent.svelte.ts` (create) — a minimal
  memo-free `TableComponent` replacement
- `src/routes/test/v7-spike/spikeViewModel.svelte.ts` (create) — a
  getter-based derivation chain with sort + pagination
- `src/routes/test/v7-spike/spike.test.ts`, `SpikeHost.test.svelte` (create)
- `src/routes/test/v7-spike/+page.svelte` (create) — SSR probe page
- `src/routes/test/perf-bench/_PerfTableSpike.svelte` (create) and the
  `?renderer=spike` branch in `src/routes/test/perf-bench/+page.svelte`
- `.agents/.plans/v7-runes-core/001-v7-design-spike.report.md` (create)

**Out of scope** (do NOT touch):

- Anything under `src/lib/` — the spike copies what it needs; the real
  rewrite is plan 002.
- `docs/**`, `tests/**` (Playwright), `scripts/perf-baseline.json`.
- The existing `_PerfTable.svelte` / `_PerfTableStore.svelte` renderers.

## Git workflow

- Branch: `feat/v7-runes-core` (already checked out; all six plans in this batch share it).
- Conventional commits, e.g. `spike(v7): getter-based view model and memo-free component`. End the message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Reactive primitives

Create `src/routes/test/v7-spike/reactivity.svelte.ts`:

```ts
export interface Box<T> {
    current: T
}
export interface ReadonlyBox<T> {
    readonly current: T
}
export type Getter<T> = () => T

/** Writable rune state with the `current` vocabulary Svelte uses for fromStore/MediaQuery. */
export const box = <T>(initial: T): Box<T> => {
    let value = $state(initial)
    return {
        get current() {
            return value
        },
        set current(next) {
            value = next
        }
    }
}

/** Read-only view computed from other reactive reads. */
export const derivedBox = <T>(fn: Getter<T>): ReadonlyBox<T> => {
    const value = $derived.by(fn)
    return {
        get current() {
            return value
        }
    }
}

/** Writable view of one key of a record box (replaces v6 `keyedProp`). */
export const keyedBox = <T>(record: Box<Record<string, T>>, key: string): Box<T | undefined> => ({
    get current() {
        return record.current[key]
    },
    set current(next) {
        if (next === undefined) {
            const { [key]: _removed, ...rest } = record.current
            record.current = rest
        } else {
            record.current = { ...record.current, [key]: next }
        }
    }
})
```

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors (the file compiles as a
rune module).

### Step 2: Memo-free spike component

Create `src/routes/test/v7-spike/spikeComponent.svelte.ts` with a class that
mirrors the v6 `TableComponent` surface but holds getters instead of stores:

```ts
export interface ElementHook<Props, Attrs> {
    props?: Getter<Props>
    attrs?: Getter<Attrs>
}

export class SpikeComponent<Key extends string> {
    id: string
    #hooks: Record<string, ElementHook<unknown, Record<string, unknown>>> = {}
    #currentView?: {
        readonly attrs: Record<string, unknown>
        readonly props: Record<string, unknown>
    }

    constructor(id: string) {
        this.id = id
    }
    applyHook(pluginName: string, hook: ElementHook<unknown, Record<string, unknown>>) {
        this.#hooks[pluginName] = hook
    }
    /** Fixed attributes every instance of this component carries (role etc.). */
    protected decorateAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
        return attrs
    }
    get current() {
        return (this.#currentView ??= {
            attrs: undefined as never, // replaced below
            props: undefined as never
        })
    }
}
```

Implement `current` as an object with two getters (`attrs`, `props`) that on
**every read** iterate `this.#hooks`, call each `props?.()` / `attrs?.()`,
merge attrs with the same semantics as `src/lib/utils/attributes.ts`
`mergeAttributes` (copy that function into the spike; do not import from
`$lib`), and return fresh objects. No `$derived`, no caching. Reads inside a
template effect are tracked because the getters read plugin `$state`.

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors.

### Step 3: Getter-based view model with sort and pagination

Create `src/routes/test/v7-spike/spikeViewModel.svelte.ts`. It must show
the three patterns the real plugins need (see "Current state"):

1. **Derive chain as getters.** `deriveRows: (rows: Getter<Row[]>) => Getter<Row[]>`.
   The view model starts with `let rows: Getter<Row[]> = () => columnedRows`
   and folds each plugin's `deriveRows` over it. Each plugin implements it as

    ```ts
    const deriveRows = (rows: Getter<Row[]>) => {
        upstreamRows = rows // captured for `preSortedRows` (pattern 2)
        const sorted = $derived.by(() => sortRows(rows(), sortKeys.current))
        return () => sorted
    }
    ```

2. **"Pre-X rows" without writes inside derived.** v6 wrote
   `preSortedRows.set($rows)` inside the derived. In v7 the plugin captures the
   upstream getter when `deriveRows` is called and exposes
   `preSortedRows: ReadonlyBox` = `{ get current() { return upstreamRows() } }`.
   No state is written during derivation.

3. **Clamping without effects.** v6 pagination clamps `pageIndex` from inside
   the `pageCount` derived. In v7 `pageIndex` stores the raw value and its
   getter returns `Math.min(raw, Math.max(0, pageCount.current - 1))`; the
   setter stores the raw value. Same observable behaviour, no mutation during
   derivation.

Model the data input as a getter: `createSpikeViewModel(data: Getter<Item[]>, plugins)`.
Use plain objects for rows (`{ id, original, cells: [{ id, value, component }] }`);
reuse `SpikeComponent` for rows and cells and apply hooks inside the
`injectedRows` `$derived.by`, exactly where v6 applies them (mutating the row
objects produced by the same computation is fine; mutating _state_ is not).

Expose `vm.current.rows`, `vm.current.pageRows`, `vm.pluginStates.sort.sortKeys`
(a `Box<SortKey[]>` with `toggleId`) and `vm.pluginStates.page.pageIndex` /
`pageSize` (boxes) / `pageCount` (derivedBox).

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors.

### Step 4: Tests that pin the mechanism

Create `src/routes/test/v7-spike/SpikeHost.test.svelte` (renders a table from
the spike view model: header cells with `onclick={cell.current.props.sort.toggle}`
and `data-order`, body rows with `data-testid="row"`) and
`src/routes/test/v7-spike/spike.test.ts` with these cases, modelled on
`src/lib/tableComponent.current.test.ts`:

1. `renders on first paint` — 2 rows, header `data-order="none"`.
2. `sort toggles re-render through current.props` — click, `await tick()`, order `asc`, first row changes.
3. `pagination clamps pageIndex when pageSize grows` — set `pageIndex.current = 3` then `pageSize.current = 100`; `pageIndex.current` reads `0`; `current.pageRows.length` equals the data length.
4. `preSortedRows reflects the upstream getter without writes` — after a sort, `pluginStates.sort.preSortedRows.current` is the unsorted order.
5. `view model created OUTSIDE any component still works for plain reads` — build the vm at test top level (no `render`), read `vm.current.pageRows`, toggle sort, read again: the order changed. (Unowned `$derived` is recomputed on read.)
6. `view model created inside a transient $effect.root is not inert after the root is destroyed` — create the vm inside `$effect.root(() => { ... })`, call the returned cleanup, then toggle sort and read `vm.current.pageRows`: it reflects the toggle. Note the exact outcome in the report: if this test FAILS, that is a finding (not a STOP) — record it and keep the failing test as `test.fails` so the behaviour is pinned.
7. `hook applied after current was first read is visible` — mirrors the v6 test of the same name.

Also add an SSR probe: `src/routes/test/v7-spike/+page.svelte` that builds
the spike view model and renders `pageRows.length` and the first cell. Verify
with the dev server: `curl -s http://localhost:8417/test/v7-spike | grep -c '<td'`
→ a non-zero count (server-rendered cells, no 500).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/routes/test/v7-spike` →
7 tests, all pass (or 6 pass + 1 `test.fails` for case 6, documented).

### Step 5: Bench renderer and measurement

Create `src/routes/test/perf-bench/_PerfTableSpike.svelte`: the same markup
as `_PerfTable.svelte` but driven by `createSpikeViewModel` with sort and
pagination, so `rows-10k`, `sortCycle1k` and `pageCycle` presets exercise the
memo-free component reads. Wire `?renderer=spike` next to the existing
`?renderer=store` branch in `+page.svelte` (line 51). Keep every preset's
`domCells` count identical to the default renderer (the bench asserts it).

Measure, back to back, dev server running on 8417:

```sh
PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench > /tmp/current.json
PERF_BENCH_URL='http://localhost:8417/test/perf-bench?renderer=spike' PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench > /tmp/spike.json
```

Record medians for `rows-10k`, `sortCycle1k`, `pageCycle`. If the spike's
rows-10k median is more than **10 % slower** than the current renderer, add a
second variant of `SpikeComponent` that caches `attrs`/`props` in a lazily
created `$derived` (created inside the getter on first read), re-run, and
report both.

**Verify**: both JSON files exist, both runs exited 0, `domCells` medians
equal across renderers.

### Step 6: Write the report

Create `.agents/.plans/v7-runes-core/001-v7-design-spike.report.md` with:

1. **Verbatim** vitest output for Step 4 and the curl count from the SSR probe.
2. The bench table (renderer × scenario × median/p95, n=30).
3. **Decisions** (each one sentence, cite the test or number that decided it):
    - Component memoisation: memo-free / lazy `$derived` / other.
    - Ownership rule for `createViewModel` and plugin factories (from tests 5–6).
    - The three plugin patterns (getter chain, captured-upstream "pre-X" boxes, clamp-at-read) confirmed or amended.
    - The `Box` / `ReadonlyBox` / `keyedBox` shape confirmed or amended.
4. Anything that surprised you, with file:line.

Then run the full gate: `trunk fmt && trunk check --no-progress && npx -y pnpm@11.24.0 check && npx -y pnpm@11.24.0 exec vitest run`.

**Verify**: full gate green; report file exists; commit made.

## Test plan

- No red-first test: this plan adds a net-new spike with no existing
  behaviour to pin. The seven tests in Step 4 are the deliverable; test 6 is
  allowed to be `test.fails` (that outcome changes plan 002's ownership rule).
- Existing suites are untouched and must stay green (`vitest run` → 608 + 7).

## Done criteria

- [ ] `npx -y pnpm@11.24.0 check` exits 0 (both tsconfigs)
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `npx -y pnpm@11.24.0 exec vitest run` exits 0 and includes the 7 spike tests
- [ ] `curl -s http://localhost:8417/test/v7-spike | grep -c '<td'` > 0 with the dev server up
- [ ] `/tmp/current.json` and `/tmp/spike.json` produced with n=30 and equal `domCells`
- [ ] `.agents/.plans/v7-runes-core/001-v7-design-spike.report.md` exists with the four sections above
- [ ] `git status` shows no changes outside `src/routes/test/v7-spike/`, the two perf-bench files, and the report
- [ ] `.agents/.plans/v7-runes-core/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live files (drift).
- `$derived.by` inside `derivedBox` or inside `deriveRows` throws
  `effect_orphan` / `derived_references_self` / `state_unsafe_mutation` in
  test 5 (plain reads outside any component). That means unowned deriveds do
  not behave as the 2026-09-27 report claimed on the installed Svelte
  (`node_modules/svelte/package.json` → version) and the whole v7 mechanism
  needs a different design.
- The SSR probe returns HTTP 500.
- The memo-free renderer is >10 % slower AND the lazy-`$derived` variant is
  also >10 % slower on rows-10k.

## Maintenance notes

- Everything under `src/routes/test/v7-spike/` and `_PerfTableSpike.svelte`
  is deleted by plan 004 once the real implementation exists. Do not let the
  spike grow beyond what the seven tests need.
- The report is the contract for plans 002–004. If a later plan deviates from
  a decision recorded here, it must say why in its own commit message.
