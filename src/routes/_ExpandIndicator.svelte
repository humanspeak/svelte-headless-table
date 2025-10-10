<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'

    export let isExpanded: Writable<boolean>
    export let canExpand: Readable<boolean>
    export let isAllSubRowsExpanded: Readable<boolean>
    export let depth: number
</script>

{#if $canExpand}
    <button type="button" onclick={() => ($isExpanded = !$isExpanded)} style:--depth={depth}>
        {#if $isExpanded}
            {#if $isAllSubRowsExpanded}
                ⬇️
            {:else}
                ↘️
            {/if}
        {:else}
            ➡️
        {/if}
    </button>
{/if}

<style>
    button {
        padding-left: calc(var(--depth) * 1rem);
    }
</style>
