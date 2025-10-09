<script lang="ts">
    import type { Snippet } from 'svelte'

    type Props = {
        type?: 'info' | 'note' | 'warning' | 'error' | 'success'
        children?: Snippet
    }
    const { type = 'info', children }: Props = $props()

    const typeLabel: string =
        type === 'error'
            ? 'Error'
            : type === 'warning'
              ? 'Warning'
              : type === 'success'
                ? 'Success'
                : type === 'note'
                  ? 'Note'
                  : 'Information'
</script>

<div class="callout" data-type={type}>
    <span class="sr-only">{typeLabel}:</span>
    <div class="row">
        <div class="icon" aria-hidden="true">
            {#if type === 'error'}
                <i class="fa-solid fa-circle-xmark"></i>
            {:else if type === 'warning'}
                <i class="fa-solid fa-triangle-exclamation"></i>
            {:else if type === 'success'}
                <i class="fa-solid fa-circle-check"></i>
            {:else if type === 'note'}
                <i class="fa-solid fa-note-sticky"></i>
            {:else}
                <i class="fa-solid fa-circle-info"></i>
            {/if}
        </div>
        <div class="body">
            <div class="content">
                {@render children?.()}
            </div>
        </div>
    </div>
</div>

<style>
    .callout {
        border: 1px solid var(--border);
        border-left-width: 4px;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
        background: var(--card);
    }
    .callout .row {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
    }
    .callout .icon {
        flex: none;
        width: 1rem;
        height: 1rem;
        margin-top: 0.125rem;
        font-size: 1rem;
        line-height: 1;
    }
    .callout[data-type='info'] .icon {
        color: var(--brand-500);
    }
    .callout[data-type='note'] .icon {
        color: var(--muted-foreground);
    }
    .callout[data-type='warning'] .icon {
        color: var(--admonition-warning, #f59e0b);
    }
    .callout[data-type='error'] .icon {
        color: var(--admonition-error, #ef4444);
    }
    .callout[data-type='success'] .icon {
        color: var(--admonition-success, #22c55e);
    }
    .callout[data-type='info'] {
        border-left-color: var(--brand-500);
    }
    .callout[data-type='note'] {
        border-left-color: var(--muted-foreground);
    }
    .callout[data-type='warning'] {
        border-left-color: var(--admonition-warning, #f59e0b);
    }
    .callout[data-type='error'] {
        border-left-color: var(--admonition-error, #ef4444);
    }
    .callout[data-type='success'] {
        border-left-color: var(--admonition-success, #22c55e);
    }
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
</style>
