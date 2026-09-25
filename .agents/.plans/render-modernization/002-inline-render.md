# Plan 002: Make `Render` / `createRender` first-party and drop `@humanspeak/svelte-render`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/render-modernization/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- src/lib/index.ts src/lib/render src/lib/types/Label.ts src/lib/headerCells.ts src/lib/bodyCells.ts src/lib/plugins/addColumnFilters.ts package.json`
> Plan 001 is expected to have added `src/lib/render/Render.smoke.test.ts`
> and `src/lib/render/Fixture.test.svelte`; anything else changed under
> in-scope paths must be compared against the "Current state" excerpts. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (public API surface; must stay byte-for-byte compatible)
- **Depends on**: 001-component-test-harness.md
- **Category**: migration / tech-debt
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

`Render`, `createRender`, `ComponentRenderConfig` and the `RenderConfig`
type are the library's entire custom-cell API, and they are re-exported
wholesale from `@humanspeak/svelte-render` — a separate repo the
maintainer no longer wants to maintain (last published 2025-03-08, v5.1.1).
Every change to how cells render currently needs a release in that repo
first. Its implementation is also three nested components
(`Render` → `ComponentRenderer` → `PropsRenderer`) that route reactive
props through yet another legacy package (`@humanspeak/svelte-subscribe`
with Svelte-4 slot props). This plan moves the code into `src/lib/render/`
as two small Svelte-5 files with the **same public API**, so the library
owns its rendering and later plans (005: snippet support) can evolve it
in-repo. The sibling `@humanspeak/svelte-markdown` has already made this
move: it depends on none of the legacy helper packages.

## Current state

- `src/lib/index.ts:1-3` — the public re-export:

```ts
// components
export * from '@humanspeak/svelte-render'
export { Subscribe } from '@humanspeak/svelte-subscribe'
```

- `@humanspeak/svelte-render` exports (from `node_modules/@humanspeak/svelte-render/dist/index.js`):
  `createRender`, `ComponentRenderConfig` (class), `RenderConfig` (type), `Render` (component).
  Public type shape that must be preserved:

```ts
export type RenderConfig<TComponent extends Component = Component<any>> =
    ComponentRenderConfig<TComponent> | string | number | Readable<string | number>

export declare class ComponentRenderConfig<TComponent extends Component = Component<any>> {
    component: TComponent
    props?: Record<string, unknown> | undefined
    constructor(component: TComponent, props?: Record<string, unknown> | undefined)
    /** @deprecated */ eventHandlers: [string, (ev: any) => void][]
    /** @deprecated */ on<TEventType extends string, TEvent = any>(
        type: TEventType,
        handler: (ev: TEvent) => void
    ): this
    children: RenderConfig[]
    slot(...children: RenderConfig[]): this
}
export declare function createRender<TComponent extends Component<any>>(
    component: TComponent
): ComponentRenderConfig<TComponent>
export declare function createRender<TComponent extends Component<any>>(
    component: TComponent,
    props: Partial<ComponentProps<TComponent>> | Readable<ComponentProps<TComponent>>
): ComponentRenderConfig<TComponent>
```

- Runtime behaviour of the dependency's `createRender.js` that must be kept:
  `.on(type, handler)` pushes to `eventHandlers` **and** sets
  `this.props[`on${type}`] = handler` (creating `props` if undefined);
  `.slot(...children)` replaces `children`; both return `this`.
- Dependency's `Render.svelte` (the behaviour to replicate):

```svelte
<script lang="ts">
    // ...
    const { of: config }: Props = $props()
    const readableConfig = $derived(isReadable(config) ? config : Undefined)
</script>

{#if isReadable(config)}
    {$readableConfig}
{:else if typeof config !== 'object'}
    {config}
{:else}
    <ComponentRenderer {config} />
{/if}
```

`ComponentRenderer.svelte` then checks `isReadable(config.props)` and either
wraps `PropsRenderer` in `<Subscribe props={config.props} let:props>` or
passes `config.props` directly. `PropsRenderer.svelte` renders
`<config.component {...props}>{#each config.children as child, i (i)}<Render of={child} />{/each}</config.component>`.
The `bind:instance` in those files is internal and never exposed — drop it.

- In-repo type-only imports of `RenderConfig` that must be re-pointed:
    - `src/lib/types/Label.ts:1` — `import type { RenderConfig } from '@humanspeak/svelte-render'`
    - `src/lib/headerCells.ts:6` — same
    - `src/lib/bodyCells.ts:6` — same
    - `src/lib/plugins/addColumnFilters.ts:2` — same
- `src/lib/utils/store.ts` already exports an `isReadable` type guard
  (identical semantics to the dependency's): use it, do not add another.
- Dev example that exercises every path (keep it as the e2e fixture, do not
  edit it in this plan): `src/routes/kitchen-sink/+page.svelte` imports
  `createRender` directly from `'@humanspeak/svelte-render'` on line 3 and
  `Render, Subscribe, createTable` from `'../../lib/index.js'` on line 5.
  That direct import **must** be re-pointed in this plan (see Step 4) or
  the build breaks when the dependency is removed.
- Conventions: 4-space indent, no semicolons, single quotes, JSDoc on every
  exported symbol (see `src/lib/utils/store.ts` for the documentation style),
  `// trunk-ignore(eslint/...)` for suppressions, never `eslint-disable`.
  Svelte 5 runes style for new components: `$props()`, `$derived`,
  `generics="..."` on the script tag (not `$$Generic`).

## Commands you will need

| Purpose        | Command                                                         | Expected on success                   |
| -------------- | --------------------------------------------------------------- | ------------------------------------- |
| Install        | `pnpm install`                                                  | exit 0                                |
| Typecheck      | `pnpm check`                                                    | exit 0, `svelte-check found 0 errors` |
| One test file  | `pnpm exec vitest run <path>`                                   | all pass                              |
| All unit tests | `pnpm test:only`                                                | exit 0                                |
| Lint           | `trunk check`                                                   | no failures                           |
| Format         | `trunk fmt`                                                     | exit 0/1                              |
| Package        | `pnpm package`                                                  | exit 0, publint clean                 |
| E2E            | `pnpm exec playwright install --with-deps` then `pnpm test:e2e` | all pass (builds + previews on :4173) |

## Scope

**In scope**:

- `src/lib/render/createRender.ts` (create)
- `src/lib/render/Render.svelte` (create)
- `src/lib/render/index.ts` (create)
- `src/lib/render/Render.test.ts` (create — characterization tests; may
  absorb and delete `Render.smoke.test.ts` from plan 001)
- `src/lib/index.ts` (line 2 only)
- `src/lib/types/Label.ts`, `src/lib/headerCells.ts`, `src/lib/bodyCells.ts`,
  `src/lib/plugins/addColumnFilters.ts` (import line only)
- `src/routes/kitchen-sink/+page.svelte` (import line 3 only)
- `package.json` (remove the `@humanspeak/svelte-render` dependency) and `pnpm-lock.yaml`

**Out of scope**:

- `Subscribe` and `@humanspeak/svelte-subscribe` — plan 003.
- `@humanspeak/svelte-keyed` — plan 004.
- Adding snippet support or any new `RenderConfig` variant — plan 005.
- `docs/**`, `README.md` — plan 006.
- Any change to the `RenderConfig` union, method names, or `Render`'s prop name `of`.

## Git workflow

- Branch: `chore/inline-render`
- Commit style: conventional, e.g. `refactor(render): inline Render and createRender, drop svelte-render`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the characterization tests (green against the current dependency)

Rename `src/lib/render/Render.smoke.test.ts` to `src/lib/render/Render.test.ts`
and add these cases (keep the existing five). All must pass **before** any
implementation change — they pin the dependency's behaviour.

- `createRender(Fixture).on('click', handler)` → `config.props.onclick === handler`
  and `config.eventHandlers` has length 1.
- `createRender(Fixture, { label: 'x' }).slot('a', 'b').children` deep-equals `['a', 'b']`.
- `RenderConfig` accepts a number: `render(Render, { props: { of: 42 } })` → text `42`.
- Nested children render: make a second fixture `Wrapper.test.svelte`:

```svelte
<script lang="ts">
    import type { Snippet } from 'svelte'
    const { children }: { children?: Snippet } = $props()
</script>

<div data-testid="wrapper">{@render children?.()}</div>
```

then `render(Render, { props: { of: createRender(Wrapper).slot('inner', createRender(Fixture, { label: 'n' })) } })`
→ `getByTestId('wrapper')` has text containing `inner` and `n:0`.

Note: today the dependency renders children into the component's **default
slot**. In Svelte 5 that is the `children` snippet, so `Wrapper` above is
the correct consumer shape. If this test fails against the current
dependency, STOP — the assumption "children are passed as the `children`
snippet" is wrong for the installed version.

**Verify**: `pnpm exec vitest run src/lib/render/Render.test.ts` → 9 tests pass, with
`@humanspeak/svelte-render` still installed.

### Step 2: Create `src/lib/render/createRender.ts`

Port the class and function with identical semantics and the type
signatures shown in "Current state". Requirements:

- `import type { Component, ComponentProps } from 'svelte'` and
  `import type { Readable } from 'svelte/store'`.
- Keep `@deprecated` JSDoc on `eventHandlers` and `on()` exactly as the
  dependency has it ("will be removed in the next major release. Please use
  svelte-5 event syntax instead.").
- Use `// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)` where
  `any` is unavoidable in the generics (the dependency needed it in the same places).

**Verify**: `pnpm check` → 0 errors (the file is not yet imported; this
just proves it compiles).

### Step 3: Create `src/lib/render/Render.svelte` and `src/lib/render/index.ts`

`Render.svelte` — a single self-recursive runes component replacing all
three dependency components. Target shape:

```svelte
<script lang="ts" generics="TComponent extends Component<any>">
    import type { Component } from 'svelte'
    import { readable } from 'svelte/store'
    import { isReadable } from '$lib/utils/store.js'
    import Render from './Render.svelte'
    import type { ComponentRenderConfig, RenderConfig } from './createRender.js'

    const { of: config }: { of: RenderConfig<TComponent> } = $props()

    // Primitive-or-store branch: a store that always exists lets the template
    // use `$` auto-subscription on a $derived value (same trick the
    // dependency used) instead of manual subscribe/unsubscribe.
    const valueStore = $derived(isReadable<string | number>(config) ? config : readable(undefined))

    // Component branch: normalise props to a store so the template can
    // spread `$propsStore` whether the caller passed a plain object or a Readable.
    const componentConfig = $derived(
        typeof config === 'object' && !isReadable(config)
            ? (config as ComponentRenderConfig<TComponent>)
            : undefined
    )
    const propsStore = $derived(
        componentConfig === undefined
            ? readable({})
            : isReadable<Record<string, unknown>>(componentConfig.props)
              ? componentConfig.props
              : readable(componentConfig.props ?? {})
    )
</script>

{#if isReadable(config)}
    {$valueStore}
{:else if componentConfig === undefined}
    {config}
{:else}
    <componentConfig.component {...$propsStore}>
        {#each componentConfig.children as child, i (i)}
            <Render of={child} />
        {/each}
    </componentConfig.component>
{/if}
```

Adjust the type-narrowing casts as needed to satisfy `svelte-check` with
`strict: true`, but do not change the branch order (store → primitive →
component) or the `(i)` key on children; both match the dependency.

If `isReadable` in `src/lib/utils/store.ts` is not generic-friendly enough
for the narrowing above, call it without the generic and cast — do not
change `store.ts` in this plan.

`src/lib/render/index.ts`:

```ts
export { ComponentRenderConfig, createRender, type RenderConfig } from './createRender.js'
export { default as Render } from './Render.svelte'
```

**Verify**: `pnpm check` → 0 errors.

### Step 4: Switch all imports to the first-party module

- `src/lib/index.ts` line 2: replace `export * from '@humanspeak/svelte-render'`
  with `export * from '$lib/render/index.js'`.
- `src/lib/types/Label.ts`, `src/lib/headerCells.ts`, `src/lib/bodyCells.ts`,
  `src/lib/plugins/addColumnFilters.ts`: change the `RenderConfig` type import
  to `from '$lib/render/createRender.js'` (Label.ts uses relative imports
  elsewhere — `from '../render/createRender.js'` is fine there; match the
  file's existing style).
- `src/routes/kitchen-sink/+page.svelte` line 3: change
  `import { createRender } from '@humanspeak/svelte-render'` to import
  `createRender` from `'../../lib/index.js'` alongside the existing
  `Render, Subscribe, createTable` import on line 5 (merge into one import).

**Verify**:
`grep -rn "svelte-render" src/` → no matches.
`pnpm exec vitest run src/lib/render/Render.test.ts` → 9 tests pass (now
against first-party code). `pnpm check` → 0 errors.

### Step 5: Remove the dependency

`pnpm remove @humanspeak/svelte-render`. Confirm `@humanspeak/svelte-subscribe`
is **still** listed — it is used directly by `src/lib/tableComponent.ts`
(`derivedKeys`) and `src/lib/index.ts` (`Subscribe`) until plan 003.

**Verify**: `grep -n "svelte-render" package.json pnpm-lock.yaml` → no
matches; `pnpm install` → exit 0; `pnpm check` → 0 errors.

### Step 6: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`, `pnpm package`,
then `pnpm test:e2e` (the kitchen-sink and virtual-scroll routes render
every `RenderConfig` variant: string headers, `derived(...)` store headers,
`createRender(Component, props)`, `createRender(Component, derived(...))`).

**Verify**: all exit 0. If e2e cannot run locally (no browsers), run
`pnpm exec playwright install --with-deps` first; if that is not possible,
say so explicitly in the report rather than skipping silently.

## Test plan

- No red-first test: this is a behaviour-preserving migration. The anchor
  is the characterization suite in Step 1, which must be green before and
  after the swap.
- `src/lib/render/Render.test.ts` — 9 cases: string, number, readable
  primitive (+update), component + static props, component + readable
  props (+update), `.slot()` children into a `children` snippet, nested
  `Render` inside children, `.on()` mapping to `on<type>` prop, `.slot()`
  replacing children.
- Pattern: `src/lib/render/Render.smoke.test.ts` from plan 001 and
  `~/GitHub/svelte-markdown/src/lib/SvelteMarkdown.test.ts`.
- Verification: `pnpm test:only` → all pass; `pnpm test:e2e` → all pass.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; `src/lib/render/Render.test.ts` has 9 passing tests
- [ ] `grep -rn "svelte-render" src/ package.json` → no matches
- [ ] `pnpm package` exits 0 and `ls dist/render/` shows `Render.svelte`, `createRender.js`, `index.js` and their `.d.ts`
- [ ] `node -e "import('./dist/index.js').then(m => console.log(typeof m.Render, typeof m.createRender, typeof m.ComponentRenderConfig))"` → `function function function`
- [ ] `pnpm test:e2e` exits 0 (or the report states exactly why it could not run)
- [ ] `git status --porcelain` lists only in-scope files
- [ ] README status row for 002 updated

## STOP conditions

- The "Current state" excerpts don't match the live code.
- Any Step 1 characterization test fails **against the current dependency**
  (the plan's understanding of existing behaviour would be wrong).
- `svelte-check` rejects `$`-auto-subscription on a `$derived` store
  (`$valueStore` / `$propsStore`). Do not fall back to manual
  `subscribe()` in `$effect` without reporting — that changes teardown
  semantics and belongs in review.
- A consumer-visible export name from the dependency (`Render`,
  `createRender`, `ComponentRenderConfig`, `RenderConfig`) would have to
  change or be dropped.
- Removing the dependency breaks `docs/` (the docs package pins its own
  deps; it should be unaffected — if `pnpm install` at the root complains
  about the workspace, report rather than editing `docs/package.json`).

## Maintenance notes

- Plan 005 adds a `Snippet` variant to `RenderConfig` on top of this file;
  keep the three-branch structure so that becomes a fourth branch.
- Reviewer focus: (1) props passed as a `Readable` must re-render on
  `set` — the second fixture test covers it; (2) `.on()` remains deprecated,
  not removed — removing it is a major-version decision.
- `README.md` and the docs site still say `createRender` "is based on
  svelte-render"; plan 006 fixes the wording.
