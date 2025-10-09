<script lang="ts">
    export let isExpanded: boolean
    export let canExpand: boolean
    export let isAllSubRowsExpanded: boolean
    export let depth: number
</script>

<button class="demo" disabled={!canExpand}>
    {#if isExpanded}Collapse{:else}Expand{/if}
</button>
