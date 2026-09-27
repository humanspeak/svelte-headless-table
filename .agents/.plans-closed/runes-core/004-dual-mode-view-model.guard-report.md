# Guard report — 004 dual-mode-view-model

**Recommendation: PASS** — `vm.current.*` lands, the two defects execution uncovered (inert deriveds, eager per-instance rune state) are fixed with red-first tests and an absolute perf gate, and every criterion was reproduced.
**Reviewed at** e72b549 · 2026-09-27 05:57 · **Plan planned at** 815c91d (re-baselined after 003; amended three times during execution)
**Integrated** — batch complete; PR is the operator's decision.

## Done criteria

| Criterion                                                                                      | Result | Evidence                                             |
| ---------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `pnpm check` exits 0; `pnpm test` exits 0 with thresholds                                      | met    | 0 errors; 56 files / 597 tests                       |
| Rename in place; no `createViewModel.js'` imports                                              | met    | `dist/createViewModel.svelte.js` present; grep clean |
| `createViewModel.current.test.ts` 5 passing incl. select-after-sort; Step 1 counters unchanged | met    | executor + guard probe                               |
| No `derived_inert` in full vitest output; no `$derived`/`$state` in the two `.svelte.ts` files | met    | 0 lines; grep clean                                  |
| `index.exports.test.ts` snapshot unchanged                                                     | met    | passes                                               |
| e2e chromium + mobile-chrome exit 0                                                            | met    | 36 / 2 skipped                                       |
| rows10k first paint within 15% of the spike commit's store renderer, back to back              | met    | 185.15 vs 198.65 ms (0.93×)                          |
| Step 3d probe under 150 ms, probe deleted                                                      | met    | 134.7 ms (guard's own run)                           |
| Only in-scope files; README row updated                                                        | met    | by guard                                             |

## Spirit

The plan wanted a whole table renderable with no store syntax while the store chain and plugin contract stay untouched. That is what landed, and the route to it was more valuable than the plan itself: the first execution passed every listed gate and would have shipped rows whose `current.props` froze after a sort, and the fix for that quietly tripled 10k-row construction cost. Both were caught by an executor that refused to hand over green-but-wrong work and by guard benches against the spike commit rather than against the plan's own baseline. The final mechanism is simpler than the one the spike recommended: no class-level runes at all, just `fromStore` handles created on first read.

## Scope & conduct

- In-scope only? yes, under the amended scope (`tableComponent.svelte.ts` added for the two fixes).
- STOP conditions respected? yes — three stops, all correct: importer-count mismatch, the freeze, the untrackable lazy `$state`.
- Plan amendments during execution: second pre-flight (importers), fix round 1 (mechanism A → cached handles + version signal), fix round 2 (lazy state, absolute perf gate), fix round 3 (writable version signal). All dated in the plan.

## Residual risk / follow-ups

- `sortCycle1k` on `current.*` is 43.6 ms vs the spike's ad-hoc wrapper at 28.4 ms (still faster than the store path's 51 ms). The spike wrapper cached one `fromStore` per cell for life; the real `current` rebuilds its handles when the hook version changes. If sort-heavy tables matter, profiling that path is the next perf item.
- Each instance actually read through `current` now holds up to three subscriptions (version, attrs, props) for the lifetime of the reading effect. Fine for rendered rows; worth remembering if `current` is ever read for every row in a large dataset outside the viewport.
- Plan 002's guard report still says PASS against its own plan; its mechanism was replaced here. The 002 guard log carries the addendum.
- Next initiative (v7): plugin contract in runes, `createTable(() => data)`, deprecate `Subscribe`, then delete the store layer and `_PerfTableStore.svelte`.
