// Test helper (plan 002): observe reactivity from plain `*.test.ts` files,
// where runes cannot be written.
import { flushSync } from 'svelte'

/**
 * Runs `fn` as an `$effect` inside a new `$effect.root`, flushes it once and
 * returns the root's cleanup. `fn` re-runs (on the next flush) whenever rune
 * state it read changes, which is how tests observe reactivity that v6 tests
 * observed with `store.subscribe`.
 *
 * Only observe here: build view models and plugins outside `fn`. A view model
 * built inside a root that is destroyed before the view model is dropped goes
 * inert (Svelte warns `derived_inert`).
 *
 * @param fn - The effect body.
 * @returns A function that destroys the root.
 */
export const withEffectRoot = (fn: () => void): (() => void) => {
    const cleanup = $effect.root(() => {
        $effect(() => {
            fn()
        })
    })
    flushSync()
    return cleanup
}
