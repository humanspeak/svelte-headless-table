<script lang="ts">
    import type { Box, ReadonlyBox } from '../lib/index.js'

    interface Props {
        isExpanded: Box<boolean>
        canExpand: boolean
        isAllSubRowsExpanded: ReadonlyBox<boolean>
        depth: number
    }

    const { isExpanded, canExpand, isAllSubRowsExpanded, depth }: Props = $props()
</script>

{#if canExpand}
    <button
        type="button"
        onclick={() => (isExpanded.current = !isExpanded.current)}
        style:--depth={depth}
    >
        {#if isExpanded.current}
            {#if isAllSubRowsExpanded.current}
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
