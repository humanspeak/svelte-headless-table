// The reactive primitives the core and its plugins are built on: rune state
// behind the `current` vocabulary Svelte itself uses (`fromStore`,
// `MediaQuery`).
//
// Values are held in `$state.raw`: a write replaces the value and notifies
// readers, exactly like `store.set`. Nothing is deep-proxied, so a value read
// back is the object that was written (identity is preserved) and mutating it in
// place does not notify; assign a new value instead.

/**
 * A reactive value with a readable and writable `current` property. Reading
 * `current` inside a template, `$derived` or `$effect` tracks it.
 *
 * @template T - The type of the value.
 */
export interface Box<T> {
    current: T
}

/**
 * A reactive value that can only be read.
 *
 * @template T - The type of the value.
 */
export interface ReadonlyBox<T> {
    readonly current: T
}

/**
 * A function that returns a value. Called inside a `$derived` or a template,
 * every reactive read it performs is tracked.
 *
 * @template T - The type of the value.
 */
export type Getter<T> = () => T

/**
 * Creates writable rune state.
 *
 * @template T - The type of the value.
 * @param initial - The initial value.
 * @returns A {@link Box} holding the value.
 * @example
 * ```ts
 * const pageSize = box(10)
 * pageSize.current = 20
 * ```
 */
export const box = <T>(initial: T): Box<T> => {
    let value = $state.raw(initial)
    return {
        get current() {
            return value
        },
        set current(next) {
            value = next
        }
    }
}

/**
 * Creates a read-only value computed from other reactive reads. The function
 * runs lazily, the first time `current` is read after a dependency changed.
 * It must not write rune state.
 *
 * Create it in a component `<script>`, at module or test top level, or while a
 * view model is being built — never inside a transient `$effect` /
 * `$effect.root` that is destroyed before the value is dropped.
 *
 * @template T - The type of the value.
 * @param fn - Computes the value.
 * @returns A {@link ReadonlyBox} holding the computed value.
 */
export const derivedBox = <T>(fn: Getter<T>): ReadonlyBox<T> => {
    const value = $derived.by(fn)
    return {
        get current() {
            return value
        }
    }
}

/**
 * A read-only view over a getter. Unlike {@link derivedBox} nothing is
 * memoised: `current` calls `get` on every read, so it follows a getter that
 * is reassigned after the box was created.
 *
 * @template T - The type of the value.
 * @param get - Returns the current value.
 * @returns A {@link ReadonlyBox} that reads through `get`.
 */
export const readonlyBox = <T>(get: Getter<T>): ReadonlyBox<T> => ({
    get current() {
        return get()
    }
})

/** Whether `value` looks like a Svelte store (it has a `subscribe` function). */
export const isStore = (value: unknown): boolean =>
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    'subscribe' in value &&
    typeof value.subscribe === 'function'

/** Whether `value` is a box (an object with a `current` property). */
export const isBox = <T>(value: unknown): value is ReadonlyBox<T> =>
    typeof value === 'object' && value !== null && 'current' in value

/**
 * Normalises a value, a getter or a box to a getter. Svelte stores and
 * anything else that is not a `T` are rejected with `errorMessage`, so a
 * caller passing a store gets a clear error instead of silently empty data.
 *
 * @template T - The type of the value.
 * @param value - A `T`, a getter returning one, or a box holding one.
 * @param isValue - Recognises a plain `T`.
 * @param errorMessage - Thrown when `value` is none of the accepted forms.
 * @returns A getter for the value.
 * @throws Error if `value` is a Svelte store or otherwise unusable.
 */
export const toGetter = <T>(
    value: unknown,
    isValue: (_candidate: unknown) => _candidate is T,
    errorMessage: string
): Getter<T> => {
    if (isStore(value)) {
        throw new Error(errorMessage)
    }
    if (isValue(value)) {
        return () => value
    }
    if (typeof value === 'function') {
        return value as Getter<T>
    }
    if (isBox<T>(value)) {
        return () => value.current
    }
    throw new Error(errorMessage)
}

/**
 * A writable view of one key of a record box. The key is used verbatim: keys containing `.` or `[` are ordinary keys. Writing
 * replaces the parent record with a shallow copy, so readers of the parent are
 * notified; writing `undefined` removes the key.
 *
 * @template T - The type of the record values.
 * @param record - The record box.
 * @param key - The key to read and write.
 * @returns A {@link Box} for `record.current[key]`.
 */
export const keyedBox = <T>(record: Box<Record<string, T>>, key: string): Box<T | undefined> => ({
    get current() {
        return record.current[key]
    },
    set current(next) {
        if (next === undefined) {
            record.current = withoutKey(record.current, key)
        } else {
            record.current = { ...record.current, [key]: next }
        }
    }
})

/**
 * Returns a copy of `record` without `key`. The input is not mutated.
 *
 * @param record - The source record.
 * @param key - The key to drop.
 * @returns A new record.
 */
export const withoutKey = <T>(record: Record<string, T>, key: string): Record<string, T> => {
    const { [key]: _removed, ...rest } = record
    return rest
}

/**
 * Returns a copy of `record` without any of `keys`. The input is not mutated.
 *
 * @param record - The source record.
 * @param keys - The keys to drop.
 * @returns A new record.
 */
export const withoutKeys = <T>(record: Record<string, T>, keys: string[]): Record<string, T> => {
    // A local lookup table, not state.
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const removed = new Set(keys)
    return Object.fromEntries(Object.entries(record).filter(([key]) => !removed.has(key)))
}

const withFalseRemoved = <K extends string>(record: Record<K, boolean>): Record<K, boolean> =>
    Object.fromEntries(Object.entries(record).filter(([, v]) => v === true)) as Record<K, boolean>

/**
 * A reactive set of string keys stored as a `Record<K, true>`. `false` entries are dropped on every write, so
 * `current` only ever holds `true` values.
 *
 * @template K - The key type.
 */
export class RecordSet<K extends string = string> implements Box<Record<K, boolean>> {
    #record = $state.raw<Record<K, boolean>>({} as Record<K, boolean>)

    /**
     * @param initial - The initial record; `false` entries are dropped.
     */
    constructor(initial: Record<K, boolean> = {} as Record<K, boolean>) {
        this.#record = withFalseRemoved(initial)
    }

    /** The keys in the set, as a record of `true` values. */
    get current(): Record<K, boolean> {
        return this.#record
    }

    set current(next: Record<K, boolean>) {
        this.#record = withFalseRemoved(next)
    }

    /**
     * @param key - The key to look up.
     * @returns True if `key` is in the set.
     */
    has(key: K): boolean {
        return this.#record[key] === true
    }

    /** Adds `key` to the set. */
    add(key: K): void {
        if (this.has(key)) return
        this.#record = { ...this.#record, [key]: true }
    }

    /** Adds every key in `keys` to the set. */
    addAll(keys: K[]): void {
        this.#record = {
            ...this.#record,
            ...(Object.fromEntries(keys.map((key) => [key, true])) as Record<K, boolean>)
        }
    }

    /** Removes `key` from the set. */
    remove(key: K): void {
        if (!this.has(key)) return
        this.#record = withoutKey(this.#record, key)
    }

    /** Removes every key in `keys` from the set. */
    removeAll(keys: K[]): void {
        this.#record = withoutKeys(this.#record, keys)
    }

    /** Adds `key` if it is absent, removes it if present. */
    toggle(key: K): void {
        if (this.has(key)) {
            this.remove(key)
        } else {
            this.add(key)
        }
    }

    /** Removes every key. */
    clear(): void {
        this.#record = {} as Record<K, boolean>
    }
}

/**
 * Options for {@link ArraySet.toggle}.
 */
export interface ToggleOptions {
    /** If true, toggling an item on removes every other item, and toggling it off empties the set. */
    clearOthers?: boolean | undefined
}

/**
 * Options for {@link ArraySet}.
 *
 * @template T - The item type.
 */
export interface ArraySetOptions<T> {
    /** Equality used to find items. Defaults to `===`. */
    isEqual?: ((a: T, b: T) => boolean) | undefined
}

/**
 * A reactive ordered set of items stored as an array. Every write assigns a new array.
 *
 * @template T - The item type.
 */
export class ArraySet<T> implements Box<T[]> {
    #items = $state.raw<T[]>([])
    #isEqual: (a: T, b: T) => boolean

    /**
     * @param initial - The initial items.
     * @param options - Equality options.
     */
    constructor(initial: T[] = [], { isEqual = (a, b) => a === b }: ArraySetOptions<T> = {}) {
        this.#items = initial
        this.#isEqual = isEqual
    }

    /** The items in the set, in insertion order. */
    get current(): T[] {
        return this.#items
    }

    set current(next: T[]) {
        this.#items = next
    }

    #indexOf(item: T): number {
        return this.#items.findIndex((existing) => this.#isEqual(existing, item))
    }

    /**
     * @param item - The item to look up.
     * @returns True if an equal item is in the set.
     */
    has(item: T): boolean {
        return this.#indexOf(item) !== -1
    }

    /** Appends `item` unless an equal item is already present. */
    add(item: T): void {
        if (this.#indexOf(item) === -1) {
            this.#items = [...this.#items, item]
        }
    }

    /** Removes the item equal to `item`, if any. */
    remove(item: T): void {
        const index = this.#indexOf(item)
        if (index !== -1) {
            this.#items = [...this.#items.slice(0, index), ...this.#items.slice(index + 1)]
        }
    }

    /**
     * Adds `item` if it is absent, removes it if present.
     *
     * @param item - The item to toggle.
     * @param options - With `clearOthers`, adding leaves only `item` and removing empties the set.
     */
    toggle(item: T, { clearOthers = false }: ToggleOptions = {}): void {
        const index = this.#indexOf(item)
        if (index === -1) {
            this.#items = clearOthers ? [item] : [...this.#items, item]
            return
        }
        this.#items = clearOthers
            ? []
            : [...this.#items.slice(0, index), ...this.#items.slice(index + 1)]
    }

    /** Removes every item. */
    clear(): void {
        this.#items = []
    }
}
