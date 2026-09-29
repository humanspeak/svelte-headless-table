<script lang="ts">
    import type { Box, ReadonlyBox } from '../lib/index.js'
    import { isNumber } from '../lib/utils/filter.js'

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

    // The box may be cleared to `undefined`; a box value is replaced, never
    // mutated, so each input writes a new tuple.
    const range = $derived(filterValue.current ?? [null, null])
    const parse = (value: string): number | null => (value === '' ? null : Number(value))
</script>

<div>
    <input
        type="number"
        value={range[0] ?? ''}
        oninput={(e) => (filterValue.current = [parse(e.currentTarget.value), range[1]])}
        onclick={(e) => e.stopPropagation()}
        placeholder="Min ({min})"
    />
    to
    <input
        type="number"
        value={range[1] ?? ''}
        oninput={(e) => (filterValue.current = [range[0], parse(e.currentTarget.value)])}
        onclick={(e) => e.stopPropagation()}
        placeholder="Max ({max})"
    />
</div>

<style>
    div {
        display: flex;
        gap: 0.5rem;
    }
</style>
