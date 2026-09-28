# Guard log — 006 release-v7

## Checkpoint 1 — 2026-09-28 17:47 — ON TRACK

058e399 · final close-out after the Opus executor's single run

- Scope: `src/lib/publicApi.types.test.ts` (new), `src/lib/currentProps.types.test.ts` (all 15 plugins), `RELEASE-NOTES-v7.md`, `RELEASE-CHECKLIST.md`. `package.json`, `README.md`, `.github/` untouched. Plan/README/guard files untouched.
- Drift: the plan's baseline (`61c36ee`) predates main's own 6.5.4 bump; against the branch base `1d80d78` only the memory-cache removal touches `package.json`. Plan text defect, not a STOP; the "version still 6.5.3" criterion reads 6.5.4.
- Reproduced at 058e399: `pnpm check` `707 FILES 0 ERRORS` / `205 FILES 0 ERRORS`; `pnpm test` `54 passed, 621 passed`; `pnpm package` publint `All good!`; pack audit — 0 `.test.` entries, 18 `.svelte.js` modules, `$state.raw` present, 0 `svelte/store` imports in `dist/`.
- Fresh consumer (`/tmp/v7-consumer`, `sv create` skeleton + tarball): the guard's first rebuild failed on the scaffold's missing `src/lib/assets/favicon.svg` (template asset, not the library); with the asset restored: build exit 0, preview renders 6 `role="cell"`, consumer `pnpm check` 0 errors. The packaged `.svelte.js` runes modules compile in an external SvelteKit app.
- Trunk: `✖ 14 new lint issues`, all `no-unsafe-*` on `$props()` destructures in six `src/routes/_*.svelte` files; plain `npx eslint src/routes` clean; Prettier clean. Same signature as the sandbox quirk seen on `main` (`Render.svelte`) in earlier sessions where the PR's CI Trunk job passed. Recorded in the release checklist as an item to watch on the PR; not a code defect.
- Read: `publicApi.types.test.ts` asserts the two accepted data forms, a `@ts-expect-error` on a store, box/RecordSet types and a hand-written plugin's typed props; the executor proved the assertions bite by breaking them (2 check errors) and restoring.
- Action: verdict PASS; README row set to DONE with the consumer output; batch retired.
