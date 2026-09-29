<script lang="ts">
    import type { Box, ReadonlyBox } from '../lib/index.js'

    interface Props {
        filterValue: Box<string | undefined>
        values: ReadonlyBox<unknown[]>
        testId: string
    }

    const { filterValue, values, testId }: Props = $props()
</script>

<input
    type="text"
    value={filterValue.current ?? ''}
    oninput={(e) => (filterValue.current = e.currentTarget.value)}
    onclick={(e) => e.stopPropagation()}
    placeholder="Search {values.current.length} records..."
    data-testid={testId}
/>
