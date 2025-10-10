<script lang="ts">
    import type { Readable, Writable } from 'svelte/store'
    export let isSelected: Writable<boolean>
    export let isSomeSubRowsSelected: Readable<boolean>
    // Accept stores to match upstream usage
    $: checked = $isSelected
    $: indeterminate = $isSomeSubRowsSelected
</script>

<input type="checkbox" class="demo" {checked} {indeterminate} />
