<script lang="ts">
    const { type = 'info', title = '' } = $props<{
        type?: 'info' | 'note' | 'warning' | 'error' | 'success'
        title?: string
    }>()
</script>

<div class="admonition" data-type={type}>
    {#if title}
        <div class="title">{title}</div>
    {/if}
    <div class="content">
        <slot />
    </div>
    <style>
        .admonition {
            border: 1px solid var(--border);
            border-left-width: 4px;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            background: var(--card);
        }
        .admonition .title {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .admonition[data-type='info'] {
            border-left-color: var(--brand-500);
        }
        .admonition[data-type='note'] {
            border-left-color: var(--muted-foreground);
        }
        .admonition[data-type='warning'] {
            border-left-color: #f59e0b;
        }
        .admonition[data-type='error'] {
            border-left-color: #ef4444;
        }
        .admonition[data-type='success'] {
            border-left-color: #22c55e;
        }
    </style>
</div>
