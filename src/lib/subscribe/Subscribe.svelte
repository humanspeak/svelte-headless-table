<!--
    Subscribe: exposes each store prop as a slot prop of the same name.
    Deliberately written in Svelte legacy mode (`$$restProps` + `<slot>`)
    because consumers rely on `let:` slot props, which only work against a
    legacy-mode child. Svelte 5 consumers who prefer runes can use
    `fromStore` from 'svelte/store' instead of this component.
-->
<script lang="ts" generics="Stores extends Record<string, unknown>">
    import type { Readable } from 'svelte/store'
    import { derivedKeys, type ReadOrWritableKeys } from '$lib/utils/store.js'

    type Values = { [K in keyof Stores]: Stores[K] extends Readable<infer V> ? V : never }
    /* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
    type $$Props = Stores
    /* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
    interface $$Slots {
        default: Values
    }

    const values = derivedKeys(
        $$restProps as ReadOrWritableKeys<Record<string, unknown>>
    ) as Readable<Values>
</script>

<slot {...$values} />
