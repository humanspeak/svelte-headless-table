/**
 * Compares two values or arrays for sorting purposes.
 * Returns a negative number if a < b, positive if a > b, and 0 if equal.
 *
 * @template T - The type of elements being compared (string or number).
 * @param a - The first value or array to compare.
 * @param b - The second value or array to compare.
 * @returns A number indicating the sort order.
 * @example
 * ```typescript
 * compare(1, 2) // Returns -1
 * compare('b', 'a') // Returns 1
 * compare([1, 2], [1, 3]) // Returns -1
 * ```
 */
export const compare = <T extends string | number>(a: T | T[], b: T | T[]): number => {
    if (Array.isArray(a) && Array.isArray(b)) {
        return compareArray(a, b)
    }
    if (typeof a === 'number' && typeof b === 'number') return a - b
    return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two arrays element by element for sorting purposes.
 * Comparison stops at the first non-equal element.
 *
 * @template T - The type of elements in the arrays (string or number).
 * @param a - The first array to compare.
 * @param b - The second array to compare.
 * @returns A number indicating the sort order based on the first differing element.
 * @example
 * ```typescript
 * compareArray([1, 2, 3], [1, 2, 4]) // Returns -1
 * compareArray(['a', 'b'], ['a', 'a']) // Returns 1
 * ```
 */
export const compareArray = <T extends string | number>(a: T[], b: T[]): number => {
    const minLength = Math.min(a.length, b.length)
    for (let i = 0; i < minLength; i++) {
        const order = compare(a[i], b[i])
        if (order !== 0) return order
    }
    return 0
}
