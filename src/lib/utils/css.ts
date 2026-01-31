/**
 * Converts a CSS style object into an inline style string.
 *
 * @param style - An object containing CSS property-value pairs.
 * @returns A semicolon-separated string of CSS declarations.
 * @example
 * ```typescript
 * stringifyCss({ color: 'red', fontSize: '14px' })
 * // Returns 'color:red;fontSize:14px'
 * ```
 */
export const stringifyCss = (style: Record<string, unknown>): string => {
    return Object.entries(style)
        .map(([name, value]) => `${name}:${value}`)
        .join(';')
}
