<script lang="ts">
    import type { Snippet } from 'svelte'
    const { children }: { children?: Snippet } = $props()
</script>

<div data-testid="wrapper">{@render children?.()}</div>
