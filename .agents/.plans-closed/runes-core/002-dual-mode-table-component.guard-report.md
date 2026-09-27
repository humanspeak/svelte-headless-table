# Guard report — 002 dual-mode-table-component

**Recommendation: PASS** — `current.attrs/props` lands as the spike specified, store surface byte-compatible, every criterion reproduced.
**Reviewed at** c557fe5 · 2026-09-27 04:44 · **Plan planned at** e5fbb85 (amended after the spike; drift check empty)
**Integrated** — no PR mid-batch; one PR at batch close.

## Done criteria

| Criterion                                                                  | Result | Evidence                                                                               |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                                       | met    | `COMPLETED 692 FILES 0 ERRORS`                                                         |
| `pnpm test` exits 0 with thresholds; current 4/4 and SSR test pass         | met    | 55 files / 600 tests; listed ✓                                                         |
| `trunk check --no-fix src/lib/tableComponent.svelte.ts` → no parsing error | met    | no new issues on `src/lib` + `eslint.config.mjs`                                       |
| Rename in place; no old import path; no `derived(super.attrs()`            | met    | greps                                                                                  |
| `pnpm package` exits 0 and `dist/tableComponent.svelte.js` exists          | met    | publint All good; file present                                                         |
| Playwright chromium exits 0                                                | met    | 36 passed / 2 skipped (+ mobile-chrome)                                                |
| Only in-scope files modified                                               | met    | 12 paths, all listed in Scope (incl. amended `eslint.config.mjs` and the spike header) |
| README status row for 002 updated                                          | met    | by guard                                                                               |

## Spirit

The plan's purpose was a runes-native read path for cell/row attrs and props that consumers can adopt without anything changing for those who don't. That is what landed: `cell.current.attrs` / `cell.current.props` with proven reactivity (including hooks applied after first read), proven SSR, and the store API left alone. The `decorateAttrs` refactor removes the duplicated role/colspan logic so the two views cannot drift. The eslint change is the enabling piece for every later `.svelte.ts` file.

## Scope & conduct

- In-scope only? yes.
- STOP conditions respected? yes — none fired; the `$`-prefix rename and the `attrs()` return type were judged (correctly) as not STOP-worthy and disclosed.
- Plan amendments during execution: none (pre-flight amendment on 2026-09-27 only).

## Residual risk / follow-ups

- Four trunk findings remain in the throwaway spike file until plan 003 deletes it; the snapshot commit bypassed the hook for that reason only.
- `current.attrs` is typed `Record<string, unknown>` while `attrs()` keeps the per-key attribute types; tightening `current.attrs` to `AttributesForKey<…>[Key]` is a small follow-up plan 004 can pick up.
