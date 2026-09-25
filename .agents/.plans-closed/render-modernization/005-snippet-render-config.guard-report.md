# Guard report — 005 snippet-render-config

**Recommendation: PASS** — additive snippet API lands with the required hoisting proof, reactive-args coverage, and an unchanged e2e surface.
**Reviewed at** 520f2dd · 2026-09-25 14:50 · **Plan planned at** 05f757e (re-baselined; drift check empty)
**Integrated** — not yet published: one branch → one PR at batch close (label `minor`).

## Done criteria

| Criterion                                                                  | Result                        | Evidence                                                           |
| -------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `pnpm check` exits 0                                                       | met                           | `COMPLETED 673 FILES 0 ERRORS 3 WARNINGS` (pre-existing)           |
| `pnpm test:only` exits 0; `Render.snippet.test.ts` has 4 passing tests     | met                           | 45 files / 558 tests; 4 listed ✓                                   |
| `node -e "import('./dist/render/createRender.js')…"` → `function function` | met                           | printed `function function`                                        |
| `grep -n "createSnippetRender" src/routes/kitchen-sink/+page.svelte` → ≥ 1 | met                           | 2 matches                                                          |
| `pnpm test:e2e` exits 0                                                    | met (chromium, mobile-chrome) | 34 passed; firefox/webkit not installed                            |
| `git status --porcelain` lists only in-scope files                         | met                           | 7 files, all in scope (incl. permitted `_Profile.svelte` deletion) |
| README status row for 005 updated                                          | met                           | by guard in this commit                                            |

## Spirit

The plan wanted small custom cells to live inline as snippets instead of one `.svelte` file each, the way svelte-markdown does it. The result is one new class and one constructor, a fourth `Render` branch, and a kitchen-sink column that demonstrates the idiom end to end; the fixture test proves the load-bearing assumption (script access to top-level snippets) rather than relying on it. Nothing existing changed shape.

## Scope & conduct

- In-scope only? yes.
- STOP conditions respected? yes — none fired.
- Plan amendments during execution: pre-flight re-baseline and the `dist/render/createRender.js` substitute for the un-runnable `dist/index.js` Node check (e022a96 / fedca0f).

## Residual risk / follow-ups

- `SnippetRenderConfig<any>` in the `RenderConfig` union loses the snippet's argument type at the union level; per-call typing via `createSnippetRender<Args>` is still checked. Acceptable for now; a generic `RenderConfig<TComponent, Args>` would be the stricter follow-up.
- eslint's `svelte/require-store-reactive-access` autofix is hostile to `Render.svelte`; `trunk check --fix` (as run by the pre-commit hook) could re-introduce the breaking rewrite if the `trunk-ignore` comments are ever removed. Tests would catch it.
- Docs for the feature are plan 006.
