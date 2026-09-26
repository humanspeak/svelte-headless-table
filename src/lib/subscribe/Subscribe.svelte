<!--
    Subscribe: exposes each store prop as a slot prop of the same name, so
    consumers can write `<Subscribe attrs={cell.attrs()} let:attrs>`.

    This deliberately uses `<slot>` rather than a `children` snippet: `let:`
    slot props are how every existing consumer template reads the values, and
    Svelte 5 keeps that working against a `<slot>`-based child. The component
    is otherwise written in runes mode so it compiles whether or not the
    consumer forces `compilerOptions.runes = true` (a `$$restProps` version
    would fail there with `legacy_rest_props_invalid`).

    @see fromStore from 'svelte/store' — the runes-native alternative:
    `{@const attrs = fromStore(cell.attrs())}` then `{...attrs.current}`.
-->
<script lang="ts" generics="Stores extends Record<string, unknown>">
    import type { Readable } from 'svelte/store'
    import { derivedKeys, isReadable, type ReadOrWritableKeys } from '$lib/utils/store.js'

    type Values = { [K in keyof Stores]: Stores[K] extends Readable<infer V> ? V : never }

    const stores: Stores = $props()

    // In runes mode the props object also carries internal entries such as
    // `$$slots`; only store-shaped props are exposed as slot props.
    const values = $derived(
        derivedKeys(
            Object.fromEntries(
                Object.entries(stores).filter(([, value]) => isReadable(value))
            ) as ReadOrWritableKeys<Record<string, unknown>>
        ) as Readable<Values>
    )
</script>

<!-- svelte-ignore slot_element_deprecated -->
<slot {...$values} />
