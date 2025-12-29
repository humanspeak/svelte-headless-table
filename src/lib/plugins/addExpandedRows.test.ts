/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { get, readable } from 'svelte/store'
import type { Sample } from '../../routes/_createSamples.js'
import { createTable } from '../createTable.js'
import { addExpandedRows } from './addExpandedRows.js'
import { addSubRows } from './addSubRows.js'

const data = readable<Sample[]>([
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
])

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
    let rows = get(vm.rows)
    expect(rows.length).toBe(3)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Adam')

    // Expand first row
    const { expandedIds } = vm.pluginStates.expand
    expandedIds.add('0')

    // Now root + 2 children visible (5 rows)
    rows = get(vm.rows)
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
    const rows = get(vm.rows)

    const { getRowState } = vm.pluginStates.expand

    // Row 0 (Adam) has children, so canExpand should be true
    const row0 = rows[0]
    const state0 = getRowState(row0)
    expect(get(state0.canExpand)).toBe(true)

    // Row 2 (Charlie) has no children, so canExpand should be false
    const row2 = rows[2]
    const state2 = getRowState(row2)
    expect(get(state2.canExpand)).toBe(false)
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
    const rows = get(vm.rows)
    const row0 = rows[0]

    const { getRowState, expandedIds } = vm.pluginStates.expand
    const state = getRowState(row0)

    // Initially not expanded (keyed store returns undefined for missing keys)
    expect(get(state.isExpanded)).toBeFalsy()

    // Expand via store
    expandedIds.add('0')
    expect(get(state.isExpanded)).toBe(true)

    // Collapse via store
    expandedIds.remove('0')
    expect(get(state.isExpanded)).toBeFalsy()

    // Expand via isExpanded.set
    state.isExpanded.set(true)
    expect(get(expandedIds)['0']).toBe(true)
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
    const rows = get(vm.rows)
    const row0 = rows[0] // Adam - has 2 children, Allie (has children) and Amy (no children)

    const { getRowState, expandedIds } = vm.pluginStates.expand
    const state = getRowState(row0)

    // Initially no sub rows are expanded
    expect(get(state.isAllSubRowsExpanded)).toBe(false)

    // Expand the parent to see children
    expandedIds.add('0')

    // Get the child row (Allie) which has expandable children
    const expandedRows = get(vm.rows)
    const allieRow = expandedRows[1] // Allie is first child

    // Expand Allie (the only expandable child)
    expandedIds.add(allieRow.id)

    // Now all expandable sub rows are expanded
    expect(get(state.isAllSubRowsExpanded)).toBe(true)
})

test('getRowState returns memoized store instances', () => {
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
    const rows = get(vm.rows)
    const row0 = rows[0]

    const { getRowState } = vm.pluginStates.expand

    // Call getRowState twice for the same row
    const state1 = getRowState(row0)
    const state2 = getRowState(row0)

    // With memoization, these should be the exact same store instances
    expect(state1.isExpanded).toBe(state2.isExpanded)
    expect(state1.canExpand).toBe(state2.canExpand)
    expect(state1.isAllSubRowsExpanded).toBe(state2.isAllSubRowsExpanded)

    // Values should be consistent
    expect(get(state1.isExpanded)).toBe(get(state2.isExpanded))
    expect(get(state1.canExpand)).toBe(get(state2.canExpand))
    expect(get(state1.isAllSubRowsExpanded)).toBe(get(state2.isAllSubRowsExpanded))

    // Verify updates propagate correctly (same instance, so this is trivially true)
    state1.isExpanded.set(true)
    expect(get(state1.isExpanded)).toBe(true)
    expect(get(state2.isExpanded)).toBe(true)
})

test('getRowState returns distinct store instances for different rows', () => {
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
    const rows = get(vm.rows)

    // Get two different rows
    const row0 = rows[0] // Adam
    const row1 = rows[1] // Bryan

    const { getRowState } = vm.pluginStates.expand

    // Get state for each row
    const state0 = getRowState(row0)
    const state1 = getRowState(row1)

    // Store instances should NOT be the same between different rows
    expect(state0.isExpanded).not.toBe(state1.isExpanded)
    expect(state0.canExpand).not.toBe(state1.canExpand)
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
    const rows = get(vm.rows)

    // Get two different rows that both have children
    const row0 = rows[0] // Adam (has children)
    const row1 = rows[1] // Bryan (has children)

    const { getRowState } = vm.pluginStates.expand

    const state0 = getRowState(row0)
    const state1 = getRowState(row1)

    // Verify both rows are initially not expanded
    expect(get(state0.isExpanded)).toBeFalsy()
    expect(get(state1.isExpanded)).toBeFalsy()

    // Expand only row0
    state0.isExpanded.set(true)

    // Row0 should be expanded
    expect(get(state0.isExpanded)).toBe(true)

    // Row1 should remain unexpanded (state is isolated)
    expect(get(state1.isExpanded)).toBeFalsy()

    // Now expand row1 as well
    state1.isExpanded.set(true)

    // Both should now be expanded
    expect(get(state0.isExpanded)).toBe(true)
    expect(get(state1.isExpanded)).toBe(true)

    // Collapse row0, row1 should remain expanded
    state0.isExpanded.set(false)
    expect(get(state0.isExpanded)).toBeFalsy() // keyed store returns undefined for collapsed
    expect(get(state1.isExpanded)).toBe(true)
})
