import { createTable } from '$lib/createTable.js'
import { addResizedColumns } from '$lib/plugins/addResizedColumns.js'
import { addSortBy } from '$lib/plugins/addSortBy.js'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync, tick } from 'svelte'
import { get, readable } from 'svelte/store'
import RunesHost from './RunesHost.test.svelte'
import { observeInEffectRoot, wrap } from './runesComponent.svelte.js'

// Same three assertions as src/lib/fromStore.test.ts, run once per spike
// mechanism (plan runes-core/001, Step 2).
describe.each(['fromStore', 'subscriber'] as const)('mechanism %s', (mechanism) => {
    it('renders attrs and props on first paint', () => {
        render(RunesHost, { mechanism })
        expect(screen.getByTestId('th-name')).toHaveAttribute('role', 'columnheader')
        expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'none')
        const rows = screen.getAllByTestId('row')
        expect(rows).toHaveLength(2)
        expect(rows[0]).toHaveTextContent('Grace')
        expect(rows[0]).toHaveAttribute('role', 'row')
    })

    it('updates props when a plugin toggles state', async () => {
        render(RunesHost, { mechanism })
        await fireEvent.click(screen.getByTestId('th-name'))
        await tick()
        expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'asc')
        expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Ada')

        await fireEvent.click(screen.getByTestId('th-name'))
        await tick()
        expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'desc')
        expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Grace')
    })

    it('updates attrs when plugin state changes outside the template', async () => {
        const { component } = render(RunesHost, { mechanism })
        component.pluginStates.resize.columnWidths.set({ name: 123 })
        await tick()
        expect(screen.getByTestId('th-name').getAttribute('style')).toContain('width: 123px')
        expect(screen.getByTestId('th-age').getAttribute('style') ?? '').not.toContain('123px')
    })
})

// Supplemental probes (not the plan's three assertions): wrappers built and
// read with no component at all -- the genuinely "unowned" case behind the
// plan's Decision 3. These pin the OBSERVED behaviour of each mechanism so the
// report's claims are backed by a test, including mechanism B's hazard.
const setupOutside = (mechanism: 'fromStore' | 'subscriber') => {
    const data = readable([
        { name: 'Grace', age: 45 },
        { name: 'Ada', age: 36 }
    ])
    const table = createTable(data, { sort: addSortBy(), resize: addResizedColumns() })
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns)
    const headerCell = get(vm.headerRows)[0].cells[0]
    return { vm, w: wrap(headerCell, mechanism) }
}

describe('outside any component', () => {
    it('fromStore: plain reads outside any effect return current values', () => {
        const { vm, w } = setupOutside('fromStore')
        expect(w.attrs.role).toBe('columnheader')
        expect(w.props.sort.order).toBeUndefined()
        vm.pluginStates.sort.sortKeys.set([{ id: 'name', order: 'asc' }])
        expect(w.props.sort.order).toBe('asc')
    })

    it('fromStore: an $effect.root tracks updates', () => {
        const { vm, w } = setupOutside('fromStore')
        const { log, dispose } = observeInEffectRoot(() => w.props.sort?.order ?? 'none')
        flushSync()
        vm.pluginStates.sort.sortKeys.set([{ id: 'name', order: 'asc' }])
        flushSync()
        dispose()
        expect(log).toEqual(['none', 'asc'])
    })

    it('subscriber: plain reads outside any effect return the EMPTY seed, not the store value', () => {
        const { vm, w } = setupOutside('subscriber')
        expect(w.attrs).toEqual({})
        expect(w.props).toEqual({})
        vm.pluginStates.sort.sortKeys.set([{ id: 'name', order: 'asc' }])
        expect(w.props).toEqual({})
    })

    it('subscriber: an $effect.root tracks updates but runs once on the empty seed first', () => {
        const { vm, w } = setupOutside('subscriber')
        const { log, dispose } = observeInEffectRoot(() => w.props.sort?.order ?? 'none')
        flushSync()
        vm.pluginStates.sort.sortKeys.set([{ id: 'name', order: 'asc' }])
        flushSync()
        dispose()
        // First entry is from the `{}` seed (sort undefined), second from the
        // subscription's synchronous first emission, third from the update.
        expect(log).toEqual(['none', 'none', 'asc'])
    })
})
