import { stringifyCss } from './css.js'

/**
 * Merges two attribute objects, with special handling for style properties.
 * Style objects are deeply merged rather than overwritten.
 *
 * @template T - The type of the first attributes object.
 * @template U - The type of the second attributes object.
 * @param a - The first attributes object.
 * @param b - The second attributes object (takes precedence for non-style properties).
 * @returns A merged attributes object with combined styles.
 * @example
 * ```typescript
 * mergeAttributes(
 *   { class: 'foo', style: { color: 'red' } },
 *   { class: 'bar', style: { fontSize: '14px' } }
 * )
 * // Returns { class: 'bar', style: { color: 'red', fontSize: '14px' } }
 * ```
 */
export const mergeAttributes = <
    T extends Record<string, unknown>,
    U extends Record<string, unknown>
>(
    a: T,
    b: U
): T & U => {
    if (a.style === undefined && b.style === undefined) {
        return { ...a, ...b }
    }
    return {
        ...a,
        ...b,
        style: {
            ...(typeof a.style === 'object' ? a.style : {}),
            ...(typeof b.style === 'object' ? b.style : {})
        }
    }
}

/**
 * Converts an attributes object's style property from an object to a CSS string.
 * This prepares attributes for use in DOM elements.
 *
 * @template T - The type of the attributes object.
 * @param attrs - The attributes object with a potential style object.
 * @returns A new attributes object with the style converted to a string.
 * @example
 * ```typescript
 * finalizeAttributes({ class: 'foo', style: { color: 'red' } })
 * // Returns { class: 'foo', style: 'color:red' }
 * ```
 */
export const finalizeAttributes = <T extends Record<string, unknown>>(
    attrs: T
): Record<string, unknown> => {
    if (attrs.style === undefined || typeof attrs.style !== 'object') {
        return attrs
    }
    return {
        ...attrs,
        style: stringifyCss(attrs.style as Record<string, unknown>)
    }
}
