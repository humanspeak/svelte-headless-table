/**
 * Calculates the sum of an array of numbers.
 *
 * @param nums - The array of numbers to sum.
 * @returns The sum of all numbers in the array, or 0 for an empty array.
 * @example
 * ```typescript
 * sum([1, 2, 3, 4, 5]) // Returns 15
 * sum([]) // Returns 0
 * ```
 */
export const sum = (nums: number[]): number => nums.reduce((a, b) => a + b, 0)

/**
 * Calculates the arithmetic mean (average) of an array of numbers.
 *
 * @param nums - The array of numbers to average.
 * @returns The mean of all numbers, or 0 for an empty array.
 * @example
 * ```typescript
 * mean([1, 2, 3, 4, 5]) // Returns 3
 * mean([]) // Returns 0
 * ```
 */
export const mean = (nums: number[]): number => (nums.length === 0 ? 0 : sum(nums) / nums.length)
