/**
 * Converts an object type to its entries type (array of [key, value] tuples).
 * Similar to the return type of Object.entries() but with stronger typing.
 *
 * @template Obj - The object type to convert.
 */
export type Entries<Obj> = NonNullable<
    {
        [K in keyof Obj]: [K, NonNullable<Obj[K]>]
    }[keyof Obj]
>[]
