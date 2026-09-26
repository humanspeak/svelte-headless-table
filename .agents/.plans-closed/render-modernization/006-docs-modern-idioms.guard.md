# Guard log — 006 docs-modern-idioms

## Checkpoint 1 — 2026-09-25 15:03 — ON TRACK

50078be · final close-out after one Opus executor run (batch worktree, base 557b8cf)

- Reproduced by guard at 50078be: `grep -rn "svelte-render\|svelte-subscribe" docs/src/routes README.md` → none; `Demo.svelte` has 0 occurrences of `Subscribe`; `createSnippetRender` ×3 on the create-render page; `SnippetRenderConfig` ×3 on the render page; README has `fromStore` and `createSnippetRender`; `trunk check --no-fix README.md docs/src/routes` → no issues; `cd docs && pnpm build` → built, favicon verified; `cd docs && pnpm check` → 0 errors (31 pre-existing warnings). The executor had skipped the build after a final wording edit; guard's build/check ran on the committed text.
- Step 2 render claim reproduced independently: docs dev server + throwaway Playwright script on `/docs/getting-started/quick-start` → headers `["Name","Age"]` with `role=columnheader`, 3 body rows with `role=row`, cells `["Ada Lovelace","21","Barbara Liskov","52","Richard Hamming","38"]` with `role=cell`, no page/console errors. Script deleted; `demo-loaders.ts` churn reverted; tree clean.
- Diff read in full (7 files, all in scope). Quick-start keeps `### Using Subscribe` so existing users still find their idiom; Subscribe page correctly describes the component as legacy-mode and points at `fromStore`; README's ecosystem footer untouched; `.on()` marked deprecated with the `on<event>` prop replacement.
- Executor's own build break (literal `{ ... }` inside an Admonition parsed as a Svelte expression) was self-inflicted and self-fixed with HTML entities; correctly not treated as the "page you did not touch" STOP.
- Action: none needed; PASS recorded; README row → DONE; batch retired.
