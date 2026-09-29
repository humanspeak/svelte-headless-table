<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    interface Props {
        filterValue: Box<string>
        values: ReadonlyBox<unknown[]>
        preFilteredValues: ReadonlyBox<unknown[]>
    }

    const { filterValue, values, preFilteredValues }: Props = $props()
</script>

<label for="filter-input">
    {values.current.length} out of {preFilteredValues.current.length}
</label>
<input
    id="filter-input"
    class="demo"
    type="text"
    bind:value={filterValue.current}
    placeholder="filter..."
/>

<style>
    input {
        width: 8rem;
    }
    label {
        display: block;
        margin-bottom: 0.25rem;
    }
    .demo {
        margin: 0;
    }
    :global(.dark) input {
        color-scheme: dark;
    }
</style>
