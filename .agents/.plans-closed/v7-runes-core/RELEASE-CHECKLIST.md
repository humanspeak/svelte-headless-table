# v7 release checklist

The publish workflow (`.github/workflows/npm-publish.yml`) bumps **patch** unless the merged PR carries `major` or `minor`. Without the `major` label, this branch ships as 6.5.5 and breaks every consumer on `^6`. Work through this list in order.

## Before merging

1. **PR title**: `feat!: v7 — runes-native core and plugin contract`. The GitHub Release body is the PR title and URL, so paste `RELEASE-NOTES-v7.md` (this folder) into the PR body.
2. **Labels**: `major`, `breaking-change`, `enhancement`, `javascript`, `documentation`. **Never** `minor` or `skip-publish`: `minor` would publish 6.6.0, and `skip-publish` would skip the release.
3. **Confirm the label** immediately before merging:

    ```sh
    gh pr view <n> --json labels --jq '.labels[].name'
    ```

    `major` must be in the output. If it is missing, add it (`gh pr edit <n> --add-label major`) and re-run the command before you merge.

4. `package.json` `version` is untouched on the branch (it reads `6.5.4`, the value on `main`). The workflow runs `pnpm version major` on merge. Do not bump it by hand.

## After the workflow publishes

1. `npm view @humanspeak/svelte-headless-table version` prints `7.0.0`.
2. `npm view @humanspeak/svelte-headless-table dist-tags` shows `latest: 7.0.0`. The workflow publishes without `--tag`, so there is no 6.x `latest` to restore.
3. The GitHub Release `v7.0.0` exists and is marked latest. If its body is only the PR title and URL, edit it to include the release notes.
4. The docs site picks up the new version badge on its next build. Check <https://table.svelte.page/docs/guides/migrating-to-v7> is live.

## Post-release

1. Close this plan batch. Move `.agents/.plans/v7-runes-core` to `.agents/.plans-closed/v7-runes-core` and add a CLOSED banner listing the executing commits, following the convention in `.agents/.plans-closed/runes-core/README.md`.
2. Open one GitHub issue per item under "Deferred" below.

## Deferred

Follow-ups that are deliberately not part of 7.0:

- **Remove the store-argument guard in `createTable` (v8).** `createTable`, `addPagination`'s `serverItemCount` and `addVirtualScroll`'s `totalRows` / `dataOffset` throw a pointer to the migration guide when given a Svelte store. Once v6 callers have had a major version to migrate, drop the runtime check. The types already reject stores.
- **Pass the column `Value` type through plugin column options.** Per-column callbacks such as `addGroupBy`'s `getGroupOn(value)` see `value: any` today (`GroupByColumnOptions`' `Value` defaults to `any`) instead of the column's accessor type.
- **Make the virtual scroll `HeightManager` a `$state` class.** It is a plain class today, and every derivation that reads row heights also reads a `heightsVersion` box to be invalidated.
- **Cache per-row selection state, if profiling warrants.** `addSelectedRows`' per-row views recompute `allSubRowsSelected` / `someSubRowsSelected` from the whole `selectedDataIds` record.
- **Docs `pnpm test:unit` lacks `test.globals`.** This is pre-existing on `main`: `docs/vite.config.ts` has no `test.globals`, so the docs unit script fails. CI runs only the docs Playwright suite, so nothing is red in CI.
- **Trunk flags `$props()` destructures in `src/routes/_*.svelte`.** Trunk's local sandbox reports `no-unsafe-assignment` on these dev-route files while plain `npx eslint src/routes` is clean. Watch the PR's Trunk job. If CI reproduces it, fix the types or suppress with `trunk-ignore`.
