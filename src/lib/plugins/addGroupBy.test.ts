import type { Sample } from '../../routes/_createSamples.js'
import { createTable } from '../createTable.js'
import { addExpandedRows } from './addExpandedRows.svelte.js'
import { addGroupBy } from './addGroupBy.svelte.js'
import { addSubRows } from './addSubRows.svelte.js'

test('basic row grouping', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        { firstName: 'Bryan', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        {
            firstName: 'Charlie',
            lastName: 'Puth',
            age: 30,
            progress: 30,
            status: 'single',
            visits: 5
        },
        { firstName: 'Danny', lastName: 'Lee', age: 40, progress: 40, status: 'single', visits: 5 },
        {
            firstName: 'Elliot',
            lastName: 'Page',
            age: 40,
            progress: 40,
            status: 'single',
            visits: 5
        }
    ]
    const table = createTable(data, {
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'firstName',
            header: 'First Name'
        }),
        table.column({
            accessor: 'lastName',
            header: 'Last Name'
        })
    ])
    const vm = table.createViewModel(columns)

    const { groupByIds } = vm.pluginStates.group
    groupByIds.toggle('lastName')
    const rows = vm.current.rows

    expect(rows).toHaveLength(3)
    expect(rows[0].subRows).toHaveLength(3)
    expect(rows[1].subRows).toHaveLength(1)
    expect(rows[2].subRows).toHaveLength(1)

    const subRow00 = rows[0].subRows?.[0]
    const subRow00Data = (subRow00?.isData() && subRow00.original) as Sample
    expect(subRow00Data.firstName).toBe('Adam')

    const subRow11 = rows[0].subRows?.[1]
    const subRow11Data = (subRow11?.isData() && subRow11.original) as Sample
    expect(subRow11Data.firstName).toBe('Bryan')

    const subRow12 = rows[0].subRows?.[2]
    const subRow12Data = (subRow12?.isData() && subRow12.original) as Sample
    expect(subRow12Data.firstName).toBe('Danny')
})

test('all rows same group: 1 group row with all subRows', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        { firstName: 'Bryan', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        {
            firstName: 'Charlie',
            lastName: 'Lee',
            age: 30,
            progress: 30,
            status: 'single',
            visits: 5
        },
        { firstName: 'Danny', lastName: 'Lee', age: 40, progress: 40, status: 'single', visits: 5 },
        { firstName: 'Elliot', lastName: 'Lee', age: 40, progress: 40, status: 'single', visits: 5 }
    ]
    const table = createTable(data, {
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    const { groupByIds } = vm.pluginStates.group
    groupByIds.toggle('lastName')
    const rows = vm.current.rows

    expect(rows).toHaveLength(1)
    expect(rows[0].subRows).toHaveLength(5)
})

test('each row unique group: N group rows with 1 subRow each', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        {
            firstName: 'Bryan',
            lastName: 'Puth',
            age: 30,
            progress: 30,
            status: 'single',
            visits: 5
        },
        {
            firstName: 'Charlie',
            lastName: 'Page',
            age: 30,
            progress: 30,
            status: 'single',
            visits: 5
        }
    ]
    const table = createTable(data, {
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    const { groupByIds } = vm.pluginStates.group
    groupByIds.toggle('lastName')
    const rows = vm.current.rows

    expect(rows).toHaveLength(3)
    rows.forEach((row) => {
        expect(row.subRows).toHaveLength(1)
    })
})

test('group order: groups appear in first-seen insertion order', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Puth', age: 30, progress: 30, status: 'single', visits: 5 },
        { firstName: 'Bryan', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        {
            firstName: 'Charlie',
            lastName: 'Page',
            age: 30,
            progress: 30,
            status: 'single',
            visits: 5
        },
        { firstName: 'Danny', lastName: 'Lee', age: 40, progress: 40, status: 'single', visits: 5 }
    ]
    const table = createTable(data, {
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    const { groupByIds } = vm.pluginStates.group
    groupByIds.toggle('lastName')
    const rows = vm.current.rows

    expect(rows).toHaveLength(3)
    // First-seen order: Puth, Lee, Page
    const subRow0 = rows[0].subRows?.[0]
    const subRow0Data = (subRow0?.isData() && subRow0.original) as Sample
    expect(subRow0Data.lastName).toBe('Puth')

    const subRow1 = rows[1].subRows?.[0]
    const subRow1Data = (subRow1?.isData() && subRow1.original) as Sample
    expect(subRow1Data.lastName).toBe('Lee')

    const subRow2 = rows[2].subRows?.[0]
    const subRow2Data = (subRow2?.isData() && subRow2.original) as Sample
    expect(subRow2Data.lastName).toBe('Page')
})

it('preserves subrows of a row after grouping', () => {
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
                    visits: 5
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
        {
            firstName: 'Elliot',
            lastName: 'Page',
            age: 40,
            progress: 40,
            status: 'single',
            visits: 5
        }
    ]
    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'firstName',
            header: 'First Name'
        }),
        table.column({
            accessor: 'lastName',
            header: 'Last Name'
        })
    ])
    const vm = table.createViewModel(columns)

    const { groupByIds } = vm.pluginStates.group
    groupByIds.toggle('lastName')
    const rows = vm.current.rows

    const subRow00 = rows[0].subRows?.[0]
    expect(subRow00?.subRows).toHaveLength(2)
})

test('group-by td props are false (not undefined) for unflagged cells', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        { firstName: 'Bryan', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 }
    ]
    const table = createTable(data, {
        group: addGroupBy()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    const ungroupedCell = vm.current.rows[0].cells[0]
    expect(ungroupedCell.current.props.group).toStrictEqual({
        repeated: false,
        aggregated: false,
        grouped: false
    })
})

test('group-by td props and th props follow groupByIds', () => {
    const data: Sample[] = [
        { firstName: 'Adam', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 },
        { firstName: 'Bryan', lastName: 'Lee', age: 30, progress: 30, status: 'single', visits: 5 }
    ]
    const table = createTable(data, {
        group: addGroupBy(),
        expand: addExpandedRows({ initialExpandedIds: { '0': true } })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    const lastNameHeader = vm.current.headerRows[0].cells[1]
    const thProps = lastNameHeader.current.props.group
    expect(thProps.grouped).toBe(false)
    thProps.toggle(new MouseEvent('click'))
    expect(vm.pluginStates.group.groupByIds.current).toStrictEqual(['lastName'])
    expect(lastNameHeader.current.props.group.grouped).toBe(true)

    const [groupRow] = vm.current.rows
    const groupedCell = groupRow.cellForId.lastName
    const aggregatedCell = groupRow.cellForId.firstName
    expect(groupedCell.current.props.group).toStrictEqual({
        repeated: false,
        aggregated: false,
        grouped: true
    })
    expect(aggregatedCell.current.props.group).toStrictEqual({
        repeated: false,
        aggregated: true,
        grouped: false
    })
    // The expanded group row is followed by its sub-rows, whose grouped cells repeat.
    const repeatedCell = vm.current.rows[1].cellForId.lastName
    expect(repeatedCell.current.props.group).toStrictEqual({
        repeated: true,
        aggregated: false,
        grouped: false
    })

    thProps.clear()
    expect(vm.pluginStates.group.groupByIds.current).toStrictEqual([])
    expect(vm.current.rows).toHaveLength(2)
})
