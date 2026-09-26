<script lang="ts">
    const { label = 'fixture', count = 0 }: { label?: string; count?: number } = $props()
</script>

<span data-testid="fixture">{label}:{count}</span>
