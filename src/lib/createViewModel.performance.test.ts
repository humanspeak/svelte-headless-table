import { writable } from 'svelte/store'
import { createTable } from './createTable.js'
import {
    addColumnFilters,
    addExpandedRows,
    addHiddenColumns,
    addPagination,
    addSelectedRows,
    addSortBy
} from './plugins/index.js'

interface TestItem {
    id: string
    firstName: string
    lastName: string
    age: number
    status: string
    visits: number
    progress: number
}

describe('Store derivation chain performance', () => {
    it('reports derivation cascade metrics', () => {
        const data = writable<TestItem[]>([
            {
                id: '1',
                firstName: 'Alice',
                lastName: 'Smith',
                age: 25,
                status: 'active',
                visits: 10,
                progress: 50
            },
            {
                id: '2',
                firstName: 'Bob',
                lastName: 'Jones',
                age: 30,
                status: 'inactive',
                visits: 20,
                progress: 75
            }
        ])

        const table = createTable(data, {
            sort: addSortBy(),
            filter: addColumnFilters(),
            hide: addHiddenColumns(),
            page: addPagination(),
            select: addSelectedRows(),
            expand: addExpandedRows()
        })

        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Last', accessor: 'lastName' }),
            table.column({ header: 'Age', accessor: 'age' })
        ])

        const vm = table.createViewModel(columns)

        // Log store chain depths
        console.log('\n=== Derived Store Chain Depths ===')
        console.log(`  Plugins: ${vm._debug.pluginCount} (${vm._debug.pluginNames.join(', ')})`)
        console.log(`  tableAttrs chain: ${vm._debug.derivedStoreCount.tableAttrs}`)
        console.log(`  rows chain: ${vm._debug.derivedStoreCount.rows}`)
        console.log(`  pageRows chain: ${vm._debug.derivedStoreCount.pageRows}`)

        // Subscribe to trigger initial derivations
        const unsub = vm.pageRows.subscribe(() => {})

        // Reset counters after initial setup
        vm._debug.resetCounters()

        // Single data change - measure cascade
        data.set([
            {
                id: '1',
                firstName: 'Charlie',
                lastName: 'Brown',
                age: 35,
                status: 'active',
                visits: 15,
                progress: 60
            }
        ])

        // Report derivation calls
        console.log('\n=== Derivation Calls (1 data change) ===')
        for (const [name, count] of Object.entries(vm._debug.derivationCalls)) {
            if (count > 0) console.log(`  ${name}: ${count}`)
        }
        console.log(`  TOTAL: ${vm._debug.getTotalCalls()}`)
        console.log('=====================================\n')

        unsub()

        // Baseline assertion - with 6 plugins, expect significant cascade
        // After optimization, this number should decrease
        expect(vm._debug.getTotalCalls()).toBeGreaterThan(0)

        // Record baseline for regression testing
        // CURRENT BASELINE: X calls (update after first run)
    })

    it('measures performance with large dataset', () => {
        const largeData: TestItem[] = Array.from({ length: 1000 }, (_, i) => ({
            id: String(i),
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 20 + (i % 50),
            status: i % 2 === 0 ? 'active' : 'inactive',
            visits: i * 10,
            progress: i % 100
        }))

        const data = writable(largeData)

        const table = createTable(data, {
            sort: addSortBy(),
            filter: addColumnFilters(),
            hide: addHiddenColumns(),
            page: addPagination({ initialPageSize: 50 })
        })

        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Age', accessor: 'age' })
        ])

        const vm = table.createViewModel(columns)
        const unsub = vm.pageRows.subscribe(() => {})

        vm._debug.resetCounters()

        const start = performance.now()

        // Simulate filter change
        data.update((d) => d.filter((item) => item.age > 30))

        const elapsed = performance.now() - start

        console.log(`\n=== Large Dataset (1000 rows) ===`)
        console.log(`  Filter update: ${elapsed.toFixed(2)}ms`)
        console.log(`  Derivation calls: ${vm._debug.getTotalCalls()}`)
        console.log(`================================\n`)

        unsub()
    })
})
