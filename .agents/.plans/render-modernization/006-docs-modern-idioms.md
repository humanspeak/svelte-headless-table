# Plan 006: Document the first-party render API, the `fromStore` idiom, and snippet cells

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/render-modernization/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- README.md docs/src/routes/docs/api docs/src/routes/docs/getting-started`
> Compare any changed file against the "Current state" excerpts; on a mismatch, STOP.
> Also confirm plans 002, 003 and 005 are marked DONE in the batch README —
> this plan documents what they shipped.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 002-inline-render.md, 003-inline-subscribe.md, 005-snippet-render-config.md
- **Category**: docs
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

After plans 002–005 the library owns its render primitives, but the docs
site (`table.svelte.page`) still tells readers that `createRender` "is
based on svelte-render" and `Subscribe` "is based on svelte-subscribe",
still explains `Subscribe` in terms of Svelte 3 slot props, and has no
mention of either the Svelte-5-native `fromStore` idiom or the new
`createSnippetRender`. The quick-start is the page most new users copy;
it should show the modern shape first while keeping the legacy shape
working and documented. This plan touches only the API reference pages,
the two getting-started pages, and the README — not the 30+ plugin demos,
which keep working unchanged.

## Current state

The docs are a separate SvelteKit package in `docs/` (workspace member,
depends on the library via `"@humanspeak/svelte-headless-table": "workspace:*"`).
Pages are `.svx` (mdsvex) with a frontmatter block and a `<script>` that
sets SEO context; demos are `.svelte` files next to them.

- `docs/src/routes/docs/api/create-render/+page.svx:28`:
  a note-type admonition reading "createRender is based on svelte-render", linking to github.com/humanspeak/svelte-render.
  Lines 98–120 document `.on(type, handler)` as a normal feature; it is
  `@deprecated` in the code.
- `docs/src/routes/docs/api/subscribe/+page.svx:25`:
  a note-type admonition reading "Subscribe is based on svelte-subscribe", linking to github.com/humanspeak/svelte-subscribe,
  and lines 27–33 explain the component via "slot props" with a link to the Svelte 3 tutorial.
- `docs/src/routes/docs/api/render/+page.svx` lines 30–40 list the three
  `RenderConfig` variants (string/number, `Readable`, `ComponentRenderConfig`).
- `docs/src/routes/docs/getting-started/quick-start/+page.svx` lines 79–135
  ("Applying to markup") show the `Subscribe`/`Render` template and end with
  the admonition: "`Subscribe` and `Render` are provided by Svelte Headless
  Table to overcome certain limitations of Svelte."
- `docs/src/routes/docs/getting-started/quick-start/Demo.svelte` — the
  runnable version of that template (`<Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>` …).
- `docs/src/routes/docs/getting-started/overview/+page.svx` lines 58–97 —
  the same template inline.
- `README.md` lines 68–128 — the same template under "## Examples".
- Nav: `docs/src/lib/docsNav.ts:67-69` lists Render / createRender / Subscribe
  under API. No nav change is needed unless you add a page.
- The Svelte-5-native alternative to `Subscribe` (no library API involved):

```svelte
<script>
    import { fromStore } from 'svelte/store'
</script>

{#each $rows as row (row.id)}
    {@const rowAttrs = fromStore(row.attrs())}
    <tr {...rowAttrs.current}>
        {#each row.cells as cell (cell.id)}
            {@const attrs = fromStore(cell.attrs())}
            {@const props = fromStore(cell.props())}
            <td {...attrs.current} class:sorted={props.current.sort?.order !== undefined}>
                <Render of={cell.render()} />
            </td>
        {/each}
    </tr>
{/each}
```

`fromStore(...).current` is reactive when read inside a template
(Svelte's `createSubscriber` subscribes for the lifetime of the enclosing
effect — `node_modules/svelte/src/store/index-client.js:128-168`).
**Verify this in the docs demo before documenting it** (Step 2).

- Snippet cells (plan 005) — exported names are `createSnippetRender` and
  `SnippetRenderConfig`; consumer shape:

```svelte
<script>
    const columns = table.createColumns([
        table.column({
            accessor: 'name',
            header: 'Name',
            cell: ({ value }) => createSnippetRender(nameCell, value)
        })
    ])
</script>

{#snippet nameCell(name)}
    <strong>{name}</strong>
{/snippet}
```

- Docs tooling: `cd docs && pnpm check` (svelte-check), `pnpm dev` (port from
  `docs/vite.config.ts`). Lint/format via `trunk check` / `trunk fmt` from the
  repo root (Trunk covers `docs/` too; `docs/static/**` is ignored by markdownlint).

## Commands you will need

| Purpose         | Command                 | Expected on success                   |
| --------------- | ----------------------- | ------------------------------------- |
| Install         | `pnpm install`          | exit 0                                |
| Library package | `pnpm package` (root)   | exit 0 — docs consume `dist/`         |
| Docs typecheck  | `cd docs && pnpm check` | exit 0, `svelte-check found 0 errors` |
| Docs build      | `cd docs && pnpm build` | exit 0                                |
| Docs dev server | `cd docs && pnpm dev`   | serves; open the edited pages         |
| Lint            | `trunk check` (root)    | no failures                           |
| Format          | `trunk fmt` (root)      | exit 0/1                              |

## Scope

**In scope**:

- `docs/src/routes/docs/api/create-render/+page.svx`
- `docs/src/routes/docs/api/render/+page.svx`
- `docs/src/routes/docs/api/subscribe/+page.svx`
- `docs/src/routes/docs/getting-started/quick-start/+page.svx`
- `docs/src/routes/docs/getting-started/quick-start/Demo.svelte`
- `docs/src/routes/docs/getting-started/overview/+page.svx`
- `README.md` (the "## Examples" section only — the ecosystem footer is
  generated by docs-kit; do not edit between the `docs-kit:ecosystem` markers)

**Out of scope**:

- Every plugin page and demo under `docs/src/routes/docs/plugins/**`,
  `docs/src/routes/examples/**`, `docs/src/lib/examples/**` — they use the
  legacy template, which still works; migrating 30+ demos is a separate,
  optional effort.
- `docs/src/lib/docsNav.ts` — no new pages.
- `docs/static/**` — generated mirrors (llms.txt etc.); regenerated by the docs build.
- Any library source under `src/`.

## Git workflow

- Branch: `docs/first-party-render-api`
- Commit: `docs: document first-party render API, fromStore idiom, and snippet cells`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the "based on" admonitions and mark `.on()` deprecated

- `create-render/+page.svx`: delete line 28's admonition. In the `.on()`
  section (lines ~98–120) add a `<Admonition type="warning">` stating it is
  deprecated and will be removed in the next major; show the replacement —
  pass the handler as an `on<event>` prop: `createRender(Button, { onclick: handler })`.
- `subscribe/+page.svx`: delete line 25's admonition. Rewrite lines 27–33 so
  the explanation is Svelte-5-accurate: "stores can only be `$`-subscribed
  at the top level of `<script>`; `Subscribe` exposes each store prop as a
  slot prop of the same name (legacy-mode component, kept for compatibility)".

**Verify**: `grep -rn "svelte-render\|svelte-subscribe" docs/src/routes` → no matches.

### Step 2: Add a "Svelte 5 alternative: `fromStore`" section to the Subscribe page — after proving it

First edit `quick-start/Demo.svelte` to the `fromStore` shape shown in
"Current state" (no `Subscribe`, keep `Render`). Run `cd docs && pnpm dev`,
open `/docs/getting-started/quick-start`, and confirm the demo table renders
the three rows with header cells. Do **not** extend the demo with plugins;
the check is only that the `fromStore`-driven attrs render.

Then in `subscribe/+page.svx` add a section `## Svelte 5 alternative: fromStore`
with the snippet from "Current state", a one-line explanation
(`current` is reactive inside the template), and the statement that
`Subscribe` remains supported.

**Verify**: `cd docs && pnpm check` → 0 errors; the page renders in dev
with the new section.

### Step 3: Update the quick-start and overview pages

- `quick-start/+page.svx` "Applying to markup": show the `fromStore` version
  as the primary code block (matching the updated `Demo.svelte`), and keep
  the existing `Subscribe` block beneath a sub-heading `### Using Subscribe`
  with one sentence: both are supported. Replace the closing admonition
  text with: "`Render` is provided by Svelte Headless Table; `fromStore`
  comes from Svelte itself. If you prefer slot props, `Subscribe` is also
  provided — see …".
- `overview/+page.svx` lines 58–97: switch the inline example to the
  `fromStore` shape.

**Verify**: `cd docs && pnpm check` → 0 errors; `cd docs && pnpm build` → exit 0.

### Step 4: Document snippet cells

- `render/+page.svx`: add `SnippetRenderConfig` as the fourth `RenderConfig`
  variant in the list at lines ~30–40, with a link to the createRender page.
- `create-render/+page.svx`: add a section
  `## createSnippetRender: (snippet: Snippet<[Args]>, args?: Args | Readable<Args>) => SnippetRenderConfig`
  with the consumer example from "Current state" and one sentence on why it
  works from `<script>` (top-level snippets are hoisted).

**Verify**: `grep -c "createSnippetRender" docs/src/routes/docs/api/create-render/+page.svx` → ≥ 2.

### Step 5: README example

In `README.md` "## Examples", replace the template with the `fromStore`
version and add, directly below it, a short "Custom cells with snippets"
block (the `createSnippetRender` example). Keep the `<!-- prettier-ignore -->`
marker above code blocks as the file does today.

**Verify**: `grep -n "fromStore\|createSnippetRender" README.md` → both present.

### Step 6: Full gate

`trunk fmt`, `trunk check`, `cd docs && pnpm check && pnpm build`.

**Verify**: all exit 0.

## Test plan

- No red-first test: docs only. The runtime claims (fromStore reactivity,
  snippet cells) are covered by library tests from plans 003/005; Step 2's
  manual dev-server check is the docs-level verification.
- Verification commands are in each step; the docs build is the gate.

## Done criteria

- [ ] `grep -rn "svelte-render\|svelte-subscribe" docs/src/routes README.md` → no matches
- [ ] `cd docs && pnpm check` exits 0 and `cd docs && pnpm build` exits 0
- [ ] `quick-start/Demo.svelte` no longer imports `Subscribe`
- [ ] `create-render/+page.svx` documents `createSnippetRender`; `render/+page.svx` lists `SnippetRenderConfig`
- [ ] `git status --porcelain` lists only in-scope files (plus `docs/static/**` if the build regenerates mirrors — report that separately, do not hand-edit)
- [ ] README status row for 006 updated

## STOP conditions

- Plans 002/003/005 are not DONE — the names you would document may not exist.
- The `fromStore` demo does not render attrs reactively in the dev server
  (Step 2). Do not document an idiom you could not see working.
- `cd docs && pnpm build` fails on a page you did not touch.

## Maintenance notes

- The plugin demos still use `Subscribe`; when they are migrated, use the
  quick-start demo as the reference shape.
- Reviewer focus: the quick-start must still show `Subscribe` somewhere —
  most existing users' code looks like that and they need to find it.
