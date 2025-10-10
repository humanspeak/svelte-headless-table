<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'
    export let filterValue: Writable<string>
    export let values: Readable<Array<string | number>>
</script>

<input class="demo" bind:value={$filterValue} placeholder="Filter..." />
