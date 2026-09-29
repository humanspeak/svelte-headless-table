# Guard log — 001 v7-design-spike

## Checkpoint 1 — 2026-09-28 14:58 — ON TRACK

6a992eb · final close-out after the Opus executor's single run (dispatched by the session guard at 779c6a1)

- Scope: `git status` before the snapshot listed only `src/routes/test/v7-spike/**`, `src/routes/test/perf-bench/_PerfTableSpike.svelte`, `src/routes/test/perf-bench/+page.svelte` and the report file; nothing under `src/lib/`. Plan, README and guard files untouched by the executor.
- Drift: `git diff --stat 1d80d78..6a992eb -- src/lib/` empty.
- Reproduced `npx -y pnpm@11.24.0 check`: `COMPLETED 724 FILES 0 ERRORS` and `COMPLETED 208 FILES 0 ERRORS`.
- Reproduced `npx vitest run`: `Test Files 59 passed (59)`, `Tests 614 passed | 1 expected fail (615)`; the 7 spike tests listed by name, test 6 as `test.fails` (allowed by the plan, Step 4).
- Assertions read (`spike.test.ts:43-140`): each test asserts concrete DOM text/attributes or row-name arrays; test 5 exercises plain reads outside any component; test 7 asserts the _observed_ late-hook behaviour (plain read sees it, DOM updates on next re-render) rather than the v6 expectation — a legitimate finding, recorded below, not a gamed criterion.
- Reproduced the SSR probe on a fresh dev server: HTTP 200, `grep -o '<td' | wc -l` = 6, page shows `pageRows: 3` / `first cell: Ada`.
- Bench artefacts: `/tmp/current.json` and `/tmp/spike.json` each have n=30 for all 8 scenarios and identical `domCells` medians per scenario (400/500/1250/24/350 as applicable). rows-10k first-paint median 203.75 ms (current) vs 98.35 ms (spike).
- Lint: Prettier clean on all new files. Plain ESLint reports one `no-explicit-any` at `spikeViewModel.svelte.ts:220` that sits under a `trunk-ignore` on line 219 (Trunk is the authority; its daemon hung for the guard on this machine, executor reported `✔ No issues`).
- Report: `001-v7-design-spike.report.md` has the four required sections (verbatim results, bench, decisions, surprises).
- Findings for plan 002 (plan-level, not executor drift): (a) a view model created inside a transient `$effect.root` goes `derived_inert` once the root is destroyed — 002 must state the ownership rule and its tests must not build view models inside a root they then destroy; (b) a hook applied after first read is visible to plain reads but does not re-render the DOM by itself — 002 Step 6 "keep the test for it" must be re-specified; (c) sort _interaction_ paint is 1.29–1.33× slower memo-free (hooks re-applied per derivation) — 002/004 must re-bench and are not bound by the memo-free decision if that regression survives; (d) the bench has no `pageCycle` preset — plans 004/README name it and must be corrected.
- Action: verdict PASS; README row set to DONE; plan 002 to be amended at its pre-flight with (a)–(d).
