/**
 * Type guard that checks if a value is not null.
 *
 * @template T - The non-null type.
 * @param value - The value to check.
 * @returns True if the value is not null.
 * @example
 * ```typescript
 * const items = [1, null, 2, null, 3]
 * const filtered = items.filter(nonNull) // Type: number[]
 * ```
 */
export const nonNull = <T>(value: T | null): value is T => value !== null

/**
 * Type guard that checks if a value is not undefined.
 *
 * @template T - The defined type.
 * @param value - The value to check.
 * @returns True if the value is not undefined.
 * @example
 * ```typescript
 * const items = [1, undefined, 2, undefined, 3]
 * const filtered = items.filter(nonUndefined) // Type: number[]
 * ```
 */
export const nonUndefined = <T>(value: T | undefined): value is T => value !== undefined

/**
 * Type guard that checks if a value is neither null nor undefined.
 *
 * @template T - The non-nullish type.
 * @param value - The value to check.
 * @returns True if the value is not null and not undefined.
 * @example
 * ```typescript
 * const items = [1, null, 2, undefined, 3]
 * const filtered = items.filter(nonNullish) // Type: number[]
 * ```
 */
export const nonNullish = <T>(value: T | null | undefined): value is T => value != null

/**
 * Type guard that checks if a value is a number.
 *
 * @param value - The value to check.
 * @returns True if the value is of type number.
 * @example
 * ```typescript
 * isNumber(42) // Returns true
 * isNumber('42') // Returns false
 * ```
 */
export const isNumber = (value: unknown): value is number => typeof value === 'number'
