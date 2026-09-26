# Guard log — 001 component-test-harness

## Checkpoint 1 — 2026-09-25 14:17 — PLAN AMENDED

4b03e9a · after first Opus executor run (worktree `svelte-headless-table-rm`, branch `feat/render-modernization`); source not yet snapshotted (see checkpoint 2)

- Executor report: all gates green except `trunk check` → eslint "was not found by the project service" on `vitest.setup.ts`. Root cause: the setup file is in no tsconfig project; the repo's existing pattern for such files is the `projectService: false` list in `eslint.config.mjs:116`, which plan 001 had put out of scope. Classified **plan defect**, not drift — the plan's lint gate was unsatisfiable inside its own scope.
- Executor added `import '@testing-library/jest-dom/vitest'` to the smoke test beyond the plan text; verified necessary (same root cause; `pnpm check` reports 7 errors without it). Accepted and folded into the plan.
- `pnpm add -D jsdom` fails with `ERR_PNPM_ADDING_TO_ROOT` (workspace root); `-w` required. Folded into Step 1.
- Executor reported the pre-commit/trunk hook reformats and lints the committed plan files (markdownlint MD040 in 004, MD033 in 006). Guard-owned files; fixed in this commit.
- Action: plan amended (revision note, Step 3b, scope += `eslint.config.mjs`, Planned-at re-stamped to 4b03e9a); fix-dispatched the Step 3b change to the same executor. Operator not blocked — amendment is a scope correction, not a goal change.

## Checkpoint 2 — 2026-09-25 14:26 — ON TRACK

965672f · final close-out after the fix-dispatch round (Step 3b applied)

- Reproduced by guard: `pnpm check` 0 errors (3 pre-existing warnings in `src/routes`); `pnpm test:only` 41 files / 537 tests, smoke suite 5/5 incl. readable-props update; `trunk check` on the changed files → no issues (including `vitest.setup.ts`); `pnpm package` → publint All good; `npm pack --dry-run | grep -c test` → 0; greps for `environment: 'jsdom'`, `svelteTesting()`, `"jsdom"` → 1 each.
- Diff read in full: `vite.config.ts` carries exactly the four Step 3 changes; `eslint.config.mjs` only gains `'vitest.setup.ts'` in the `projectService: false` list (prettier re-wrapped the array); fixture and smoke test match the amended plan text; `vitest.setup.ts` is the single import line.
- Smoke assertions are real: string, readable+update, component+static props, component+readable props+update, `.slot()` mount.
- Environment note: the husky pre-commit hook calls `pnpm`, which is not on PATH in the guard's shell; a PATH shim (`/tmp/pnpm-shim/pnpm` → `npx -y pnpm@11.24.0`) let the hook run for real rather than bypassing it.
- Action: none needed; PASS recorded in the close-out report; README row → DONE.
