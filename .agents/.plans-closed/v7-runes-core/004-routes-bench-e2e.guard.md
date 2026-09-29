# Guard log — 004 routes-bench-e2e

## Checkpoint 1 — 2026-09-28 16:48 — ON TRACK

cb970fe · final close-out after the Opus executor's single run

- Scope: touched paths are `src/routes/**`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `scripts/perf-baseline.json`, new `scripts/perf-v6-vs-v7.md`, deleted spike/store renderers and `PARKED.md`. `src/lib` and `tests/` untouched; plan/README/guard files untouched.
- Reproduced at cb970fe: `pnpm check` `706 FILES 0 ERRORS` / `205 FILES 0 ERRORS`; `pnpm test` `53 passed, 618 passed` (the 7 spike tests are gone with the spike), coverage 91.6/83.3/91.9/92.8 %; `pnpm package` publint `All good!`; `trunk check` `✔ No issues` (the last dead-suppression note left with the spike); Playwright Chromium + Firefox `36 passed, 2 skipped`, exit 0 — identical to v6.5.
- Criteria: no `testIgnore`, no route excludes in `tsconfig.json` / `eslint.config.mjs`; `grep "Subscribe\|svelte/store" src/routes` → nothing; `src/routes/test/v7-spike`, `_PerfTableStore.svelte`, `_PerfTableSpike.svelte`, `PARKED.md` all gone; `scripts/perf-v6-vs-v7.md` present with setup, six-run method and per-scenario table.
- Bench gate (three headline scenarios, ≤ 1.05×): rows-10k first paint 0.579×; sort-cycle-1k interaction 0.703×; kitchen-sink-1k first paint 0.902×. Guard ruling on the executor's open question: sort-cycle-1k's headline metric is its sort _interaction_ (that is what the preset adds over a plain 1k mount); its cold mount at 1.097× has run medians 41.15/37.35/42.70 vs 37.50/37.45/38.75 — overlapping distributions on a ~40 ms measurement, while the same mount shape in rows-1k is 0.769×. Not a STOP; recorded as noise, not a regression. The spike's 1.3× sort-interaction worry is closed by the 0.703× on real code.
- Behaviour change surfaced (library, not routes): `addColumnFilters` applies `initialFilterValue` at view-model build (`addColumnFilters.svelte.ts:223-226`); v6 applied it lazily on first header-props read. The bench preset that relied on the lazy path was corrected (`initialFilterValue: ''` on a `matchFilter` column filters everything). Routed to plan 005 (migration guide) and 006 (release notes) via 005's revision note.
- Not comparable: per-derivation `timeTotalMs` (v7 nests getter work inside each body); derivation _counts_ match v6.
- Action: verdict PASS; README row set to DONE; plan 005 pre-flighted with the shipped facts and the behaviour change.
