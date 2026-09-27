# Guard log — 003 fixtures-on-current

## Checkpoint 1 — 2026-09-27 04:54 — PLAN AMENDED

(no snapshot) · executor stopped before Step 3 because `src/routes/test/runes-kitchen-sink/+page.svelte` imports from `runes-spike/` and was not in Scope; deleting one without the other would break the build. Correct call — the plan omitted a file the spike report itself said to delete together. Scope, Step 3 and Done criteria amended (commit on this branch); executor resumed. A first attempt at that amendment commit accidentally included the executor's staged renames; it was unwound with `reset --soft` and recommitted as the plan file alone before anything was pushed.

## Checkpoint 2 — 2026-09-27 04:54 — ON TRACK

815c91d · final close-out (base 5e5f174)

- Reproduced by guard at 815c91d: `Subscribe` grep on the kitchen sink and `_PerfTable.svelte` → none; `_PerfTableStore.svelte` present, both spike directories gone; `git diff --quiet HEAD~1 HEAD -- src/lib tests` → untouched; `pnpm check` 0 errors (4 pre-existing warnings); `pnpm test:only` 54 files / 590 tests (−1 file / −10 tests = the deleted spike test file); `trunk check` → no issues repo-wide (the four spike findings are gone, and the pre-commit hook ran normally on the snapshot); e2e chromium + mobile-chrome 36 passed / 2 skipped; perf page `rows-1k` → `domCells=400`, 0 page errors, on both the default (`current.*`) renderer and `?renderer=store`.
- Diff read: kitchen-sink `Subscribe` blocks replaced one-to-one (handlers, class directives, `use:` actions, filter/group/resize branches, ids all present); `_PerfTable.svelte` reads `current.attrs` for rows and cells and keeps `data-row-id`/`data-depth`; `+page.svelte` switch inverted so the store renderer is the opt-in control.
- Action: PASS; README row → DONE; plan 004 re-baselined to 815c91d.
