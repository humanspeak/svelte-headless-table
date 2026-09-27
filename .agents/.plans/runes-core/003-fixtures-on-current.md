# Plan 003: Move the perf-bench renderer and kitchen sink onto `current.*`, delete the spike

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/runes-core/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat <002 snapshot SHA>..HEAD -- src/routes/test/perf-bench src/routes/kitchen-sink src/routes/test/runes-spike src/lib/tableComponent.svelte.ts`
> (the reviewer fills in the SHA when 002 lands). On a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (dev fixtures only; e2e is the gate)
- **Depends on**: 002-dual-mode-table-component.md
- **Category**: migration
- **Planned at**: commit `fdc76a8`, 2026-09-27 (re-baseline after 002)

## Why this matters

Once cells and rows expose `current.attrs` / `current.props`, the repo's own
fixtures should use them: the perf bench so every future measurement runs
the runes path by default (with the store path kept as a switchable control),
and the kitchen sink so the e2e suite exercises `current.*` under the full
plugin stack. The spike's throwaway wrapper becomes redundant and is removed.

## Current state

- `src/routes/test/perf-bench/_PerfTable.svelte:24-52` renders rows and cells
  via `<Subscribe attrs={row.attrs()} let:attrs>` / `<Subscribe attrs={cell.attrs()} let:attrs>`.
- After plan 001, `src/routes/test/perf-bench/_PerfTableRunes.svelte` renders
  through the spike wrapper, and `+page.svelte` picks it when
  `?renderer=runes` is present.
- `src/routes/kitchen-sink/+page.svelte:412-492` uses `<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>`
  for header and body cells and `<Subscribe attrs={row.attrs()} let:attrs rowProps={row.props()} let:rowProps>` for rows.
  `tests/initial.test.ts` and `tests/performance.test.ts` drive this page.
- After plan 002, every row and cell has `current.attrs` and `current.props` (getters).

## Commands you will need

Same table as plan 002. Plus: `pnpm dev` and the perf bench commands from plan 001.

## Scope

**In scope**:

- `src/routes/test/perf-bench/_PerfTable.svelte` (rewrite to `current.*`)
- `src/routes/test/perf-bench/_PerfTableRunes.svelte` (delete)
- `src/routes/test/perf-bench/+page.svelte` (the `renderer` switch now selects a `_PerfTableStore.svelte` control: rename the old renderer to that file; default is the `current.*` renderer)
- `src/routes/kitchen-sink/+page.svelte` (replace the `Subscribe` blocks with `current.*` reads; keep every `data-testid`, class binding and handler)
- `src/routes/test/runes-spike/**` (delete)

**Out of scope**: `src/lib/**`, `tests/**` assertions, `docs/**`.

## Steps

### Step 1: Perf renderer

Rename `_PerfTable.svelte` → `_PerfTableStore.svelte` (`git mv`). Create a
new `_PerfTable.svelte` that reads `row.current.attrs` / `cell.current.attrs`
directly (no `Subscribe`), keeping `Render` and the `data-row-id`/`data-depth`
attributes. Flip the `+page.svelte` switch so `?renderer=store` selects the
control and the default is the new file. Delete `_PerfTableRunes.svelte`.

**Verify**: `pnpm dev`, open `/test/perf-bench`, run `rows-1k` → `domCells=400`;
open `/test/perf-bench?renderer=store`, run `rows-1k` → `domCells=400`.

### Step 2: Kitchen sink

Replace each `<Subscribe … let:…>` block with direct reads:
`<tr {...row.current.attrs} class:selected={row.current.props.select.selected}>`,
`<th {...cell.current.attrs} onclick={cell.current.props.sort.toggle} …>` and so on.
Every attribute, class directive, action (`use:props.resize`) and
`{#if props.filter?.render}` branch must map one-to-one onto `cell.current.props`.

**Verify**: `pnpm exec playwright test --project=chromium --project=mobile-chrome` → all pass
(`tests/initial.test.ts` filters, sorts, groups, expands and selects through this page).

### Step 3: Remove the spike and gate

Delete `src/routes/test/runes-spike/`. `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`, e2e.

**Verify**: all exit 0; `grep -rn "Subscribe" src/routes/kitchen-sink src/routes/test/perf-bench/_PerfTable.svelte` → no matches.

## Test plan

- No red-first test: fixture migration. The e2e suite is the behavioural gate and must not be edited.

## Done criteria

- [ ] `grep -rn "Subscribe" src/routes/kitchen-sink/+page.svelte src/routes/test/perf-bench/_PerfTable.svelte` → none
- [ ] `test -f src/routes/test/perf-bench/_PerfTableStore.svelte && ! test -d src/routes/test/runes-spike`
- [ ] `pnpm exec playwright test --project=chromium --project=mobile-chrome` exits 0 with the same test count as before
- [ ] `pnpm check` / `pnpm test:only` exit 0
- [ ] README status row for 003 updated

## STOP conditions

- Any e2e test fails after Step 2 — do not edit `tests/**`; report the failing assertion.
- A kitchen-sink feature has no `current.props` equivalent (would mean 002 missed a hook path).

## Maintenance notes

- The store control renderer exists so a perf regression can be attributed to the rune path vs. the derivation chain; keep it until the stores are removed in v7.
