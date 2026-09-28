<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    interface Props {
        isSelected: Box<boolean>
        isSomeSubRowsSelected: ReadonlyBox<boolean>
    }

    const { isSelected, isSomeSubRowsSelected }: Props = $props()
</script>

<input
    type="checkbox"
    checked={isSelected.current}
    indeterminate={isSomeSubRowsSelected.current}
    onchange={(e) => (isSelected.current = e.currentTarget.checked)}
/>
