# Guard log — 005 docs-and-migration-guide

## Checkpoint 1 — 2026-09-28 17:31 — ON TRACK

bb648f7 · final close-out after the Opus executor's single run

- Scope: 64 files, all under `docs/` plus `README.md`; `src/lib` untouched; `docs/src/lib/demo-loaders.ts` not in the diff; plan/README/guard files untouched.
- Drift: `docs/` and `README.md` unchanged since `61c36ee` before this plan.
- Reproduced at bb648f7: root `pnpm package` publint `All good!`; docs `docs:props` → `8 prop sets` with no diff; docs `pnpm check` `4990 FILES 0 ERRORS 27 WARNINGS` (baseline before the plan: 124 errors); docs `pnpm build` exit 0 with `Favicon verified`; docs Playwright `4 passed`; the migration guide is first in the Guides nav (`docsNav.ts:129`); `api/subscribe` deleted; the `$pluginState` grep over `docs/src` `.svelte` files → 0; `Subscribe` / `.attrs()` / `.props()` in `.svx` → only inside the guides' 6.x "before" blocks and the mandated removal note; README grep → clean.
- Read: the guide has the seven required sections (lines 23–409) and calls out the eager `initialFilterValue` change (table row line 56, warning line 230, checklist line 419).
- Done-criteria wording defect (not drift): the two literal "no matches" greps cannot hold while the guide shows before/after code; the executor's reading (matches only in guides' 6.x blocks) is the intent — recorded here, no plan text change needed.
- Pre-existing, out of scope: docs `pnpm test:unit` fails with `ReferenceError: it is not defined` — `docs/vite.config.ts` has no `test.globals`, unchanged on `main`; CI's docs job runs Playwright only. Reported to the operator.
- Trunk: on the modified set Trunk's ESLint reports `no-unsafe-assignment` on `$props()` destructures in `src/routes/_*.svelte` (plan 004 files) while plain `npx eslint src/routes` is clean and Prettier is clean on every changed file. Same signature as the sandbox type-resolution quirk seen on `main` (Render.svelte) under `--all`. Not a code defect; flagged as a thing to watch on the PR's Trunk job.
- Action: verdict PASS; README row set to DONE; plan 006 pre-flighted.
