import { flushSync } from 'svelte'
import type { Sample } from '../../routes/_createSamples.js'
import { createTable } from '../createTable.js'
import { deepState } from '../test/deepState.test.svelte.js'
import { withEffectRoot } from '../test/effectRoot.test.svelte.js'
import { addExpandedRows } from './addExpandedRows.svelte.js'
import { addSubRows } from './addSubRows.svelte.js'

const data: Sample[] = [
    {
        firstName: 'Adam',
        lastName: 'Lee',
        age: 30,
        progress: 30,
        status: 'single',
        visits: 5,
        children: [
            {
                firstName: 'Allie',
                lastName: 'Lee',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5,
                children: [
                    {
                        firstName: 'Aria',
                        lastName: 'Lee',
                        age: 30,
                        progress: 30,
                        status: 'single',
                        visits: 5
                    }
                ]
            },
            {
                firstName: 'Amy',
                lastName: 'Lee',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5
            }
        ]
    },
    {
        firstName: 'Bryan',
        lastName: 'Lee',
        age: 30,
        progress: 30,
        status: 'single',
        visits: 5,
        children: [
            {
                firstName: 'Ben',
                lastName: 'Lee',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5
            }
        ]
    },
    { firstName: 'Charlie', lastName: 'Puth', age: 30, progress: 30, status: 'single', visits: 5 }
]

test('basic row expansion', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)

    // Initially only root rows are visible (3 rows)
    let rows = vm.current.rows
    expect(rows.length).toBe(3)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Adam')

    // Expand first row
    const { expandedIds } = vm.pluginStates.expand
    expandedIds.add('0')

    // Now root + 2 children visible (5 rows)
    rows = vm.current.rows
    expect(rows.length).toBe(5)
    expect(rows[1].isData() && rows[1].original.firstName).toBe('Allie')
    expect(rows[2].isData() && rows[2].original.firstName).toBe('Amy')
})

test('getRowState canExpand reflects subRows presence', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows

    const { getRowState } = vm.pluginStates.expand

    // Row 0 (Adam) has children, so canExpand should be true
    const row0 = rows[0]
    const state0 = getRowState(row0)
    expect(state0.canExpand).toBe(true)

    // Row 2 (Charlie) has no children, so canExpand should be false
    const row2 = rows[2]
    const state2 = getRowState(row2)
    expect(state2.canExpand).toBe(false)
})

test('getRowState isExpanded reflects expansion state', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const row0 = rows[0]

    const { getRowState, expandedIds } = vm.pluginStates.expand
    const state = getRowState(row0)

    // Initially not expanded
    expect(state.isExpanded.current).toBeFalsy()

    // Expand via the set
    expandedIds.add('0')
    expect(state.isExpanded.current).toBe(true)

    // Collapse via the set
    expandedIds.remove('0')
    expect(state.isExpanded.current).toBeFalsy()

    // Expand via isExpanded
    state.isExpanded.current = true
    expect(expandedIds.current['0']).toBe(true)
})

test('getRowState isAllSubRowsExpanded tracks nested expansion', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const row0 = rows[0] // Adam - has 2 children, Allie (has children) and Amy (no children)

    const { getRowState, expandedIds } = vm.pluginStates.expand
    const state = getRowState(row0)

    // Initially no sub rows are expanded
    expect(state.isAllSubRowsExpanded.current).toBe(false)

    // Expand the parent to see children
    expandedIds.add('0')

    // Get the child row (Allie) which has expandable children
    const expandedRows = vm.current.rows
    const allieRow = expandedRows[1] // Allie is first child

    // Expand Allie (the only expandable child)
    expandedIds.add(allieRow.id)

    // Now all expandable sub rows are expanded
    expect(state.isAllSubRowsExpanded.current).toBe(true)
})

test('getRowState returns memoized instances', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const row0 = rows[0]

    const { getRowState } = vm.pluginStates.expand

    // Call getRowState twice for the same row
    const state1 = getRowState(row0)
    const state2 = getRowState(row0)

    // With memoization, these should be the exact same instances
    expect(state1.isExpanded).toBe(state2.isExpanded)
    expect(state1.canExpand).toBe(state2.canExpand)
    expect(state1.isAllSubRowsExpanded).toBe(state2.isAllSubRowsExpanded)

    // Values should be consistent
    expect(state1.isExpanded.current).toBe(state2.isExpanded.current)
    expect(state1.canExpand).toBe(state2.canExpand)
    expect(state1.isAllSubRowsExpanded.current).toBe(state2.isAllSubRowsExpanded.current)

    // Verify updates propagate correctly (same instance, so this is trivially true)
    state1.isExpanded.current = true
    expect(state1.isExpanded.current).toBe(true)
    expect(state2.isExpanded.current).toBe(true)
})

test('getRowState returns distinct instances for different rows', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows

    // Get two different rows
    const row0 = rows[0] // Adam
    const row1 = rows[1] // Bryan

    const { getRowState } = vm.pluginStates.expand

    // Get state for each row
    const state0 = getRowState(row0)
    const state1 = getRowState(row1)

    // Instances should NOT be the same between different rows. `canExpand`
    // is a plain boolean in v7 (both rows have children), so only the two
    // reactive views are compared by identity.
    expect(state0).not.toBe(state1)
    expect(state0.isExpanded).not.toBe(state1.isExpanded)
    expect(state0.isAllSubRowsExpanded).not.toBe(state1.isAllSubRowsExpanded)
})

test('getRowState state is isolated between different rows', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows

    // Get two different rows that both have children
    const row0 = rows[0] // Adam (has children)
    const row1 = rows[1] // Bryan (has children)

    const { getRowState } = vm.pluginStates.expand

    const state0 = getRowState(row0)
    const state1 = getRowState(row1)

    // Verify both rows are initially not expanded
    expect(state0.isExpanded.current).toBeFalsy()
    expect(state1.isExpanded.current).toBeFalsy()

    // Expand only row0
    state0.isExpanded.current = true

    // Row0 should be expanded
    expect(state0.isExpanded.current).toBe(true)

    // Row1 should remain unexpanded (state is isolated)
    expect(state1.isExpanded.current).toBeFalsy()

    // Now expand row1 as well
    state1.isExpanded.current = true

    // Both should now be expanded
    expect(state0.isExpanded.current).toBe(true)
    expect(state1.isExpanded.current).toBe(true)

    // Collapse row0, row1 should remain expanded
    state0.isExpanded.current = false
    expect(state0.isExpanded.current).toBeFalsy()
    expect(state1.isExpanded.current).toBe(true)
})

test('canExpand follows sub-rows that arrive after the view was created', () => {
    interface Node {
        name: string
        children?: Node[]
    }
    // Deep state: children are attached in place, the array keeps its identity.
    const items = deepState<Node[]>([{ name: 'parent' }, { name: 'other' }])
    const table = createTable(() => items.current, {
        sub: addSubRows({ children: 'children' }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([table.column({ header: 'Name', accessor: 'name' })])
    const vm = table.createViewModel(columns)
    const { getRowState } = vm.pluginStates.expand

    const before = vm.current.rows[0]
    expect(getRowState(before).canExpand).toBe(false)

    // Children arrive later, in place, as lazy loading does.
    items.current[0].children = [{ name: 'child' }]

    const after = vm.current.rows[0]
    // The row keeps its identity, so the cached state is reused.
    expect(after).toBe(before)
    expect(after.subRows).toHaveLength(1)
    expect(getRowState(after).canExpand).toBe(true)
    // The state a caller is already holding must agree.
    expect(getRowState(before).canExpand).toBe(getRowState(after).canExpand)
})

test('an effect reading canExpand re-runs when sub-rows arrive', () => {
    interface Node {
        name: string
        children?: Node[]
    }
    const items = deepState<Node[]>([{ name: 'parent' }, { name: 'other' }])
    const table = createTable(() => items.current, {
        sub: addSubRows({ children: 'children' }),
        expand: addExpandedRows()
    })
    const columns = table.createColumns([table.column({ header: 'Name', accessor: 'name' })])
    const vm = table.createViewModel(columns)
    const { getRowState } = vm.pluginStates.expand
    // Hold the view the way a template does, then read it in an effect.
    const row = vm.current.rows[0]
    const state = getRowState(row)

    const observed: boolean[] = []
    const cleanup = withEffectRoot(() => {
        observed.push(state.canExpand)
    })
    expect(observed).toEqual([false])

    items.current[0].children = [{ name: 'child' }]
    flushSync()

    expect(vm.current.rows[0]).toBe(row)
    expect(observed).toEqual([false, true])
    cleanup()
})
