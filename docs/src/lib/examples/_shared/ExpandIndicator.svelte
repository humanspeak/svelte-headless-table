<script lang="ts">
    import { ChevronDown, ChevronRight } from '@lucide/svelte'
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    type Props = {
        isExpanded: Box<boolean>
        canExpand: boolean
        isAllSubRowsExpanded: ReadonlyBox<boolean>
        depth: number
    }

    const { isExpanded, canExpand, depth }: Props = $props()

    const toggle = (e: MouseEvent) => {
        e.stopPropagation()
        isExpanded.current = !isExpanded.current
    }
</script>

<button
    type="button"
    class="ks-expand"
    class:expanded={isExpanded.current}
    disabled={!canExpand}
    onclick={toggle}
    aria-expanded={canExpand ? isExpanded.current : undefined}
    aria-label={canExpand ? (isExpanded.current ? 'Collapse row' : 'Expand row') : undefined}
    style="--depth: {depth}"
>
    {#if canExpand}
        {#if isExpanded.current}
            <ChevronDown size={14} strokeWidth={2.5} />
        {:else}
            <ChevronRight size={14} strokeWidth={2.5} />
        {/if}
    {/if}
</button>

<style>
    .ks-expand {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        cursor: pointer;
        color: color-mix(in srgb, var(--foreground) 75%, transparent);
        margin-left: calc(var(--depth, 0) * 14px);
        transition:
            background 80ms ease,
            color 80ms ease;
    }
    .ks-expand:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 12%, transparent);
        color: var(--foreground);
    }
    .ks-expand.expanded {
        color: var(--color-brand-500, var(--foreground));
    }
    .ks-expand:disabled {
        cursor: default;
        opacity: 0;
    }
</style>
