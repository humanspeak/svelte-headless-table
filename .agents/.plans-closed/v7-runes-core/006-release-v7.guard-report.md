# Guard report — 006 release-v7 — PASS

Snapshot: `058e399` (executor: Opus). The batch is complete; the PR is the operator's call (open via the `pr` skill with the `major` label per `RELEASE-CHECKLIST.md`).

## Verdict

**PASS.** The v7 public surface is pinned by the exports snapshot and a type-level test; the tarball contains only `dist/` runtime files with the runes modules intact and no store import; a fresh SvelteKit consumer installs the tarball, builds, server-renders six cells and type-checks clean; the release notes and merge checklist exist.

## Done criteria (reproduced)

| Criterion                                           | Result                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| exports snapshots match v7 and pass                 | yes (unchanged since plan 003's fix)                                                                                                                         |
| `publicApi.types.test.ts` compiles                  | yes, 0 errors                                                                                                                                                |
| pack audit                                          | 0 test files; 18 `.svelte.js`; `$state.raw` present; 0 store imports                                                                                         |
| fresh consumer builds, renders 6 cells, type-checks | yes (after restoring the scaffold's favicon asset)                                                                                                           |
| release notes + checklist                           | present                                                                                                                                                      |
| full gate                                           | lint: Trunk sandbox quirk on 6 route helpers (plain ESLint clean); types 0 errors; 621 tests; publint clean; docs build ok; Playwright 36 passed / 2 skipped |
| `package.json` version untouched by the branch      | 6.5.4, as on `main`                                                                                                                                          |

## For the operator

- Open the PR with `major`, `breaking-change`, `enhancement`, `javascript`, `documentation`; never `minor`. The workflow bumps patch by default.
- If the PR's Trunk job flags `src/routes/_*.svelte` `no-unsafe-assignment`, that is the sandbox quirk surfacing in CI for the first time; fix by typing the `$props()` destructures explicitly (a route-only change).
- Known, out of batch: docs `pnpm test:unit` lacks `test.globals` on `main`.
