import { createTable } from '../createTable.js'
import { box } from '../reactivity.svelte.js'
import { addDataExport } from './addDataExport.svelte.js'
import { addSelectedRows } from './addSelectedRows.svelte.js'
import { addSubRows } from './addSubRows.svelte.js'

interface Item {
    name: string
    age: number
    status: string
}

const sampleData: Item[] = [
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 30, status: 'inactive' },
    { name: 'Charlie', age: 35, status: 'active' }
]

test('default format exports array of objects', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined() // trigger derivation
    const exported = vm.pluginStates.export.exportedData.current
    expect(exported).toEqual([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
    ])
})

test('JSON format exports valid JSON string', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport({ format: 'json' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current
    expect(typeof exported).toBe('string')
    const parsed = JSON.parse(exported as string)
    expect(parsed).toEqual([
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 35 }
    ])
})

test('CSV format exports header line + comma-separated data', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport({ format: 'csv' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as string
    const lines = exported.split('\n')
    expect(lines[0]).toBe('name,age')
    expect(lines[1]).toBe('Alice,25')
    expect(lines[2]).toBe('Bob,30')
    expect(lines[3]).toBe('Charlie,35')
})

test('column exclusion omits columns from export', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({
            accessor: 'age',
            header: 'Age',
            plugins: { export: { exclude: true } }
        }),
        table.column({ accessor: 'status', header: 'Status' })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported[0]).toEqual({ name: 'Alice', status: 'active' })
    expect(exported[0]).not.toHaveProperty('age')
})

test('empty data exports empty array', () => {
    const data: Item[] = []
    const table = createTable(data, {
        export: addDataExport()
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current
    expect(exported).toEqual([])
})

test('empty data with CSV format exports header only', () => {
    const data: Item[] = []
    const table = createTable(data, {
        export: addDataExport({ format: 'csv' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as string
    expect(exported).toBe('name,age\n')
})

test('export updates reactively when the data changes', () => {
    const data = box(sampleData)
    const table = createTable(() => data.current, {
        export: addDataExport()
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)

    expect(vm.current.rows).toBeDefined()
    let exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported).toHaveLength(3)

    data.current = [{ name: 'Dave', age: 40, status: 'active' }]
    expect(vm.current.rows).toBeDefined()
    exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported).toEqual([{ name: 'Dave' }])
})

test('childrenKey for subRows exports nested data', () => {
    interface TreeItem {
        name: string
        age: number
        status: string
        children?: TreeItem[]
    }
    const treeData: TreeItem[] = [
        {
            name: 'Parent',
            age: 50,
            status: 'active',
            children: [{ name: 'Child', age: 20, status: 'active' }]
        }
    ]
    const data = treeData
    const table = createTable(data, {
        sub: addSubRows({ children: 'children' }),
        export: addDataExport({ childrenKey: 'kids' })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported[0]).toHaveProperty('kids')
    const kids = exported[0].kids as Record<string, unknown>[]
    expect(kids).toHaveLength(1)
    expect(kids[0].name).toBe('Child')
})

test('display column without data callback exports null', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.display({
            id: 'actions',
            header: 'Actions',
            cell: () => 'Click'
            // No data callback
        })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported[0].actions).toBeNull()
})

test('CSV format with display column exports resolved data', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport({ format: 'csv' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.display({
            id: 'greeting',
            header: 'Greeting',
            cell: ({ row }) => {
                if (row.isData()) return `Hi ${row.original.name}`
                return ''
            },
            data: ({ row }) => {
                if (row.isData()) return `Hi ${row.original.name}`
                return ''
            }
        })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as string
    const lines = exported.split('\n')
    expect(lines[0]).toBe('name,greeting')
    expect(lines[1]).toBe('Alice,Hi Alice')
})

test('display column with data callback exports resolved value', () => {
    const data = sampleData
    const table = createTable(data, {
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.display({
            id: 'greeting',
            header: 'Greeting',
            cell: ({ row }) => {
                if (row.isData()) {
                    return `Hello ${row.original.name}`
                }
                return ''
            },
            data: ({ row }) => {
                if (row.isData()) {
                    return `Hello ${row.original.name}`
                }
                return ''
            }
        })
    ])
    const vm = table.createViewModel(columns)
    expect(vm.current.rows).toBeDefined()
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported[0]).toHaveProperty('greeting')
    expect(exported[0].greeting).toBe('Hello Alice')
})

test('display column data returned as a getter is called', () => {
    const table = createTable(sampleData, {
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.display({
            id: 'greeting',
            header: 'Greeting',
            cell: () => '',
            data:
                ({ row }) =>
                () =>
                    row.isData() ? `Hey ${row.original.name}` : ''
        })
    ])
    const vm = table.createViewModel(columns)
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported[0]?.greeting).toBe('Hey Alice')
})

test('display column data receives the table state with plugin states', () => {
    const table = createTable(sampleData, {
        select: addSelectedRows(),
        export: addDataExport()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.display({
            id: 'selected',
            header: 'Selected',
            cell: () => '',
            data: ({ row }, state) =>
                state?.pluginStates.select.getRowState(row).isSelected.current ?? 'no state'
        })
    ])
    const vm = table.createViewModel(columns)
    vm.pluginStates.select.selectedDataIds.current = { '1': true }
    const exported = vm.pluginStates.export.exportedData.current as Record<string, unknown>[]
    expect(exported.map((row) => row.selected)).toEqual([false, true, false])
})
