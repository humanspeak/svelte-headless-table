# Parked paths (v7 runes-core batch)

Created by plan 002, Step 1. The v7 branch is intentionally partial between
plans 002 and 004: these paths are excluded from type checking, the unit suite,
coverage or Playwright so every gate in plan 002 stays honest. This file is the
source of truth until the restoring plans land; each restoring plan removes its
rows and the matching config entries.

## Moved into `src/lib/plugins/_parked/` (restored by plan 003)

| Path                                                | Why parked                               |
| --------------------------------------------------- | ---------------------------------------- |
| `src/lib/plugins/_parked/addGroupBy.ts`             | DOM/imperative state; ported in plan 003 |
| `src/lib/plugins/_parked/addGroupBy.test.ts`        | test for the above                       |
| `src/lib/plugins/_parked/addSelectedRows.ts`        | DOM/imperative state; ported in plan 003 |
| `src/lib/plugins/_parked/addSelectedRows.test.ts`   | test for the above                       |
| `src/lib/plugins/_parked/addResizedColumns.ts`      | DOM/imperative state; ported in plan 003 |
| `src/lib/plugins/_parked/addResizedColumns.test.ts` | test for the above                       |
| `src/lib/plugins/_parked/addVirtualScroll.ts`       | DOM/imperative state; ported in plan 003 |
| `src/lib/plugins/_parked/addVirtualScroll.types.ts` | public types of the above                |
| `src/lib/plugins/_parked/addVirtualScroll.test.ts`  | test for the above                       |
| `src/lib/plugins/_parked/interactions.test.ts`      | uses group-by and selected rows          |

The moved files were not edited, so their relative imports (`./cacheConfig.js`,
`../utils/*`, `../utils/store.js`) no longer resolve from `_parked/`. Plan 003
fixes the paths when it moves them back.

Config entries (remove in plan 003):

- `tsconfig.lib.json` `exclude`: `src/lib/plugins/_parked/**`
- `tsconfig.json` `exclude`: `src/lib/plugins/_parked/**`
- `vite.config.ts` `test.exclude` and `test.coverage.exclude`: `src/lib/plugins/_parked/**`
- `src/lib/plugins/index.ts`: the four `export * from './addX'` lines were removed

## Parked in place (restored by plan 003)

| Path                                | Why parked                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/lib/utils/scrollAlign.ts`      | type-only import of `../plugins/addVirtualScroll.types.js`, which now lives in `_parked/`              |
| `src/lib/utils/scrollAlign.test.ts` | imports the above; still runs under vitest (the type-only import is erased), only type-check is parked |

Config entries: `tsconfig.lib.json` `exclude` (`scrollAlign.ts`), `tsconfig.json`
`exclude` (both files). `HeightManager.ts` has no plugin imports and is not parked.

## Routes and end-to-end (restored by plan 004)

| Path / config           | Entry                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/routes/**`         | `tsconfig.json` `exclude` (the array also repeats SvelteKit's generated excludes, which a local `exclude` replaces) |
| `tests/**` (Playwright) | `playwright.config.ts` `testIgnore: ['**/*']`                                                                       |

`pnpm dev` routes (for example `/kitchen-sink`, `/test/perf-bench`) are expected
to fail to render until plan 004. `src/routes/test/v7-spike/spike.test.ts` still
runs under vitest (it does not import `$lib`).
