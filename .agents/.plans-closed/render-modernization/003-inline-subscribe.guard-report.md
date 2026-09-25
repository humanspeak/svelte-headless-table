# Guard report — 003 inline-subscribe

**Recommendation: PASS** — Subscribe and derivedKeys are first-party with the same contract, `let:` from runes parents proven by component tests and e2e, last legacy Svelte dependency gone.
**Reviewed at** 05f757e · 2026-09-25 14:41 · **Plan planned at** 72e5ca6 (re-baselined; drift check empty)
**Integrated** — not yet published: one branch → one PR at batch close.

## Done criteria

| Criterion                                                        | Result                        | Evidence                                                   |
| ---------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `pnpm check` exits 0                                             | met                           | `COMPLETED 672 FILES 0 ERRORS 3 WARNINGS` (pre-existing)   |
| `pnpm test:only` exits 0; 7 new tests pass                       | met                           | 44 files / 554 tests; 4 derivedKeys + 3 Subscribe listed ✓ |
| `grep -rn "svelte-subscribe" src/ package.json` → none           | met                           | none (lockfile also clean)                                 |
| `ls dist/subscribe/Subscribe.svelte` exists after `pnpm package` | met                           | present; publint All good                                  |
| `pnpm test:e2e` exits 0                                          | met (chromium, mobile-chrome) | 34 passed; firefox/webkit not installed                    |
| `git status --porcelain` lists only in-scope files               | met                           | 9 files, all in scope                                      |
| README status row for 003 updated                                | met                           | by guard in this commit                                    |

## Spirit

The plan wanted the consumer-facing `Subscribe` and the internal `derivedKeys` owned in-repo without breaking the `let:` templates every consumer writes. The diff does that and no more: the component stays legacy-mode on purpose with a comment explaining why, the typing contract from the old package is preserved so consumers' `props.sort.toggle` still type-checks, and `derivedKeys` lives beside the repo's other store helpers with tests. With this, `package.json` depends on nothing from the retired helper repos except `memory-cache`.

## Scope & conduct

- In-scope only? yes.
- STOP conditions respected? yes — none fired.
- Plan amendments during execution: pre-flight re-baseline only (f322bc5).

## Residual risk / follow-ups

- `Subscribe.svelte` is now the only legacy-mode file in `src/lib`; a future runes sweep must skip it (see the header comment).
- `$$Props`/`$$Slots` are Svelte-4-era typing constructs; they compile today on Svelte 5.56 and svelte-check 4.7 but are the piece most likely to need attention on a major Svelte upgrade.
- e2e verified on Chromium only; CI covers the other browsers.
