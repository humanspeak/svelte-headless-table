# Parked paths (v7 runes-core batch)

Created by plan 002, Step 1; updated by plan 003. The v7 branch is intentionally
partial until plan 004: these paths are excluded from type checking, the unit suite,
coverage or Playwright so every gate in plan 002 stays honest. This file is the
source of truth until the restoring plans land; each restoring plan removes its
rows and the matching config entries.

## Restored by plan 003

The four plugins parked in `src/lib/plugins/_parked/` (`addGroupBy`,
`addSelectedRows`, `addResizedColumns`, `addVirtualScroll` with its types, their
tests and `interactions.test.ts`) are back in `src/lib/plugins/` as
`add*.svelte.ts` on the v7 contract, exported from `src/lib/plugins/index.ts`.
`_parked/` is gone, and `src/lib/utils/scrollAlign.ts` / `scrollAlign.test.ts` are
type-checked again. Their config entries were removed from `tsconfig.json`,
`tsconfig.lib.json`, `vite.config.ts` (back to the pre-v7 `test` block) and
`eslint.config.mjs`. Only the routes and end-to-end entries below remain.

## Routes and end-to-end (restored by plan 004)

| Path / config           | Entry                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/routes/**`         | `tsconfig.json` `exclude` (the array also repeats SvelteKit's generated excludes, which a local `exclude` replaces) |
| `tests/**` (Playwright) | `playwright.config.ts` `testIgnore: ['**/*']`                                                                       |
| `src/routes/**` (lint)  | `eslint.config.mjs` top-level `ignores` (typescript-eslint's project service cannot parse tsconfig-excluded files)  |

`pnpm dev` routes (for example `/kitchen-sink`, `/test/perf-bench`) are expected
to fail to render until plan 004. `src/routes/test/v7-spike/spike.test.ts` still
runs under vitest (it does not import `$lib`).
