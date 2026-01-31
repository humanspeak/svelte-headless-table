/**
 * Creates a Map that counts the occurrences of each element in an array.
 *
 * @template T - The type of elements in the array.
 * @param items - The array of items to count.
 * @returns A Map where keys are unique items and values are their occurrence counts.
 * @example
 * ```typescript
 * getCounter(['a', 'b', 'a', 'c', 'a'])
 * // Returns Map { 'a' => 3, 'b' => 1, 'c' => 1 }
 * ```
 */
export const getCounter = <T>(items: T[]): Map<T, number> => {
    const result = new Map<T, number>()
    items.forEach((item) => {
        result.set(item, (result.get(item) ?? 0) + 1)
    })
    return result
}
