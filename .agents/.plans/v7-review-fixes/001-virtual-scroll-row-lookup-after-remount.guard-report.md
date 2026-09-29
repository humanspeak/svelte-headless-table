# Guard report — 001 virtual-scroll-row-lookup-after-remount — PASS

Snapshot: `88aeaef` (executor: Opus), checked 2026-09-29 03:20.

- Scope: only `src/lib/plugins/addVirtualScroll.svelte.ts` (+8/−13) and its test (+18).
- Red (executor's run on the unmodified plugin): `expected 1000 to be 600` — after a remount the 100 px measurement also became the estimate for unmeasured rows, so the error was larger than the review's 800. Not independently re-run by the guard; it matches the mechanism read in the code (`allRowsCache` cleared in `destroy()`, refilled only inside a memoised `$derived`).
- Reproduced by the guard: `vitest run src/lib/plugins/addVirtualScroll` 83 passed; `pnpm check` 0 errors on both tsconfigs; `grep -c allRowsCache` → 0; `destroy()` still aborts the range request.
- Verdict: **PASS**. `measureRow` reads `{ index, rows }` from the same derivation.
