<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    type Props = {
        filterValue: Box<string | undefined>
        values: ReadonlyBox<unknown[]>
    }

    const { filterValue }: Props = $props()
</script>

<input
    class="demo"
    value={filterValue.current ?? ''}
    oninput={(e) => (filterValue.current = e.currentTarget.value)}
    placeholder="Filter..."
/>
