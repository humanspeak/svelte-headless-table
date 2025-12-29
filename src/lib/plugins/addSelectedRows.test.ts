/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { derived, get, readable } from 'svelte/store'
import type { Sample } from '../../routes/_createSamples.js'
import { createTable } from '../createTable.js'
import { addPagination } from './addPagination.js'
import { addSelectedRows } from './addSelectedRows.js'
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
            },
            {
                firstName: 'Beth',
                lastName: 'Lee',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5
            }
        ]
    },
    {
        firstName: 'Charlie',
        lastName: 'Puth',
        age: 30,
        progress: 30,
        status: 'single',
        visits: 5,
        children: [
            {
                firstName: 'Cory',
                lastName: 'Puth',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5
            },
            {
                firstName: 'Carmen',
                lastName: 'Puth',
                age: 30,
                progress: 30,
                status: 'single',
                visits: 5
            }
        ]
    },
    { firstName: 'Danny', lastName: 'Lee', age: 40, progress: 40, status: 'single', visits: 5 },
    { firstName: 'Elliot', lastName: 'Page', age: 40, progress: 40, status: 'single', visits: 5 }
])

test('basic row selection', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    let row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(false)

    const { selectedDataIds } = vm.pluginStates.select
    selectedDataIds.add('0')

    row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(true)
})

test('linked data sub rows selection', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows({
            linkDataSubRows: true
        })
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    let row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(false)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(false)

    const { selectedDataIds } = vm.pluginStates.select
    selectedDataIds.add('0')

    row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(true)

    row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(false)

    selectedDataIds.add('0>0>0')

    row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(true)

    selectedDataIds.add('0>1')

    row0Props = get(row0!.props())
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(true)
    expect(row0Props.select.someSubRowsSelected).toBe(true)
})

test('reading rows selected store', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allRowsSelected, someRowsSelected } = vm.pluginStates.select

    // Populate `tableState.rows` by subscribing to `vm.rows` and running all row
    // derivation functions.
    get(vm.rows)
    selectedDataIds.add('0')

    expect(get(someRowsSelected)).toBe(true)
    expect(get(allRowsSelected)).toBe(false)

    get(vm.rows)
    selectedDataIds.addAll(['0>0', '0>0>0', '0>1', '1', '1>0', '1>1', '2', '2>0', '2>1', '3', '4'])

    expect(get(someRowsSelected)).toBe(true)
    expect(get(allRowsSelected)).toBe(true)

    get(vm.rows)
    selectedDataIds.remove('0')

    expect(get(someRowsSelected)).toBe(true)
    expect(get(allRowsSelected)).toBe(false)

    get(vm.rows)
    selectedDataIds.clear()

    expect(get(someRowsSelected)).toBe(false)
    expect(get(allRowsSelected)).toBe(false)
})

test('updating all rows selected store', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allRowsSelected } = vm.pluginStates.select

    get(vm.rows)
    allRowsSelected.set(true)

    expect(get(selectedDataIds)).toEqual({
        '0': true,
        '1': true,
        '2': true,
        '3': true,
        '4': true
    })

    get(vm.rows)
    allRowsSelected.set(false)

    expect(get(selectedDataIds)).toEqual({})
})

test('reading page rows selected store', () => {
    const table = createTable(data, {
        page: addPagination({
            initialPageSize: 2
        }),
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allPageRowsSelected, somePageRowsSelected } = vm.pluginStates.select

    // Populate `tableState.pageRows` by subscribing to `vm.pageRows` and running
    // all row derivation functions.
    get(vm.pageRows)
    selectedDataIds.add('4')

    console.log(get(vm.pageRows))

    expect(get(somePageRowsSelected)).toBe(false)
    expect(get(allPageRowsSelected)).toBe(false)

    get(vm.pageRows)
    selectedDataIds.add('0')

    expect(get(somePageRowsSelected)).toBe(true)
    expect(get(allPageRowsSelected)).toBe(false)

    get(vm.pageRows)
    selectedDataIds.addAll(['1'])

    expect(get(somePageRowsSelected)).toBe(true)
    expect(get(allPageRowsSelected)).toBe(true)

    get(vm.pageRows)
    selectedDataIds.remove('0')

    expect(get(somePageRowsSelected)).toBe(true)
    expect(get(allPageRowsSelected)).toBe(false)

    get(vm.pageRows)
    selectedDataIds.clear()

    expect(get(somePageRowsSelected)).toBe(false)
    expect(get(allPageRowsSelected)).toBe(false)
})

test('updating all page rows selected store', () => {
    const table = createTable(data, {
        page: addPagination({
            initialPageSize: 2
        }),
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allRowsSelected, someRowsSelected } = pluginStates.select
                return derived([allRowsSelected, someRowsSelected], ([$all, $some]) => {
                    return `all: ${$all}, some: ${$some}`
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return derived(
                    [isSelected, isSomeSubRowsSelected, isAllSubRowsSelected],
                    ([$selected, $someSubRowsSelected, $allSubRowsSelected]) => {
                        return `selected: ${$selected}, some subrows: ${$someSubRowsSelected}, all subrows: ${$allSubRowsSelected}`
                    }
                )
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allPageRowsSelected } = vm.pluginStates.select

    get(vm.pageRows)
    allPageRowsSelected.set(true)

    expect(get(selectedDataIds)).toEqual({
        '0': true,
        '1': true
    })

    get(vm.pageRows)
    allPageRowsSelected.set(false)

    expect(get(selectedDataIds)).toEqual({})

    selectedDataIds.add('4')

    get(vm.pageRows)
    allPageRowsSelected.set(false)

    expect(get(selectedDataIds)).toEqual({ 4: true })
})

test('getRowState returns memoized store instances', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    const { getRowState } = vm.pluginStates.select

    // Call getRowState twice for the same row
    const state1 = getRowState(row0!)
    const state2 = getRowState(row0!)

    // With memoization, these should be the exact same store instances
    expect(state1.isSelected).toBe(state2.isSelected)
    expect(state1.isSomeSubRowsSelected).toBe(state2.isSomeSubRowsSelected)
    expect(state1.isAllSubRowsSelected).toBe(state2.isAllSubRowsSelected)

    // Values should be consistent
    expect(get(state1.isSelected)).toBe(get(state2.isSelected))
    expect(get(state1.isSomeSubRowsSelected)).toBe(get(state2.isSomeSubRowsSelected))
    expect(get(state1.isAllSubRowsSelected)).toBe(get(state2.isAllSubRowsSelected))

    // Verify updates propagate correctly (same instance, so this is trivially true)
    state1.isSelected.set(true)
    expect(get(state1.isSelected)).toBe(true)
    expect(get(state2.isSelected)).toBe(true)
})

test('getRowState returns distinct store instances for different rows', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Get two different data rows
    const rowA = rows[0] // Adam
    const rowB = rows[1] // Bryan

    const { getRowState } = vm.pluginStates.select

    // Get state for each row
    const stateA = getRowState(rowA)
    const stateB = getRowState(rowB)

    // Store instances should NOT be the same between different rows
    expect(stateA.isSelected).not.toBe(stateB.isSelected)
    expect(stateA.isSomeSubRowsSelected).not.toBe(stateB.isSomeSubRowsSelected)
    expect(stateA.isAllSubRowsSelected).not.toBe(stateB.isAllSubRowsSelected)
})

test('getRowState state mutations are isolated between different rows', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    const rowA = rows[0] // Adam
    const rowB = rows[1] // Bryan

    const { getRowState, selectedDataIds } = vm.pluginStates.select

    const stateA = getRowState(rowA)
    const stateB = getRowState(rowB)

    // Both rows should initially be unselected
    expect(get(stateA.isSelected)).toBe(false)
    expect(get(stateB.isSelected)).toBe(false)

    // Select only rowA
    stateA.isSelected.set(true)

    // rowA should be selected
    expect(get(stateA.isSelected)).toBe(true)

    // rowB should remain unselected (state is isolated)
    expect(get(stateB.isSelected)).toBe(false)

    // Select rowB as well
    stateB.isSelected.set(true)

    // Both should now be selected
    expect(get(stateA.isSelected)).toBe(true)
    expect(get(stateB.isSelected)).toBe(true)

    // Deselect rowA, rowB should remain selected
    stateA.isSelected.set(false)
    expect(get(stateA.isSelected)).toBe(false)
    expect(get(stateB.isSelected)).toBe(true)

    // Clean up
    selectedDataIds.clear()
})

test('getRowState cache isolation - repeated calls return same per-row instance but distinct across rows', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    const rowA = rows[0]
    const rowB = rows[1]
    const rowC = rows[2]

    const { getRowState } = vm.pluginStates.select

    // First call for each row
    const stateA1 = getRowState(rowA)
    const stateB1 = getRowState(rowB)
    const stateC1 = getRowState(rowC)

    // Second call for each row
    const stateA2 = getRowState(rowA)
    const stateB2 = getRowState(rowB)
    const stateC2 = getRowState(rowC)

    // Same row should return same instance (memoized)
    expect(stateA1.isSelected).toBe(stateA2.isSelected)
    expect(stateB1.isSelected).toBe(stateB2.isSelected)
    expect(stateC1.isSelected).toBe(stateC2.isSelected)

    // Different rows should have different instances
    expect(stateA1.isSelected).not.toBe(stateB1.isSelected)
    expect(stateB1.isSelected).not.toBe(stateC1.isSelected)
    expect(stateA1.isSelected).not.toBe(stateC1.isSelected)

    // Verify values are independent
    stateA1.isSelected.set(true)
    expect(get(stateA1.isSelected)).toBe(true)
    expect(get(stateA2.isSelected)).toBe(true) // Same instance
    expect(get(stateB1.isSelected)).toBe(false) // Different row
    expect(get(stateC1.isSelected)).toBe(false) // Different row
})

test('getRowState cache is cleared when selectedDataIds is cleared', () => {
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows()
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

    const { getRowState, selectedDataIds } = vm.pluginStates.select

    // Get initial state
    const stateBefore = getRowState(row0)
    stateBefore.isSelected.set(true)
    expect(get(stateBefore.isSelected)).toBe(true)

    // Clear selected IDs - this should clear the cache
    selectedDataIds.clear()

    // After clearing, the row should be unselected
    expect(get(stateBefore.isSelected)).toBe(false)

    // Get state again - should get a fresh instance due to cache clear
    const stateAfter = getRowState(row0)

    // The new state should also show unselected
    expect(get(stateAfter.isSelected)).toBe(false)

    // Verify the state still works correctly after cache clear
    stateAfter.isSelected.set(true)
    expect(get(stateAfter.isSelected)).toBe(true)
})
