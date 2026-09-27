<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'
    export let filterValue: Writable<string | number | undefined | null>
    export let preFilteredValues: Readable<Array<string | number>>

    // Column values repeat across rows; the keyed each needs each option once.
    $: uniqueValues = [...new Set($preFilteredValues)]
</script>

<select class="demo" bind:value={$filterValue}>
    <option value={undefined}>All</option>
    {#each uniqueValues as v (v)}
        <option value={v}>{v}</option>
    {/each}
</select>
