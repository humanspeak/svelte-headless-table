<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'
    export let filterValue: Writable<string | number | undefined | null>
    export let preFilteredValues: Readable<Array<string | number>>
</script>

<select class="demo" bind:value={$filterValue}>
    <option value={undefined}>All</option>
    {#each $preFilteredValues as v}
        <option value={v}>{v}</option>
    {/each}
</select>
