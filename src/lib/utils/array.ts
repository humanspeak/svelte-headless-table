import { getCounter } from './counter.js'

/**
 * Returns an array containing only the distinct elements from the input array.
 * Preserves the order of first occurrence.
 *
 * @template T - The type of elements in the array.
 * @param items - The input array potentially containing duplicates.
 * @returns A new array with duplicate elements removed.
 * @example
 * ```typescript
 * getDistinct([1, 2, 2, 3, 1]) // Returns [1, 2, 3]
 * ```
 */
export const getDistinct = <T>(items: T[]): T[] => {
    return Array.from(getCounter(items).keys())
}

/**
 * Returns an array containing only the elements that appear more than once
 * in the input array.
 *
 * @template T - The type of elements in the array.
 * @param items - The input array to check for duplicates.
 * @returns A new array containing only duplicate elements.
 * @example
 * ```typescript
 * getDuplicates([1, 2, 2, 3, 1]) // Returns [1, 2]
 * ```
 */
export const getDuplicates = <T>(items: T[]): T[] => {
    return Array.from(getCounter(items).entries())
        .filter(([, count]) => count !== 1)
        .map(([key]) => key)
}
