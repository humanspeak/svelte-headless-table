# Guard report — 005 docs-and-migration-guide — PASS

Snapshot: `bb648f7` (executor: Opus). No PR: one branch → one PR after plan 006.

## Verdict

**PASS.** The docs describe what shipped: a seven-section "Migrating to v7" guide first in the Guides nav, the Subscribe page gone, every API and plugin page on `current.*` and `.current` plugin state, all 28 demo files converted, the README pointed at the guide, and the eager `initialFilterValue` change documented with a warning and a checklist grep. The docs site builds against the packaged v7 library and its smoke suite passes, which is also the first external-consumer proof of the runes modules.

## Done criteria (reproduced)

| Criterion                                                 | Result                                           |
| --------------------------------------------------------- | ------------------------------------------------ |
| migration guide with seven sections, first in Guides      | yes                                              |
| `api/subscribe` deleted and out of the nav                | yes                                              |
| `$pluginState` grep over demos                            | 0 matches                                        |
| `Subscribe` / `.attrs()` / `.props()` in prose            | only the guides' 6.x blocks and the removal note |
| README grep                                               | clean                                            |
| docs check / build / Playwright                           | 0 errors / passes / 4 passed                     |
| `plugin-props.json` regenerated from `.svelte.ts` plugins | 8 prop sets, no diff                             |
| `demo-loaders.ts` unchanged                               | yes                                              |
| README status row                                         | updated by the guard                             |

## Reported to the operator (outside this batch)

- docs `pnpm test:unit` is broken on `main` (no `test.globals` in `docs/vite.config.ts`); CI only runs the docs Playwright suite, so nothing red in CI, but the script is dead.
- Trunk's local sandbox flags `$props()` destructures in `src/routes/_*.svelte` as unsafe while plain ESLint is clean; watch the PR's Trunk job.
