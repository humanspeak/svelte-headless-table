# v6 vs v7 perf bench comparison

One-off evidence for the v7 release (plan 004 of `v7-runes-core`). The ongoing
baseline is `scripts/perf-baseline.json` (the middle v7 run below).

## Setup

- **Date**: 2026-09-28
- **v7**: branch `feat/v7-runes-core` at `9143b1a` plus the plan 004 route changes, dev server on port 8417
- **v6**: `origin/main` at `1d80d78` (v6.5.4) in a separate worktree, dev server on port 8418
- **Toolchain (both)**: Svelte 5.57.1, SvelteKit 2.70.3, Vite 8.3.1, Playwright 1.63.0 (headless Chromium), Node 24.21.0
- **Machine**: Intel Core i7-6700K @ 4.00 GHz (8 threads), 30 GB RAM, Linux 7.0.0-34-generic; desktop session, nothing else benchmarked concurrently
- **Method**: `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench`, six runs alternating v7, v6, v7, v6, v7, v6 after one discarded warm-up run per server. Each run reports a per-metric median and p95 over its 30 cold iterations; the tables show the median of the three run medians, the median of the three run p95s, and each run's median.
- **Ratio**: v7 / v6 (below 1 means v7 is faster). Wall-clock values are milliseconds.

## Results

| Scenario            | Metric          | Headline | v6 median | v6 p95 | v7 median | v7 p95 | v7 / v6 | Gate (≤ 1.05) | v6 run medians           | v7 run medians           |
| ------------------- | --------------- | -------- | --------: | -----: | --------: | -----: | ------: | ------------- | ------------------------ | ------------------------ |
| `rows-10k`          | `firstPaintMs`  | yes      |    372.75 | 444.80 |    215.80 | 254.90 |   0.579 | PASS          | 365.00 / 372.75 / 387.50 | 140.35 / 215.80 / 225.15 |
| `sort-cycle-1k`     | `interactionMs` | yes      |    123.50 | 147.70 |     86.85 | 119.30 |   0.703 | PASS          | 119.00 / 124.90 / 123.50 | 53.35 / 86.85 / 96.20    |
| `sort-cycle-1k`     | `firstPaintMs`  | see note |     37.50 |  49.00 |     41.15 |  55.60 |   1.097 | **over**      | 37.50 / 37.45 / 38.75    | 41.15 / 37.35 / 42.70    |
| `kitchen-sink-1k`   | `firstPaintMs`  | yes      |     61.55 |  76.50 |     55.50 |  73.40 |   0.902 | PASS          | 58.05 / 61.55 / 63.65    | 47.20 / 57.40 / 55.50    |
| `rows-1k`           | `firstPaintMs`  | no       |     93.80 | 128.60 |     72.15 | 106.00 |   0.769 | —             | 89.30 / 93.80 / 100.05   | 71.35 / 72.15 / 85.15    |
| `columns-50`        | `firstPaintMs`  | no       |    140.60 | 192.50 |    115.60 | 148.20 |   0.822 | —             | 129.00 / 140.60 / 144.35 | 71.85 / 115.60 / 124.70  |
| `column-reorder-1k` | `firstPaintMs`  | no       |     43.15 |  78.40 |     46.35 |  76.70 |   1.074 | —             | 42.40 / 44.80 / 43.15    | 36.25 / 46.35 / 50.90    |
| `column-reorder-1k` | `interactionMs` | no       |     37.15 |  47.80 |     30.20 |  44.20 |   0.813 | —             | 35.45 / 37.15 / 38.25    | 17.75 / 34.40 / 30.20    |
| `group-by-1k`       | `firstPaintMs`  | no       |     26.55 |  44.10 |     30.15 |  39.00 |   1.136 | —             | 25.85 / 28.20 / 26.55    | 30.35 / 24.95 / 30.15    |
| `subrows-tree-1k`   | `firstPaintMs`  | no       |     29.80 |  42.60 |     22.95 |  33.20 |   0.770 | —             | 30.20 / 29.05 / 29.80    | 31.70 / 22.70 / 22.95    |
| `subrows-tree-1k`   | `interactionMs` | no       |     22.35 |  32.80 |     17.60 |  26.70 |   0.787 | —             | 22.35 / 20.55 / 22.65    | 12.35 / 17.60 / 17.95    |

Every scenario renders the same number of DOM cells in v6 and v7 (400, 400, 1250, 500, 24, 400, 350, 400).

## Notes

- **Headline metric per scenario.** `rows-10k` and `kitchen-sink-1k` only mount, so their metric is `firstPaintMs`. `sort-cycle-1k` exists to time three sort-key changes on a mounted 1K table, so its headline is `interactionMs`. Its cold mount (`firstPaintMs`, a plain 1K × 8 mount with sort + pagination) is listed separately. It is 1.097× v6 on the median of medians, but the three v7 run medians (41.15 / 37.35 / 42.70) overlap the v6 ones (37.50 / 37.45 / 38.75). The same kind of mount in `rows-1k` is 0.769×. The reviewer should decide whether this row counts against the gate.
- **`timeTotalMs` / `derivationTimings` are not comparable across versions and are left out of the table.** In v6 each derivation is an eager derived store, so each timer covers only that store's own body. Plugin derivations (sorting, grouping, filtering) ran upstream and were never timed. In v7 the derivations are lazy `$derived` getters: `injectedPageRows` pulls `injectedRows`, which pulls the plugin chain and `columnedRows`, all inside the timed body. The same work is counted up to three times and plugin work is included. For example, `rows-10k` records v6 `columnedRows` 52 / `injectedRows` 92.75 / `injectedPageRows` 0 against v7 71.05 / 185.40 / 185.45. The derivation **counts** match (7 / 6 / 7 for `rows-10k` / `sort-cycle-1k` / `kitchen-sink-1k` in both versions).
- **`kitchen-sink-1k` preset fix.** Its `Status` column used `matchFilter` with `initialFilterValue: ''`, which matches no row. v6 only applied initial filter values once a header's props store was subscribed, and the bench renderer never reads header props, so in v6 no filter was ever active. v7 seeds initial filter values when the view model is built, so the unchanged preset rendered 0 cells. The v7 preset now leaves that column's initial value `undefined` (matchFilter's "no filter"). The two `textPrefixFilter` columns keep `''`, so v7 still runs a filter pass over all 1000 rows that v6 skipped. The comparison is conservative against v7.
