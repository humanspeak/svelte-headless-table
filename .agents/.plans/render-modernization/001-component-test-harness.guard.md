# Guard log — 001 component-test-harness

## Checkpoint 1 — 2026-09-25 14:17 — PLAN AMENDED

4b03e9a · after first Opus executor run (worktree `svelte-headless-table-rm`, branch `feat/render-modernization`); source not yet snapshotted (see checkpoint 2)

- Executor report: all gates green except `trunk check` → eslint "was not found by the project service" on `vitest.setup.ts`. Root cause: the setup file is in no tsconfig project; the repo's existing pattern for such files is the `projectService: false` list in `eslint.config.mjs:116`, which plan 001 had put out of scope. Classified **plan defect**, not drift — the plan's lint gate was unsatisfiable inside its own scope.
- Executor added `import '@testing-library/jest-dom/vitest'` to the smoke test beyond the plan text; verified necessary (same root cause; `pnpm check` reports 7 errors without it). Accepted and folded into the plan.
- `pnpm add -D jsdom` fails with `ERR_PNPM_ADDING_TO_ROOT` (workspace root); `-w` required. Folded into Step 1.
- Executor reported the pre-commit/trunk hook reformats and lints the committed plan files (markdownlint MD040 in 004, MD033 in 006). Guard-owned files; fixed in this commit.
- Action: plan amended (revision note, Step 3b, scope += `eslint.config.mjs`, Planned-at re-stamped to 4b03e9a); fix-dispatched the Step 3b change to the same executor. Operator not blocked — amendment is a scope correction, not a goal change.
