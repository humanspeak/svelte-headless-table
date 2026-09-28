# Guard report — 002 runes-core-and-contract — PASS

Snapshots: `ceb30df` (executor, Opus) + `bde2ca6` (guard fix-dispatch, Opus). No PR: one branch → one PR after plan 006.

## Verdict

**PASS.** The core is runes-native: `createViewModel` is a `$derived` chain, `TableComponent` is memo-free with hooks applied once per row, `createTable` takes an array or getter and throws on a store, the store layer and `Subscribe` are deleted, and eleven plugins live in `add*.svelte.ts` on the getter contract. The library imports nothing from `svelte/store`.

## Done criteria (reproduced at bde2ca6)

| Criterion                                          | Result                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm check` both tsconfigs                        | 0 errors                                                         |
| `trunk check`                                      | ✔ No new issues (4 dead-suppression notes in parked/spike files) |
| `pnpm test` with coverage                          | 501 passed, 1 expected fail; thresholds met                      |
| `pnpm package`; `dist/plugins/addSortBy.svelte.js` | publint clean; present                                           |
| store grep outside `_parked`                       | nothing                                                          |
| old-name grep outside `_parked`                    | nothing                                                          |
| `_parked/` contents + `PARKED.md`                  | 10 files as specified; PARKED.md lists every config entry        |
| README status row                                  | updated by the guard                                             |

## What plan 003 must know (folded into its revision note)

- Exemplars now exist: `addSortBy.svelte.ts` (`SortKeys` class, `createSortKeys`), `addPagination.svelte.ts` (`createPageState`), `addTableFilter.svelte.ts`.
- Convention: `box`/`RecordSet`/`ArraySet` use `$state.raw`; values change by assignment.
- Hooks are applied once per row object (`WeakSet` in `injectedRows`); a hook's `props`/`attrs` getters must read live state, never snapshot it.
- Test helper path: `src/lib/test/effectRoot.test.svelte.ts`.
- Restoration list is in `PARKED.md`: tsconfig.json / tsconfig.lib.json / vite.config.ts / eslint.config.mjs entries, plus `scrollAlign.ts` and its test.
- `@humanspeak/memory-cache` and `plugins/cacheConfig.ts` are still present because the parked plugins import them.

## Residual risk

The bench could not run (routes parked). The 1.3× sort-interaction regression from the spike is neither confirmed nor ruled out; plan 004's v6-vs-v7 comparison is the gate.
