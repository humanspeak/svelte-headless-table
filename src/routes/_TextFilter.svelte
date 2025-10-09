<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'

    export let filterValue: Writable<string>
    export let values: Readable<string[]>
    export let testId: string
</script>

<input
    type="text"
    bind:value={$filterValue}
    onclick={(e) => e.stopPropagation()}
    placeholder="Search {$values.length} records..."
    data-testid={testId}
/>
