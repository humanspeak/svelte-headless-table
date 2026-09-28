# Guard report — 003 complex-plugins — PASS

Snapshots: `727a7fb` (executor, Opus) + `a52550d` (guard fix-dispatch, Opus). No PR: one branch → one PR after plan 006.

## Verdict

**PASS.** All fifteen plugins are on the v7 contract; nothing is parked under `src/lib` any more; the library has no `svelte/store` import and exactly one `$effect`, owned by the virtual-scroll action's DOM lifetime. The four plugin suites plus the interaction tests pass with their v6 assertions intact and new tests for the typo fix, group-by flags, drag resizing and view-model rebuilds.

## Done criteria (reproduced at a52550d)

| Criterion                                               | Result                                              |
| ------------------------------------------------------- | --------------------------------------------------- |
| `_parked/` gone; `PARKED.md` lists only route/e2e items | yes                                                 |
| `pnpm check` both tsconfigs                             | 0 errors                                            |
| `trunk check`                                           | ✔ No new issues                                     |
| `pnpm test` incl. `interactions.test.ts`                | 624 passed, 1 expected fail; thresholds met         |
| store grep                                              | nothing                                             |
| `$effect` grep                                          | only the `virtualScroll` action and the test helper |
| README status row                                       | updated by the guard                                |

## For plan 004

- The bench and the browser suites are the first real exercise of virtual scroll under runes; the jsdom measurement caveat above is why.
- `vm._debug.derivedCount` replaced `derivedStoreCount`; `createTable` throws on a store; virtual-scroll config takes `Box` / `Getter` / `ReadonlyBox`, not stores.
