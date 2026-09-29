# Guard report — 002 view-model-provides-upstream-getters — PASS

Snapshot: `18f2a9f` (executor: Opus, single run), checked 2026-09-29 05:27.

## Verdict

**PASS.** `TablePluginInit` has a required `upstream` member (`rows`, `pageRows`, `flatColumns`); the view model records every plugin's input while folding the three chains; sort, both filters, pagination and virtual scroll read it instead of capturing the getter their derive function receives. Derive functions keep their signature.

## What happened

- Step 1 red (executor): `pnpm check` failed with `Property 'upstream' does not exist on type 'TablePluginInit<…>'` at four sites in the new test.
- No STOP fired: nothing in the repo builds an init object by hand, so `upstream` stayed required.
- Deviations accepted: a double cast in the test's `names` helper (the plan's own snippet did not type-check); the `TablePluginInstance` JSDoc rule was reworded to point at `upstream`.

## Done criteria (reproduced by the guard)

| Criterion                                                  | Result                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `grep "let upstreamRows" src/lib/plugins`                  | no output                                                |
| `upstream` on `TablePluginInit`; `PluginUpstream` exported | yes (`TablePlugin.ts:57`)                                |
| `pnpm check`                                               | 0 errors (709 / 206 files)                               |
| `pnpm test`                                                | 55 files, 634 passed; 92.3 % statements, 83.9 % branches |
| publint                                                    | clean                                                    |
| Playwright Chromium + Firefox                              | 36 passed, 2 skipped                                     |
| docs `check` / docs smoke tests                            | 0 errors / 4 passed                                      |
| old rule text in docs and release notes                    | none                                                     |
| `trunk check`                                              | ✔ No issues                                              |

## Note

The guard's first browser run hung on the guard's own wait loop (a `pgrep -f` that matched its own command line); it was killed and the suites were run directly. No code was involved.
