<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'
    export let isExpanded: Writable<boolean>
    export let canExpand: Readable<boolean>
    export let isAllSubRowsExpanded: Readable<boolean>
    export let depth: number
</script>

<button class="demo" disabled={!$canExpand}>
    {#if $isExpanded}Collapse{:else}Expand{/if}
    <!-- depth and isAllSubRowsExpanded available if needed -->
</button>
