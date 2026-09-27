# Plan 001: Spike a runes-backed `TableComponent` and measure it against the store chain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/runes-core/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat fdc76a8..HEAD -- src/lib/tableComponent.ts src/lib/headerCells.ts src/lib/bodyCells.ts src/lib/headerRows.ts src/lib/bodyRows.ts src/routes/test/perf-bench scripts/perf-bench.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (prototype lives under `src/routes/test/`, which is not published; no library file changes)
- **Depends on**: none
- **Category**: direction (design spike)
- **Planned at**: commit `fdc76a8`, 2026-09-27

## Why this matters

The library's public reactive surface is Svelte stores: every cell and row
exposes `attrs()` and `props()` as `Readable`s, and the view model hands out
eight more. That is the only reason a consumer template needs `<Subscribe>`
or `fromStore` at all. Moving the core to Svelte 5 runes is a major-version
redesign touching 25 non-test files, so the two decisions that shape every
later plan must be settled on real code first, not guessed:

1. **What a runes-native `attrs`/`props` looks like to a consumer** (a getter
   on the cell? a namespace like `cell.current.attrs`? something else), and
   what it costs relative to today's per-cell `derived` stores.
2. **Where reactive state can live in this codebase.** Runes only compile in
   `.svelte` and `.svelte.ts` files, and a `$derived` created outside a
   component effect is "unowned". Whether `fromStore(...).current` inside such
   a `$derived` actually tracks the store, or silently reads a snapshot, decides
   the whole adapter strategy for the dual-mode phase.

This plan produces a prototype, numbers, and a short written report. Nothing
from it is merged into `src/lib`. The report is the input to plans 002–004.

## Current state

- `src/lib/tableComponent.ts` — abstract base for rows and cells. Plugins
  attach hook stores via `applyHook`, and consumers read merged results as
  fresh derived stores on every call:

```ts
// src/lib/tableComponent.ts:46-72
private attrsForName: Record<string, Readable<Record<string, unknown>>> = {}

attrs(): Readable<Record<string, unknown>> {
    return derived(Object.values(this.attrsForName), ($attrsArray) => {
        let $mergedAttrs: Record<string, unknown> = {}
        $attrsArray.forEach(($attrs) => {
            $mergedAttrs = mergeAttributes($mergedAttrs, $attrs)
        })
        return finalizeAttributes($mergedAttrs)
    })
}

private propsForName: Record<string, Readable<Record<string, unknown>>> = {}

props(): Readable<PluginTablePropSet<Plugins>[Key]> {
    return derivedKeys(this.propsForName) as Readable<PluginTablePropSet<Plugins>[Key]>
}
```

and `applyHook` (lines 93–103) writes into those two maps. Subclasses wrap
`super.attrs()` in another `derived` to add `role`/`colspan`:
`src/lib/headerCells.ts:93-101`, `src/lib/bodyCells.ts:52-59`,
`src/lib/bodyRows.ts:63-70`, `src/lib/headerRows.ts:69-76`.

- Hooks are applied inside the view model's derivations, not at render time:
  `src/lib/createViewModel.ts:457-477` (`injectedRows`) and `500-521`
  (`headerRows`). So by the time a template sees a row, its hook maps are
  already populated. Plugin hook props/attrs are `Readable`s (see
  `src/lib/types/TablePlugin.ts`, `ElementHook`).
- Svelte 5.56.10 is installed. Relevant runtime facts, verified in
  `node_modules/svelte/src/store/index-client.js`:
    - `fromStore(store).current` subscribes via `createSubscriber` **only when
      `effect_tracking()` is true**; otherwise it returns `get(store)` (a
      one-shot read). Whether a `$derived` in a class field counts as tracking
      is precisely what Step 2 measures.
    - `toStore(getter)` (lines 47–98) wraps a getter in a store using
      `effect_root` + `render_effect`, so it works outside components.
- `@sveltejs/package@2.5.8` maps `foo.svelte.ts` to `dist/foo.svelte.js`
  (`node_modules/@sveltejs/package/src/utils.js:156-166`), so `.svelte.ts`
  library files are publishable. Not needed for this spike (routes are not
  packaged) but it matters for the report's recommendation.
- Perf harness: `src/routes/test/perf-bench/+page.svelte` runs fixed
  scenarios (`rows-1k`, `rows-10k`, `columns-50`, `column-reorder-1k`,
  `group-by-1k`, `sort-cycle-1k`, `subrows-tree-1k`, `kitchen-sink-1k`),
  writes a stats line into `[data-testid="perf-stats"]`, and renders the
  current view model through one child component:

```svelte
<!-- src/routes/test/perf-bench/+page.svelte:1376-1382 -->
{#if currentVm}
    {#key currentVm}
        <PerfTable vm={currentVm} />
    {/key}
{/if}
```

`src/routes/test/perf-bench/_PerfTable.svelte` is the store-based renderer
(`<Subscribe attrs={cell.attrs()} let:attrs>` per row and cell, lines 24–52).
`scripts/perf-bench.mjs` drives the page headlessly and aggregates
mean/median/p95 over `PERF_BENCH_ITERATIONS`; `scripts/perf-baseline.json`
holds a 100-iteration cold baseline (captured 2026-05-24). Medians from it:

| scenario        | firstPaintMs | p95   | timeTotalMs (derivations) |
| --------------- | ------------ | ----- | ------------------------- |
| rows-1k         | 55.5         | 65.0  | 6.6                       |
| rows-10k        | 168.75       | 196.9 | 53.9                      |
| sort-cycle-1k   | 28.7         | 32.3  | 5.8                       |
| kitchen-sink-1k | 43.7         | 49.1  | 4.9                       |

Absolute numbers differ machine to machine; only same-machine deltas
between the two renderers matter here.

- Existing exemplar for a runes host + reactivity test:
  `src/lib/FromStoreHost.test.svelte` and `src/lib/fromStore.test.ts` (sort
  toggle updates `props.current.sort.order`; column width updates
  `attrs.current.style`). Component tests run under jsdom via
  `@testing-library/svelte`; every component test file starts with
  `import '@testing-library/jest-dom/vitest'`.
- Conventions: 4-space indent, no semicolons, single quotes, JSDoc on
  exports, `// trunk-ignore(eslint/<rule>)` for suppressions (never
  `eslint-disable`). Files under `src/routes/test/**` are dev fixtures and
  are excluded from coverage and from the package.
- A prior attempt does not exist; `.agents/.plans-closed/` holds unrelated
  finished batches.

## Commands you will need

| Purpose            | Command                                                                             | Expected on success               |
| ------------------ | ----------------------------------------------------------------------------------- | --------------------------------- |
| Install            | `pnpm install --frozen-lockfile`                                                    | exit 0                            |
| Typecheck          | `pnpm check`                                                                        | `svelte-check found 0 errors`     |
| One test file      | `pnpm exec vitest run <path>`                                                       | all pass                          |
| All unit tests     | `pnpm test:only`                                                                    | exit 0                            |
| Lint               | `trunk check`                                                                       | no new issues                     |
| Format             | `trunk fmt`                                                                         | exit 0/1                          |
| Dev server         | `pnpm dev`                                                                          | serves on `localhost:8417`        |
| Perf bench (store) | `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench > /tmp/store.json` | JSON with `cold.<scenario>.stats` |
| Perf bench (runes) | same with `PERF_BENCH_URL='http://localhost:8417/test/perf-bench?renderer=runes'`   | JSON                              |

If `pnpm` is not on PATH, `npx -y pnpm@11.24.0 <args>` is equivalent. The
perf bench needs the dev server running in another shell and Playwright
Chromium installed (`pnpm exec playwright install chromium`).

## Scope

**In scope** (create/modify only these):

- `src/routes/test/runes-spike/runesComponent.svelte.ts` (create — the prototype)
- `src/routes/test/runes-spike/RunesHost.test.svelte` and
  `src/routes/test/runes-spike/runesComponent.test.ts` (create — reactivity tests)
- `src/routes/test/perf-bench/_PerfTableRunes.svelte` (create — runes renderer)
- `src/routes/test/perf-bench/+page.svelte` (only: read a `renderer` query
  param and pick `_PerfTableRunes` when it equals `runes`)
- `src/routes/test/runes-kitchen-sink/+page.svelte` (create — a copy of the
  kitchen sink rendered through the prototype)
- `.agents/.plans/runes-core/001-runes-spike.report.md` (create — the design report)
- `vite.config.ts` only if the test `include` glob must be widened to pick
  up `src/routes/test/runes-spike/*.test.ts` (it is currently
  `src/**/*.test.ts`, which already matches — so probably no change)

**Out of scope** (do NOT touch):

- Anything under `src/lib/` — this is a prototype, not the migration.
- `scripts/perf-bench.mjs` and `scripts/perf-baseline.json`.
- `tests/**` e2e, `docs/**`, `README.md`.
- Existing scenarios or stats fields in the perf page — the store renderer
  must keep producing identical stats.

## Git workflow

- Branch: this batch runs on `feat/runes-core` (already created off `main`).
- Commits: conventional, e.g. `spike(runes): prototype runes-backed cell attrs/props with perf renderer`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prototype the runes wrapper (two candidate mechanisms)

Create `src/routes/test/runes-spike/runesComponent.svelte.ts`. It wraps an
existing store-based `TableComponent` (any row or cell) and exposes plain
reactive values. Implement **both** mechanisms side by side, because which
one works is the finding:

```ts
import type { Readable } from 'svelte/store'
import { fromStore } from 'svelte/store'
import { createSubscriber } from 'svelte/reactivity'
import type { TableComponent } from '$lib/tableComponent.js'
import type { AnyPlugins, ComponentKeys } from '$lib/types/TablePlugin.js'

/**
 * Mechanism A: read the component's existing derived stores through
 * fromStore inside class-field $derived. Whether this tracks updates when
 * the instance is created outside a component effect is the open question.
 */
export class RunesViaFromStore<Item, Plugins extends AnyPlugins, Key extends ComponentKeys> {
    #attrsStore: Readable<Record<string, unknown>>
    #propsStore: Readable<Record<string, unknown>>
    constructor(component: TableComponent<Item, Plugins, Key>) {
        this.#attrsStore = component.attrs()
        this.#propsStore = component.props() as Readable<Record<string, unknown>>
    }
    readonly attrs = $derived(fromStore(this.#attrsStore).current)
    readonly props = $derived(fromStore(this.#propsStore).current)
}

/**
 * Mechanism B: mirror each store into $state through an explicit
 * subscription started by createSubscriber, so the subscription lives
 * exactly as long as something reads the value inside an effect.
 */
export class RunesViaSubscriber<Item, Plugins extends AnyPlugins, Key extends ComponentKeys> {
    #attrs = $state.raw<Record<string, unknown>>({})
    #props = $state.raw<Record<string, unknown>>({})
    #subscribeAttrs: () => void
    #subscribeProps: () => void
    constructor(component: TableComponent<Item, Plugins, Key>) {
        const attrsStore = component.attrs()
        const propsStore = component.props() as Readable<Record<string, unknown>>
        this.#subscribeAttrs = createSubscriber(() =>
            attrsStore.subscribe((value) => {
                this.#attrs = value
            })
        )
        this.#subscribeProps = createSubscriber(() =>
            propsStore.subscribe((value) => {
                this.#props = value
            })
        )
    }
    get attrs() {
        this.#subscribeAttrs()
        return this.#attrs
    }
    get props() {
        this.#subscribeProps()
        return this.#props
    }
}
```

Add a `wrapRows(rows)` helper that returns, per row, `{ row, cell: Map<cellId, wrapper> }`
so a template can do `{#each wrapped as { row, wrapper } (row.id)}` and
`<tr {...wrapper.attrs}>`. Keep it tiny; it exists only for the renderer.

**Verify**: `pnpm check` → 0 errors. If `svelte-check` rejects `$derived` or
`$state` in a class field of a `.svelte.ts` file, STOP: that would mean the
toolchain does not support the mechanism the whole roadmap assumes.

### Step 2: Prove or disprove reactivity for each mechanism

Create `src/routes/test/runes-spike/RunesHost.test.svelte` modelled on
`src/lib/FromStoreHost.test.svelte` (same data, same `addSortBy()` +
`addResizedColumns()` plugins), but taking a `mechanism: 'fromStore' | 'subscriber'`
prop and rendering header cells as
`<th {...w.attrs} data-testid={`th-${cell.id}`} data-order={w.props.sort.order ?? 'none'} onclick={w.props.sort.toggle}>`
where `w` is the wrapper for that cell, created **inside `<script>` at
component init**, not inside the template. Body rows likewise.

Create `src/routes/test/runes-spike/runesComponent.test.ts` running the same
three assertions as `src/lib/fromStore.test.ts` (first paint, sort toggle
flips `data-order` and reorders rows, `columnWidths.set` changes the `th`
style) **for each mechanism** via `describe.each`.

**Verify**: `pnpm exec vitest run src/routes/test/runes-spike/runesComponent.test.ts`
→ record the result per mechanism. Either outcome is a finding; a failure
here is not a STOP. Note in the report exactly which assertions failed for
mechanism A, if any, and whether wrapping the reads in an `$effect` changes it.

### Step 3: Add the runes renderer to the perf bench

Create `src/routes/test/perf-bench/_PerfTableRunes.svelte`: a copy of
`_PerfTable.svelte` that builds wrappers for `$headerRows` and `$pageRows`
(use whichever mechanism passed Step 2; if both passed, use A and say so) and
spreads `wrapper.attrs` directly, with no `<Subscribe>`. Keep `Render` for
cell content and keep the `data-row-id` / `data-depth` attributes so DOM
cell counts match.

In `+page.svelte`, read `page.url.searchParams.get('renderer')` once at init
(`import { page } from '$app/state'` is fine in Svelte 5) and render
`<PerfTableRunes vm={currentVm} />` instead of `<PerfTable>` when it equals
`runes`. No other change to the page.

**Verify**: with `pnpm dev` running, open
`http://localhost:8417/test/perf-bench?renderer=runes`, run the `rows-1k`
scenario from the page's controls, and confirm `domCells=400` in the stats
line (same as the store renderer). Then `pnpm check` → 0 errors.

### Step 4: Measure

With the dev server running and nothing else heavy on the machine, capture
both renderers back to back, 30 cold iterations each:

```bash
PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench > /tmp/store.json
PERF_BENCH_URL='http://localhost:8417/test/perf-bench?renderer=runes' \
  PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench > /tmp/runes.json
```

Extract, for `rows1k`, `rows10k`, `sortCycle1k` and `kitchenSink1k`, the
`stats.firstPaintMs.median`, `.p95`, `stats.renderOnlyMs.median` and
`stats.scenarioLongestTaskMs.median` from each file (`cold.<key>.stats`).

**Verify**: both JSON files parse and contain all four scenarios; put the
eight rows in the report as a table with the runes/store ratio per row.

### Step 5: Write the report

Create `.agents/.plans/runes-core/001-runes-spike.report.md` with exactly these sections:

1. **Decision 1 — consumer shape.** Recommend one of: (a) getters on the
   component named `attrs`/`props` (breaking: today those are methods), (b) a
   namespace such as `cell.current.attrs` / `cell.current.props` that can
   coexist with the store methods during a dual-mode major, or (c) something
   the prototype showed to be better. State the recommendation in one
   sentence, then the reasoning. Include a 10-line template snippet showing
   what a consumer's `{#each row.cells}` block would look like.
2. **Decision 3 — where reactive state lives.** Which mechanism tracked
   updates (Step 2 results, verbatim test output), whether unowned `$derived`
    - `fromStore` is safe, and therefore whether the dual-mode core should
      hold `$state` mirrors (mechanism B) or `$derived` over `fromStore`
      (mechanism A).
3. **Performance.** The Step 4 table. Call out any scenario where the runes
   renderer is more than 10% slower at the median, and whether the longest
   task grew.
4. **Risks found.** Anything the toolchain rejected, warnings from
   `svelte-check`, SSR behaviour if you checked it (optional: `render` from
   `svelte/server` on the host).
5. **Recommendation for plan 002.** Which mechanism, which naming, and any
   change to the split "TableComponent → cells/rows → createViewModel".

**Verify**: `trunk check .agents/.plans/runes-core/001-runes-spike.report.md` → no issues.

### Step 6: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`.

**Verify**: all exit 0; the existing 52+ test files still pass (the spike
adds one).

## Test plan

- No red-first test: net-new prototype with no existing behaviour to pin.
- New: `src/routes/test/runes-spike/runesComponent.test.ts` — 3 assertions ×
  2 mechanisms. A failing mechanism-A case is an expected possible result and
  must be reported, not fixed away; mark it `test.fails` only if the report
  explains why, so the suite stays green.
- Pattern: `src/lib/fromStore.test.ts` and `src/lib/FromStoreHost.test.svelte`.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; `runesComponent.test.ts` exists and its results are recorded in the report
- [ ] `/test/perf-bench?renderer=runes` renders `rows-1k` with `domCells=400`
- [ ] `/tmp/store.json` and `/tmp/runes.json` each contain `cold.rows1k`, `cold.rows10k`, `cold.sortCycle1k`, `cold.kitchenSink1k`
- [ ] `.agents/.plans/runes-core/001-runes-spike.report.md` exists with the five sections and the performance table
- [ ] `git status --porcelain` lists only in-scope files; nothing under `src/lib/` changed
- [ ] README status row for 001 updated

## STOP conditions

- The "Current state" excerpts don't match the live code.
- `svelte-check` or Vite rejects runes in a `.svelte.ts` class (Step 1).
- The store renderer's stats change (e.g. `domCells` ≠ 400 for `rows-1k`)
  after the `+page.svelte` edit — the control must be untouched.
- You find yourself changing anything under `src/lib/` to make the
  prototype work; report what you needed instead.

## Maintenance notes

- The prototype and renderer are throwaway fixtures; plan 002 supersedes
  them and should delete `src/routes/test/runes-spike/` once the real
  implementation has its own tests.
- Reviewer focus: the report's Decision 3 must cite the actual test output,
  not reasoning about how `fromStore` "should" behave.
- Deferred on purpose: plugin-contract changes and any public API change.
