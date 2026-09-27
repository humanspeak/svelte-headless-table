# Guard log — 002 dual-mode-table-component

## Checkpoint 1 — 2026-09-27 04:44 — ON TRACK

c557fe5 · final close-out after one Opus executor run (base 47c71a8)

- Red state reproduced by executor: `Property 'current' does not exist on type 'HeaderRow<…>'` ×6 from `pnpm check` before Step 3. Executor also proved the fourth test depends on `#hookVersion` by commenting the bump out (fails) and restoring it (passes).
- Reproduced by guard at c557fe5: `pnpm check` 0 errors; `pnpm test` 55 files / 600 tests with thresholds; `current.test.ts` 4/4 incl. late-`applyHook`; `tableComponent.ssr.test.ts` 1/1 (Node env, `svelte/server`); rename in place, no `tableComponent.js'` imports, no `derived(super.attrs()` left; `trunk check src/lib eslint.config.mjs` → no new issues; `pnpm package` publint All good with `dist/tableComponent.svelte.js`; e2e chromium + mobile-chrome 36 passed / 2 skipped.
- Diff read in full. `current` is exactly the spike's mechanism A (constructor-assigned `$derived.by` over `fromStore`, version signal bumped in `applyHook`); store methods untouched; `decorateAttrs` replaces the four `derived(super.attrs())` wrappers; `eslint.config.mjs` adds `**/*.svelte.ts` to three blocks (TS parser, floating-promises, complexity). `$`-prefixed locals renamed because the compiler reserves the prefix in `.svelte.ts` — cosmetic. Base `attrs()` typed as `Readable<AttributesForKey<Item, Plugins>[Key]>` so the public subclass types did not widen (executor verified with a type probe, then removed it).
- Executor decision 1 (trunk findings in the spike file after its blanket ignore was removed per Step 0): accepted as known until plan 003 deletes the file; the four findings are in `src/routes/test/runes-spike/runesComponent.svelte.ts` only. Consequence: the pre-commit hook rejected the snapshot commit, so it was made with `--no-verify` after `trunk check` on `src/lib` and `eslint.config.mjs` was confirmed clean.
- Executor decision 2 (no kitchen-sink e2e spec): incorrect premise — `tests/initial.test.ts` and `tests/performance.test.ts` both navigate to `/kitchen-sink`; the STOP condition was exercised and passed.
- Action: PASS; README row → DONE; plan 003 re-baselined to c557fe5.
