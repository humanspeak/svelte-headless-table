# Guard report — 001 runes-spike

**Recommendation: PASS** — both decisions settled with cited evidence, hard boundary (`src/lib` untouched) held, perf and SSR claims reproduced by guard.
**Reviewed at** e5fbb85 · 2026-09-27 04:24 · **Plan planned at** fdc76a8 (drift check empty)
**Integrated** — design output only; no PR. The snapshot commit stays on `feat/runes-core` and is superseded by plans 002–003.

## Done criteria

| Criterion                                                                         | Result | Evidence                                                           |
| --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `pnpm check` exits 0                                                              | met    | `COMPLETED 689 FILES 0 ERRORS`                                     |
| `pnpm test:only` exits 0; `runesComponent.test.ts` results recorded in the report | met    | 10/10 reproduced; verbatim block in report §2                      |
| `/test/perf-bench?renderer=runes` renders `rows-1k` with `domCells=400`           | met    | guard rerun: 400/400 on all four scenarios                         |
| `/tmp/store.json` and `/tmp/runes.json` contain the four scenarios                | met    | executor files present; guard's own `/tmp/guard-*.json` also parse |
| Report exists with five sections and the performance table                        | met    | §1–§5 present, 16-row table                                        |
| Only in-scope files changed; nothing under `src/lib/`                             | met    | `git diff --stat 36bbe99 HEAD -- src/lib` empty; 7 files changed   |
| README status row for 001 updated                                                 | met    | by guard                                                           |

## Spirit

The plan wanted proof, not opinion, on two decisions. It got it: mechanism A works in and out of effects and under SSR; mechanism B fails in exactly the ways a reviewer would have feared and that in-component tests alone would not show. The executor added the unowned-context probes and the SSR check beyond the plan's minimum, which is what turned "it passes in the component" into a decision. The perf result (runes renderer 4–25% faster at the median, never slower) removes the main reason to hesitate, with the honest caveat that it bundles "no Subscribe component per cell" with "runes vs stores".

## Scope & conduct

- In-scope only? yes.
- STOP conditions respected? yes. The TS2729 rejection was correctly judged not to be the "toolchain rejects runes in `.svelte.ts`" STOP: runes compile; only the field-initializer form is rejected.
- Plan amendments during execution: none to 001. After close-out, 002 and 004 amended (checkpoint 2).

## Residual risk / follow-ups

- Hook re-application on long-lived wrappers is untested; plan 002's `#hookVersion` + fourth test case is the tripwire.
- ESLint cannot parse `.svelte.ts` today; plan 002 Step 0 fixes the config before any library file moves.
- The perf gain is partly the removal of one component per cell; a future comparison of `fromStore`-in-template vs `current` would isolate the runes contribution if anyone needs that number.
