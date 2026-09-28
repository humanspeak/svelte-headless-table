# Guard report — 001 v7-design-spike — PASS

Snapshot: `6a992eb` on `feat/v7-runes-core` (executor: Opus via the dispatch skill; dispatched at `779c6a1`). No PR: the batch convention is one branch → one PR after plan 006.

## Verdict

**PASS.** The spike delivers exactly what "Why this matters" asked for: an on-code answer to ownership and per-cell cost, pinned by seven tests, an SSR probe and a 30-iteration bench, plus a report with explicit decisions. Nothing under `src/lib` changed; every touched path is in the plan's in-scope list.

## Done criteria (reproduced by the guard)

| Criterion                          | Result                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` both tsconfigs        | 0 errors                                                                                                             |
| `trunk check`                      | executor: ✔ No issues; guard: Prettier clean, plain ESLint's single hit is trunk-ignored (daemon hung for the guard) |
| `vitest run` incl. 7 spike tests   | 614 passed, 1 expected fail (test 6, allowed)                                                                        |
| SSR probe `<td` count > 0          | 6                                                                                                                    |
| bench JSONs n=30, equal `domCells` | yes, all 8 scenarios                                                                                                 |
| report with four sections          | yes                                                                                                                  |
| no files outside scope             | confirmed                                                                                                            |
| README status row                  | updated by the guard (executor is read-only on it)                                                                   |

## What the spike decided (binding on plan 002 unless its pre-flight amends)

- Components are memo-free; no per-cell reactive allocation. rows-10k first paint 0.48× of the current renderer.
- Ownership rule: build view models in component setup, module/test top level, or a load function — never inside a transient effect/root.
- The three plugin patterns (getter chain, captured-upstream pre-X boxes, clamp-at-read) hold with no state writes during derivation.
- `Box` / `ReadonlyBox` / `keyedBox` shapes confirmed (`keyedBox` untested).

## Findings routed to plan 002's pre-flight

1. Late `applyHook` does not re-render by itself (test 7); 002 Step 6 must make `applyHook` internal to derivation or document the semantics — not "keep the v6 test".
2. Sort interaction paint 1.29–1.33× slower memo-free; 002 must measure after the real rewrite and may adopt a lazy `$derived` for props if it persists.
3. No `pageCycle` bench preset exists; 004 and the README must name real presets (rows-10k, sort-cycle-1k, kitchen-sink-1k).
4. `derivedBox` over a captured-upstream getter only tracks once the derive function has been called (report §4).

## Residual risk

The spike models three plugins and skips timing counters; the 0.48× is an upper bound. The real number comes from plan 004's v6-vs-v7 comparison.
