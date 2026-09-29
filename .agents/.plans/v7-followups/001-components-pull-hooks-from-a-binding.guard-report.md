# Guard report — 001 components-pull-hooks-from-a-binding — PASS

Snapshot: `381848e` (executor: Opus, resumed once after a STOP), checked 2026-09-29 04:49.

## Verdict

**PASS.** `applyHook`, `injectState` and the public `state` are gone from every exported row and cell class; components resolve hooks lazily from a binding shared per component kind; the view model binds rows, page rows and header rows through one helper; the once-per-row `WeakSet` is deleted.

## What happened

- Step 1 red (executor): `pnpm check` failed on the missing `bindComponent` export and on the three `not.toHaveProperty` assertions.
- STOP in Step 2: the plan told `addDataExport` to use the plugin's init `tableState`, which has no `pluginStates`; display-column `data(cell, state)` functions read it. **Plan defect.** Amended at `4e9e248`: an internal `componentState(component)` accessor beside `bindComponent`. A new export test failed against the wrong version with `Cannot read properties of undefined (reading 'select')` and passes with the accessor.
- Accepted deviations: the binding field is typed with `never` for its component parameter (typing it with `this` breaks `clone()` overrides); lazily resolved fields are `| undefined` rather than optional.

## Done criteria (reproduced by the guard)

| Criterion                                      | Result                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| removed members in `src/lib`                   | only the two type assertions that prove their absence (criterion wording defect) |
| removed members in `dist/**/*.d.ts`            | 0 hits; `state` appears only as `protected get state()`                          |
| internals not exported from `src/lib/index.ts` | confirmed; exports snapshot unchanged                                            |
| `static {` block survives packaging            | present in `dist/tableComponent.svelte.js`                                       |
| `pnpm check`                                   | 0 errors (708 / 206 files)                                                       |
| `pnpm test`                                    | 54 files, 630 passed; 92.2 % statements, 84.1 % branches                         |
| publint                                        | clean                                                                            |
| Playwright Chromium + Firefox                  | 36 passed, 2 skipped                                                             |
| `trunk check`                                  | ✔ No issues                                                                      |
| docs `check`                                   | 0 errors                                                                         |

## Bench — same session, commit before (`317a8c8`) vs after, three alternating 30-iteration runs

| Scenario                    |    Before |     After | Ratio |
| --------------------------- | --------: | --------: | ----: |
| rows-10k first paint        | 127.80 ms | 112.35 ms |  0.88 |
| kitchen-sink-1k first paint |  40.70 ms |  38.60 ms |  0.95 |
| sort-cycle-1k interaction   |  46.45 ms |  46.05 ms |  0.99 |
| rows-1k first paint         |  48.20 ms |  46.50 ms |  0.97 |

The executor's 0.51× for rows-10k compared against a baseline recorded on 2026-09-28; the machine is roughly 1.7× faster in today's session (the unchanged code measures 127.8 ms today vs 215.8 ms then), so that figure overstated the change. The honest gain is about 12 % at 10k rows and within noise for sort interaction. `scripts/perf-baseline.json` now holds a run from today's session, so its absolute values are not comparable with `scripts/perf-v6-vs-v7.md` (whose ratios, measured same-session, still stand).
