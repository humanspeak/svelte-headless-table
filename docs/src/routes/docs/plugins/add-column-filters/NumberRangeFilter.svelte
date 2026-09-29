<script lang="ts" module>
    export const isNumber = (value: unknown): value is number => typeof value === 'number'
</script>

<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    interface Props {
        filterValue: Box<[number | null, number | null] | undefined>
        values: ReadonlyBox<unknown[]>
    }

    const { filterValue, values }: Props = $props()
    const min = $derived(
        values.current.length === 0 ? 0 : Math.min(...values.current.filter(isNumber))
    )
    const max = $derived(
        values.current.length === 0 ? 0 : Math.max(...values.current.filter(isNumber))
    )

    // A box value is replaced, never mutated in place, so each input writes a
    // new tuple. The box may also be cleared to `undefined`.
    const range = $derived(filterValue.current ?? [null, null])
    const parse = (value: string): number | null => (value === '' ? null : Number(value))
</script>

<div>
    <input
        type="number"
        value={range[0] ?? ''}
        oninput={(e) => (filterValue.current = [parse(e.currentTarget.value), range[1]])}
        onclick={(e) => e.stopPropagation()}
        class="demo"
        placeholder={`Min (${min})`}
    />
    to
    <input
        type="number"
        value={range[1] ?? ''}
        oninput={(e) => (filterValue.current = [range[0], parse(e.currentTarget.value)])}
        onclick={(e) => e.stopPropagation()}
        class="demo"
        placeholder={`Max (${max})`}
    />
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
    }
    input {
        width: 5rem;
    }
</style>
