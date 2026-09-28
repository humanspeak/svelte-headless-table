# Plan 005: Document v7 — migration guide, API and plugin pages, demos, README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Read first**: the v7 library as landed by plans 002–004: `src/lib/index.ts`,
> `src/lib/reactivity.svelte.ts`, `src/lib/types/TablePlugin.ts`,
> `src/lib/createViewModel.svelte.ts` (the `ViewModelCurrent` / `TableState`
> types), two plugins (`addSortBy.svelte.ts`, `addPagination.svelte.ts`) and
> `src/routes/kitchen-sink/+page.svelte` (the idiomatic v7 template). The
> docs must describe what shipped, not what this plan assumed.
>
> **Drift check (run first)**: `git diff --stat 61c36ee..HEAD -- docs/ README.md`
> Nothing under `docs/` or `README.md` should have changed on this branch
> before this plan. If it has, compare against "Current state" before
> proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW (docs only; the docs build and smoke tests are the gate)
- **Depends on**: 004-routes-bench-e2e.md
- **Category**: docs
- **Planned at**: commit `61c36ee`, 2026-09-28

## Why this matters

v7 removes the store API, `<Subscribe>`, `createRender`'s event handlers
and the store-based plugin contract. Every consumer on 6.x has to change
their data source, their plugin-state reads and (if they never moved to
`current.*`) their templates. The maintainer asked for a conversion guide
as part of the rewrite. This plan writes that guide, updates every page
that still shows the store idiom, converts the 20 demo files that read
plugin state through `$store`, and re-points the README. The docs site is
built from `workspace:*`, so `pnpm build` in `docs/` is also the first real
consumer test of the packaged runes modules.

## Current state

- Docs site: SvelteKit + mdsvex + `@humanspeak/docs-kit` under `docs/`.
  Pages are `docs/src/routes/docs/<section>/<slug>/+page.svx` with
  frontmatter `title`, `description`, `sidebar_title`. Navigation is
  `docs/src/lib/docsNav.ts` (`docsSections`, items `{ title, href, icon }`;
  the Guides section is lines 126–138 and currently lists
  "Moving to current.*", "shadcn-svelte", "Migrating from 0.17.x"). The
  header version badge comes from the root `package.json` version at build
  time (`routes/docs/+layout.svelte` line 66).
- Generator: `docs/scripts/generate-plugin-props.ts` walks
  `src/lib/plugins/add[A-Z]*.ts` (skipping `.test.` and `.types.ts`) for
  exported `*PropSet` type aliases and writes
  `docs/src/lib/generated/plugin-props.json`; runs as `docs:props` and in
  `build`. **Plan 002 renamed the plugins to `add*.svelte.ts`, so the glob
  at line 29–31 no longer matches — the generator must be updated or every
  plugin page loses its prop tables.** `docs/src/lib/components/PluginProps.svelte`
  renders the JSON.
- Demos: 4 example demos under `docs/src/lib/examples/*/demos/*.svelte`,
  12 per-page `*Demo.svelte` under `routes/docs/**`, 7 `_shared` helpers.
  All 28 already render through `current.*`; **20 files (75 occurrences)
  read plugin state as `$store`** (`$sortKeys`, `$pageIndex`, `$filterValues`,
  `$isSelected`, ...), e.g. `add-pagination/SimplePaginationDemo.svelte`
  lines 52–74:

    ```svelte
    const { pageIndex, pageCount, pageSize, hasNextPage, hasPreviousPage } = pluginStates.page
    <button onclick={() => $pageIndex--} disabled={!$hasPreviousPage}>...
    <input type="number" min={1} bind:value={$pageSize} />
    ```

    and `kitchen-sink/demos/Default.svelte` (20 occurrences).

- Prose pages that still show store idioms (counts from 2026-09-28):
  `<Subscribe` in `guides/moving-to-current` (10 lines), `api/subscribe` (8),
  `getting-started/quick-start` (4, the "Using the store API instead"
  section lines 129–168); `.props()` in 15 plugin pages via the shared
  admonition sentence "Read `current.props` on table components, or
  subscribe to `.props()`"; `pluginStates.` store reads in 14 pages;
  `$pageRows` / `$headerRows` / `$tableAttrs` in `api/table-view-model`
  (headings `TableViewModel#tableAttrs: Readable<...>` etc., lines 55–113),
  `api/table-state` (`data: ReadOrWritable<Item[]>`), `api/create-table`,
  `plugins/overview` ("Defining plugins", line 39, shows `createTable(data, {...})`).
  `api/subscribe` documents a component that no longer exists.
- README.md: example at lines 65–120 uses `current.*` but `readable([...])`
  data (lines 66–72); line 37 lists "Manage state with Svelte stores"; line
  121 says the store API "is still supported".
- Docs tests: `docs/tests/quick-start.test.ts` (Playwright, run by
  `.github/workflows/docs-tests.yml` on `docs/**` and `src/lib/**` changes)
  asserts the quick-start demo renders through `current.*` and that the
  create-render page has no "based on svelte-render" text. `docs/` also has
  a vitest suite (`pnpm test:unit`).
- v7 API facts to document (verify each against the code before writing):
    - `createTable(data, plugins)` where `data` is `Item[]`, `() => Item[]`
      (reactive: pass `$state` through a getter). A Svelte store throws
      with a message pointing at the migration guide; there is no adapter.
    - `vm.current.{tableAttrs, tableHeadAttrs, tableBodyAttrs, visibleColumns, headerRows, originalRows, rows, pageRows}`;
      `vm.flatColumns`, `vm.pluginStates`, `vm._debug`. No store fields.
    - `row.current.attrs` / `.props`, `cell.current.attrs` / `.props`
      unchanged from 6.4.
    - Plugin state: `Box` (`.current` get/set), `ReadonlyBox` (`.current`
      get), `RecordSet` / `ArraySet` (`.current` + methods), exported from the
      root along with `box`, `derivedBox`, `keyedBox`.
    - Plugin contract: `deriveRows: (rows: () => Row[]) => () => Row[]`,
      hooks return `{ props?: () => Props, attrs?: () => Attrs }`,
      `tableState` members are getters; `transformFlatColumnsFn` removed.
    - Removed: `Subscribe`, `createRender(...).on()` / `eventHandlers`,
      `Readable` accepted by `RenderConfig` / `props` / `args` (use a getter),
      `addExpandedRows` / `addSelectedRows` `invalidate()`, `createSortKeysStore`
      (now `createSortKeys`), `createPageStore` if plan 002 renamed it (check).

## Commands you will need

| Purpose          | Command (run in `docs/` unless noted)                       | Expected on success                   |
| ---------------- | ----------------------------------------------------------- | ------------------------------------- |
| Install          | `npx -y pnpm@11.24.0 install --frozen-lockfile` (repo root) | exit 0                                |
| Package the lib  | `npx -y pnpm@11.24.0 package` (repo root)                   | publint `All good!`                   |
| Generate props   | `npx -y pnpm@11.24.0 docs:props`                            | `plugin-props: 8 prop sets → ...json` |
| Typecheck docs   | `npx -y pnpm@11.24.0 check`                                 | `COMPLETED ... 0 ERRORS`              |
| Build docs       | `npx -y pnpm@11.24.0 build`                                 | exit 0, `Favicon verified` line       |
| Docs unit tests  | `npx -y pnpm@11.24.0 test:unit -- --run`                    | all pass                              |
| Docs smoke (e2e) | `npx playwright test --reporter=line`                       | all pass                              |
| Dev server       | `npx -y pnpm@11.24.0 dev --port 8473`                       | site at `http://localhost:8473`       |
| Lint             | `trunk check --no-progress` (repo root)                     | `✔ No issues`                         |

After every docs build run `git checkout -- docs/src/lib/demo-loaders.ts`
from the repo root: the build regenerates that file with different
formatting and it must not be committed.

## Scope

**In scope**:

- `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` (create)
- `docs/src/lib/docsNav.ts` (add the guide; remove the Subscribe API entry)
- `docs/src/routes/docs/api/subscribe/` (delete), `api/table-view-model`, `api/table-state`, `api/create-table`, `api/create-view-model`, `api/render`, `api/create-render`, `api/header-cell`, `api/body-cell`, `api/body-row`, `api/header-row`
- `docs/src/routes/docs/getting-started/quick-start/+page.svx`, `overview/+page.svx`
- `docs/src/routes/docs/plugins/**` (`+page.svx` prose and every `*Demo.svelte`), `docs/src/routes/docs/guides/moving-to-current/+page.svx`, `guides/shadcn-svelte/+page.svx`, `guides/migrating-from-svelte-headless-table/+page.svx`
- `docs/src/lib/examples/**` (4 demos + 7 shared helpers)
- `docs/scripts/generate-plugin-props.ts`
- `docs/tests/quick-start.test.ts` (add assertions), `docs/src/lib/sitemap-manifest.json` if new pages need an entry (check how existing guide pages are listed)
- `README.md`

**Out of scope** (do NOT touch):

- `src/lib/**` — if a doc cannot be written because the API is missing or
  inconsistent, STOP and report; that is a plan 002/003 defect.
- `package.json` version, `CHANGELOG` — plan 006.
- `docs/package.json` dependencies.

## Git workflow

- Branch: `feat/v7-runes-core`; commits per area, e.g. `docs: v7 migration guide`, `docs(plugins): plugin state on .current`. End messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Fix the props generator

In `docs/scripts/generate-plugin-props.ts` change the file glob (lines
29–31) to match `add[A-Z]*.svelte.ts` while still skipping `.test.` files
and `addVirtualScroll.types.ts`. Run `docs:props`.

**Verify**: `npx -y pnpm@11.24.0 docs:props` → `plugin-props: 8 prop sets → docs/src/lib/generated/plugin-props.json` and `git diff --stat docs/src/lib/generated/` shows only expected type-string changes (e.g. `toggle: (event: Event) => void` unchanged).

### Step 2: Convert the demos

For each of the 20 files with `$store` plugin-state reads (find them with
`grep -rlE '\$[a-zA-Z]+' docs/src/lib/examples docs/src/routes/docs --include=*.svelte` and inspect), apply the v7 idiom:

- `$pageIndex` → `pageIndex.current`; `$pageIndex--` → `pageIndex.current -= 1`
- `bind:value={$pageSize}` → `bind:value={pageSize.current}` (Svelte 5
  allows binding to a getter/setter property of a plain object; verify it
  compiles — if not, use `value={pageSize.current}` + `oninput`)
- `$selectedDataIds` → `selectedDataIds.current`; `selectedDataIds.add(id)` unchanged
- `$isSelected` on `getRowState(row).isSelected` → `.current`; checkbox
  helpers (`_shared/SelectIndicator.svelte`, `add-selected-rows/SelectIndicator.svelte`) take a `Box<boolean>` prop named `isSelected` and use `checked={isSelected.current}` + `onchange`
- `_shared/ExpandIndicator.svelte`, `add-expanded-rows/ExpandIndicator.svelte`: `isExpanded: Box<boolean>` likewise
- `_shared/TextFilter.svelte`, `NumberRangeFilter.svelte`, `SelectFilter.svelte`: `filterValue: Box<...>`, `values` / `preFilteredValues: ReadonlyBox<unknown[]>`
- Data: demos that use `readable([...])` switch to a plain array or `() => items`

Do the four `docs/src/lib/examples/**/demos` files last and run
`docs:props`-independent `pnpm build` after them (they are compiled into
the demo manifest).

**Verify**: `npx -y pnpm@11.24.0 check` (in `docs/`) → 0 errors; `grep -rnE '\$(sortKeys|pageIndex|pageSize|pageCount|hasNextPage|hasPreviousPage|filterValues|filterValue|selectedDataIds|isSelected|isExpanded|expandedIds|groupByIds|hiddenColumnIds|columnIdOrder|columnWidths|depth)\b' docs/src` → no matches.

### Step 3: The migration guide

Create `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` with
frontmatter `title: Migrating to v7`, `description: Move a 6.x table to the
runes-native v7 API`, `sidebar_title: Migrating to v7`, the same
`getSeoContext()` block the other guides use, and these sections:

1. **What v7 is** — three sentences: runes-native core, `current.*` is the
   only surface, plugins are getter-based. Link to the perf comparison
   (`scripts/perf-v6-vs-v7.md` numbers, quoted as a small table).
2. **Before you start** — be on 6.4+ and on `current.*` in templates
   (link "Moving to current.*"); Svelte `^5.30`.
3. **Breaking changes at a glance** — a table: v6 → v7 for each of: data
   input; view-model stores; `Subscribe`; `cell.attrs()` / `props()`;
   plugin state reads/writes; `RecordSet`/`ArraySet` methods; per-row state
   (`getRowState`); `createRender` events; `Readable` render props;
   removed helpers (`createSortKeysStore`, `invalidate`); plugin-author
   contract.
4. **Step by step** — one subsection per row above with a before/after
   `svelte` or `ts` block. Use the pagination demo (Step 2) and the
   kitchen-sink route as the source of real code.
5. **Writing a v7 plugin** — a complete minimal plugin (`deriveRows` +
   a `thead.tr.th` hook) in a `.svelte.ts` file, followed by the three
   rules: no state writes during derivation; allocate handlers once per
   cell; expose pre-transform rows by capturing the upstream getter.
6. **Outside components** — `createViewModel` in a `load` function or a
   test: plain reads work; wrap in `$effect.root` only to observe changes.
7. **Checklist** — grep-able items (`grep -rn "svelte/store"`,
   `<Subscribe`, `.attrs()`, `$pluginStates`).

Add `{ title: 'Migrating to v7', href: '/docs/guides/migrating-to-v7', icon: Zap }`
as the **first** Guides item in `docsNav.ts`.

**Verify**: with the dev server up, `curl -s http://localhost:8473/docs/guides/migrating-to-v7 | grep -c "Breaking changes"` ≥ 1.

### Step 4: API pages

- Delete `docs/src/routes/docs/api/subscribe/` and its nav entry; add a
  redirect note to the migration guide in `api/table-view-model` ("`Subscribe`
  was removed in v7; see Migrating to v7").
- `api/table-view-model`: replace the `Readable<...>` headings (lines
  55–113) with `TableViewModel#current.tableAttrs: TableAttributes` etc.;
  document `flatColumns`, `pluginStates`, `_debug`. Remove `$pageRows`
  examples.
- `api/table-state`: `data: () => Item[]`, `rows: () => BodyRow[]`, ... with
  a label example `header: (cell, state) => state.pageRows().length`.
- `api/create-table`: the two accepted data forms with examples, and the
  v6 → v7 data conversion (`readable(items)` → `items`; `writable(items)` →
  `let items = $state(items)` + `() => items`; a store you cannot replace →
  `fromStore(store)` **in the consumer's own code**, then `() => handle.current`).
- `api/create-view-model`: `reuseKey` unchanged; note that the view model is
  built with `$derived` and should be created in component setup, a
  `.svelte.ts` module, or a `load` function (plain reads work anywhere).
- `api/render`, `api/create-render`: getter-based dynamic values; remove
  `.on()` / `eventHandlers`; snippet `args` may be a getter.
- `api/header-cell`, `body-cell`, `body-row`, `header-row`: remove `attrs()`
  / `props()` method sections; keep `current`.
- `getting-started/quick-start`: delete "Using the store API instead"
  (lines 129–168) and the fromStore mention; data as a plain array.
- `getting-started/overview`: remove any "Svelte stores" wording.
- `guides/moving-to-current`: keep the page (it is the 6.x path) but add a
  top admonition: "On v7 this migration is mandatory; the store API no
  longer exists — see Migrating to v7." Update its comparison table's last
  rows (`pluginStates` "unchanged" is no longer true on v7).
- `guides/shadcn-svelte` (7 `pluginStates.` reads) and
  `guides/migrating-from-svelte-headless-table` (2): update to `.current`.
- `plugins/overview`: rewrite "Defining plugins" for the v7 contract
  (getter chain, hooks with getters, `tableState` getters) with the minimal
  plugin from the migration guide; link there.
- Each plugin page: change the shared admonition sentence to "Read
  `current.props` on table components." (drop "or subscribe to
  `.props()`"); rewrite the **Plugin State** section to `.current` /
  method form (e.g. `sortKeys: Box<SortKey[]> & { toggleId, clearId }`,
  `pageIndex: Box<number>`, `selectedDataIds: RecordSet<string>`); document
  the removal of `invalidate()` on expanded/selected rows and of
  `createSortKeysStore`; virtual-scroll: `hasMore` / `totalRows` /
  `dataOffset` accept boxes or getters, `onRangeChange` unchanged.

**Verify**: `grep -rn "Subscribe\|\.attrs()\|\.props()\|ReadOrWritable\|Readable<" docs/src/routes/docs --include=*.svx` → matches only inside the v7 migration guide's "before" blocks and the `moving-to-current` guide (which documents 6.x). `npx -y pnpm@11.24.0 check` → 0 errors.

### Step 5: README

- Line 37: "Manage state with Svelte stores" → "Runes-native: plain reactive values, no stores".
- Example (lines 65–120): `const data = [...]` (drop the `readable` import) and `createTable(data)`.
- Line 121: replace the "store API is still supported" sentence with one
  line pointing to the migration guide.
- Add a short "Upgrading from 6.x" line under Installation linking to
  `https://table.svelte.page/docs/guides/migrating-to-v7`.

**Verify**: `grep -n "svelte/store\|Subscribe\|still supported" README.md` → no matches.

### Step 6: Docs smoke test additions and the full gate

Append to `docs/tests/quick-start.test.ts`:

- `migration guide is reachable and lists the breaking changes` — goto
  `/docs/guides/migrating-to-v7`, expect a heading matching
  `/Breaking changes/` and the text `createTable(() =>`.
- `pagination demo drives page index through .current` — goto
  `/docs/plugins/add-pagination`, click "Next page", expect the page
  counter text to change (read the exact labels from the demo).

Then, from the repo root: `npx -y pnpm@11.24.0 package`; in `docs/`:
`docs:props`, `check`, `build`, `test:unit -- --run`, `npx playwright test --reporter=line`;
then `git checkout -- docs/src/lib/demo-loaders.ts` and `trunk check --no-progress`.

## Test plan

- No red-first test: docs have no runtime behaviour to pin. The docs
  Playwright smoke suite (existing 2 tests + the 2 added in Step 6) and
  the docs build are the gates.
- The docs build compiling the demos against `workspace:*` `dist/` is the
  first external-consumer check of the packaged `.svelte.js` runes modules;
  a failure there is a packaging finding for plan 006, not a docs bug —
  report it.

## Done criteria

- [ ] `docs/src/routes/docs/guides/migrating-to-v7/+page.svx` exists with the seven sections and is first in the Guides nav
- [ ] `docs/src/routes/docs/api/subscribe/` is deleted and not in the nav
- [ ] `grep -rnE '\$(sortKeys|pageIndex|...)\b'` (the Step 2 pattern) over `docs/src` → no matches
- [ ] `grep -rn "Subscribe\|\.attrs()\|\.props()" docs/src/routes/docs --include=*.svx` → matches only in the two guides' "before"/6.x sections
- [ ] `grep -n "svelte/store\|Subscribe\|still supported" README.md` → no matches
- [ ] docs `pnpm check` 0 errors; `pnpm build` passes; `pnpm test:unit -- --run` passes; docs Playwright passes (4 tests)
- [ ] `docs/src/lib/generated/plugin-props.json` regenerated from the `.svelte.ts` plugins (8 prop sets)
- [ ] `git status` shows no change to `docs/src/lib/demo-loaders.ts`
- [ ] README status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any v7 API fact in "Current state" does not match the shipped code
  (e.g. `createSortKeys` has a different name, `pageSize` is not a box).
  Document what shipped only after the discrepancy is resolved.
- The docs build fails to compile a demo because the packaged library
  (`dist/*.svelte.js`) is rejected by the docs' Svelte compiler — that is a
  packaging problem for plan 006; report the exact error.
- `bind:value` on a box's `current` does not compile in the docs' Svelte
  version — report and use the explicit `oninput` form everywhere.

## Maintenance notes

- Keep `guides/moving-to-current` as the 6.x document; do not fold it into
  the v7 guide, because 6.x users read it before upgrading.
- `PluginProps.svelte` tables come from types; if a plugin's prop set
  changes in a later PR the page updates on build without edits.
- The migration guide's checklist greps are the same ones plan 006 runs
  against the docs site itself.
