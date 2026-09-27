# Plan 002: Give `TableComponent` a runes-backed `current.attrs` / `current.props` beside the store methods

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/runes-core/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Read first**: `.agents/.plans/runes-core/001-runes-spike.report.md`. This
> plan is written against the _default_ design (namespace `current`,
> mechanism B "subscriber mirror"). If the report's "Recommendation for plan
> 002" section chose a different name or mechanism, the reviewer will have
> amended this plan; if it has not been amended and the report disagrees,
> STOP and report the discrepancy.
>
> **Drift check (run first)**:
> `git diff --stat fdc76a8..HEAD -- src/lib/tableComponent.ts src/lib/headerCells.ts src/lib/bodyCells.ts src/lib/headerRows.ts src/lib/bodyRows.ts src/lib/tableComponent.applyHook.test.ts`
> On a mismatch with the "Current state" excerpts, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches the base class of every row and cell; public store methods must stay byte-compatible)
- **Depends on**: 001-runes-spike.md (its report decides naming and mechanism)
- **Category**: migration
- **Planned at**: commit `fdc76a8`, 2026-09-27

## Why this matters

Every row and cell inherits `attrs()` and `props()` from `TableComponent`,
and both return a fresh `derived` store per call. That is the reason
consumer templates need `<Subscribe>` or `fromStore`. This plan is the
first of three "dual-mode" steps: it adds a runes-native way to read the
same values (`cell.current.attrs`, `cell.current.props` as plain reactive
objects) while leaving the store methods exactly as they are. Consumers see
no change; the characterisation suites and e2e stay green; the file becomes
`.svelte.ts` so later plans can hold rune state in it. This is the pattern
Svelte itself uses to bridge stores and runes (`fromStore`/`toStore`), and it
is what makes a later v7 "drop the stores" release a deletion rather than a
rewrite.

## Current state

- `src/lib/tableComponent.ts` (106 lines) — the abstract base. Full store
  surface:

```ts
// src/lib/tableComponent.ts:46-72
private attrsForName: Record<string, Readable<Record<string, unknown>>> = {}

attrs(): Readable<Record<string, unknown>> {
    return derived(Object.values(this.attrsForName), ($attrsArray) => {
        let $mergedAttrs: Record<string, unknown> = {}
        $attrsArray.forEach(($attrs) => {
            $mergedAttrs = mergeAttributes($mergedAttrs, $attrs)
        })
        return finalizeAttributes($mergedAttrs)
    })
}

private propsForName: Record<string, Readable<Record<string, unknown>>> = {}

props(): Readable<PluginTablePropSet<Plugins>[Key]> {
    return derivedKeys(this.propsForName) as Readable<PluginTablePropSet<Plugins>[Key]>
}
```

```ts
// src/lib/tableComponent.ts:93-103
applyHook(
    pluginName: string,
    hook: ElementHook<Record<string, unknown>, Record<string, unknown>>
) {
    if (hook.props !== undefined) {
        this.propsForName[pluginName] = hook.props
    }
    if (hook.attrs !== undefined) {
        this.attrsForName[pluginName] = hook.attrs
    }
}
```

- Subclasses override `attrs()` by wrapping `super.attrs()` in another
  `derived` to add fixed attributes. All four look like this one:

```ts
// src/lib/headerCells.ts:93-101
attrs() {
    return derived(super.attrs(), ($baseAttrs) => {
        return {
            ...$baseAttrs,
            role: 'columnheader' as const,
            colspan: this.colspan
        }
    })
}
```

(`src/lib/bodyCells.ts:52-59` adds `role: 'cell'`; `src/lib/bodyRows.ts:63-70`
and `src/lib/headerRows.ts:69-76` add `role: 'row'`.) `props()` is not overridden anywhere.

- Importers of `$lib/tableComponent.js` (all must change to the new path):
  `src/lib/bodyCells.ts`, `src/lib/bodyRows.ts`, `src/lib/headerCells.ts`,
  `src/lib/headerRows.ts`, `src/lib/tableComponent.applyHook.test.ts`.
  `src/lib/index.ts` does not export `TableComponent`; the class is internal.
- Hooks are applied during view-model derivation, before render
  (`src/lib/createViewModel.ts:457-477` and `500-521`), and `applyHook` may be
  called again when rows re-derive. So `current.attrs` must react both to the
  hook stores changing value and to the set of hooks changing.
- Existing tests: `src/lib/tableComponent.applyHook.test.ts` (4 cases on the
  store surface — must stay untouched apart from the import path);
  `src/lib/fromStore.test.ts` + `src/lib/FromStoreHost.test.svelte` are the
  exemplar for a reactivity host test (sort toggle, column widths).
- Tooling facts: `@sveltejs/package@2.5.8` emits `tableComponent.svelte.ts`
  as `dist/tableComponent.svelte.js` (verified in
  `node_modules/@sveltejs/package/src/utils.js:156-166`); vitest compiles
  `.svelte.ts` through the SvelteKit Vite plugin already configured. Svelte
  5.56.10: `createSubscriber` is exported from `svelte/reactivity`.
- Conventions: 4-space indent, no semicolons, single quotes, JSDoc on every
  public member, `// trunk-ignore(eslint/<rule>)` for suppressions.

## Commands you will need

| Purpose        | Command                                                             | Expected on success           |
| -------------- | ------------------------------------------------------------------- | ----------------------------- |
| Typecheck      | `pnpm check`                                                        | `svelte-check found 0 errors` |
| One test file  | `pnpm exec vitest run <path>`                                       | all pass                      |
| All unit tests | `pnpm test:only`                                                    | exit 0                        |
| Coverage gate  | `pnpm test`                                                         | exit 0 (thresholds hold)      |
| Lint           | `trunk check`                                                       | no new issues                 |
| Format         | `trunk fmt`                                                         | exit 0/1                      |
| Package        | `pnpm package`                                                      | publint All good              |
| E2E            | `pnpm test:e2e` (or `pnpm exec playwright test --project=chromium`) | all pass                      |

`pnpm` may need to be invoked as `npx -y pnpm@11.24.0`.

## Scope

**In scope**:

- `src/lib/tableComponent.ts` → renamed with `git mv` to `src/lib/tableComponent.svelte.ts`, then edited
- `src/lib/bodyCells.ts`, `src/lib/bodyRows.ts`, `src/lib/headerCells.ts`, `src/lib/headerRows.ts` (import path + the `decorateAttrs` refactor in Step 3)
- `src/lib/tableComponent.applyHook.test.ts` (import path only)
- `src/lib/tableComponent.current.test.ts` and `src/lib/CurrentHost.test.svelte` (create)
- `src/lib/index.exports.test.ts` only if its inline snapshot needs no change — it should not; if it does, STOP

**Out of scope**:

- `src/lib/createViewModel.ts` — plan 004.
- Plugin files and `src/lib/types/TablePlugin.ts` — the plugin contract is unchanged; hooks still return stores.
- Removing or changing the behaviour of `attrs()` / `props()`.
- `src/routes/**` and `docs/**` — plan 003 switches the fixtures.

## Git workflow

- Branch: `feat/runes-core`.
- Commit: `refactor(core): add runes-backed current.attrs/props to TableComponent (dual mode)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Characterisation test for the store surface (green now, must stay green)

Extend `src/lib/tableComponent.applyHook.test.ts` with one more case:
applying a hook, then re-applying a different `attrs` store for the same
plugin name, and asserting `get(component.attrs())` reflects the newer store.
This pins the "hooks can be re-applied" behaviour that `current` must also honour.

**Verify**: `pnpm exec vitest run src/lib/tableComponent.applyHook.test.ts` → 5 pass.

### Step 2: Write the failing reactivity test for `current`

Create `src/lib/CurrentHost.test.svelte`, a copy of `src/lib/FromStoreHost.test.svelte`
where every `fromStore(x.attrs()).current` / `fromStore(x.props()).current`
becomes `x.current.attrs` / `x.current.props` (no `fromStore`, no `{@const}`
needed beyond destructuring). Create `src/lib/tableComponent.current.test.ts`
with the same three assertions as `src/lib/fromStore.test.ts` against
`CurrentHost`, plus a fourth: after `component.applyHook('late', { attrs: writable({ 'data-late': '1' }) })`
on a header cell obtained from `vm.headerRows`, `await tick()`, the rendered
`th` has `data-late="1"` (proves the hook _set_ is reactive, not only values).

**Verify**: `pnpm check` fails with `Property 'current' does not exist` on
the host (that is the red state). Do not proceed until you see that error.

### Step 3: Rename the file and add `current`

`git mv src/lib/tableComponent.ts src/lib/tableComponent.svelte.ts`; update the
five importers to `'$lib/tableComponent.svelte.js'`.

In the class, keep `attrs()`, `props()`, `applyHook` and `injectState`
exactly as they are, and add:

```ts
import { createSubscriber } from 'svelte/reactivity'

// Rune-side mirrors of the hook maps. `$state.raw` because the values are
// replaced wholesale, never mutated in place.
#hookAttrs = $state.raw<Record<string, Record<string, unknown>>>({})
#hookProps = $state.raw<Record<string, Record<string, unknown>>>({})
#hookVersion = $state(0)
#subscribe = createSubscriber((update) => {
    // Subscribe to every currently-applied hook store; re-run when the set changes.
    const stops: (() => void)[] = []
    for (const [name, store] of Object.entries(this.attrsForName)) {
        stops.push(store.subscribe((value) => { this.#hookAttrs = { ...this.#hookAttrs, [name]: value }; update() }))
    }
    for (const [name, store] of Object.entries(this.propsForName)) {
        stops.push(store.subscribe((value) => { this.#hookProps = { ...this.#hookProps, [name]: value }; update() }))
    }
    return () => stops.forEach((stop) => stop())
})

/**
 * Runes-native view of the same values the `attrs()` / `props()` stores
 * expose. Read inside a template or `$derived` to track updates.
 */
readonly current = {
    attrs: (): Record<string, unknown> => {
        this.#subscribe()
        void this.#hookVersion
        let merged: Record<string, unknown> = {}
        for (const value of Object.values(this.#hookAttrs)) merged = mergeAttributes(merged, value)
        return this.decorateAttrs(finalizeAttributes(merged))
    },
    props: (): PluginTablePropSet<Plugins>[Key] => {
        this.#subscribe()
        void this.#hookVersion
        return { ...this.#hookProps } as PluginTablePropSet<Plugins>[Key]
    }
}

/** Fixed attributes a subclass adds on top of the plugin-merged ones. */
protected decorateAttrs(base: Record<string, unknown>): Record<string, unknown> {
    return base
}
```

Then make `current.attrs` and `current.props` **getters**, not methods:
implement `current` as an object with `get attrs()` / `get props()` so the
template reads `cell.current.attrs` (the shape shown above is for clarity of
the body; the final code uses getters). In `applyHook`, after storing the
hook, increment `#hookVersion` so an active subscriber re-subscribes to the
new set (`createSubscriber` tears down and restarts when its dependencies
change because `#hookVersion` is read inside `current.*`). If the report's
Decision 3 chose mechanism A instead, replace the mirror with
`$derived(fromStore(this.attrs()).current)` per the report and delete the
subscriber code — but only if the plan was amended to say so.

**Verify**: `pnpm check` → 0 errors; `pnpm exec vitest run src/lib/tableComponent.current.test.ts`
→ 4 pass; `pnpm exec vitest run src/lib/tableComponent.applyHook.test.ts` → 5 pass.

### Step 4: Route subclass attribute decoration through `decorateAttrs`

In each of the four subclasses, replace the `derived(super.attrs(), …)`
override with an override of `decorateAttrs` returning `{ ...base, role: 'columnheader', colspan: this.colspan }`
(and the `role: 'cell'` / `role: 'row'` equivalents), and change the base
`attrs()` store to apply `this.decorateAttrs(...)` inside its own `derived`
so the store path produces the same result it does today. Delete the four
subclass `attrs()` overrides. `props()` stays untouched.

**Verify**: `pnpm test:only` → all pass (the plugin tests such as
`addResizedColumns.test.ts:78` "thead.tr.th attrs derive width styles" and
the SSR tests cover the store path; `tableComponent.current.test.ts` covers
the rune path). `grep -rn "derived(super.attrs()" src/lib` → no matches.

### Step 5: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test` (with coverage
thresholds), `pnpm package` (confirm `ls dist/tableComponent.svelte.js`),
`pnpm exec playwright test --project=chromium --project=mobile-chrome`.

**Verify**: all exit 0; `src/lib/index.exports.test.ts` snapshot unchanged.

## Test plan

- Red-first: Step 2's host fails to typecheck until `current` exists; that
  is the reproduction for "no runes-native surface".
- New: `tableComponent.current.test.ts` (4 cases) + host; 1 extra case in `applyHook.test.ts`.
- Pattern: `src/lib/fromStore.test.ts`, `src/lib/FromStoreHost.test.svelte`.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test` exits 0 with thresholds; `tableComponent.current.test.ts` has 4 passing tests
- [ ] `test -f src/lib/tableComponent.svelte.ts && ! test -f src/lib/tableComponent.ts`
- [ ] `grep -rn "tableComponent.js'" src/` → no matches; `grep -rn "derived(super.attrs()" src/lib` → no matches
- [ ] `pnpm package` exits 0 and `dist/tableComponent.svelte.js` exists
- [ ] `pnpm exec playwright test --project=chromium` exits 0
- [ ] `git status --porcelain` lists only in-scope files
- [ ] README status row for 002 updated

## STOP conditions

- The spike report is missing, or its recommendation differs from this plan and the plan was not amended.
- Step 2's red state does not appear (means `current` already exists somewhere).
- The Step 2 fourth assertion (late `applyHook`) cannot be made to pass with `createSubscriber` — report; do not fall back to a global `$effect`.
- `src/lib/index.exports.test.ts` snapshot changes.
- Any e2e failure in the kitchen sink.

## Maintenance notes

- `attrs()` / `props()` and `current.*` are two views of the same hook maps;
  a change to merging rules must land in `decorateAttrs` or the base merge,
  never in one path only. The `current` tests and the store tests together
  are the tripwire.
- Plan 003 switches the perf-bench renderer and kitchen sink to `current`;
  plan 004 adds the view-model-level equivalent.
- v7 removal path: delete `attrs()`/`props()`, `derivedKeys`, and `Subscribe`.
