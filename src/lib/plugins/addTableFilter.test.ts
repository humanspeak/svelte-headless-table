import { get, readable } from 'svelte/store'
import type { Sample } from '../../routes/_createSamples.js'
import { DataBodyCell } from '../bodyCells.js'
import { DataBodyRow } from '../bodyRows.js'
import type { DataColumn } from '../columns.js'
import { createTable } from '../createTable.js'
import { textPrefixFilter } from './addColumnFilters.js'
import { addHiddenColumns } from './addHiddenColumns.js'
import { addSubRows } from './addSubRows.js'
import { addTableFilter, rowMatchesFilter, type RowMatchesFilterOptions } from './addTableFilter.js'

// ============================================================================
// Test Data
// ============================================================================

const sampleData = readable<Sample[]>([
    { firstName: 'Alice', lastName: 'Smith', age: 30, progress: 50, status: 'active', visits: 5 },
    { firstName: 'Bob', lastName: 'Jones', age: 25, progress: 75, status: 'inactive', visits: 3 },
    {
        firstName: 'Charlie',
        lastName: 'Brown',
        age: 35,
        progress: 100,
        status: 'active',
        visits: 10
    },
    { firstName: 'Diana', lastName: 'Prince', age: 28, progress: 60, status: 'pending', visits: 7 }
])

const nestedData = readable<Sample[]>([
    {
        firstName: 'Parent1',
        lastName: 'Family',
        age: 50,
        progress: 80,
        status: 'active',
        visits: 20,
        children: [
            {
                firstName: 'Child1',
                lastName: 'Family',
                age: 20,
                progress: 40,
                status: 'active',
                visits: 5
            },
            {
                firstName: 'Child2',
                lastName: 'Family',
                age: 18,
                progress: 30,
                status: 'inactive',
                visits: 3
            }
        ]
    },
    {
        firstName: 'Parent2',
        lastName: 'Other',
        age: 45,
        progress: 90,
        status: 'active',
        visits: 15
    }
])

// ============================================================================
// Basic Filtering Tests
// ============================================================================

test('filters rows by text prefix match (default)', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'Al' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Alice')
})

test('returns all rows when filterValue is empty', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: '' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(4)
})

test('case-insensitive matching', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'bob' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Bob')
})

test('filters across multiple columns', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'Bro' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Should match "Brown" in lastName
    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Charlie')
})

test('updates filtered rows when filterValue changes', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: '' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)

    // Initially all rows
    expect(get(vm.rows)).toHaveLength(4)

    // Update filter
    const { filterValue } = vm.pluginStates.filter
    filterValue.set('Char')

    // Now only Charlie
    const rows = get(vm.rows)
    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Charlie')
})

// ============================================================================
// Hidden Column Visibility Tests (Critical for Issue #4)
// ============================================================================

test('excludes hidden columns from filtering by default', () => {
    const table = createTable(sampleData, {
        hide: addHiddenColumns({ initialHiddenColumnIds: ['lastName'] }),
        filter: addTableFilter({ initialFilterValue: 'Smith' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // lastName is hidden, so "Smith" should not match
    expect(rows).toHaveLength(0)
})

test('includes hidden columns when includeHiddenColumns=true', () => {
    const table = createTable(sampleData, {
        hide: addHiddenColumns({ initialHiddenColumnIds: ['lastName'] }),
        filter: addTableFilter({ initialFilterValue: 'Smith', includeHiddenColumns: true })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // lastName is hidden but includeHiddenColumns=true, so "Smith" should match
    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Alice')
})

test('correctly identifies visible vs hidden cells', () => {
    const table = createTable(sampleData, {
        hide: addHiddenColumns({ initialHiddenColumnIds: ['lastName'] }),
        filter: addTableFilter({ initialFilterValue: 'Alice' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // firstName is visible and matches "Alice"
    expect(rows).toHaveLength(1)

    // Verify the row's visible cells (row.cells) vs all cells (row.cellForId)
    const row = rows[0]
    expect(row.cells).toHaveLength(1) // Only firstName is visible
    expect(row.cells[0].id).toBe('firstName')
    expect(Object.keys(row.cellForId)).toHaveLength(2) // Both firstName and lastName exist
})

// ============================================================================
// rowMatchesFilter Unit Tests
// ============================================================================

test('rowMatchesFilter: excludes hidden columns from filtering by default', () => {
    // Create a mock row with hidden column
    const mockRow = createMockRow({
        visibleCellIds: ['firstName'],
        allCells: {
            firstName: { value: 'Alice', isData: true },
            lastName: { value: 'Smith', isData: true }
        }
    })

    const options: RowMatchesFilterOptions<Sample> = {
        columnOptions: {},
        filterValue: 'Smith',
        fn: textPrefixFilter,
        includeHiddenColumns: false,
        tableCellMatches: {}
    }

    const result = rowMatchesFilter(mockRow, options)
    expect(result).toBe(false) // Should not match hidden lastName
})

test('rowMatchesFilter: includes hidden columns when includeHiddenColumns=true', () => {
    const mockRow = createMockRow({
        visibleCellIds: ['firstName'],
        allCells: {
            firstName: { value: 'Alice', isData: true },
            lastName: { value: 'Smith', isData: true }
        }
    })

    const options: RowMatchesFilterOptions<Sample> = {
        columnOptions: {},
        filterValue: 'Smith',
        fn: textPrefixFilter,
        includeHiddenColumns: true,
        tableCellMatches: {}
    }

    const result = rowMatchesFilter(mockRow, options)
    expect(result).toBe(true) // Should match hidden lastName
})

test('rowMatchesFilter: correctly identifies visible vs hidden cells', () => {
    const mockRow = createMockRow({
        visibleCellIds: ['firstName', 'age'],
        allCells: {
            firstName: { value: 'Alice', isData: true },
            lastName: { value: 'Smith', isData: true },
            age: { value: '30', isData: true }
        }
    })

    // Test visible cell match
    let options: RowMatchesFilterOptions<Sample> = {
        columnOptions: {},
        filterValue: 'Alice',
        fn: textPrefixFilter,
        includeHiddenColumns: false,
        tableCellMatches: {}
    }
    expect(rowMatchesFilter(mockRow, options)).toBe(true)

    // Test hidden cell - should not match with includeHiddenColumns=false
    options = {
        columnOptions: {},
        filterValue: 'Smith',
        fn: textPrefixFilter,
        includeHiddenColumns: false,
        tableCellMatches: {}
    }
    expect(rowMatchesFilter(mockRow, options)).toBe(false)
})

test('rowMatchesFilter: uses Set for O(1) visibility lookup', () => {
    // This test verifies the optimization indirectly by checking behavior
    // The Set-based lookup should produce the same results as the old .find() approach
    const mockRow = createMockRow({
        visibleCellIds: ['firstName'],
        allCells: {
            firstName: { value: 'Alice', isData: true },
            lastName: { value: 'Smith', isData: true },
            age: { value: '30', isData: true },
            status: { value: 'active', isData: true }
        }
    })

    const options: RowMatchesFilterOptions<Sample> = {
        columnOptions: {},
        filterValue: 'Alice',
        fn: textPrefixFilter,
        includeHiddenColumns: false,
        tableCellMatches: {}
    }

    // The function should correctly identify only firstName as visible
    expect(rowMatchesFilter(mockRow, options)).toBe(true)

    // Hidden columns should not match
    options.filterValue = 'Smith'
    expect(rowMatchesFilter(mockRow, options)).toBe(false)

    options.filterValue = '30'
    expect(rowMatchesFilter(mockRow, options)).toBe(false)

    options.filterValue = 'active'
    expect(rowMatchesFilter(mockRow, options)).toBe(false)
})

test('rowMatchesFilter: parent rows with subRows always included', () => {
    const mockRow = createMockRow({
        visibleCellIds: ['firstName'],
        allCells: {
            firstName: { value: 'Parent', isData: true }
        },
        subRows: [{} as DataBodyRow<Sample>] // Has children
    })

    const options: RowMatchesFilterOptions<Sample> = {
        columnOptions: {},
        filterValue: 'NonMatchingValue',
        fn: textPrefixFilter,
        includeHiddenColumns: false,
        tableCellMatches: {}
    }

    // Parent rows are always included regardless of filter match
    expect(rowMatchesFilter(mockRow, options)).toBe(true)
})

// ============================================================================
// Column Exclusion Tests
// ============================================================================

test('respects exclude: true column option', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'active' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({
            accessor: 'status',
            header: 'Status',
            plugins: { filter: { exclude: true } }
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // status column is excluded, so "active" should not match
    expect(rows).toHaveLength(0)
})

test('applies getFilterValue transformer before matching', () => {
    const data = readable([
        { id: 1, name: 'Alice', email: 'alice@test.com' },
        { id: 2, name: 'Bob', email: 'bob@example.org' },
        { id: 3, name: 'Charlie', email: 'charlie@test.com' }
    ])

    const table = createTable(data, {
        filter: addTableFilter({ initialFilterValue: 'test' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({
            accessor: 'email',
            header: 'Email',
            plugins: {
                filter: {
                    // Extract domain from email for filtering
                    getFilterValue: (value: string) => value.split('@')[1] || ''
                }
            }
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Should match rows where email domain starts with "test"
    expect(rows).toHaveLength(2)
    const names = rows.map((r) => r.isData() && r.original.name)
    expect(names).toContain('Alice')
    expect(names).toContain('Charlie')
})

// ============================================================================
// Hierarchical Data Tests
// ============================================================================

test('includes parent row when child matches filter', () => {
    const table = createTable(nestedData, {
        sub: addSubRows({ children: 'children' }),
        filter: addTableFilter({ initialFilterValue: 'Child1' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Parent1 should be included because it has children that match
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const parentRow = rows.find((r) => r.isData() && r.original.firstName === 'Parent1')
    expect(parentRow).toBeDefined()
})

test('filters nested subRows recursively', () => {
    const table = createTable(nestedData, {
        sub: addSubRows({ children: 'children' }),
        filter: addTableFilter({ initialFilterValue: 'Child1' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Find the parent row
    const parentRow = rows.find((r) => r.isData() && r.original.firstName === 'Parent1')
    expect(parentRow).toBeDefined()

    // Check subRows are filtered
    const subRows = parentRow?.subRows ?? []
    expect(subRows).toHaveLength(1)
    expect(subRows[0].isData() && subRows[0].original.firstName).toBe('Child1')
})

test('empty subRows array handled correctly', () => {
    const dataWithEmptyChildren = readable<Sample[]>([
        {
            firstName: 'Parent',
            lastName: 'Test',
            age: 40,
            progress: 50,
            status: 'active',
            visits: 10,
            children: []
        }
    ])

    const table = createTable(dataWithEmptyChildren, {
        sub: addSubRows({ children: 'children' }),
        filter: addTableFilter({ initialFilterValue: 'Parent' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Parent')
})

// ============================================================================
// Edge Cases
// ============================================================================

test('handles null/undefined cell values', () => {
    const dataWithNulls = readable([
        { id: 1, name: 'Alice', nickname: null },
        { id: 2, name: 'Bob', nickname: undefined },
        { id: 3, name: 'Charlie', nickname: 'Chuck' }
    ])

    const table = createTable(dataWithNulls, {
        filter: addTableFilter({ initialFilterValue: 'null' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'name', header: 'Name' }),
        table.column({ accessor: 'nickname', header: 'Nickname' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Should match "null" string representation
    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.id).toBe(1)
})

test('handles empty rows array', () => {
    const emptyData = readable<Sample[]>([])

    const table = createTable(emptyData, {
        filter: addTableFilter({ initialFilterValue: 'test' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(0)
})

test('tracks matching cells in tableCellMatches', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'Alice' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // Get the first row and check that the matching cell has matches=true
    expect(rows).toHaveLength(1)
    const row = rows[0]
    const firstNameCell = row.cellForId['firstName']

    // Access the cell props through the hook
    const cellProps = get(firstNameCell.props())
    expect(cellProps.filter.matches).toBe(true)

    // lastName should not have matches=true
    const lastNameCell = row.cellForId['lastName']
    const lastNameProps = get(lastNameCell.props())
    expect(lastNameProps.filter.matches).toBe(false)
})

test('preFilteredRows contains all rows before filtering', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'Alice' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)

    // Need to access rows first to trigger the derived store computation
    const filteredRows = get(vm.rows)

    const { preFilteredRows } = vm.pluginStates.filter
    const $preFilteredRows = get(preFilteredRows)

    expect($preFilteredRows).toHaveLength(4) // All original rows
    expect(filteredRows).toHaveLength(1) // Only Alice
})

// ============================================================================
// Server-side Mode
// ============================================================================

test('serverSide=true returns all rows unchanged', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'Alice', serverSide: true })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    // With serverSide=true, all rows should be returned regardless of filter
    expect(rows).toHaveLength(4)
})

test('serverSide mode still tracks filterValue', () => {
    const table = createTable(sampleData, {
        filter: addTableFilter({ initialFilterValue: 'test', serverSide: true })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)

    const { filterValue } = vm.pluginStates.filter
    expect(get(filterValue)).toBe('test')

    filterValue.set('newValue')
    expect(get(filterValue)).toBe('newValue')
})

// ============================================================================
// Custom Filter Function
// ============================================================================

test('uses custom filter function when provided', () => {
    // Custom function that matches exact values (not prefix)
    const exactMatchFilter = ({ value, filterValue }: { value: string; filterValue: string }) => {
        if (filterValue === '') return true
        return value.toLowerCase() === filterValue.toLowerCase()
    }

    const table = createTable(sampleData, {
        filter: addTableFilter({ fn: exactMatchFilter, initialFilterValue: 'Alice' })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' })
    ])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)

    expect(rows).toHaveLength(1)
    expect(rows[0].isData() && rows[0].original.firstName).toBe('Alice')

    // Partial match should NOT work with exact match filter
    const { filterValue } = vm.pluginStates.filter
    filterValue.set('Ali')
    expect(get(vm.rows)).toHaveLength(0)
})

// ============================================================================
// Helper Functions
// ============================================================================

interface MockCellData {
    value: string
    isData: boolean
}

interface MockRowOptions {
    visibleCellIds: string[]
    allCells: Record<string, MockCellData>
    subRows?: DataBodyRow<Sample>[]
}

function createMockRow(options: MockRowOptions): DataBodyRow<Sample> {
    const { visibleCellIds, allCells, subRows } = options

    // Create a minimal mock DataColumn
    const createMockColumn = (id: string): DataColumn<Sample> =>
        ({
            id,
            isData: () => true,
            isDisplay: () => false
        }) as unknown as DataColumn<Sample>

    // Create mock row first (without cells, we'll add them after)
    const mockRow = new DataBodyRow<Sample>({
        id: '0',
        dataId: '0',
        original: {} as Sample,
        cells: [],
        cellForId: {}
    })

    // Create cellForId with all cells
    const cellForId: Record<string, DataBodyCell<Sample>> = {}
    for (const [cellId, cellData] of Object.entries(allCells)) {
        const mockCell = new DataBodyCell<Sample>({
            row: mockRow,
            column: createMockColumn(cellId),
            value: cellData.value
        })
        cellForId[cellId] = mockCell
    }
    mockRow.cellForId = cellForId

    // Create visible cells array (only includes visible cell IDs)
    const visibleCells = visibleCellIds.map((id) => cellForId[id]).filter(Boolean)
    mockRow.cells = visibleCells

    // Set subRows if provided
    if (subRows) {
        mockRow.subRows = subRows
    }

    return mockRow
}
