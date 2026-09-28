import { flushSync } from 'svelte'
import { createTable } from './createTable.js'
import {
    addColumnFilters,
    addExpandedRows,
    addHiddenColumns,
    addPagination,
    addSortBy
} from './plugins/index.js'
import { box } from './reactivity.svelte.js'
import { withEffectRoot } from './test/effectRoot.test.svelte.js'

interface TestItem {
    id: string
    firstName: string
    lastName: string
    age: number
    status: string
    visits: number
    progress: number
}

describe('View model derivation chain performance', () => {
    it('reports derivation cascade metrics', () => {
        const data = box<TestItem[]>([
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

        // addSelectedRows is parked until plan 003, so this stack has five
        // plugins instead of v6's six.
        const table = createTable(() => data.current, {
            sort: addSortBy(),
            filter: addColumnFilters(),
            hide: addHiddenColumns(),
            page: addPagination(),
            expand: addExpandedRows()
        })

        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Last', accessor: 'lastName' }),
            table.column({ header: 'Age', accessor: 'age' })
        ])

        const vm = table.createViewModel(columns)

        // Log derivation chain depths
        console.log('\n=== Derivation Chain Depths ===')
        console.log(`  Plugins: ${vm._debug.pluginCount} (${vm._debug.pluginNames.join(', ')})`)
        console.log(`  tableAttrs chain: ${vm._debug.derivedCount.tableAttrs}`)
        console.log(`  rows chain: ${vm._debug.derivedCount.rows}`)
        console.log(`  pageRows chain: ${vm._debug.derivedCount.pageRows}`)

        // Observe page rows in an effect to trigger the initial derivations
        let observedPageRows = 0
        const unsub = withEffectRoot(() => {
            observedPageRows = vm.current.pageRows.length
        })

        // Reset counters after initial setup
        vm._debug.resetCounters()

        // Single data change - measure cascade
        data.current = [
            {
                id: '1',
                firstName: 'Charlie',
                lastName: 'Brown',
                age: 35,
                status: 'active',
                visits: 15,
                progress: 60
            }
        ]
        flushSync()
        // The observing effect re-ran with the new data.
        expect(observedPageRows).toBe(1)

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

        const data = box(largeData)

        const table = createTable(() => data.current, {
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
        let observedPageRows = 0
        const unsub = withEffectRoot(() => {
            observedPageRows = vm.current.pageRows.length
        })

        vm._debug.resetCounters()

        const start = performance.now()

        // Simulate filter change
        data.current = data.current.filter((item) => item.age > 30)
        flushSync()
        expect(observedPageRows).toBe(50)

        const elapsed = performance.now() - start

        console.log('\n=== Large Dataset (1000 rows) ===')
        console.log(`  Filter update: ${elapsed.toFixed(2)}ms`)
        console.log(`  Derivation calls: ${vm._debug.getTotalCalls()}`)
        console.log('================================\n')

        unsub()

        // Assertions to catch regressions
        expect(vm._debug.getTotalCalls()).toBeGreaterThan(0)
        // Performance threshold - typically ~10ms, allow 100ms for CI variability
        expect(elapsed).toBeLessThan(100)
    })

    it('pins derivationCalls for sort + pagination after one read of vm.current.pageRows', () => {
        const data = box<TestItem[]>(
            Array.from({ length: 5 }, (_, i) => ({
                id: String(i),
                firstName: `First${i}`,
                lastName: `Last${i}`,
                age: 20 + i,
                status: 'active',
                visits: i,
                progress: i
            }))
        )
        const table = createTable(() => data.current, {
            sort: addSortBy(),
            page: addPagination({ initialPageSize: 2 })
        })
        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Age', accessor: 'age' })
        ])
        const vm = table.createViewModel(columns)

        expect(vm.current.pageRows).toBeDefined()

        // Baseline pinned in v6 (one `get(vm.pageRows)`); the runes chain must
        // not derive more on one read.
        expect({ ...vm._debug.derivationCalls }).toEqual({
            tableAttrs: 0,
            tableHeadAttrs: 0,
            tableBodyAttrs: 0,
            visibleColumns: 1,
            columnedRows: 1,
            rows: 0,
            injectedRows: 1,
            pageRows: 0,
            injectedPageRows: 1,
            headerRows: 0
        })
    })
})
