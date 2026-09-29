// Test helper: deep `$state` for plain
// `*.test.ts` files, where runes cannot be written. `box` uses `$state.raw`,
// so it cannot model data mutated in place (lazy-loaded children).

/**
 * Wraps `initial` in deep `$state`. Mutating a nested field of `current`
 * (for example `current[0].children = [...]`) notifies readers of that field
 * without replacing the array, so rows derived from it keep their identity.
 *
 * @param initial - The initial value.
 * @returns An object whose `current` is the deep reactive proxy.
 */
export const deepState = <T>(initial: T): { readonly current: T } => {
    const value = $state(initial)
    return {
        get current() {
            return value
        }
    }
}
