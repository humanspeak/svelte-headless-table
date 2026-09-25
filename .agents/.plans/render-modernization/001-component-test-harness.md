# Plan 001: Add a jsdom component-test harness so `.svelte` files can be unit-tested

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/render-modernization/README.md`) — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dbb5a2..HEAD -- vite.config.ts package.json src/lib/render src/lib/test`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `7dbb5a2`, 2026-09-25

## Why this matters

The library ships three `.svelte`-level behaviours (`Render`, `Subscribe`,
and the component-with-props rendering behind `createRender`) but has
**zero** component tests: the vitest config runs in Node with no DOM, and
every one of the 40 unit-test files exercises plain TypeScript. The
follow-on plans in this batch replace externally-maintained Svelte
components (`@humanspeak/svelte-render`, `@humanspeak/svelte-subscribe`)
with first-party code, and they need a harness that can mount a component,
assert on DOM, and observe store-driven updates. This plan adds that
harness, modelled exactly on the sibling repo `@humanspeak/svelte-markdown`,
and proves it with one smoke test against the *current* dependency so later
plans have a green characterization baseline to preserve.

## Current state

- `vite.config.ts` — vitest config; Node environment, no setup file, no
  testing-library vite plugin. Current test block:

```ts
// vite.config.ts:1-30 (abridged)
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit()],
    build: { sourcemap: false },
    server: { port: 8417 },
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        coverage: {
            reporter: ['lcov'],
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [ 'src/**/*.test.ts', 'docs/**', 'docs-new/**', 'docs-old/**',
                       'scripts/**', '.trunk/**', '.svelte-kit/**', 'tests/**', 'src/routes/**' ]
        },
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    }
})
```

- `package.json` — devDependencies already include
  `@testing-library/svelte@^5.4.2` and `@testing-library/jest-dom@^7.0.1`
  but **not** `jsdom`. There is no `vitest.setup.ts`.
- `tsconfig.json` has `"types": ["vitest/globals"]` — `it`/`expect` are
  globals in tests (existing tests use them without importing).
- Existing unit-test convention: files named
  `src/lib/<module>.<Feature>.test.ts` (e.g.
  `src/lib/bodyCells.DataBodyCell.render.test.ts`), top-level `it(...)`
  blocks, 4-space indent, no semicolons, single quotes (Prettier via Trunk).
- Public render API is currently re-exported from a dependency:

```ts
// src/lib/index.ts:1-3
// components
export * from '@humanspeak/svelte-render'
export { Subscribe } from '@humanspeak/svelte-subscribe'
```

- The exemplar this plan copies is the sibling repo
  `~/GitHub/svelte-markdown/vite.config.ts` (same maintainer, same
  toolchain). Its relevant lines:

```ts
import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit(), svelteTesting()],
    resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
    test: {
        include: ['src/lib/**/*.test.ts'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['vitest.setup.ts'],
        ...
```

  and its `vitest.setup.ts` begins with `import '@testing-library/jest-dom/vitest'`.
- Publishing: `package.json` `files` is `["dist", "!dist/**/*.test.*", "!dist/**/*.spec.*"]`,
  so any fixture named `*.test.svelte` is automatically excluded from the npm tarball.
- Coding-style rule from `CLAUDE.md`: suppress lint with
  `// trunk-ignore(eslint/rule-name)`, never `eslint-disable`.

## Commands you will need

| Purpose        | Command                                             | Expected on success                        |
| -------------- | --------------------------------------------------- | ------------------------------------------ |
| Install        | `pnpm install`                                      | exit 0                                     |
| Typecheck      | `pnpm check`                                        | exit 0, `svelte-check found 0 errors`      |
| One test file  | `pnpm exec vitest run <path>`                       | all tests in file pass                     |
| All unit tests | `pnpm test:only`                                    | exit 0, all files pass                     |
| Lint           | `trunk check`                                       | no failures on changed files               |
| Format         | `trunk fmt`                                         | exit 0 or 1 (1 = it reformatted something) |
| Package        | `pnpm package`                                      | exit 0, publint reports no errors          |

Trunk (`.trunk/trunk.yaml`) is the lint/format authority. Do not run
`pnpm lint` / `prettier` / `eslint` directly.

## Scope

**In scope** (the only files you should modify or create):

- `vite.config.ts`
- `vitest.setup.ts` (create)
- `package.json` (add `jsdom` devDependency only)
- `pnpm-lock.yaml` (regenerated by `pnpm install`)
- `src/lib/render/Render.smoke.test.ts` (create)
- `src/lib/render/Fixture.test.svelte` (create — a trivial fixture component)

**Out of scope** (do NOT touch):

- `src/lib/index.ts` and everything else under `src/lib/` — the dependency
  swap happens in plans 002–004.
- `playwright.config.ts`, `tests/**` — e2e is unchanged.
- `docs/**` — separate package, separate plan (006).
- Coverage thresholds — do not add any; that is a separate decision.

## Git workflow

- Branch: `test/component-test-harness`
- Conventional commits with scope, matching `git log` (e.g.
  `feat(virtual-scroll): expose an unbuffered viewport range`). Suggested:
  `test: add jsdom + testing-library harness for component tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `jsdom` as a devDependency

Run `pnpm add -D jsdom`. This is the only `package.json` change.

**Verify**: `grep -n '"jsdom"' package.json` → one line under
`devDependencies`; `pnpm install` → exit 0.

### Step 2: Create `vitest.setup.ts`

Create `vitest.setup.ts` at the repo root with exactly:

```ts
import '@testing-library/jest-dom/vitest'
```

(Do not copy svelte-markdown's fake-timer / IntersectionObserver mocks —
this repo's existing tests rely on real timers; see STOP conditions.)

**Verify**: `test -f vitest.setup.ts && echo ok` → `ok`

### Step 3: Update `vite.config.ts`

Make these changes and nothing else:

1. `import { svelteTesting } from '@testing-library/svelte/vite'`
2. `plugins: [sveltekit(), svelteTesting()]`
3. Add `resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,`
   at the top level of the config object (needed so Svelte resolves its
   client runtime under vitest — without it, `fromStore`/mount use the
   server build and components render nothing).
4. In `test`: add `environment: 'jsdom'` and `setupFiles: ['vitest.setup.ts']`.

Keep `include`, `globals`, `coverage`, and `reporters` unchanged.

**Verify**: `pnpm test:only` → exit 0, every existing test file still
passes (40 files). If `createViewModel.performance.test.ts` fails on
timing, see STOP conditions.

### Step 4: Add a fixture component and a smoke test against the current `Render`

Create `src/lib/render/Fixture.test.svelte`:

```svelte
<script lang="ts">
    const { label = 'fixture', count = 0 }: { label?: string; count?: number } = $props()
</script>

<span data-testid="fixture">{label}:{count}</span>
```

Create `src/lib/render/Render.smoke.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import { tick } from 'svelte'
import { Render, createRender } from '../index.js'
import Fixture from './Fixture.test.svelte'

it('renders a string config', () => {
    render(Render, { props: { of: 'hello' } })
    expect(screen.getByText('hello')).toBeInTheDocument()
})

it('renders a readable config and tracks updates', async () => {
    const store = writable('one')
    render(Render, { props: { of: store } })
    expect(screen.getByText('one')).toBeInTheDocument()
    store.set('two')
    await tick()
    expect(screen.getByText('two')).toBeInTheDocument()
})

it('renders a component config with static props', () => {
    render(Render, { props: { of: createRender(Fixture, { label: 'a', count: 1 }) } })
    expect(screen.getByTestId('fixture')).toHaveTextContent('a:1')
})

it('renders a component config with readable props and tracks updates', async () => {
    const props = writable({ label: 'a', count: 1 })
    render(Render, { props: { of: createRender(Fixture, props) } })
    expect(screen.getByTestId('fixture')).toHaveTextContent('a:1')
    props.set({ label: 'b', count: 2 })
    await tick()
    expect(screen.getByTestId('fixture')).toHaveTextContent('b:2')
})

it('renders slotted children', () => {
    render(Render, {
        props: { of: createRender(Fixture, { label: 'p' }).slot('child-text') }
    })
    // Fixture has no children outlet, so the child string is not rendered,
    // but the parent must still mount without error.
    expect(screen.getByTestId('fixture')).toHaveTextContent('p:0')
})
```

The point of this file is a **green** baseline: these behaviours
are what `@humanspeak/svelte-render` does today and what plan 002 must keep.

**Verify**: `pnpm exec vitest run src/lib/render/Render.smoke.test.ts` →
5 tests pass.

### Step 5: Full gate

Run, in order: `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test:only`,
`pnpm package`.

**Verify**: all exit 0 (trunk fmt may exit 1 if it reformatted; re-run
`trunk check` after). `pnpm package` → publint clean, and
`ls dist/render/` must NOT list `Fixture.test.svelte` or `Render.smoke.test.*`
in the *published* set — confirm with `npm pack --dry-run 2>&1 | grep -c 'test'`
→ `0`.

## Test plan

- No red-first test: this plan has no runtime behaviour change; it is
  tooling. The smoke test is a characterization baseline (green before and
  after) for plans 002/003.
- New tests: `src/lib/render/Render.smoke.test.ts` — 5 cases listed in Step 4.
- Pattern: `~/GitHub/svelte-markdown/src/lib/SvelteMarkdown.test.ts` for
  `render`/`screen` usage; this repo's `src/lib/bodyCells.DataBodyCell.render.test.ts`
  for file naming and style.
- Verification: `pnpm test:only` → all files pass including the new one.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `pnpm test:only` exits 0; `src/lib/render/Render.smoke.test.ts` exists with 5 passing tests
- [ ] `grep -n "environment: 'jsdom'" vite.config.ts` → 1 match
- [ ] `grep -n "svelteTesting()" vite.config.ts` → 1 match
- [ ] `npm pack --dry-run 2>&1 | grep -c 'test'` → `0`
- [ ] `git status --porcelain` lists only the in-scope files
- [ ] `.agents/.plans/render-modernization/README.md` status row for 001 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code in "Current state" doesn't match the live files.
- After switching to `jsdom`, any pre-existing test fails. The most likely
  candidate is `src/lib/createViewModel.performance.test.ts` (timing
  assertions). Do not loosen its thresholds — report which test failed and
  the numbers.
- `@testing-library/svelte/vite` cannot be resolved (would mean the
  installed version is older than expected — report `pnpm ls @testing-library/svelte`).
- The smoke test's readable-props case fails against the current dependency.
  That would mean the characterization is wrong, not the library; report it.

## Maintenance notes

- Every later plan in this batch writes component tests into this harness.
  If the vitest environment is ever changed back to Node, those tests break.
- Reviewer focus: the `resolve.conditions: ['browser']` line is easy to
  drop as "unnecessary" — it is load-bearing (see Step 3).
- Deferred: coverage thresholds like svelte-markdown's (`statements: 95` …)
  — worth adding once the render code is first-party, as a separate PR.
