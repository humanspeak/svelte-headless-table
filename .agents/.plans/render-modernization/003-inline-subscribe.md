# Plan 003: Make `Subscribe` and `derivedKeys` first-party and drop `@humanspeak/svelte-subscribe`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/render-modernization/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- src/lib/index.ts src/lib/tableComponent.ts src/lib/utils/store.ts src/lib/subscribe package.json`
> Plans 001/002 may have touched `src/lib/index.ts` line 2 and `package.json`
> (that is expected). Anything else must match the "Current state" excerpts;
> on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (the component is legacy-mode Svelte by necessity — see Step 3)
- **Depends on**: 001-component-test-harness.md (can run in parallel with 002)
- **Category**: migration / tech-debt
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

`<Subscribe>` is the component every consumer writes around every row and
cell (`<Subscribe attrs={cell.attrs()} let:attrs>`), and `derivedKeys` is
what `TableComponent.props()` uses to merge plugin props. Both come from
`@humanspeak/svelte-subscribe` v5.0.0 — a 12-line package whose `.svelte`
file is Svelte-4 syntax (`$$restProps`, `<slot {...$values} />`) and which
declares `svelte: ^4.2.7` as a dependency. Owning these two files in-repo
removes one more external release cycle, lets the docs stop saying
"based on svelte-subscribe", and puts the legacy-mode component under this
repo's own tests so it can be deprecated on purpose later rather than by
accident. The Svelte-5-native replacement for consumers is the built-in
`fromStore` (documented in plan 006), so no new API is needed here.

## Current state

- `src/lib/index.ts:3` — `export { Subscribe } from '@humanspeak/svelte-subscribe'`
- `src/lib/tableComponent.ts:10` — `import { derivedKeys } from '@humanspeak/svelte-subscribe'`,
  used at line 71:

```ts
    props(): Readable<PluginTablePropSet<Plugins>[Key]> {
        return derivedKeys(this.propsForName) as Readable<PluginTablePropSet<Plugins>[Key]>
    }
```

- The dependency's entire runtime (`node_modules/@humanspeak/svelte-subscribe/dist/`):

```js
// derivedKeys.js
import { derived } from 'svelte/store';
export const derivedKeys = (storeMap) => {
    // Freeze the order of entries.
    const entries = Object.entries(storeMap);
    const keys = entries.map(([key]) => key);
    return derived(entries.map(([, store]) => store), ($stores) => {
        return Object.fromEntries($stores.map((store, idx) => [keys[idx], store]));
    });
};
```

```svelte
<!-- Subscribe.svelte -->
<script>import { derivedKeys } from "./derivedKeys.js";
const values = derivedKeys($$restProps);
</script>

<slot {...$values} />
```

  and its types (`derivedKeys.d.ts`):

```ts
export type ReadOrWritable<T> = Readable<T> | Writable<T>
export type WritableKeys<T> = { [K in keyof T]: T[K] extends undefined ? Writable<T[K] | undefined> : Writable<T[K]> }
export type ReadableKeys<T> = { [K in keyof T]: T[K] extends undefined ? Readable<T[K] | undefined> : Readable<T[K]> }
export type ReadOrWritableKeys<T> = { [K in keyof T]: T[K] extends undefined ? ReadOrWritable<T[K] | undefined> : ReadOrWritable<T[K]> }
export declare const derivedKeys: <S extends ReadOrWritableKeys<unknown>>(storeMap: S) => DerivedKeys<S>
export type DerivedKeys<S extends ReadOrWritableKeys<unknown>> = S extends ReadOrWritableKeys<infer T> ? Readable<T> : never
```

- `src/lib/utils/store.ts` already defines `ReadOrWritable<T>` (line 4) and
  `isReadable`; add `derivedKeys` there, do not duplicate `ReadOrWritable`.
- The existing test of `props()` merging is `src/lib/tableComponent.applyHook.test.ts`:

```ts
it('hooks plugin props', () => {
    const component = new TestComponent({ id: '0' })
    const $props = { a: 1, b: 2 }
    const props = readable($props)
    component.applyHook('test', { props })
    const actual = component.props()
    expect(get(actual)).toStrictEqual({ test: $props })
})
```

- Consumers use `let:` slot props on `Subscribe` from **runes-mode** parents
  today — `src/routes/kitchen-sink/+page.svelte` uses `$state`/`$effect` and
  also `<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>`
  (lines 412–492). This works because the child is a legacy-mode component.
  **The first-party `Subscribe.svelte` must therefore stay legacy-mode**
  (no runes, `$$restProps`, `<slot>`), otherwise every consumer template breaks.
- Svelte version installed: 5.56.10. `svelte-package` copies `.svelte`
  sources as-is, so consumers compile the component themselves — same as today.

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

- `src/lib/utils/store.ts` (add `derivedKeys` + its key types)
- `src/lib/utils/store.derivedKeys.test.ts` (create)
- `src/lib/subscribe/Subscribe.svelte` (create)
- `src/lib/subscribe/Subscribe.test.ts` (create)
- `src/lib/subscribe/SubscribeHost.test.svelte` (create — test host that uses `let:`)
- `src/lib/tableComponent.ts` (import line only)
- `src/lib/index.ts` (line 3 only)
- `package.json` (remove `@humanspeak/svelte-subscribe`), `pnpm-lock.yaml`

**Out of scope**:

- Changing `Subscribe` to a runes/snippet API — that is a breaking change for
  every consumer; the modern path is `fromStore` and is a docs matter (plan 006).
- `src/lib/render/**` — plan 002.
- `@humanspeak/svelte-keyed` — plan 004.
- `docs/**`, `README.md` — plan 006.

## Git workflow

- Branch: `chore/inline-subscribe`
- Commit: `refactor(subscribe): inline Subscribe and derivedKeys, drop svelte-subscribe`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Characterization tests (green against the current dependency)

Create `src/lib/utils/store.derivedKeys.test.ts` importing `derivedKeys`
from `'@humanspeak/svelte-subscribe'` **for now** (Step 4 re-points it):

- merges `{ a: readable(1), b: writable('x') }` into `{ a: 1, b: 'x' }`;
- updates when a member store changes (`b.set('y')` → `get(result).b === 'y'`);
- key order follows insertion order (`Object.keys(get(result))` deep-equals `['a', 'b']`);
- empty map → `{}`.

Create `src/lib/subscribe/SubscribeHost.test.svelte` — a runes-mode host
that mirrors real consumer usage:

```svelte
<script lang="ts">
    import type { Readable } from 'svelte/store'
    import { Subscribe } from '../index.js'
    const { attrs, props }: { attrs: Readable<Record<string, unknown>>; props: Readable<{ n: number }> } = $props()
</script>

<Subscribe {attrs} let:attrs {props} let:props>
    <div data-testid="out" {...attrs}>{props.n}</div>
</Subscribe>
```

Create `src/lib/subscribe/Subscribe.test.ts`:

- render `SubscribeHost` with `attrs = writable({ role: 'cell' })`,
  `props = writable({ n: 1 })` → element `out` has attribute `role="cell"` and text `1`;
- `props.set({ n: 2 })` + `await tick()` → text `2`;
- `attrs.set({ role: 'gridcell' })` + `await tick()` → attribute updated.

**Verify**: `pnpm exec vitest run src/lib/utils/store.derivedKeys.test.ts src/lib/subscribe/Subscribe.test.ts`
→ 7 tests pass with the dependency still installed.

### Step 2: Add `derivedKeys` to `src/lib/utils/store.ts`

Port the function and the four key types verbatim (with JSDoc in the
file's existing style). Reuse the file's existing `ReadOrWritable<T>`.

**Verify**: `pnpm check` → 0 errors.

### Step 3: Create `src/lib/subscribe/Subscribe.svelte` (legacy mode, on purpose)

```svelte
<!--
    Subscribe: exposes each store prop as a slot prop of the same name.
    Deliberately written in Svelte legacy mode (`$$restProps` + `<slot>`)
    because consumers rely on `let:` slot props, which only work against a
    legacy-mode child. Svelte 5 consumers who prefer runes can use
    `fromStore` from 'svelte/store' instead of this component.
-->
<script lang="ts">
    import { derivedKeys } from '$lib/utils/store.js'

    const values = derivedKeys($$restProps)
</script>

<slot {...$values} />
```

If `trunk check` (eslint-plugin-svelte) flags the `<slot>` or
`$$restProps`, suppress with `<!-- trunk-ignore(eslint/svelte/<rule>) -->`
per `CLAUDE.md`; do not rewrite the component in runes.

If `svelte-check` types `$$restProps` too loosely for `derivedKeys`'s
generic, cast at the call site (`derivedKeys($$restProps as Record<string, Readable<unknown>>)`).

**Verify**: `pnpm check` → 0 errors and, critically, **no**
`slot_element_deprecated` or `legacy` warnings for this file (legacy-mode
files do not emit them; if you see one, the file accidentally became
runes-mode — remove whatever rune crept in).

### Step 4: Re-point imports, remove the dependency

- `src/lib/index.ts` line 3 → `export { default as Subscribe } from '$lib/subscribe/Subscribe.svelte'`
- `src/lib/tableComponent.ts` line 10 → `import { derivedKeys } from '$lib/utils/store.js'`
- `src/lib/utils/store.derivedKeys.test.ts` → import from `'./store.js'`
- `pnpm remove @humanspeak/svelte-subscribe`

**Verify**: `grep -rn "svelte-subscribe" src/ package.json` → no matches;
the Step 1 tests still pass; `pnpm check` → 0 errors.

### Step 5: Full gate

`trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`, `pnpm package`, `pnpm test:e2e`.

**Verify**: all exit 0. The e2e suite is the real consumer test for
`let:` slot props from runes parents (kitchen-sink).

## Test plan

- No red-first test: behaviour-preserving migration; Step 1 characterizes
  the dependency and must stay green.
- New: `store.derivedKeys.test.ts` (4 cases), `Subscribe.test.ts` (3 cases).
- Pattern: `src/lib/utils/store.arraySetStore.test.ts`; `src/lib/render/Render.test.ts` from plan 001/002.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; 7 new tests pass
- [ ] `grep -rn "svelte-subscribe" src/ package.json` → no matches
- [ ] `ls dist/subscribe/Subscribe.svelte` exists after `pnpm package`
- [ ] `pnpm test:e2e` exits 0
- [ ] `git status --porcelain` lists only in-scope files
- [ ] README status row for 003 updated

## STOP conditions

- Excerpts don't match the live code.
- The `let:` host test fails against the current dependency (understanding of slot-prop behaviour is wrong).
- `svelte-check` or the Svelte compiler errors on `let:` against the
  first-party component (e.g. `let_directive_invalid_placement`) — that
  means the component is not legacy-mode; report rather than switching
  consumers to snippets.
- Removing the dependency breaks something under `docs/` at install time.

## Maintenance notes

- This is now the **only** legacy-mode `.svelte` file in `src/lib`. Any
  future "migrate everything to runes" pass must skip it or accept the
  consumer-facing break.
- Reviewer focus: the header comment explaining why the file is legacy
  mode must survive review; without it, the next contributor "modernises"
  it and breaks every consumer template.
- Deferred: a runes/snippet successor (`{#snippet children({ attrs, props })}`)
  was considered and rejected for now — `fromStore` gives consumers a
  cleaner native idiom with zero library API (plan 006 documents it).
