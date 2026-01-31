import { readable, writable, type Readable, type Updater, type Writable } from 'svelte/store'

/** Union type representing either a Readable or Writable Svelte store. */
export type ReadOrWritable<T> = Readable<T> | Writable<T>

/**
 * Type guard that checks if a value is a Svelte Readable store.
 *
 * @template T - The type of the store's value.
 * @param value - The value to check.
 * @returns True if the value has a subscribe method.
 * @example
 * ```typescript
 * if (isReadable(maybeStore)) {
 *   maybeStore.subscribe(value => console.log(value))
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isReadable = <T>(value: any): value is Readable<T> => {
    return value?.subscribe instanceof Function
}

/**
 * Type guard that checks if a value is a Svelte Writable store.
 *
 * @template T - The type of the store's value.
 * @param store - The value to check.
 * @returns True if the value has both update and set methods.
 * @example
 * ```typescript
 * if (isWritable(maybeStore)) {
 *   maybeStore.set(newValue)
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isWritable = <T>(store: any): store is Writable<T> => {
    return store?.update instanceof Function && store.set instanceof Function
}

/**
 * Maps each key of T to a Writable store containing that key's value type.
 * @template T - The object type to map.
 */
export type WritableKeys<T> = {
    [K in keyof T]: T[K] extends undefined ? Writable<T[K] | undefined> : Writable<T[K]>
}

/**
 * Maps each key of T to a Readable store containing that key's value type.
 * @template T - The object type to map.
 */
export type ReadableKeys<T> = {
    [K in keyof T]: T[K] extends undefined ? Readable<T[K] | undefined> : Readable<T[K]>
}

/**
 * Maps each key of T to either a Readable or Writable store.
 * @template T - The object type to map.
 */
export type ReadOrWritableKeys<T> = {
    [K in keyof T]: T[K] extends undefined ? ReadOrWritable<T[K] | undefined> : ReadOrWritable<T[K]>
}

/** A readable store that always contains undefined. */
export const Undefined = readable(undefined)

/**
 * Returns the Undefined store typed as a Readable of type T.
 * Useful for providing a default store value.
 *
 * @template T - The type to cast the undefined store to.
 * @returns A Readable store typed as Readable<T>.
 */
export const UndefinedAs = <T>() => Undefined as unknown as Readable<T>

/**
 * Options for toggle operations in set stores.
 */
export interface ToggleOptions {
    /** If true, removes all other items when toggling an item on. */
    clearOthers?: boolean
}

/**
 * Configuration options for creating an ArraySetStore.
 * @template T - The type of elements in the array.
 */
export interface ArraySetStoreOptions<T> {
    /** Custom equality function for comparing items. Defaults to strict equality. */
    isEqual?: (_a: T, _b: T) => boolean
}

/**
 * A Svelte store that maintains a unique set of items as an array.
 * Extends Writable with set-like operations.
 *
 * @template T - The type of elements in the set.
 */
export interface ArraySetStore<T> extends Writable<T[]> {
    /** Toggles an item in the set (adds if absent, removes if present). */
    toggle: (_item: T, _options?: ToggleOptions) => void
    /** Adds an item to the set if not already present. */
    add: (_item: T) => void
    /** Removes an item from the set if present. */
    remove: (_item: T) => void
    /** Removes all items from the set. */
    clear: () => void
}

/**
 * Creates a Svelte store that maintains a unique set of items as an array.
 * Supports toggle, add, remove, and clear operations.
 *
 * @template T - The type of elements in the set.
 * @param initial - The initial array of items.
 * @param options - Configuration options including custom equality function.
 * @returns An ArraySetStore with set-like operations.
 * @example
 * ```typescript
 * const selectedIds = arraySetStore<string>(['id1'])
 * selectedIds.toggle('id2') // Adds 'id2'
 * selectedIds.toggle('id1') // Removes 'id1'
 * ```
 */
export const arraySetStore = <T>(
    initial: T[] = [],
    { isEqual = (a, b) => a === b }: ArraySetStoreOptions<T> = {}
): ArraySetStore<T> => {
    const { subscribe, update, set } = writable(initial)
    const toggle = (item: T, { clearOthers = false }: ToggleOptions = {}) => {
        update(($arraySet) => {
            const index = $arraySet.findIndex(($item) => isEqual($item, item))
            if (index === -1) {
                if (clearOthers) {
                    return [item]
                }
                return [...$arraySet, item]
            }
            if (clearOthers) {
                return []
            }
            return [...$arraySet.slice(0, index), ...$arraySet.slice(index + 1)]
        })
    }
    const add = (item: T) => {
        update(($arraySet) => {
            const index = $arraySet.findIndex(($item) => isEqual($item, item))
            if (index === -1) {
                return [...$arraySet, item]
            }
            return $arraySet
        })
    }
    const remove = (item: T) => {
        update(($arraySet) => {
            const index = $arraySet.findIndex(($item) => isEqual($item, item))
            if (index === -1) {
                return $arraySet
            }
            return [...$arraySet.slice(0, index), ...$arraySet.slice(index + 1)]
        })
    }
    const clear = () => {
        set([])
    }
    return {
        subscribe,
        update,
        set,
        toggle,
        add,
        remove,
        clear
    }
}

/**
 * A Svelte store that maintains a set using a Record with boolean values.
 * More efficient for string/number keys than ArraySetStore.
 *
 * @template T - The type of keys (must be string or number).
 */
export interface RecordSetStore<T extends string | number> extends Writable<Record<T, boolean>> {
    /** Toggles a key in the set (adds if absent, removes if present). */
    toggle: (_item: T) => void
    /** Adds a key to the set. */
    add: (_item: T) => void
    /** Adds multiple keys to the set. */
    addAll: (_items: T[]) => void
    /** Removes a key from the set. */
    remove: (_item: T) => void
    /** Removes multiple keys from the set. */
    removeAll: (_items: T[]) => void
    /** Removes all keys from the set. */
    clear: () => void
}

/**
 * Creates a Svelte store that maintains a set using a Record with boolean values.
 * False values are automatically removed to keep the record clean.
 *
 * @template T - The type of keys (must be string or number).
 * @param initial - The initial record of key-boolean pairs.
 * @returns A RecordSetStore with set-like operations.
 * @example
 * ```typescript
 * const expandedIds = recordSetStore<string>({ row1: true })
 * expandedIds.toggle('row2') // Adds 'row2'
 * expandedIds.toggle('row1') // Removes 'row1'
 * ```
 */
export const recordSetStore = <T extends string | number>(
    initial: Record<T, boolean> = {} as Record<T, boolean>
): RecordSetStore<T> => {
    const withFalseRemoved = (record: Record<T, boolean>): Record<T, true> => {
        return Object.fromEntries(Object.entries(record).filter(([, v]) => v)) as Record<T, true>
    }
    const { subscribe, update, set } = writable(withFalseRemoved(initial))
    const updateAndRemoveFalse = (fn: Updater<Record<T, boolean>>) => {
        update(($recordSet) => {
            const newRecordSet = fn($recordSet)
            return withFalseRemoved(newRecordSet)
        })
    }
    const toggle = (item: T) => {
        update(($recordSet) => {
            if ($recordSet[item] === true) {
                delete $recordSet[item]
                return $recordSet
            }
            return {
                ...$recordSet,
                [item]: true
            }
        })
    }
    const add = (item: T) => {
        update(($recordSet) => ({
            ...$recordSet,
            [item]: true
        }))
    }
    const addAll = (items: T[]) => {
        update(($recordSet) => ({
            ...$recordSet,
            ...Object.fromEntries(items.map((item) => [item, true]))
        }))
    }
    const remove = (item: T) => {
        update(($recordSet) => {
            delete $recordSet[item]
            return $recordSet
        })
    }
    const removeAll = (items: T[]) => {
        update(($recordSet) => {
            for (const item of items) {
                delete $recordSet[item]
            }
            return $recordSet
        })
    }
    const clear = () => {
        set({} as Record<T, true>)
    }
    return {
        subscribe,
        update: updateAndRemoveFalse,
        set: (newValue) => updateAndRemoveFalse(() => newValue),
        toggle,
        add,
        addAll,
        remove,
        removeAll,
        clear
    }
}
