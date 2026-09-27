# Guard report — 003 fixtures-on-current

**Recommendation: PASS** — both fixtures render through `current.*`, the e2e suite exercises it under the full plugin stack, the spike is gone and Trunk is fully green again.
**Reviewed at** 815c91d · 2026-09-27 04:54 · **Plan planned at** c557fe5 (drift check empty; one mid-execution scope amendment)
**Integrated** — no PR mid-batch.

## Done criteria

| Criterion                                                 | Result | Evidence                       |
| --------------------------------------------------------- | ------ | ------------------------------ |
| No `Subscribe` in the kitchen sink or `_PerfTable.svelte` | met    | grep → none                    |
| `_PerfTableStore.svelte` exists; both spike dirs deleted  | met    | test → ok                      |
| e2e chromium + mobile-chrome exit 0, same test count (38) | met    | 36 passed / 2 skipped          |
| `pnpm check` / `pnpm test:only` exit 0                    | met    | 0 errors; 54 files / 590 tests |
| README status row for 003 updated                         | met    | by guard                       |

## Spirit

The purpose was to make the repo's own fixtures the first consumers of the rune path so regressions surface in e2e and in every future perf number, while keeping a store-based control. Both landed: the default perf renderer is now the `current.*` path with the old renderer one query parameter away, and the kitchen sink — the page every e2e spec drives — no longer uses `Subscribe` at all.

## Scope & conduct

- In-scope only? yes (after the amendment).
- STOP conditions respected? yes — the executor stopped for an unlisted but genuine scope conflict rather than improvising; textbook.
- Plan amendments during execution: 2026-09-27, Scope/Step 3/Done criteria gained `src/routes/test/runes-kitchen-sink/**` (plan defect).

## Residual risk / follow-ups

- The kitchen sink no longer exercises `Subscribe` in e2e; the component is still covered by unit + SSR tests and by the perf control renderer. If `Subscribe` is kept through v7, consider one e2e page that still uses it.
