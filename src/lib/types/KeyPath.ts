/**
 * Generates a union of all valid dot-notation key paths for an object type.
 * Useful for type-safe property access with nested objects.
 *
 * @template T - The object type to extract paths from.
 * @template D - Maximum depth to traverse (default 3 to avoid infinite recursion).
 * @example
 * ```typescript
 * type Person = { name: string; address: { city: string } }
 * type Paths = KeyPath<Person> // 'name' | 'address' | 'address.city'
 * ```
 */
export type KeyPath<T, D extends number = 3> = KeyPath_<T, D, []>

/**
 * Internal recursive helper for KeyPath.
 * @internal
 */
type KeyPath_<T, D extends number, S extends unknown[]> = D extends S['length']
    ? never
    : T extends object
      ? {
            [K in keyof T]-?: K extends string
                ? `${K}` | Join<K, KeyPath_<T[K], D, [never, ...S]>>
                : K extends number
                  ? `[${K}]` | Join<`[${K}]`, KeyPath_<T[K], D, [never, ...S]>>
                  : never
        }[keyof T]
      : ''

/**
 * Internal helper for joining path segments with dots.
 * @internal
 */
type Join<K, P> = K extends string | number
    ? P extends string | number
        ? P extends `[${string}`
            ? `${K}${P}`
            : `${K}${'' extends P ? '' : '.'}${P}`
        : never
    : never
