<script lang="ts">
    import type { Box, ReadonlyBox } from '../lib/index.js'
    import { getDistinct } from '../lib/utils/array.js'

    interface Props {
        filterValue: Box<string | undefined>
        preFilteredValues: ReadonlyBox<unknown[]>
    }

    const { filterValue, preFilteredValues }: Props = $props()
    const uniqueValues = $derived(getDistinct(preFilteredValues.current))
</script>

<select bind:value={filterValue.current} onclick={(e) => e.stopPropagation()}>
    <option value={undefined}>All</option>
    {#each uniqueValues as value (value)}
        <option {value}>{value}</option>
    {/each}
</select>
