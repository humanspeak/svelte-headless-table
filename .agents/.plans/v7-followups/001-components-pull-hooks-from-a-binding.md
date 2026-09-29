# Plan 001: Components pull their hooks from a private binding; `applyHook`, `injectState` and `state` leave the public surface

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-followups/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 317a8c8..HEAD -- src/lib/tableComponent.svelte.ts src/lib/createViewModel.svelte.ts src/lib/bodyRows.ts src/lib/bodyCells.ts src/lib/headerRows.ts src/lib/headerCells.ts src/lib/plugins/addDataExport.svelte.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1 (public-contract change; must land before 7.0 is published)
- **Effort**: M
- **Risk**: MED (touches the base class of every row and cell)
- **Depends on**: none
- **Category**: tech-debt (API surface)
- **Planned at**: commit `317a8c8`, 2026-09-29

## Why this matters

Every exported row and cell class (`BodyRow`, `DataBodyCell`, `HeaderCell`,
…) publicly exposes `applyHook()`, `injectState()` and a writable `state`
property. They are the view model's plumbing: a consumer who calls them
overwrites a plugin's hooks or swaps the table state. `applyHook` is marked
`@internal`, but nothing strips it, so it ships in the `.d.ts`. v6 had the
same members, which makes 7.0 — already a breaking release — the cheapest
moment to remove them.

The plumbing is also heavier than it needs to be. The view model _pushes_
hooks into components while deriving: for every row and every cell it calls
every plugin's hook factory and stores the result. That forces a
once-per-row `WeakSet`, makes header cells behave differently from body
cells (their factories re-run on every header derivation), allocates hook
objects and closures for 10,000 rows when 30 are rendered, and rests on an
unenforced assumption that page rows are the same objects as the rows that
were hooked. If a component instead holds one pointer to a shared _binding_
and resolves its hooks lazily on first `current` read, all of that goes
away.

## Current state

- `src/lib/tableComponent.svelte.ts` (166 lines) — abstract
  `TableComponent<Item, Plugins, Key>`:

    ```ts
    #hooks: Record<string, AnyElementHook> = {}
    #currentView?: TableComponentCurrent<Item, Plugins, Key>
    get current() { /* lazily builds { get attrs(), get props() } over #readAttrs / #readProps */ }
    #readAttrs() { /* for...in over #hooks, mergeAttributes, finalizeAttributes, decorateAttrs */ }
    #readProps() { /* for...in over #hooks → { [pluginName]: hook.props() } */ }
    protected decorateAttrs(attrs) { return attrs }
    /** Reference to the table state, injected after creation. */
    state?: TableState<Item, Plugins>
    injectState(state: TableState<Item, Plugins>) { this.state = state }
    /** @internal */
    applyHook(pluginName: string, hook: ElementHook<unknown, Record<string, unknown>>) { this.#hooks[pluginName] = hook }
    abstract clone(): TableComponent<Item, Plugins, Key>
    ```

- `src/lib/createViewModel.svelte.ts`:
    - 239–248: `hookEntriesFor(pluginEntries, key)` returns
      `[pluginName, hookFactory][]` for one component key.
    - 431–434: `trHookEntries`, `tdHookEntries`, `theadTrHookEntries`, `thHookEntries`.
    - 436–462: `hookedRows = new WeakSet()` and `injectedRows`, which for each
      row not yet in the set calls `row.injectState(tableState)`,
      `cell.injectState(tableState)`, `row.applyHook(name, trHook(row))` and
      `cell.applyHook(name, tdHook(cell))`.
    - 470–476: `injectedPageRows` with the comment "Page rows are a subset of
      the same object references already processed by injectedRows — no need
      to re-inject state or re-apply hooks."
    - 480–499: `headerRows`, which injects state and applies the two header
      hook sets on **every** derivation (no `WeakSet`).
- `this.state` is read by `render()` in `src/lib/bodyCells.ts` (182–185,
  257–260) and `src/lib/headerCells.ts` (73–76): if `state` is undefined
  they throw, otherwise `return this.label(this, this.state)`.
- `src/lib/plugins/addDataExport.svelte.ts:75` reads `row.state`:
  `const data = cell.column.data(cell, row.state)`. The plugin's init
  argument already contains `tableState`.
- `clone()` implementations (`bodyRows.ts` 184/251 plus `cloneCellsInto`
  at 113, `bodyCells.ts` 193/268, `headerCells.ts` 198/264/317/400/461,
  `headerRows.ts` 79) build a new instance from constructor arguments. They
  do not copy `#hooks` or `state`; a clone is hooked again when the view
  model next sees it.
- Tests that call the plumbing directly:
  `src/lib/tableComponent.applyHook.test.ts` (6 tests: props, attrs, merged
  attrs, merged styles, replacing a hook, memo-free reads),
  `src/lib/tableComponent.current.test.ts:42-54` ("picks up a hook applied
  after current was first read"),
  `src/lib/bodyCells.DataBodyCell.render.test.ts:60`,
  `bodyCells.DisplayBodyCell.render.test.ts:47`,
  `bodyCells.HeaderCell.render.test.ts:47` (`actual.injectState(state)`).
- Hook factories (`TableHooks` in `src/lib/types/TablePlugin.ts`) have the
  shape `(component) => { props?: () => Props; attrs?: () => Attrs }`. The
  plugin-author rules say factories allocate handlers once per component and
  never write state. `addColumnFilters.svelte.ts` wraps part of its factory
  in `untrack` because factories currently run inside a `$derived`.
- Conventions: 4-space indent, no semicolons, single quotes;
  `// trunk-ignore(eslint/<rule>)` for suppressions; runes only in
  `.svelte` / `.svelte.ts`; library files are checked with
  `tsconfig.lib.json` (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`). Test helpers live in `src/lib/test/` and are
  named `*.test.svelte.ts` so they stay out of the npm tarball.

## Commands you will need

| Purpose       | Command                                                                                                                     | Expected on success                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                                                                                 | two `COMPLETED ... 0 ERRORS` lines |
| Unit tests    | `npx -y pnpm@11.24.0 test`                                                                                                  | all pass, coverage thresholds met  |
| Package       | `npx -y pnpm@11.24.0 package`                                                                                               | publint `All good!`                |
| e2e           | `PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line`                             | `36 passed`, `2 skipped`           |
| Bench         | `npx -y pnpm@11.24.0 dev --port 8417` then `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench` | JSON after `=== JSON ===`          |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                                                                                   | `✔ No issues`                      |

`pnpm` is not on PATH; always use `npx -y pnpm@11.24.0`. Put
`/tmp/pnpm-shim` first on PATH for Playwright (its build runs publint):
`export PATH=/tmp/pnpm-shim:$PATH`.

## Scope

**In scope**:

- `src/lib/tableComponent.svelte.ts`, `src/lib/createViewModel.svelte.ts`
- `src/lib/bodyRows.ts`, `src/lib/bodyCells.ts`, `src/lib/headerRows.ts`, `src/lib/headerCells.ts` (only `state` access and `clone`)
- `src/lib/plugins/addDataExport.svelte.ts` (the `row.state` read)
- `src/lib/plugins/addColumnFilters.svelte.ts` (only if its factory's `untrack` becomes redundant — see Step 3)
- Tests: `src/lib/tableComponent.applyHook.test.ts` (rename to `tableComponent.binding.test.ts`), `tableComponent.current.test.ts`, the three `bodyCells.*.render.test.ts`, `src/lib/CurrentHost.test.svelte`, `src/lib/VmCurrentHost.test.svelte` if they touch the plumbing, `src/lib/publicApi.types.test.ts`, `src/lib/createViewModel.performance.test.ts`
- `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` and the API pages `docs/src/routes/docs/api/{body-row,body-cell,header-row,header-cell}/+page.svx` (remove any mention of the three members; add one row to the guide's breaking-changes table)
- `.agents/.plans-closed/v7-runes-core/RELEASE-NOTES-v7.md` ("Removed" list)
- `scripts/perf-baseline.json` (replace with the new run if Step 5 passes)

**Out of scope** (do NOT touch):

- The plugin contract (`src/lib/types/TablePlugin.ts` hook and derive
  types) — hook factories keep their signature.
- How plugins capture upstream rows — plan 002.
- `current.props` / `current.attrs` semantics: still memo-free, still one
  object with every plugin's props.
- `src/routes/**` unless a route fails to type-check because it called one
  of the removed members.

## Git workflow

- Branch: `feat/v7-runes-core` (already checked out; PR #335 is open on it).
- Commits: `refactor(core)!: components resolve hooks from a private binding`
  and `docs: drop applyHook / injectState / state from the v7 surface`. End
  messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pin the target behaviour with tests (red first)

Create `src/lib/tableComponent.binding.test.ts` (from
`tableComponent.applyHook.test.ts`, which you delete at the end of Step 2).
It imports an internal function that does not exist yet:

```ts
import { bindComponent } from './tableComponent.svelte.js'
```

Rewrite the six existing tests so each builds its component, then calls
`bindComponent(component, { state, hooks: [['test', () => ({ props })]] })`
instead of `component.applyHook(...)`. Add:

1. `resolves hook factories lazily, once per component` — a factory that
   counts its calls: 0 after `bindComponent`, 1 after the first
   `component.current.props` read, still 1 after ten more reads.
2. `a clone resolves its own hooks` — bind, read `current`, `clone()`, bind
   the clone with the same binding; the factory has run twice and received
   the clone as its argument the second time.
3. `re-binding replaces the hook set` — bind with factory A, read, bind with
   factory B; the next `current.props` read reflects B.
4. `a component with no binding has empty props and only its fixed attrs` —
   `current.props` is `{}`, `current.attrs` is what `decorateAttrs({})` returns.

In `src/lib/publicApi.types.test.ts` add type-level assertions that the
members are gone from the public classes:

```ts
expectTypeOf<BodyRow<Item>>().not.toHaveProperty('applyHook')
expectTypeOf<BodyRow<Item>>().not.toHaveProperty('injectState')
expectTypeOf<DataBodyCell<Item>>().not.toHaveProperty('state')
```

**Verify**: `npx -y pnpm@11.24.0 check` → FAILS with errors naming
`bindComponent` (no exported member) and the three `not.toHaveProperty`
assertions. If it passes, STOP.

### Step 2: The binding and lazy resolution

In `src/lib/tableComponent.svelte.ts`:

```ts
/** A plugin's hook factory for one component kind, with the plugin's name. */
export type HookEntry<Component> = readonly [
    pluginName: string,
    factory: (_component: Component) => ElementHook<unknown, Record<string, unknown>>
]

/**
 * What a view model shares with every component of one kind: the table
 * state and the hook factories of the plugins that decorate that kind. One
 * object per kind per view model; a component holds a pointer to it.
 */
export interface ComponentBinding<Item, Plugins extends AnyPlugins, Component> {
    readonly state: TableState<Item, Plugins>
    readonly hooks: readonly HookEntry<Component>[]
}
```

Inside the class:

- Replace `#hooks: Record<...> = {}` with
  `#binding?: ComponentBinding<Item, Plugins, this>` and
  `#hooks?: [string, AnyElementHook][]` (resolved lazily; `undefined` until
  first read, reset to `undefined` when the binding changes).
- A private `#resolveHooks()` that returns `#hooks`, building it on first
  call by invoking each factory with `this` **inside `untrack`** (import
  from `svelte`), so whatever a factory reads while it is created does not
  subscribe the template that triggered the first `current` read:

    ```ts
    #resolveHooks(): [string, AnyElementHook][] {
        if (this.#hooks === undefined) {
            const entries = this.#binding?.hooks ?? []
            this.#hooks = untrack(() => entries.map(([name, factory]) => [name, factory(this)]))
        }
        return this.#hooks
    }
    ```

- `#readAttrs` / `#readProps` iterate `this.#resolveHooks()` with
  `for (const [pluginName, hook] of hooks)` (no `for...in`, no
  `Object.hasOwn`).
- `protected get state(): TableState<Item, Plugins> | undefined { return this.#binding?.state }`
  replaces the public `state` field. Delete `injectState` and `applyHook`.
- Expose the binding setter **only as a module function**, through a static
  initialisation block so it can reach the private field without a public
  member:

    ```ts
    let setBinding: <Item, Plugins extends AnyPlugins, Key extends ComponentKeys>(
        component: TableComponent<Item, Plugins, Key>,
        binding: ComponentBinding<Item, Plugins, never>
    ) => void

    export abstract class TableComponent<...> {
        static {
            setBinding = (component, binding) => {
                component.#binding = binding as never
                component.#hooks = undefined
            }
        }
        /* ... */
    }

    /**
     * Binds a component to a view model. Internal: exported from this module
     * for the view model and tests, not re-exported from the package entry.
     */
    export const bindComponent = setBinding
    ```

    Adjust the generics until `pnpm check` is clean without `any`; the
    binding's `Component` parameter is contravariant, so the view model's
    call sites may need the binding typed per concrete class.
    `src/lib/index.ts` must **not** export `bindComponent`, `ComponentBinding`
    or `HookEntry`.

Update the class JSDoc ("Provides common functionality for state injection,
hook application, and attribute merging") to describe the binding.

In `src/lib/plugins/addDataExport.svelte.ts` replace `row.state` with the
`tableState` from the plugin's init argument (add it to the destructured
init if it is not already there).

Delete `src/lib/tableComponent.applyHook.test.ts`. In
`src/lib/tableComponent.current.test.ts` delete the "picks up a hook applied
after current was first read" test (a late hook no longer exists) and its
comment. In the three `bodyCells.*.render.test.ts` files replace
`actual.injectState(state)` with
`bindComponent(actual, { state, hooks: [] })`.

**Verify**: `npx -y pnpm@11.24.0 check` → the only remaining errors are in
`src/lib/createViewModel.svelte.ts` (calls to the removed methods).

### Step 3: The view model binds instead of pushing

In `src/lib/createViewModel.svelte.ts`:

- Build four bindings once, after `tableState` exists:

    ```ts
    const bodyRowBinding = { state: tableState, hooks: hookEntriesFor(pluginEntries, 'tbody.tr') }
    const bodyCellBinding = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'tbody.tr.td')
    }
    const headerRowBinding = { state: tableState, hooks: hookEntriesFor(pluginEntries, 'thead.tr') }
    const headerCellBinding = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'thead.tr.th')
    }
    ```

- One helper binds a list of rows and their cells:

    ```ts
    const bindRows = <Row extends { cells: readonly unknown[] }>(rows, rowBinding, cellBinding) => {
        for (const row of rows) {
            bindComponent(row, rowBinding)
            for (const cell of row.cells) bindComponent(cell, cellBinding)
        }
    }
    ```

    (type it properly; the sketch shows the shape).

- `injectedRows` becomes: read `rowsFn()`, `bindRows(...)`, return. Delete
  the `hookedRows` `WeakSet` and its comment: binding is two pointer writes
  per component and is idempotent.
- `injectedPageRows` binds too, so a `derivePageRows` plugin that produces
  new row objects gets state and hooks; replace the "same object
  references" comment with one sentence saying so.
- `headerRows` uses the same helper with the header bindings.
- Keep every `measure(...)` wrapper and counter name.
- In `addColumnFilters.svelte.ts`, the factory's own `untrack` wrapper is
  now inside the component's `untrack`. Leave it if removing it changes any
  test; otherwise remove it and its comment.

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors;
`npx -y pnpm@11.24.0 exec vitest run src/lib` → all pass, including the
Step 1 tests; `grep -rn "applyHook\|injectState\|hookedRows" src/lib` → no
output.

### Step 4: Docs and release notes

- `docs/src/routes/docs/guides/migrating-to-v7/+page.svx`: add a row to
  "Breaking changes at a glance" — `row.applyHook()`, `row.injectState()`,
  `row.state` (and the same on cells and header components) | removed;
  labels and display-column `data` functions receive the table state as
  their second argument — and one sentence in the "Removed helpers" section.
- The four API pages: remove any section documenting `applyHook`,
  `injectState` or `state`.
- `.agents/.plans-closed/v7-runes-core/RELEASE-NOTES-v7.md`: add the three
  members to the "Removed" list.

**Verify**: `grep -rn "applyHook\|injectState" docs/src README.md` → matches
only in the migration guide's new row/sentence;
`npx -y pnpm@11.24.0 package && (cd docs && npx -y pnpm@11.24.0 check)` →
0 errors; then `git checkout -- docs/src/lib/demo-loaders.ts`.

### Step 5: Bench — this must not be slower, and should be faster at 10k rows

Run the bench three times on this branch before your change (use
`git stash` is NOT allowed — instead compare against the committed
`scripts/perf-baseline.json`, which is the v7 run at
`rows-10k-done` first paint ≈ 216 ms on the maintainer's machine) and three
times after. Report median first paint for `rows-10k-done`,
`kitchen-sink-1k-done`, and `interactionMs` for `sort-cycle-1k-done`.

**Verify**: each of the three medians is ≤ 1.05 × the baseline value in
`scripts/perf-baseline.json`. If all three pass, replace
`scripts/perf-baseline.json` with the middle run.

### Step 6: Full gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line | tail -3
grep -n "applyHook\|injectState" dist/*.d.ts dist/**/*.d.ts   # expect no output
```

## Test plan

- Red first: Step 1's type check fails on the missing `bindComponent` and
  on the three `not.toHaveProperty` assertions; both go green after Step 3.
- New tests (Step 1): lazy once-per-component resolution, clones resolve
  their own hooks, re-binding replaces hooks, unbound components.
- Deleted test: "picks up a hook applied after current was first read" —
  the capability it pinned (mutating a component's hooks after the fact) is
  the thing being removed.
- The plugin suites and `interactions.test.ts` are the characterization
  tests for behaviour: they must pass unchanged.

## Done criteria

- [ ] `grep -rn "applyHook\|injectState\|hookedRows" src/lib` → no output
- [ ] `grep -n "applyHook\|injectState" dist/*.d.ts dist/**/*.d.ts` → no output after `pnpm package`
- [ ] `src/lib/index.ts` does not export `bindComponent`, `ComponentBinding` or `HookEntry`; `src/lib/index.exports.test.ts` passes unchanged
- [ ] `npx -y pnpm@11.24.0 check` exits 0; `npx -y pnpm@11.24.0 test` exits 0 with thresholds met
- [ ] Playwright Chromium + Firefox: 36 passed, 2 skipped
- [ ] Bench: the three medians ≤ 1.05 × baseline
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `.agents/.plans/v7-followups/README.md` status row updated

## STOP conditions

- A hook factory, now running under a template's first read instead of
  inside the view model's `$derived`, throws `state_unsafe_mutation` or
  writes state (name the plugin and line).
- A plugin test fails because a factory relied on running eagerly for every
  row (for example to populate a side table). Report the plugin; do not
  make resolution eager again.
- The static-block approach does not survive `svelte-package` or the
  consumer build (`npx -y pnpm@11.24.0 package` then inspect
  `dist/tableComponent.svelte.js` for the `static {` block). If it is
  mangled, report; the fallback is a module-private `WeakMap` keyed by
  component, which costs one map insert per component.
- The bench is more than 5 % slower on any of the three scenarios.
- Hiding `state` breaks a route or docs demo that read `row.state` /
  `cell.state` (report the file; labels receive state as their argument).

## Maintenance notes

- `bindComponent` is reachable only by deep-importing a file the package's
  `exports` map does not expose. Keep it out of `src/lib/index.ts`.
- Lazy resolution means a hook factory runs the first time a component's
  `current` is read, inside `untrack`. Factories must therefore be pure
  constructors: allocate handlers, return getters, read nothing reactive at
  creation time that they need to stay subscribed to — read it inside the
  returned getters.
- This removes the basis for follow-up item 5 in this folder's README
  ("hooks are applied to every row") — update that row when this lands.
