# Guard report — 004 replace-keyed

**Recommendation: PASS** — dotted-id crash reproduced red then green, svelte-keyed gone, every criterion reproduced by guard.
**Reviewed at** 4371e3d · 2026-09-25 14:19 · **Plan planned at** 7dbb5a2 (in-scope source unchanged between 7dbb5a2 and the branch base 4b03e9a; drift check empty)
**Integrated** — not yet published: batch convention is one branch → one PR; this snapshot is cherry-picked onto `feat/render-modernization` and the PR opens when the last plan passes.

## Done criteria

| Criterion                                                             | Result  | Evidence                                                                                         |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `pnpm check` exits 0                                                  | met     | `COMPLETED 639 FILES 0 ERRORS 3 WARNINGS` (warnings pre-existing in `src/routes`)                |
| `pnpm test:only` exits 0; dotted-id regression test exists and passes | met     | `Test Files 41 passed, Tests 538 passed`; test at `src/lib/plugins/addColumnFilters.test.ts:343` |
| `grep -rn "svelte-keyed" src/ package.json` → no matches              | met     | grep printed nothing                                                                             |
| `grep -rn "keyedProp(" src/lib/plugins/` → exactly 3                  | met     | count = 3                                                                                        |
| `git status --porcelain` lists only in-scope files                    | met     | 8 files in snapshot diff, all in scope                                                           |
| README status row for 004 updated                                     | pending | updated on the batch branch at integration (see log)                                             |

## Spirit

The plan's purpose was to stop depending on a path-tokenising helper for what are always flat keys, and to fix the crash that tokenising caused for column ids containing dots. The diff does exactly that: `keyedProp` (`src/lib/utils/store.ts:302`) uses the key verbatim with a shallow-copy write, the three call sites are switched one-for-one, and the regression test proves both the absence of the throw and that filtering still works on a dotted id. No caching-around-the-problem, no weakened assertions.

## Scope & conduct

- In-scope only? yes.
- STOP conditions respected? yes — none fired (3 call sites found, red test failed as predicted).
- Plan amendments during execution: none.

## Residual risk / follow-ups

- `keyedProp` spreads the parent object, so prototype-carrying parents lose their prototype on write (svelte-keyed preserved it). All three parents are plain object literals; a future plugin passing a class instance would need a different helper.
- The plan's claim that removing svelte-keyed drops `type-fest` was wrong (it is a direct devDependency); nothing to do.
