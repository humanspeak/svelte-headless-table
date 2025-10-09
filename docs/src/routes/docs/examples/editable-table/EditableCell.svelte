<script lang="ts">
    import type { DataColumn, BodyRow } from '@humanspeak/svelte-headless-table'

    export let row: BodyRow<any>
    export let column: DataColumn<any>
    export let value: unknown
    export let onUpdateValue: (rowDataId: string, columnId: string, newValue: unknown) => void

    let isEditing = false

    let inputElement: HTMLInputElement | undefined
    $: if (isEditing) {
        inputElement?.focus()
    }

    const handleCancel = () => {
        isEditing = false
    }
    const handleSubmit = () => {
        isEditing = false
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, value)
        }
    }
</script>

<div>
    {#if !isEditing}
        <span onclick={() => (isEditing = true)}>
            {value}
        </span>
    {:else}
        <form
            onsubmit={(e) => {
                e.preventDefault()
                handleSubmit()
            }}
        >
            <input bind:this={inputElement} type="text" bind:value />
            <button type="submit">✅</button>
            <button onclick={handleCancel}>❌</button>
        </form>
    {/if}
</div>

<style>
    form {
        display: flex;
        gap: 0.5rem;
    }
</style>
