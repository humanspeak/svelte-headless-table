# Compare bench: humanspeak vs TanStack Table

First head-to-head run of `scripts/compare-bench.mjs` against
`src/routes/test/compare-bench`. Raw input for the docs benchmark page
(HUM-36); rerun and replace when either library changes.

## Setup

- **Date**: 2026-10-28
- **Libraries**: `@humanspeak/svelte-headless-table` at `fbbe6a3` (7.0.1 + agent skills, no runtime change), `@tanstack/svelte-table` 9.3.1
- **Build**: production (`vite build` + `vite preview`), not the dev server
- **Toolchain**: Svelte 5.57.1, Vite 8.3.1, Playwright 1.63.0 (headless Chromium), Node 24.15.0
- **Machine**: Intel Core i9-10910 @ 3.60 GHz (20 threads), 128 GB RAM, macOS 26.7.1
- **Method**: `COMPARE_BENCH_ITERATIONS=20 pnpm compare:bench`. Each sample is a fresh page load (cold mount) of one library on one scenario; library order alternates every iteration; one discarded warm-up per library.
- **Ratio**: humanspeak / TanStack (below 1 means humanspeak is faster). Milliseconds.

## Same work on both sides

- 8 columns, deterministic rows (`_data.ts`, seeded PRNG)
- Case-insensitive substring global filter over every column (`includesString` vs an equivalent `addTableFilter` fn)
- Single-column sort with a plain comparator (`sortFn_basic` vs our default `compare`)
- Client-side pagination, 50 rows per page
- The runner fails if the libraries render a different number of cells or a different first row

Our adapter also spreads `attrs` (roles, ids) onto every element; TanStack's renders bare elements. That is extra work on our side, kept because it is what our documented template does.

## Results

| Scenario       | Metric                    | humanspeak median / p95 | TanStack median / p95 | humanspeak / TanStack |
| -------------- | ------------------------- | ----------------------: | --------------------: | --------------------: |
| `mount-10k`    | first paint               |           109.5 / 121.9 |           50.5 / 56.3 |                 2.17× |
| `mount-1k-all` | first paint (8,000 cells) |           186.1 / 198.2 |         155.6 / 165.6 |                 1.20× |
| `sort-10k`     | 3 sorts                   |             62.2 / 67.9 |           83.0 / 93.8 |                 0.75× |
| `filter-10k`   | 3 searches                |             61.3 / 66.6 |         111.2 / 120.7 |                 0.55× |
| `page-10k`     | 3 page turns              |             31.8 / 34.3 |           25.2 / 27.1 |                 1.26× |

Mount times in the interaction scenarios match `mount-10k` (2.2–2.3×) and are omitted.

## Reading

- **Mounting a large table is our biggest gap: about 2.2× TanStack at 10K rows.** We build every plugin's derived rows up front; TanStack only computes a row model when it is read, so an unsorted, unfiltered first paint skips the sort and filter models entirely. Short-circuiting plugins whose state is empty (no sort keys, empty filter) is the obvious first target.
- **Rendering is close (1.2× at 8,000 cells)**, with our attribute spreading included.
- **We are faster once the table is live: sorting 25% faster, filtering 45% faster.** Part of TanStack's interaction cost is building those models on first use, which is the other side of its cheap mount.
- **Page turns are 1.26× slower**, about 2 ms per turn. Worth a look alongside the mount work, since both touch the row-model chain.
