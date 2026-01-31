/**
 * Interface for objects that can create a copy of themselves.
 *
 * @template T - The type of the cloned object.
 */
export interface Clonable<T> {
    /** Creates and returns a copy of the object. */
    clone(): T
}

/**
 * Type guard that checks if an object implements the Clonable interface.
 *
 * @template T - The expected type of the cloned object.
 * @param obj - The object to check.
 * @returns True if the object has a clone method.
 * @example
 * ```typescript
 * if (isClonable(obj)) {
 *   const copy = obj.clone()
 * }
 * ```
 */
export const isClonable = <T>(obj: unknown): obj is Clonable<T> => {
    return typeof (obj as Clonable<T>).clone === 'function'
}

/**
 * Create a new instance of a class instance with all properties shallow
 * copied. This is unsafe as it does not re-run the constructor. Therefore,
 * cloned instances will share a reference to the same property instances.
 * @param source The original instance object.
 * @param props Any additional properties to override.
 * @returns A new instance object with all properties shallow copied.
 */
export const unsafeClone = <T extends object>(source: T, props?: Partial<T>): T => {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(source)), source)
    if (props !== undefined) {
        Object.assign(clone, props)
    }
    return clone
}
