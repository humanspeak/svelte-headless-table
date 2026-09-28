<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    type Props = {
        filterValue: Box<string | number | undefined | null>
        preFilteredValues: ReadonlyBox<unknown[]>
    }

    const { filterValue, preFilteredValues }: Props = $props()

    // Column values repeat across rows; the keyed each needs each option once.
    const uniqueValues = $derived([...new Set(preFilteredValues.current)])
</script>

<select class="demo" bind:value={filterValue.current}>
    <option value={undefined}>All</option>
    {#each uniqueValues as v (v)}
        <option value={v}>{v}</option>
    {/each}
</select>
