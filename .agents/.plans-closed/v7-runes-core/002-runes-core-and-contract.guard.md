# Guard log — 002 runes-core-and-contract

## Checkpoint 1 — 2026-09-28 15:38 — ON TRACK (after one fix-dispatch)

ceb30df (executor snapshot) → bde2ca6 (fix-dispatch snapshot) · final close-out

- Scope: every path in the executor's tree was in the plan's in-scope list (core, render, 11 plugins renamed to `.svelte.ts`, tests, parking config, `PARKED.md`); the four complex plugins were moved with `git mv` and not edited; plan/README/guard files untouched.
- Drift: `git diff --stat 6a992eb..ceb30df -- src/lib/` is the plan's own work; `src/lib` was unchanged before it.
- Reproduced at bde2ca6: `pnpm check` `684 FILES 0 ERRORS` / `202 FILES 0 ERRORS`; `vitest run` `49 passed, 501 passed | 1 expected fail (502)`, coverage 93.4/88.8/91.9/94.6 %; `pnpm package` publint `All good!`; tarball contains no `package/dist/test/` entry; `trunk check` `✔ No new issues` (4 non-blocking notes are dead suppressions inside parked/spike files that plans 003/004 restore).
- Greps: `svelte/store` and the old store-layer names return nothing outside `src/lib/plugins/_parked/`; 13 `dist/**/*.svelte.js` files carry `$state.raw(` / `$derived` — runes survive packaging.
- Assertions read: migrated plugin tests assert values through `.current` (e.g. `addPagination.test.ts:20-53`); the late-hook test asserts the observed semantics (`tableComponent.current.test.ts:45-54`) per the 001 report; `createViewModel.tableState.test.ts` and `LabelStateHost.test.svelte` are new and assert label re-render through `state.pageRows()`.
- Plan defects (not executor drift), amended at 92efbac: the dist rune grep matched only `$state(` (executor used `$state.raw` to keep v6 identity semantics — accepted); the store/old-name greps hit files the plan forbids editing. Two further defects fixed via a guard-dispatched follow-up (bde2ca6): excluded tsconfig paths needed matching ESLint ignores (15 Trunk parse errors), and the vitest helper `src/lib/test/effectRoot.svelte.ts` shipped in dist → renamed `effectRoot.test.svelte.ts` so the `!dist/**/*.test.*` filter drops it.
- Executor deviations accepted as reasonable: `vm.current.rows` stays typed `DataBodyRow` (matches 6.4, avoids breaking `row.original` reads); `serverItemCount` rejects stores (consistent with the batch decision); `addColumnFilters` seeds `initialFilterValue` at plugin creation because hooks run under `$derived`; `@humanspeak/memory-cache` stays until 003 decides.
- Not verified: the bench (routes are parked; plan 004 owns it). The 001 sort-interaction regression remains open for 004.
- Action: verdict PASS; README row set to DONE; findings folded into plan 003's pre-flight.
