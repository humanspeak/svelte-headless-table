# Plan 005: Let cells and headers render Svelte 5 snippets via `createSnippetRender`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/render-modernization/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- src/lib/render src/lib/index.ts`
> Plan 002 is expected to have _created_ `src/lib/render/`. Open
> `src/lib/render/Render.svelte` and `src/lib/render/createRender.ts` and
> confirm they match the shapes described in "Current state" (three-branch
> template; `ComponentRenderConfig` class). On a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (purely additive; existing `RenderConfig` variants untouched)
- **Depends on**: 002-inline-render.md (needs first-party `Render.svelte`)
- **Category**: direction / enhancement
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

Today the only way to put a component in a cell is `createRender(Component, props)`,
which forces a separate `.svelte` file for every custom cell — the kitchen
sink has seven of them (`_Profile.svelte`, `_Tick.svelte`, `_Italic.svelte`,
…). Svelte 5 snippets exist precisely so small bits of markup can live
inline, and the sibling `@humanspeak/svelte-markdown` made "snippet override

> component renderer > default" its headline customization feature. This
> plan adds one additive `RenderConfig` variant so a column can say
> `cell: ({ value }) => createSnippetRender(profile, value)` where `profile` is
> a `{#snippet profile(value)}` declared in the same file. No existing API changes.

## Current state

- After plan 002, `src/lib/render/createRender.ts` exports
  `ComponentRenderConfig`, `createRender`, and

```ts
export type RenderConfig<TComponent extends Component = Component<any>> =
    ComponentRenderConfig<TComponent> | string | number | Readable<string | number>
```

- After plan 002, `src/lib/render/Render.svelte` has a three-branch template:
  store → primitive → component (`<componentConfig.component {...$propsStore}>` with
  `{#each componentConfig.children as child, i (i)}<Render of={child} />{/each}`).
- `src/lib/render/index.ts` re-exports those; `src/lib/index.ts` does `export * from '$lib/render/index.js'`.
- Label types that consumers implement (`src/lib/types/Label.ts`) all
  return `RenderConfig`, so widening the union automatically lets
  `header`, `cell`, and `plugins.colFilter.render` return the new variant.
- Svelte 5.56.10 hoists top-level `{#snippet}` declarations so they can be
  referenced from `<script>` (compiler source:
  `node_modules/svelte/src/compiler/phases/3-transform/client/visitors/SnippetBlock.js:84`,
  comment "Top-level snippets are hoisted so they can be referenced in the `<script>`").
  Step 1 proves this in a test before anything is built on it.
- Runtime fact: compiled snippets and components are both plain functions,
  so `Render` **cannot** distinguish them by inspection. The new variant
  therefore needs its own class (`SnippetRenderConfig`) and constructor
  (`createSnippetRender`), not an overload of `createRender`.
- Exemplar for the consumer-facing shape and vocabulary: `~/GitHub/svelte-markdown/README.md`
  lines 301–339 (snippet overrides receive a single props object; precedence
  "snippet > component"). Use the same single-argument convention here: the
  snippet receives one `args` value.
- Test harness: jsdom + `@testing-library/svelte` (plan 001); fixtures named
  `*.test.svelte` are excluded from the npm tarball by `package.json` `files`.

## Commands you will need

| Purpose        | Command                       | Expected on success                   |
| -------------- | ----------------------------- | ------------------------------------- |
| Typecheck      | `pnpm check`                  | exit 0, `svelte-check found 0 errors` |
| One test file  | `pnpm exec vitest run <path>` | all pass                              |
| All unit tests | `pnpm test:only`              | exit 0                                |
| Lint           | `trunk check`                 | no failures                           |
| Format         | `trunk fmt`                   | exit 0/1                              |
| Package        | `pnpm package`                | exit 0, publint clean                 |
| E2E            | `pnpm test:e2e`               | all pass                              |

## Scope

**In scope**:

- `src/lib/render/createRender.ts` (add `SnippetRenderConfig`, `createSnippetRender`, widen `RenderConfig`)
- `src/lib/render/Render.svelte` (add the fourth branch)
- `src/lib/render/index.ts` (export the new names)
- `src/lib/render/SnippetHost.test.svelte` (create — fixture that declares snippets and a table)
- `src/lib/render/Render.snippet.test.ts` (create)
- `src/routes/kitchen-sink/+page.svelte` — convert **one** column (`Summary`, currently
  `createRender(Profile, {...})`) to an inline snippet as a living example. Only that
  column's `cell` and the new `{#snippet}` block; nothing else in the file.
- `src/routes/_Profile.svelte` — may be deleted only if the kitchen-sink conversion
  leaves it unused (`grep -rn "_Profile" src/routes` → no matches).

**Out of scope**:

- Any change to `createRender`, `ComponentRenderConfig`, `.slot()`, `.on()`.
- `Subscribe` — plan 003. Docs — plan 006 (it documents this feature; leave
  a one-line note in your report of the final exported names).
- `tests/**` e2e assertions — the kitchen-sink conversion must keep the
  rendered text identical so existing e2e tests keep passing.

## Git workflow

- Branch: `feat/snippet-render-config`
- Commit: `feat(render): add createSnippetRender for inline snippet cells and headers`
- This is a feature → the PR should carry the `minor` label (the publish
  workflow reads labels to pick the bump). Note it in the report; do not
  create the PR unless instructed.

## Steps

### Step 1: Prove snippets declared in markup are usable from `<script>` (fixture + test)

Create `src/lib/render/SnippetHost.test.svelte`:

```svelte
<script lang="ts">
    import { readable } from 'svelte/store'
    import { createTable } from '$lib/createTable.js'
    import { Render, createSnippetRender } from './index.js'

    const data = readable([{ name: 'Ada', age: 36 }])
    const table = createTable(data)
    const columns = table.createColumns([
        table.column({
            header: 'Name',
            accessor: 'name',
            cell: ({ value }) => createSnippetRender(nameCell, value)
        }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const { rows } = table.createViewModel(columns)
</script>

{#snippet nameCell(name: string)}
    <strong data-testid="name-cell">{name.toUpperCase()}</strong>
{/snippet}

{#each $rows as row (row.id)}
    {#each row.cells as cell (cell.id)}
        <span data-testid={`cell-${cell.id}`}><Render of={cell.render()} /></span>
    {/each}
{/each}
```

Create `src/lib/render/Render.snippet.test.ts` with, for now, one test:
render `SnippetHost` → `getByTestId('name-cell')` has text `ADA`, and
`getByTestId('cell-age')` has text `36`.

**Verify**: `pnpm check` → this file **fails** to compile only because
`createSnippetRender` does not exist yet (error mentions
`createSnippetRender`). If svelte-check instead reports that `nameCell` is
not defined / used before declaration in `<script>`, the hoisting
assumption is false: STOP and report.

### Step 2: Add `SnippetRenderConfig` and `createSnippetRender`

In `src/lib/render/createRender.ts`:

````ts
import type { Snippet } from 'svelte'

/**
 * Render configuration for a Svelte 5 snippet with a single argument.
 * Created with {@link createSnippetRender}.
 */
export class SnippetRenderConfig<Args = void> {
    constructor(
        /** The snippet to render. */
        public snippet: Snippet<[Args]>,
        /** The single argument passed to the snippet, static or reactive. */
        public args: Args | Readable<Args>
    ) {}
}

/**
 * Creates a render configuration for a snippet declared in the consumer's
 * markup. Top-level snippets are hoisted by Svelte, so they can be referenced
 * from the `<script>` block where columns are defined.
 *
 * @example
 * ```svelte
 * <script>
 *   const columns = table.createColumns([
 *     table.column({ accessor: 'name', header: 'Name',
 *       cell: ({ value }) => createSnippetRender(nameCell, value) })
 *   ])
 * </script>
 * {#snippet nameCell(name)}<strong>{name}</strong>{/snippet}
 * ```
 */
export function createSnippetRender<Args = void>(
    snippet: Snippet<[Args]>,
    args?: Args | Readable<Args>
): SnippetRenderConfig<Args>
````

(Implement the body: `return new SnippetRenderConfig(snippet, args as Args)`;
for `Args = void` callers pass nothing.)

Widen the union: `RenderConfig<TComponent> = ComponentRenderConfig<TComponent> | SnippetRenderConfig<any> | string | number | Readable<string | number>`
(with a `trunk-ignore` for the `any`, matching the file's existing style).

Export both from `src/lib/render/index.ts`.

**Verify**: `pnpm check` → 0 errors (Step 1 fixture now compiles).

### Step 3: Add the fourth branch to `Render.svelte`

Before the component branch, add:

```svelte
{:else if config instanceof SnippetRenderConfig}
    {@render config.snippet($snippetArgsStore)}
```

with, in the script, the same store-normalisation used for component props:

```ts
const snippetArgsStore = $derived(
    config instanceof SnippetRenderConfig
        ? isReadable(config.args)
            ? config.args
            : readable(config.args)
        : readable(undefined)
)
```

Keep the `instanceof` check **before** the generic `typeof config === 'object'`
component branch so a `SnippetRenderConfig` is never treated as a component config.

**Verify**: `pnpm exec vitest run src/lib/render/Render.snippet.test.ts` → the Step 1 test passes.

### Step 4: Cover reactive args and header usage

Add to `Render.snippet.test.ts`:

- reactive args: `render(Render, { props: { of: createSnippetRender(snippet, writable('a')) } })`
  updates after `set('b')` + `tick()`. (Add a second exported snippet to the
  fixture, or a tiny second fixture, to obtain a `Snippet` value for this test —
  snippets can be exported from a `<script module>` block in a `.svelte` file.)
- header usage: extend `SnippetHost` so the `Age` column's `header` is
  `() => createSnippetRender(ageHeader)` with `{#snippet ageHeader()}<em data-testid="age-header">Age</em>{/snippet}`,
  and assert it renders.
- no-arg snippet: `createSnippetRender(ageHeader)` type-checks without a second argument.

**Verify**: `pnpm exec vitest run src/lib/render/Render.snippet.test.ts` → 4 tests pass;
`pnpm exec vitest run src/lib/render/Render.test.ts` → the plan-002 suite still passes.

### Step 5: Convert the kitchen-sink `Summary` column to a snippet

In `src/routes/kitchen-sink/+page.svelte`, replace the `Summary` column's
`cell` (currently `createRender(Profile, { age: value.age, progress: value.progress, name: ... })`)
with `createSnippetRender(summaryCell, value)` and add, at the top level of
the markup, a `{#snippet summaryCell(value)}` that renders the **same DOM
and text** that `_Profile.svelte` renders today (open `_Profile.svelte`
and copy its markup; keep any `data-testid`s). Import `createSnippetRender`
from `'../../lib/index.js'`. Delete `_Profile.svelte` only if nothing else
imports it.

**Verify**: `pnpm test:e2e` → all pass (the e2e suite asserts on names such
as `Colton Mertz` rendered by this column).

### Step 6: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`, `pnpm package`, `pnpm test:e2e`.

**Verify**: all exit 0.

## Test plan

- No red-first test: net-new feature. Step 1 is the type-level "red" (the
  fixture cannot compile until the API exists) and doubles as the hoisting proof.
- New: `Render.snippet.test.ts` — 4 cases (script-referenced snippet in a
  cell, reactive args, header snippet, no-arg snippet).
- Pattern: `src/lib/render/Render.test.ts` (plan 002).
- Verification: `pnpm test:only` and `pnpm test:e2e` → all pass.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; `Render.snippet.test.ts` has 4 passing tests
- [ ] `node -e "import('./dist/index.js').then(m => console.log(typeof m.createSnippetRender, typeof m.SnippetRenderConfig))"` → `function function` (after `pnpm package`)
- [ ] `grep -n "createSnippetRender" src/routes/kitchen-sink/+page.svelte` → ≥ 1 match
- [ ] `pnpm test:e2e` exits 0
- [ ] `git status --porcelain` lists only in-scope files
- [ ] README status row for 005 updated

## STOP conditions

- `src/lib/render/` does not exist or does not match the plan-002 shape.
- Top-level snippets cannot be referenced from `<script>` (Step 1).
- `{@render config.snippet($snippetArgsStore)}` is rejected by the compiler
  (e.g. store auto-subscription not allowed inside `{@render}` arguments) —
  report; a `{@const}` intermediate is an acceptable fix, an `$effect`-based
  manual subscription is not without review.
- The kitchen-sink conversion changes rendered text and an e2e test fails —
  restore the exact markup rather than editing the e2e expectations.

## Maintenance notes

- Docs for this feature are plan 006's job; report the final export names.
- Reviewer focus: `instanceof SnippetRenderConfig` ordering in `Render.svelte`;
  and that `RenderConfig` stayed a superset (no existing consumer type breaks —
  `pnpm check` on `docs/` after plan 006 is the real check).
- Deferred: a `renderers`-style map (per-column-id snippet overrides passed
  once to the view model, as svelte-markdown does for token types) was
  considered; it would be a larger design on top of this primitive.
