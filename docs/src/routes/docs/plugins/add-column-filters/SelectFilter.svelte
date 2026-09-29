<script lang="ts" module>
    export const getDistinct = (items: unknown[]): unknown[] => {
        return Array.from(new Set(items))
    }
</script>

<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    interface Props {
        filterValue: Box<string | undefined>
        preFilteredValues: ReadonlyBox<unknown[]>
    }

    const { filterValue, preFilteredValues }: Props = $props()
    const uniqueValues = $derived(getDistinct(preFilteredValues.current))
</script>

<select bind:value={filterValue.current} onclick={(e) => e.stopPropagation()} class="demo">
    <option value={undefined}>All</option>
    {#each uniqueValues as value (value)}
        <option {value}>{value}</option>
    {/each}
</select>
