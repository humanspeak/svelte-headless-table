# Guard log — 003 complex-plugins

## Checkpoint 1 — 2026-09-28 16:00 — ON TRACK (after one fix-dispatch)

727a7fb (executor snapshot) → a52550d (fix-dispatch snapshot) · final close-out

- Scope: touched paths are the four plugins (moved with `git mv` to `add*.svelte.ts`), their tests, `interactions.test.ts`, `plugins/index.ts`, the parking config entries in `tsconfig.json` / `tsconfig.lib.json` / `vite.config.ts` / `eslint.config.mjs`, `package.json` + lockfile (memory-cache removal), `cacheConfig.ts` (deleted), `PARKED.md`. `src/routes` untouched. Plan/README/guard files untouched.
- Drift: parked files were byte-identical to `61c36ee` before the port (rename lines only).
- Reproduced at a52550d: `pnpm check` `693 FILES 0 ERRORS` / `205 FILES 0 ERRORS`; `pnpm test` `54 passed, 624 passed | 1 expected fail (625)`, coverage 91.6/83.3/91.9/92.8 %; `pnpm package` publint `All good!`, no `dist/plugins/_parked`; `trunk check` `✔ No new issues` (one dead-suppression note in the spike file plan 004 deletes).
- Greps: `svelte/store` in `src/lib` → none; `$effect` in code → only `addVirtualScroll.svelte.ts:621-622` (inside the scroll-container action's `$effect.root`) and the test helper; `memory-cache` → none in `src/lib` or `package.json`; `src/lib/plugins/_parked` gone; no `_parked`/`scrollAlign` config entries remain.
- Plan defect (not drift): `src/lib/index.exports.test.ts` was not in scope although restoring the exports changes its snapshot; fix-dispatched (a52550d) — the snapshot gained exactly the four plugin names plus `getGroupedRows`, no store-era name.
- Executor deviations accepted: per-row selection views cached in a `WeakMap` keyed by the row object (the plan's maintenance note anticipated exactly this); virtual scroll keeps a shared row-source box written during view-model construction under `untrack` (pinned by `addVirtualScroll.test.ts:1014-1048`); range reports follow the padded `visibleRange` as v6 did; `hasMore` / `totalRows` / `dataOffset` accept boxes or getters and throw on a store.
- Read: `addResizedColumns.svelte.ts:392-396` registers and removes `dblclick` (typo fixed) with a test at `:204`; `addSelectedRows.svelte.ts:160-162` ports the v6 setter line for line.
- Residual risk: under jsdom the virtual-scroll content-offset measurement can loop because every element measures zero (executor probe, not a repo test); v6 had the same code. Plan 004's browser e2e (`tests/virtual-scroll.test.ts`) is the real check.
- Action: verdict PASS; README row set to DONE; plan 004 pre-flighted.
