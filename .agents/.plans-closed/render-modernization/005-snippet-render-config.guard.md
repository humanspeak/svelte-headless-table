# Guard log — 005 snippet-render-config

## Checkpoint 1 — 2026-09-25 14:50 — ON TRACK

520f2dd · final close-out after one Opus executor run (batch worktree, base e022a96)

- Step 1 type-level red reproduced by executor: `Module "./index.js" has no exported member 'createSnippetRender'`; no hoisting error, confirming top-level snippets are referenceable from `<script>`.
- Reproduced by guard at 520f2dd: `pnpm check` 0 errors; `pnpm test:only` 45 files / 558 tests with `Render.snippet.test.ts` 4/4; `trunk check --no-fix src` → no new issues; `pnpm package` → publint All good; `import('./dist/render/createRender.js')` → `function function`; `grep -c createSnippetRender` kitchen-sink → 2; `npm pack --dry-run | grep -c test` → 0; e2e chromium + mobile-chrome → 34 passed (kitchen-sink text assertions on the converted `Summary` column hold).
- Diff read in full: `SnippetRenderConfig`/`createSnippetRender` match the plan's signatures; `RenderConfig` is a strict superset; the snippet branch in `Render.svelte` precedes the component branch and `componentConfig` additionally excludes snippet configs (defensive, sensible); the `instanceof` guard is exactly the mechanism the plan required because snippets and components are indistinguishable functions.
- Kitchen-sink: `Summary` cell converted to a top-level `{#snippet summaryCell(value: Sample)}` reproducing `_Profile.svelte`'s markup; scoped style became inline `style` because the page's `<style>` block was out of scope. Cosmetic, dev-only route; accepted. `_Profile.svelte` deleted after confirming no other importer.
- Lint: eslint's `svelte/require-store-reactive-access` autofix again rewrote `config` → `$config` (would break rendering); executor reverted and used `trunk-ignore` per CLAUDE.md. Follow-up worth noting for maintainers: run `trunk check --no-fix` on `Render.svelte`.
- Executor needed a `pnpm` PATH shim for the e2e web server (publint spawns bare `pnpm`); environment, not code.
- Action: none needed; PASS recorded; README row → DONE. Release note: this is the batch's feature — the PR should carry the `minor` label.
