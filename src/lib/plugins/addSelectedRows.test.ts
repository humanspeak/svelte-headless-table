import type { Sample } from '../../routes/_createSamples.js'
import { createTable } from '../createTable.js'
import { addPagination } from './addPagination.svelte.js'
import { addSelectedRows } from './addSelectedRows.svelte.js'
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
]

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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    let row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(false)

    const { selectedDataIds } = vm.pluginStates.select
    selectedDataIds.add('0')

    row0Props = row0!.current.props
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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    let row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(false)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(false)

    const { selectedDataIds } = vm.pluginStates.select
    selectedDataIds.add('0')

    row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(true)

    row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(false)

    selectedDataIds.add('0>0>0')

    row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(false)
    expect(row0Props.select.someSubRowsSelected).toBe(true)

    selectedDataIds.add('0>1')

    row0Props = row0!.current.props
    expect(row0Props.select.selected).toBe(true)
    expect(row0Props.select.allSubRowsSelected).toBe(true)
    expect(row0Props.select.someSubRowsSelected).toBe(true)
})

test('reading rows selected state', () => {
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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allRowsSelected, someRowsSelected } = vm.pluginStates.select

    selectedDataIds.add('0')

    expect(someRowsSelected.current).toBe(true)
    expect(allRowsSelected.current).toBe(false)

    selectedDataIds.addAll(['0>0', '0>0>0', '0>1', '1', '1>0', '1>1', '2', '2>0', '2>1', '3', '4'])

    expect(someRowsSelected.current).toBe(true)
    expect(allRowsSelected.current).toBe(true)

    selectedDataIds.remove('0')

    expect(someRowsSelected.current).toBe(true)
    expect(allRowsSelected.current).toBe(false)

    selectedDataIds.clear()

    expect(someRowsSelected.current).toBe(false)
    expect(allRowsSelected.current).toBe(false)
})

test('updating all rows selected state', () => {
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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allRowsSelected } = vm.pluginStates.select

    allRowsSelected.current = true

    expect(selectedDataIds.current).toEqual({
        '0': true,
        '1': true,
        '2': true,
        '3': true,
        '4': true
    })

    allRowsSelected.current = false

    expect(selectedDataIds.current).toEqual({})
})

test('reading page rows selected state', () => {
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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allPageRowsSelected, somePageRowsSelected } = vm.pluginStates.select

    selectedDataIds.add('4')

    expect(somePageRowsSelected.current).toBe(false)
    expect(allPageRowsSelected.current).toBe(false)

    selectedDataIds.add('0')

    expect(somePageRowsSelected.current).toBe(true)
    expect(allPageRowsSelected.current).toBe(false)

    selectedDataIds.addAll(['1'])

    expect(somePageRowsSelected.current).toBe(true)
    expect(allPageRowsSelected.current).toBe(true)

    selectedDataIds.remove('0')

    expect(somePageRowsSelected.current).toBe(true)
    expect(allPageRowsSelected.current).toBe(false)

    selectedDataIds.clear()

    expect(somePageRowsSelected.current).toBe(false)
    expect(allPageRowsSelected.current).toBe(false)
})

test('updating all page rows selected state', () => {
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
                return `all: ${allRowsSelected.current}, some: ${someRowsSelected.current}`
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected, isAllSubRowsSelected } =
                    pluginStates.select.getRowState(row)
                return `selected: ${isSelected.current}, some subrows: ${isSomeSubRowsSelected.current}, all subrows: ${isAllSubRowsSelected.current}`
            }
        }),
        table.column({
            header: 'First Name',
            accessor: 'firstName'
        })
    ])
    const vm = table.createViewModel(columns)
    const { selectedDataIds, allPageRowsSelected } = vm.pluginStates.select

    allPageRowsSelected.current = true

    expect(selectedDataIds.current).toEqual({
        '0': true,
        '1': true
    })

    allPageRowsSelected.current = false

    expect(selectedDataIds.current).toEqual({})

    selectedDataIds.add('4')

    allPageRowsSelected.current = false

    expect(selectedDataIds.current).toEqual({ 4: true })
})

test('getRowState returns the same views for the same row', () => {
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
    const rows = vm.current.rows
    const row0 = rows[0].isData() ? rows[0] : undefined
    expect(row0).not.toBeUndefined()

    const { getRowState } = vm.pluginStates.select

    // Call getRowState twice for the same row
    const state1 = getRowState(row0!)
    const state2 = getRowState(row0!)

    // The same row object returns the same views
    expect(state1.isSelected).toBe(state2.isSelected)
    expect(state1.isSomeSubRowsSelected).toBe(state2.isSomeSubRowsSelected)
    expect(state1.isAllSubRowsSelected).toBe(state2.isAllSubRowsSelected)

    // Values should be consistent
    expect(state1.isSelected.current).toBe(state2.isSelected.current)
    expect(state1.isSomeSubRowsSelected.current).toBe(state2.isSomeSubRowsSelected.current)
    expect(state1.isAllSubRowsSelected.current).toBe(state2.isAllSubRowsSelected.current)

    // Verify updates propagate correctly (same instance, so this is trivially true)
    state1.isSelected.current = true
    expect(state1.isSelected.current).toBe(true)
    expect(state2.isSelected.current).toBe(true)
})

test('getRowState returns distinct views for different rows', () => {
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
    const rows = vm.current.rows

    // Get two different data rows
    const rowA = rows[0] // Adam
    const rowB = rows[1] // Bryan

    const { getRowState } = vm.pluginStates.select

    // Get state for each row
    const stateA = getRowState(rowA)
    const stateB = getRowState(rowB)

    // Views should NOT be shared between different rows
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
    const rows = vm.current.rows

    const rowA = rows[0] // Adam
    const rowB = rows[1] // Bryan

    const { getRowState, selectedDataIds } = vm.pluginStates.select

    const stateA = getRowState(rowA)
    const stateB = getRowState(rowB)

    // Both rows should initially be unselected
    expect(stateA.isSelected.current).toBe(false)
    expect(stateB.isSelected.current).toBe(false)

    // Select only rowA
    stateA.isSelected.current = true

    // rowA should be selected
    expect(stateA.isSelected.current).toBe(true)

    // rowB should remain unselected (state is isolated)
    expect(stateB.isSelected.current).toBe(false)

    // Select rowB as well
    stateB.isSelected.current = true

    // Both should now be selected
    expect(stateA.isSelected.current).toBe(true)
    expect(stateB.isSelected.current).toBe(true)

    // Deselect rowA, rowB should remain selected
    stateA.isSelected.current = false
    expect(stateA.isSelected.current).toBe(false)
    expect(stateB.isSelected.current).toBe(true)

    // Clean up
    selectedDataIds.clear()
})

test('getRowState isolation - repeated calls return same per-row instance but distinct across rows', () => {
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
    const rows = vm.current.rows

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
    stateA1.isSelected.current = true
    expect(stateA1.isSelected.current).toBe(true)
    expect(stateA2.isSelected.current).toBe(true) // Same instance
    expect(stateB1.isSelected.current).toBe(false) // Different row
    expect(stateC1.isSelected.current).toBe(false) // Different row
})

test('getRowState views follow selectedDataIds after it is cleared', () => {
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
    const rows = vm.current.rows
    const row0 = rows[0]

    const { getRowState, selectedDataIds } = vm.pluginStates.select

    // Get initial state
    const stateBefore = getRowState(row0)
    stateBefore.isSelected.current = true
    expect(stateBefore.isSelected.current).toBe(true)

    // Clear selected IDs; the views read them live, so nothing goes stale
    selectedDataIds.clear()

    // After clearing, the row should be unselected
    expect(stateBefore.isSelected.current).toBe(false)

    // Get state again
    const stateAfter = getRowState(row0)

    // The new state should also show unselected
    expect(stateAfter.isSelected.current).toBe(false)

    // Verify the state still works correctly after the clear
    stateAfter.isSelected.current = true
    expect(stateAfter.isSelected.current).toBe(true)
})

test('isSelected setter links sub-rows and updates the parent', () => {
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
    const row0 = vm.current.rows[0]!
    const { getRowState, selectedDataIds } = vm.pluginStates.select

    // Selecting a parent selects every descendant.
    getRowState(row0).isSelected.current = true
    expect(selectedDataIds.current).toEqual({
        '0': true,
        '0>0': true,
        '0>0>0': true,
        '0>1': true
    })

    // Deselecting a child deselects its parent; the other branch is kept.
    const child01 = row0.subRows![1]!
    expect(child01.parentRow).toBe(row0)
    getRowState(child01).isSelected.current = false
    expect(selectedDataIds.current).toEqual({ '0>0': true, '0>0>0': true })
    expect(getRowState(row0).isSelected.current).toBe(false)
    expect(getRowState(row0).isSomeSubRowsSelected.current).toBe(true)
    expect(getRowState(row0).isAllSubRowsSelected.current).toBe(false)

    // Reselecting the last child reselects the parent.
    getRowState(child01).isSelected.current = true
    expect(selectedDataIds.current).toEqual({
        '0': true,
        '0>0': true,
        '0>0>0': true,
        '0>1': true
    })
    expect(getRowState(row0).isAllSubRowsSelected.current).toBe(true)
})

test('allRowsSelected tracks row and selection changes without a subscription', () => {
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
    const { allRowsSelected, someRowsSelected } = vm.pluginStates.select

    expect(allRowsSelected.current).toBe(false)
    allRowsSelected.current = true
    expect(allRowsSelected.current).toBe(true)
    expect(someRowsSelected.current).toBe(true)
    allRowsSelected.current = false
    expect(someRowsSelected.current).toBe(false)
})
