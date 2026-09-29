# Plan 001: A view model built outside a render computes each derivation once per server read pass

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/ssr-derivation-cost/README.md`) — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 411e6d4..HEAD -- src/lib/createViewModel.svelte.ts src/lib/reactivity.svelte.ts src/lib/plugins/ package.json`
> This plan is scheduled for a release **after** 7.0, so these files will
> have changed (at minimum the review fixes in
> `.agents/.plans/v7-review-fixes/`). Compare every "Current state" excerpt
> against the live code and re-locate line numbers before proceeding; if an
> excerpt's _shape_ no longer matches (not just its line number), treat it
> as a STOP condition.

## Status

- **Priority**: P2 (performance; planned for 7.1, not a 7.0 blocker)
- **Effort**: M
- **Risk**: MED (a wrong cache key serves stale rows on the server)
- **Depends on**: none; land after 7.0 is published
- **Category**: perf
- **Planned at**: commit `411e6d4`, 2026-09-29

## Why this matters

On the server, Svelte memoises a `$derived` only when it is created
_during a render_. A `$derived` created outside one — at the top level of a
`.svelte.ts` module or in a SvelteKit `load` function, both of which the v7
docs recommend — is a plain function: every read recomputes it. The view
model is a chain of deriveds, so one server render of a table whose view
model was built outside the component rebuilds the body rows, re-applies
every plugin's `deriveRows`, re-injects state and re-applies hooks for each
read of `vm.current.headerRows`, `vm.current.rows`, `vm.current.pageRows`,
`pageCount.current`, `allPageRowsSelected.current`, and so on. Anything read
per row that touches the rows getter makes the render quadratic. It also
produces _new row objects_ on every read, so per-row caches keyed by row
identity (`WeakMap`s in `addExpandedRows` / `addSelectedRows`, the
once-per-row hook set in `createViewModel`) never hit.

v6 had a comparable cost profile (an unsubscribed `derived` store recomputes
on every `get`), so this is not a regression; it is the largest remaining
server-side cost and the one place where v7's guidance ("build the view
model anywhere") has a hidden price. Browsers are unaffected.

## Current state

- Svelte's server runtime, `node_modules/svelte/src/internal/server/index.js`
  lines 495–511 (Svelte 5.57.1):

    ```js
    export function derived(fn) {
        // deriveds created during render are memoized,
        // deriveds created outside (e.g. SvelteKit `page` stuff) are not
        const get_value = ssr_context === null ? fn : once(fn)
        /* ... */
    }
    ```

    `$state` on the server is a plain variable; there is no dependency graph
    and nothing signals "a dependency changed".

- `src/lib/createViewModel.svelte.ts` — the chain (line numbers at `411e6d4`):
    - 306–312: `measure(name, fn)` increments `derivationCalls[name]` and
      accumulates `derivationTimings[name]` around each derivation body. These
      counters are public as `vm._debug.derivationCalls`.
    - 316: `const originalRows = $derived(getBodyRows(data(), flatColumns, { rowDataId }))`
    - 366–392: `finalizedTableAttrs`, `finalizedTableHeadAttrs`, `finalizedTableBodyAttrs` (`$derived.by`)
    - 407: `visibleColumns`; 411: `columnedRows`; 446: `injectedRows` (injects
      state and applies `tbody` hooks once per row object via a `WeakSet`);
      479: `injectedPageRows`; 483: `headerRows`.
    - `tableState` members and `vm.current.*` are getters over these.
- `src/lib/reactivity.svelte.ts` — `box` (`$state.raw`), `derivedBox`
  (lines 75–82, `const value = $derived.by(fn)`), `keyedBox`, `RecordSet`,
  `ArraySet`. Every plugin's writable state goes through these (plus the
  `SortKeys` class in `src/lib/plugins/addSortBy.svelte.ts` and
  `createPageState` in `addPagination.svelte.ts`).
- Every plugin's `deriveRows` / `derivePageRows` / `deriveFlatColumns`
  creates its own `$derived.by` (e.g. `addSortBy.svelte.ts`,
  `addExpandedRows.svelte.ts` lines 143–151) and many expose `derivedBox`
  state (`pageCount`, `someRowsSelected`, `exportedData`, ...).
- Existing server tests: `src/lib/createViewModel.current.ssr.test.ts`,
  `src/lib/ssr.test.ts`, `src/lib/tableComponent.ssr.test.ts`. They start
  with `// @vitest-environment node`, call `render(Host)` from
  `svelte/server`, and build the view model **inside** the host component
  (`src/lib/VmCurrentHost.test.svelte`) — the memoised path. No test covers
  a view model built outside the render.
- Docs that recommend the unmemoised path:
  `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` lines 409–434
  ("Outside components": "works in a component `<script>`, at the top level
  of a `.svelte.ts` module, in a SvelteKit `load` function and in a test")
  and `docs/src/routes/docs/api/create-view-model/+page.svx`.
- `package.json` has **no runtime dependencies**. `esm-env` (what Svelte
  itself uses for `BROWSER` / `DEV`) is not installed at the top level.
- Conventions: 4-space indent, no semicolons, single quotes;
  `// trunk-ignore(eslint/<rule>)`; runes only in `.svelte` / `.svelte.ts`;
  library files are checked with `tsconfig.lib.json`; never write `$state`
  while a derivation evaluates.

## Commands you will need

| Purpose              | Command                                                                                                                     | Expected on success                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Focused tests        | `npx -y pnpm@11.24.0 exec vitest run src/lib/ssr src/lib/createViewModel`                                                   | all pass                           |
| Full tests           | `npx -y pnpm@11.24.0 test`                                                                                                  | all pass, coverage thresholds met  |
| Typecheck            | `npx -y pnpm@11.24.0 check`                                                                                                 | two `COMPLETED ... 0 ERRORS` lines |
| Package              | `npx -y pnpm@11.24.0 package`                                                                                               | publint `All good!`                |
| Bench (client guard) | `npx -y pnpm@11.24.0 dev --port 8417` then `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench` | JSON aggregates                    |
| Lint / format        | `trunk check --no-progress` / `trunk fmt`                                                                                   | `✔ No issues`                      |

`pnpm` is not on PATH; always use `npx -y pnpm@11.24.0`.

## Scope

**In scope**:

- `src/lib/reactivity.svelte.ts` (the memo primitive and the write epoch)
- `src/lib/createViewModel.svelte.ts`
- `src/lib/plugins/add*.svelte.ts` (only to route their deriveds through
  the primitive)
- `src/lib/createViewModel.ssr-outside.test.ts` + a host `*.test.svelte` (create)
- `package.json` / `pnpm-lock.yaml` only if `esm-env` is added (Step 2)
- `docs/src/routes/docs/api/create-view-model/+page.svx` and the "Outside
  components" section of the migration guide (one paragraph each)

**Out of scope** (do NOT touch):

- Client behaviour. On the browser every derivation stays a real
  `$derived`; the bench must not move (Step 5).
- The plugin contract types in `src/lib/types/TablePlugin.ts`.
- `src/routes/**`.

## Git workflow

- Branch: `perf/ssr-derivation-memo` off fresh `origin/main` (after 7.0):
  `git fetch origin main && git switch -c perf/ssr-derivation-memo origin/main && git branch --unset-upstream`.
- Conventional commits, e.g. `perf(ssr): memoise view-model derivations built outside a render`.
  End messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR unless the operator instructed it. The PR needs
  the `minor` label (no API change) — never `major`.

## Steps

### Step 1: Write a failing test that reproduces the cost

Create `src/lib/SsrOutsideHost.test.svelte`: a table template (copy the
markup of `VmCurrentHost.test.svelte`) that receives an already-built view
model as a prop `vm` and renders `vm.current.tableAttrs`,
`vm.current.headerRows`, `vm.current.pageRows`, plus
`vm.pluginStates.page.pageCount.current` and, per row,
`row.current.props.select.selected`.

Create `src/lib/createViewModel.ssr-outside.test.ts`:

```ts
// @vitest-environment node
import { render } from 'svelte/server'
import { createTable } from './createTable.js'
import { addPagination } from './plugins/addPagination.svelte.js'
import { addSelectedRows } from './plugins/addSelectedRows.svelte.js'
import { addSortBy } from './plugins/addSortBy.svelte.js'
import SsrOutsideHost from './SsrOutsideHost.test.svelte'

const items = Array.from({ length: 200 }, (_, i) => ({ name: `n${i}`, age: i }))

it('computes each derivation once for one server render of an outside-built view model', () => {
    const table = createTable(items, {
        sort: addSortBy({ initialSortKeys: [{ id: 'age', order: 'desc' }] }),
        select: addSelectedRows(),
        page: addPagination({ initialPageSize: 50 })
    })
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns) // outside any render
    vm._debug.resetCounters()

    const { body } = render(SsrOutsideHost, { props: { vm } })

    expect(body).toContain('n199')
    expect(vm._debug.derivationCalls.columnedRows).toBe(1)
    expect(vm._debug.derivationCalls.injectedRows).toBe(1)
    expect(vm._debug.derivationCalls.injectedPageRows).toBe(1)
    expect(vm._debug.derivationCalls.headerRows).toBe(1)
})

it('returns the same row objects on consecutive reads', () => {
    /* build as above */
    expect(vm.current.rows[0]).toBe(vm.current.rows[0])
})
```

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/createViewModel.ssr-outside`
→ both tests FAIL: the first with `expected <N> to be 1` where N > 1
(record the actual N for each counter in your report — that is the
baseline), the second with two different row objects.
If the first test passes, the premise is wrong for the installed Svelte:
STOP and report the Svelte version and the counters.

### Step 2: A memo primitive that is `$derived` on the client and an epoch cache on the server

In `src/lib/reactivity.svelte.ts`:

1. Add a module-level write epoch, bumped by every write the library
   controls:

    ```ts
    let writeEpoch = 0
    /** @internal Bumped whenever library-owned state is written. */
    export const bumpWriteEpoch = (): void => {
        writeEpoch += 1
    }
    ```

    Call it in the setters of `box`, `keyedBox`, `RecordSet` (every mutating
    method and the `current` setter), `ArraySet`, and in `SortKeys` /
    `createPageState` wherever they write outside those primitives.
    A counter write is not rune state and is safe anywhere.

2. Add the primitive:

    ```ts
    /**
     * A derivation that is a real `$derived` in the browser and, on the
     * server, is cached until library state is written or `inputs()` returns
     * a different identity. Svelte does not memoise a `$derived` created
     * outside a server render; this does.
     */
    export const memo = <T>(fn: Getter<T>, inputs?: Getter<unknown>): Getter<T> => {
        if (BROWSER) {
            const value = $derived.by(fn)
            return () => value
        }
        let cachedEpoch = -1
        let cachedInputs: unknown
        let cached: T
        return () => {
            const nextInputs = inputs?.()
            if (cachedEpoch !== writeEpoch || nextInputs !== cachedInputs) {
                cached = fn()
                cachedEpoch = writeEpoch
                cachedInputs = nextInputs
            }
            return cached
        }
    }
    ```

    `BROWSER` comes from `esm-env`: add it to `dependencies`
    (`npx -y pnpm@11.24.0 add esm-env`). It is the package Svelte itself uses
    and resolves at build time through export conditions, so the server
    branch is dead code in a client bundle. Do **not** use
    `typeof window === 'undefined'`: jsdom tests and edge runtimes make it
    unreliable.

3. `derivedBox(fn)` becomes `const get = memo(fn); return { get current() { return get() } }`.

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors;
`npx -y pnpm@11.24.0 exec vitest run src/lib/reactivity` → all pass.

### Step 3: Route the view model's chain through `memo`

In `src/lib/createViewModel.svelte.ts` replace each `$derived` /
`$derived.by` in the chain (lines 316, 366–392, 407, 411, 446, 479, 483)
with `memo(...)` and read it by calling the returned getter. Only
`originalRows` depends on caller-owned state: pass the data identity as its
input key, `memo(() => getBodyRows(data(), flatColumns, { rowDataId }), data)`,
so a new array from the caller recomputes even though no library state was
written. Downstream derivations read `originalRows()` and are invalidated
through the same key: give each of them `inputs: data` as well (the key is
one function call; correctness beats saving it).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib` → all pass
(the client suites run under jsdom with the browser build, so they exercise
the `$derived` branch; the node-environment SSR suites exercise the cache).

### Step 4: Route the plugins' deriveds through `memo`

In every `src/lib/plugins/add*.svelte.ts`, replace `$derived.by(fn)` created
in `deriveRows` / `derivePageRows` / `deriveFlatColumns` / table-attrs
functions and in plugin state with `memo(fn)` (no `inputs`: they read the
upstream getter, which carries the data key, and library state, which
carries the epoch). `addVirtualScroll.svelte.ts` keeps its `$effect.root`
inside the action untouched.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/createViewModel.ssr-outside`
→ both Step 1 tests PASS; `grep -rn "\$derived" src/lib --include=*.svelte.ts | grep -v reactivity.svelte.ts | grep -v "\.test\."`
→ no output (every derivation goes through the primitive).

### Step 5: Prove the client did not move

Run the perf bench on this branch and on `origin/main` (worktree on port
8418, as `scripts/perf-v6-vs-v7.md` describes), three alternating
30-iteration runs each. Compare `rows-10k` first paint, `sort-cycle-1k`
interaction and `kitchen-sink-1k` first paint.

**Verify**: each ratio (branch / main, median of run medians) is within
0.95–1.05. Record the table in your report.

### Step 6: Docs

Add one paragraph to `docs/src/routes/docs/api/create-view-model/+page.svx`
and to the guide's "Outside components" section: a view model built outside
a render is cached on the server until plugin state is written or the data
getter returns a different array; mutate-in-place of the data array on the
server is not detected (replace the array).

**Verify**: `npx -y pnpm@11.24.0 package && (cd docs && npx -y pnpm@11.24.0 check)` → 0 errors; `git checkout -- docs/src/lib/demo-loaders.ts`.

### Step 7: Full gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line | tail -3
```

## Test plan

- Red first: the two Step 1 tests fail on the baseline (counters > 1; row
  identity differs) and pass after Step 4.
- Add to `createViewModel.ssr-outside.test.ts`:
    - a write invalidates: after `vm.pluginStates.sort.sortKeys.current = []`
      the first row changes and `injectedRows` is computed once more;
    - new data invalidates: with `createTable(() => current)` and
      `current = otherArray`, the next read reflects the new rows;
    - two view models do not share a cache (build two, write one's state,
      assert the other's rows are still correct — the epoch is global, so the
      other recomputes; assert correctness, not call counts).
- Pattern: `src/lib/createViewModel.current.ssr.test.ts`.

## Done criteria

- [ ] Step 1 tests exist and pass; baseline counters recorded in the report
- [ ] `grep -rn "\$derived" src/lib --include=*.svelte.ts | grep -v reactivity.svelte.ts | grep -v "\.test\."` → no output
- [ ] `npx -y pnpm@11.24.0 check` exits 0; `npx -y pnpm@11.24.0 test` exits 0 with thresholds met
- [ ] Client bench ratios within 0.95–1.05 on the three headline scenarios
- [ ] Playwright Chromium + Firefox: same counts as `main`
- [ ] `package.json` `dependencies` contains only `esm-env`
- [ ] `.agents/.plans/ssr-derivation-cost/README.md` status row updated

## STOP conditions

- The Step 1 counters are already 1 on the installed Svelte (the server
  runtime changed; this plan may be unnecessary).
- Wrapping a `$derived.by` inside `memo` changes any client test's result,
  or the client bench moves by more than 5 %.
- A plugin writes library state _during_ a derivation on the server (the
  epoch would then invalidate the cache it is filling and loop). Report the
  plugin and line.
- The maintainer's zero-runtime-dependency stance rules out `esm-env`:
  report, and propose the alternative of resolving `BROWSER` through
  `package.json` `exports` conditions in a local `env.js` / `env.browser.js`
  pair instead.

## Maintenance notes

- The epoch is global to the module, so any write in any table invalidates
  every server cache. That is deliberate: correctness first, and a server
  render performs few writes. If profiling shows cross-table invalidation
  matters, scope the epoch per `createTable` call.
- In-place mutation of the caller's data array is invisible to the server
  cache. Document it (Step 6); do not try to detect it.
- Reviewers: check every new write path in `reactivity.svelte.ts` bumps the
  epoch — a missed bump is a stale server render, the one failure mode this
  design can produce.
