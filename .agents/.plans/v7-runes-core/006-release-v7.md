# Plan 006: Freeze the v7 public surface and prepare the major release

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 61c36ee..HEAD -- package.json .github/workflows/npm-publish.yml src/lib/index.exports.test.ts`
> Only the `@humanspeak/memory-cache` removal (plan 003, if it happened)
> should have touched `package.json`. Anything else → compare before
> proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (a wrong label ships v7 as a patch)
- **Depends on**: 005-docs-and-migration-guide.md
- **Category**: migration (release)
- **Planned at**: commit `61c36ee`, 2026-09-28

## Why this matters

The publish workflow bumps **patch by default**: a PR merged to `main`
without the `major` label would ship the breaking v7 core as 6.5.4 and
break every consumer on `^6`. There is no CHANGELOG in the repo; the
GitHub Release body is the PR title and URL. This plan pins the public
surface with a snapshot test, writes the release notes the maintainer
pastes into the PR, and leaves an explicit checklist for the merge so the
label cannot be forgotten.

## Current state

- `package.json` line 3: `"version": "6.5.3"`; `exports` `.` and
  `./plugins` (both `types` + `svelte` + `default` → `dist/...`);
  `files: ["dist", "!dist/**/*.test.*", "!dist/**/*.spec.*"]`;
  `peerDependencies.svelte: "^5.30.0"`.
- `.github/workflows/npm-publish.yml`: on push to `main` touching
  `src/**` / `package.json` / lockfile, reads the merged PR's labels
  (`skip-publish`, `major`, `minor`; lines 80–87), then lines 471–501:

    ```sh
    elif [ "$HAS_MAJOR" = "true" ]; then BUMP_TYPE="major"
    elif [ "$HAS_MINOR" = "true" ]; then BUMP_TYPE="minor"
    else BUMP_TYPE="patch"
    ```

    `pnpm version "$BUMP_TYPE" --no-git-tag-version` (line 541), commit
    "Bump version to vX [skip ci]", tag, `gh release create --latest`,
    `pnpm publish --provenance --access public` (no `--tag`, so every release
    is `latest`). Pre-release versions are rejected by the validator and the
    cleanup regex (~line 618).

- `src/lib/index.exports.test.ts`: inline snapshots of
  `Object.keys(lib)` and `Object.keys(plugins)`; plan 002 updated the root
  list (no `Subscribe`; plus `box`, `derivedBox`, `keyedBox`, `RecordSet`,
  `ArraySet`).
- `src/lib/currentProps.types.test.ts`: type-level test that
  `current.props` never resolves to `any` across all 15 plugins.
- Repo labels include `major`, `minor`, `skip-publish`, `breaking-change`,
  `enhancement`, `javascript`, `documentation`.
- The PR for this branch is opened by the maintainer with the `/pr` skill
  (assignee `jaysin586`); executors do not push.

## Commands you will need

| Purpose        | Command                                              | Expected on success                     |
| -------------- | ---------------------------------------------------- | --------------------------------------- |
| Full unit gate | `npx -y pnpm@11.24.0 test`                           | all pass, thresholds met                |
| Typecheck      | `npx -y pnpm@11.24.0 check`                          | 0 errors                                |
| Lint           | `trunk check --no-progress`                          | `✔ No issues`                           |
| Package        | `npx -y pnpm@11.24.0 package`                        | publint `All good!`                     |
| Pack contents  | see Step 2 (`pnpm pack`, then `tar tzf` the tarball) | lists `package/dist/**` only            |
| Consumer check | see Step 3                                           | a fresh SvelteKit app renders the table |

## Scope

**In scope**:

- `src/lib/index.exports.test.ts` (snapshot), `src/lib/currentProps.types.test.ts` (extend), `src/lib/publicApi.types.test.ts` (create)
- `package.json`: `description` / `keywords` only if they mention stores; **not** `version` (the workflow bumps it)
- `.agents/.plans/v7-runes-core/RELEASE-NOTES-v7.md` (create) and `RELEASE-CHECKLIST.md` (create)
- `README.md` only if Step 3 finds a consumer-facing packaging fix

**Out of scope** (do NOT touch):

- `src/lib/**` implementation, `docs/**` content — defects found here go back to plans 002–005 as STOP reports.
- `.github/workflows/npm-publish.yml` — do not change the release mechanics in the same PR as the major.

## Git workflow

- Branch: `feat/v7-runes-core`; commits `test: pin the v7 public surface`, `chore(release): v7 notes and checklist`. End messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push, tag, bump the version, or open a PR.

## Steps

### Step 1: Pin the public surface

- Update the two inline snapshots in `src/lib/index.exports.test.ts` to
  the final v7 lists (run the test, inspect the diff, accept only
  intentional entries; `Subscribe`, `createSortKeysStore`, `keyedProp`,
  `recordSetStore`, `arraySetStore`, `derivedKeys` must be absent).
- Create `src/lib/publicApi.types.test.ts` (compile-time assertions with
  `expectTypeOf`, modelled on `currentProps.types.test.ts`):
  `createTable` accepts an array and a getter, and rejects a `Readable` at the type level (`// @ts-expect-error`); `vm.current.pageRows`
  is `BodyRow[]`; `pluginStates.page.pageIndex` is `Box<number>`;
  `pluginStates.sort.sortKeys.current` is `SortKey[]`;
  `pluginStates.select.selectedDataIds` is `RecordSet<string>`;
  a hand-written plugin typed `TablePlugin<Item, {}, {}, NewTablePropSet<{ 'tbody.tr': { x: number } }>>`
  with `deriveRows: (rows) => rows` and a hook returning `{ props: () => ({ x: 1 }) }`
  is accepted by `createTable(data, { custom })`.
- Extend `currentProps.types.test.ts` if plan 002/003 changed any prop-set
  shape (e.g. `ColumnFiltersPropSet['thead.tr.th'].render` now takes boxes).

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors; `npx -y pnpm@11.24.0 exec vitest run src/lib/index.exports src/lib/publicApi src/lib/currentProps` → all pass.

### Step 2: Package audit

```sh
npx -y pnpm@11.24.0 package
npx -y pnpm@11.24.0 pack --pack-destination /tmp
tar tzf /tmp/humanspeak-svelte-headless-table-*.tgz | sort > /tmp/pack.txt
grep -c "\.test\." /tmp/pack.txt            # expect 0
grep -c "svelte\.js$" /tmp/pack.txt         # expect > 0 (runes modules)
grep -l '\$state(' dist/*.svelte.js dist/plugins/*.svelte.js | wc -l   # expect > 0
grep -rn "svelte/store" dist/ --include=*.js  # expect no output
```

**Verify**: the four expectations hold.

### Step 3: Fresh-consumer smoke test

In `/tmp` create a minimal SvelteKit app and install the tarball:

```sh
cd /tmp && rm -rf v7-consumer && npx -y sv@latest create v7-consumer --template minimal --types ts --no-add-ons --no-install
cd v7-consumer && npx -y pnpm@11.24.0 install && npx -y pnpm@11.24.0 add /tmp/humanspeak-svelte-headless-table-*.tgz
```

Write `src/routes/+page.svelte` with the README example (array data,
`addSortBy`, `vm.current.*`, `cell.current.props.sort.toggle`). Then
`npx -y pnpm@11.24.0 build` and `npx -y pnpm@11.24.0 preview --port 4190 &`,
`curl -s http://localhost:4190 | grep -c 'role="cell"'` → 6. Also run
`npx -y pnpm@11.24.0 check` in the consumer (types resolve, no `any`).

This is the check that `svelte-package`'s `.svelte.js` runes modules are
compiled by a consumer's vite-plugin-svelte. If the build fails with an
uncompiled `$state` error, that is a packaging defect: STOP.

**Verify**: cell count 6; consumer `check` 0 errors.

### Step 4: Release notes and checklist

Create `.agents/.plans/v7-runes-core/RELEASE-NOTES-v7.md` — the text the
maintainer pastes into the PR body / GitHub Release:

- Headline and the perf table from `scripts/perf-v6-vs-v7.md`.
- "Breaking changes" list mirroring the migration guide's table, each with
  the one-line before/after.
- "Removed" list (Subscribe, store API, createRender events, invalidate,
  createSortKeysStore, transformFlatColumnsFn, Readable render values).
- "Migration": link to `/docs/guides/migrating-to-v7`.
- "For plugin authors": the three rules and a link to plugins/overview.

Create `RELEASE-CHECKLIST.md`:

1. PR title `feat!: v7 — runes-native core and plugin contract`.
2. Labels: `major`, `breaking-change`, `enhancement`, `javascript`, `documentation`. **Never** `minor` or `skip-publish`.
3. Confirm with `gh pr view <n> --json labels` before merging that `major` is present.
4. After the workflow publishes: `npm view @humanspeak/svelte-headless-table version` → `7.0.0`; the docs deploy picks up the new version badge on its next build.
5. Post-release: close `.agents/.plans/v7-runes-core` (move to `.plans-closed/`), open the follow-up issues listed under "Deferred".

"Deferred" section: remove the store-argument guard in `createTable` (v8); pass the column
`Value` type through plugin column options; `HeightManager` as `$state`
class; per-row selection state caching if profiling warrants.

**Verify**: both files exist; `trunk check --no-progress` clean (markdownlint runs on them).

### Step 5: Final gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
(cd docs && npx -y pnpm@11.24.0 build) && git checkout -- docs/src/lib/demo-loaders.ts
PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line | tail -3
git status --short   # clean
git log --oneline 61c36ee..HEAD | wc -l   # the batch's commits
```

## Test plan

- No red-first test (release tooling). New tests: the public-surface
  snapshot update and `publicApi.types.test.ts` (type-level).
- The consumer smoke test in Step 3 is manual but its commands and expected
  outputs are listed; record the verbatim output in the README status row.

## Done criteria

- [ ] `src/lib/index.exports.test.ts` snapshots match the v7 surface and pass
- [ ] `src/lib/publicApi.types.test.ts` exists and compiles under `pnpm check`
- [ ] Pack audit: no test files, `.svelte.js` modules present with `$state(`, no `svelte/store` import anywhere in `dist/`
- [ ] Fresh SvelteKit consumer builds, previews 6 cells, type-checks clean
- [ ] `RELEASE-NOTES-v7.md` and `RELEASE-CHECKLIST.md` exist
- [ ] Full gate (lint, both type checks, unit, package, docs build, Chromium + Firefox e2e) green
- [ ] `package.json` `version` is still `6.5.3` (the workflow bumps it on merge)
- [ ] README status row updated with the consumer smoke output

## STOP conditions

Stop and report back (do not improvise) if:

- The consumer app fails to build or renders zero cells (packaging of the
  runes modules is wrong; do not patch `dist` by hand).
- The exports snapshot contains a store-era name that plans 002–003 were
  supposed to remove.
- Any gate in Step 5 fails — the release is not ready; report which.

## Maintenance notes

- The maintainer opens the PR with `/pr` and must apply the `major` label
  before merge; the checklist exists because the workflow's default is
  `patch`.
- After release, the `.agents/.plans/v7-runes-core` folder is closed with
  the same convention as `.plans-closed/runes-core/README.md` (a CLOSED
  banner with the executing commits).
