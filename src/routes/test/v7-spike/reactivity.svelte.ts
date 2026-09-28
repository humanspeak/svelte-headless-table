// v7 design spike (plan 001): the reactive primitives the v7 core is built on.
// Throwaway: deleted by plan 004 once `src/lib/reactivity.svelte.ts` exists.

export interface Box<T> {
    current: T
}
export interface ReadonlyBox<T> {
    readonly current: T
}
export type Getter<T> = () => T

/** Writable rune state with the `current` vocabulary Svelte uses for fromStore/MediaQuery. */
export const box = <T>(initial: T): Box<T> => {
    let value = $state(initial)
    return {
        get current() {
            return value
        },
        set current(next) {
            value = next
        }
    }
}

/** Read-only view computed from other reactive reads. */
export const derivedBox = <T>(fn: Getter<T>): ReadonlyBox<T> => {
    const value = $derived.by(fn)
    return {
        get current() {
            return value
        }
    }
}

/** Writable view of one key of a record box (replaces v6 `keyedProp`). */
export const keyedBox = <T>(record: Box<Record<string, T>>, key: string): Box<T | undefined> => ({
    get current() {
        return record.current[key]
    },
    set current(next) {
        if (next === undefined) {
            const { [key]: _removed, ...rest } = record.current
            record.current = rest
        } else {
            record.current = { ...record.current, [key]: next }
        }
    }
})
