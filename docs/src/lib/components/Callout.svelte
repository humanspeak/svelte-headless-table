<script lang="ts">
    const { type = 'info' } = $props<{ type?: 'info' | 'note' | 'warning' | 'error' | 'success' }>()
</script>

<div class="callout" data-type={type}>
    <slot />
    <style>
        .callout {
            border: 1px solid var(--border);
            border-left-width: 4px;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            background: var(--card);
        }
        .callout[data-type='info'] {
            border-left-color: var(--brand-500);
        }
        .callout[data-type='note'] {
            border-left-color: var(--muted-foreground);
        }
        .callout[data-type='warning'] {
            border-left-color: #f59e0b;
        }
        .callout[data-type='error'] {
            border-left-color: #ef4444;
        }
        .callout[data-type='success'] {
            border-left-color: #22c55e;
        }
    </style>
</div>
