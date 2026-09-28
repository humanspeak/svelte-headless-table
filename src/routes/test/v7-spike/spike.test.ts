// v7 design spike (plan 001): pins the runes mechanism plans 002-004 rely on.
// Throwaway: deleted by plan 004.
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import SpikeHost from './SpikeHost.test.svelte'
import {
    addSpikePagination,
    addSpikeSort,
    createSpikeViewModel,
    inTransientRoot
} from './spikeViewModel.svelte.js'

interface Item {
    name: string
    age: number
}

const DATA: Item[] = [
    { name: 'Grace', age: 45 },
    { name: 'Ada', age: 36 },
    { name: 'Linus', age: 54 },
    { name: 'Barbara', age: 81 },
    { name: 'Edsger', age: 72 }
]

const buildVm = (pageSize = 10) =>
    createSpikeViewModel(
        () => DATA,
        [
            { id: 'name', header: 'Name', accessor: (item: Item) => item.name },
            { id: 'age', header: 'Age', accessor: (item: Item) => item.age }
        ],
        {
            sort: addSpikeSort<Item>(),
            page: addSpikePagination<Item>({ initialPageSize: pageSize })
        }
    )

const DATA_NAMES = DATA.map((item) => item.name)
const names = (rows: { original: Item }[]) => rows.map((row) => row.original.name)

it('renders on first paint', () => {
    render(SpikeHost)
    const rows = screen.getAllByTestId('row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Grace')
    expect(rows[0]).toHaveAttribute('role', 'row')
    expect(screen.getByTestId('th-name')).toHaveAttribute('role', 'columnheader')
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'none')
})

it('sort toggles re-render through current.props', async () => {
    render(SpikeHost)
    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'asc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Ada')

    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'desc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Grace')
})

it('pagination clamps pageIndex when pageSize grows', () => {
    const vm = buildVm(1)
    const { pageIndex, pageSize, pageCount } = vm.pluginStates.page
    expect(pageCount.current).toBe(5)
    pageIndex.current = 3
    expect(pageIndex.current).toBe(3)
    expect(names(vm.current.pageRows)).toEqual(['Barbara'])

    pageSize.current = 100
    expect(pageCount.current).toBe(1)
    expect(pageIndex.current).toBe(0)
    expect(vm.current.pageRows).toHaveLength(DATA.length)
})

it('preSortedRows reflects the upstream getter without writes', () => {
    const vm = buildVm()
    vm.pluginStates.sort.sortKeys.toggleId('age')
    expect(names(vm.current.rows)).toEqual(['Ada', 'Grace', 'Linus', 'Edsger', 'Barbara'])
    expect(names(vm.pluginStates.sort.preSortedRows.current)).toEqual(DATA_NAMES)
    expect(names(vm.pluginStates.page.prePaginatedRows.current)).toEqual(names(vm.current.rows))
})

it('view model created OUTSIDE any component still works for plain reads', () => {
    const vm = buildVm()
    expect(names(vm.current.pageRows)).toEqual(DATA_NAMES)
    vm.pluginStates.sort.sortKeys.toggleId('name')
    expect(names(vm.current.pageRows)).toEqual(['Ada', 'Barbara', 'Edsger', 'Grace', 'Linus'])
    vm.pluginStates.sort.sortKeys.toggleId('name')
    expect(names(vm.current.pageRows)).toEqual(['Linus', 'Grace', 'Edsger', 'Barbara', 'Ada'])
    const th = vm.current.headerRows[0]?.cells.find((cell) => cell.id === 'name')
    expect(th?.current.props.sort).toMatchObject({ order: 'desc' })
})

// FINDING (Svelte 5.57.1): this fails. The chain's `$derived.by`s are owned by
// the root; once it is destroyed they keep their last value and Svelte warns
// `derived_inert` ("Reading a derived belonging to a now-destroyed effect may
// result in stale values"). Pinned with `test.fails`; see the plan 001 report.
test.fails(
    'view model created inside a transient $effect.root is not inert after the root is destroyed',
    () => {
        const { value: vm, destroy } = inTransientRoot(() => {
            const created = buildVm()
            // Read once while the root is alive so the deriveds have run.
            expect(names(created.current.pageRows)).toEqual(DATA_NAMES)
            return created
        })
        destroy()
        vm.pluginStates.sort.sortKeys.toggleId('age')
        expect(names(vm.current.pageRows)).toEqual(['Ada', 'Grace', 'Linus', 'Edsger', 'Barbara'])
        vm.pluginStates.page.pageSize.current = 2
        expect(names(vm.current.pageRows)).toEqual(['Ada', 'Grace'])
    }
)

it('hook applied after current was first read is visible', async () => {
    const { component } = render(SpikeHost)
    const th = screen.getByTestId('th-name')
    expect(th).not.toHaveAttribute('data-late')

    const cell = component.vm.current.headerRows[0]?.cells.find((c) => c.id === 'name')
    cell?.component.applyHook('late', { attrs: () => ({ 'data-late': '1' }) })
    // Memo-free: the very next read sees the new hook (no stale cache, which
    // is what the v6 test of this name guards against).
    expect(cell?.current.attrs).toMatchObject({ 'data-late': '1' })

    // FINDING: applyHook writes a plain record (it runs inside derivations,
    // where `$state` writes are illegal), so on its own it does not schedule
    // a re-render. v6 bumped a per-component version store here.
    await tick()
    expect(th).not.toHaveAttribute('data-late')

    // The next time that cell's template effect runs, the hook is rendered.
    await fireEvent.click(th)
    await tick()
    expect(th).toHaveAttribute('data-late', '1')
})
