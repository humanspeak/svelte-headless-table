<script lang="ts" module>
    export const isNumber = (value: unknown): value is number => typeof value === 'number'
</script>

<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    interface Props {
        filterValue: Box<number | undefined>
        preFilteredValues: ReadonlyBox<unknown[]>
    }

    const { filterValue, preFilteredValues }: Props = $props()
    const min = $derived(
        preFilteredValues.current.length === 0
            ? 0
            : Math.min(...preFilteredValues.current.filter(isNumber))
    )
    const max = $derived(
        preFilteredValues.current.length === 0
            ? 0
            : Math.max(...preFilteredValues.current.filter(isNumber))
    )
</script>

<input
    type="range"
    {min}
    {max}
    bind:value={filterValue.current}
    onclick={(e) => e.stopPropagation()}
/>
