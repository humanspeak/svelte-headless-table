<script lang="ts">
    import type { DataColumn, BodyRow } from '@humanspeak/svelte-headless-table'
    import { Check, X } from '@lucide/svelte'

    type Props = {
        row: BodyRow<unknown>
        column: DataColumn<unknown>
        value: unknown
        onUpdateValue: (rowDataId: string, columnId: string, newValue: unknown) => void
    }

    let { row, column, value = $bindable(), onUpdateValue }: Props = $props()

    let isEditing = $state(false)
    let inputElement: HTMLInputElement | undefined = $state(undefined)

    // Capture the value the cell entered edit mode with — Escape reverts to it.
    let snapshot: unknown = value

    $effect(() => {
        if (isEditing) {
            snapshot = value
            inputElement?.focus()
            inputElement?.select()
        }
    })

    const commit = () => {
        isEditing = false
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, value)
        }
    }

    const cancel = () => {
        value = snapshot
        isEditing = false
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
        }
    }
</script>

{#if !isEditing}
    <button
        type="button"
        class="cell-display"
        onclick={() => (isEditing = true)}
        title="Click to edit"
    >
        <span class="cell-value">{value}</span>
    </button>
{:else}
    <form
        class="cell-edit"
        onsubmit={(e) => {
            e.preventDefault()
            commit()
        }}
    >
        <input
            bind:this={inputElement}
            bind:value
            type="text"
            onkeydown={onKeydown}
            onblur={commit}
        />
        <button type="submit" class="icon-btn icon-btn--commit" title="Commit (Enter)">
            <Check size={14} strokeWidth={2.25} />
        </button>
        <button
            type="button"
            class="icon-btn icon-btn--cancel"
            onclick={cancel}
            title="Cancel (Esc)"
        >
            <X size={14} strokeWidth={2.25} />
        </button>
    </form>
{/if}

<style>
    .cell-display {
        all: unset;
        display: inline-block;
        width: 100%;
        padding: 4px 8px;
        margin: -4px -8px;
        cursor: text;
        border: 1px solid transparent;
        border-radius: 0;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
        transition: border-color 100ms ease;
    }
    .cell-display:hover {
        border-color: var(--border);
        background: color-mix(in srgb, var(--muted, var(--foreground)) 4%, transparent);
    }
    .cell-display:focus-visible {
        outline: 2px solid var(--color-brand-500, currentColor);
        outline-offset: -2px;
    }
    .cell-value {
        display: inline-block;
        min-width: 1ch;
    }

    .cell-edit {
        display: inline-flex;
        align-items: stretch;
        gap: 4px;
        width: 100%;
    }
    .cell-edit input {
        flex: 1 1 0;
        min-width: 0;
        padding: 3px 8px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--color-brand-500, var(--border));
        border-radius: 0;
        outline: none;
    }
    .cell-edit input:focus {
        box-shadow:
            inset 0 0 0 1px var(--color-brand-500, var(--border)),
            0 0 0 2px color-mix(in srgb, var(--color-brand-500, currentColor) 25%, transparent);
    }

    .icon-btn {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        flex: 0 0 auto;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        transition:
            background 100ms ease,
            color 100ms ease,
            border-color 100ms ease;
    }
    .icon-btn:hover {
        background: var(--foreground);
        color: var(--background);
        border-color: var(--foreground);
    }
    .icon-btn--commit:hover {
        background: var(--color-brand-500, var(--foreground));
        border-color: var(--color-brand-500, var(--foreground));
        color: var(--background);
    }
</style>
