# Guard report — 004 routes-bench-e2e — PASS

Snapshot: `cb970fe` (executor: Opus). No PR: one branch → one PR after plan 006.

## Verdict

**PASS.** The routes, perf bench and Playwright suites run on the v7 API with the same browser results as v6.5 (36 passed, 2 skipped on Chromium and Firefox). The spike and the v6 store renderer are deleted. The v6-vs-v7 comparison exists with six alternating 30-iteration runs and v7 is faster on every headline metric.

## Done criteria (reproduced)

| Criterion                                                  | Result                         |
| ---------------------------------------------------------- | ------------------------------ |
| no route exclude / no `testIgnore`                         | confirmed                      |
| `pnpm check` with routes                                   | 0 errors                       |
| `pnpm test`                                                | 618 passed; thresholds met     |
| Playwright Chromium + Firefox                              | 36 passed, 2 skipped, 0 failed |
| routes grep for `Subscribe` / `svelte/store`               | nothing                        |
| spike, store renderer, `PARKED.md` deleted                 | confirmed                      |
| `scripts/perf-v6-vs-v7.md`; ≤ 1.05× on the three headlines | 0.579× / 0.703× / 0.902×       |
| README status row                                          | updated by the guard           |

## Headline numbers (median of the three v7 runs vs three v6 runs)

| Scenario                    |        v6 |        v7 | ratio |
| --------------------------- | --------: | --------: | ----: |
| rows-10k first paint        | 372.75 ms | 215.80 ms |  0.58 |
| sort-cycle-1k interaction   | 123.50 ms |  86.85 ms |  0.70 |
| kitchen-sink-1k first paint |  61.55 ms |  55.50 ms |  0.90 |

The one metric over 1.05× (sort-cycle-1k cold mount, 1.097×) is a ~40 ms measurement whose three-run medians overlap v6's; the guard ruled it noise (see the log).

## For plans 005 and 006

- Migration guide + release notes must state the `initialFilterValue` eager-application change.
- Release notes may quote the table above; the machine and method are in `scripts/perf-v6-vs-v7.md`.
