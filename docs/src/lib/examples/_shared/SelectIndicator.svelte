<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    type Props = {
        isSelected: Box<boolean>
        isSomeSubRowsSelected: ReadonlyBox<boolean>
    }

    const { isSelected, isSomeSubRowsSelected }: Props = $props()
</script>

<input
    type="checkbox"
    class="demo"
    checked={isSelected.current}
    indeterminate={isSomeSubRowsSelected.current}
    onchange={(e) => (isSelected.current = e.currentTarget.checked)}
/>
