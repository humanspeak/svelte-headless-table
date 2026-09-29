<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'

    type Props = {
        filterValue: Box<[number | null, number | null] | undefined>
        values: ReadonlyBox<unknown[]>
    }

    const { filterValue }: Props = $props()

    // A box value is replaced, never mutated in place, so each input writes a
    // new tuple. The box may also be cleared to `undefined`.
    const range = $derived(filterValue.current ?? [null, null])
    const parse = (value: string): number | null => (value === '' ? null : Number(value))
</script>

<div class="flex gap-2">
    <input
        class="demo"
        type="number"
        value={range[0] ?? ''}
        oninput={(e) => (filterValue.current = [parse(e.currentTarget.value), range[1]])}
        placeholder="Min"
    />
    <input
        class="demo"
        type="number"
        value={range[1] ?? ''}
        oninput={(e) => (filterValue.current = [range[0], parse(e.currentTarget.value)])}
        placeholder="Max"
    />
</div>
