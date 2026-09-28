import { expectTypeOf } from 'vitest'
import { createTable } from './createTable.js'
import { addColumnFilters } from './plugins/addColumnFilters.svelte.js'
import { addColumnOrder } from './plugins/addColumnOrder.svelte.js'
import { addDataExport } from './plugins/addDataExport.svelte.js'
import { addExpandedRows } from './plugins/addExpandedRows.svelte.js'
import { addFlatten } from './plugins/addFlatten.svelte.js'
import { addGridLayout } from './plugins/addGridLayout.svelte.js'
import { addHiddenColumns } from './plugins/addHiddenColumns.svelte.js'
import { addPagination } from './plugins/addPagination.svelte.js'
import { addSortBy } from './plugins/addSortBy.svelte.js'
import { addSubRows } from './plugins/addSubRows.svelte.js'
import { addTableFilter } from './plugins/addTableFilter.svelte.js'

type IsAny<T> = 0 extends 1 & T ? true : false
// `true` if any key of T is typed `any`.
type AnyLeak<T> = { [K in keyof T]: IsAny<T[K]> }[keyof T]

// `cell.current.props.<plugin>` must be exactly typed for every shipped
// plugin (the four DOM-driven plugins are parked until plan 003): a plugin that omits its prop-set generic falls back to
// TablePropSet<any> and silently turns the whole key into `any`.
it('current.props is precisely typed for every plugin', () => {
    const table = createTable(
        [{ name: 'a', age: 1, children: [] as { name: string; age: number }[] }],
        {
            sort: addSortBy(),
            page: addPagination(),
            filter: addColumnFilters(),
            tableFilter: addTableFilter(),
            order: addColumnOrder(),
            exp: addDataExport(),
            expand: addExpandedRows(),
            flatten: addFlatten(),
            grid: addGridLayout(),
            hide: addHiddenColumns(),
            sub: addSubRows({ children: 'children' })
        }
    )
    const columns = table.createColumns([table.column({ header: 'Name', accessor: 'name' })])
    const vm = table.createViewModel(columns)
    const th = vm.current.headerRows[0].cells[0]
    const tr = vm.current.pageRows[0]
    const td = tr.cells[0]

    // Checked per component: a single union of the three would collapse to
    // `false` before any leak could surface in it.
    expectTypeOf<AnyLeak<typeof th.current.props>>().toEqualTypeOf<false>()
    expectTypeOf<AnyLeak<typeof tr.current.props>>().toEqualTypeOf<false>()
    expectTypeOf<AnyLeak<typeof td.current.props>>().toEqualTypeOf<false>()

    // Spot checks on the shapes consumers actually read.
    expectTypeOf(th.current.props.sort.order).toEqualTypeOf<'asc' | 'desc' | undefined>()
    expectTypeOf(th.current.props.sort.toggle).toEqualTypeOf<(_event: Event) => void>()
    expectTypeOf(td.current.props.sort.order).toEqualTypeOf<'asc' | 'desc' | undefined>()
    expectTypeOf(td.current.props.tableFilter.matches).toEqualTypeOf<boolean>()
    // Plugins without props resolve to `never`, not `any`, so a typo cannot compile.
    expectTypeOf(th.current.props.page).toEqualTypeOf<never>()
    expectTypeOf(th.current.props.exp).toEqualTypeOf<never>()
    expect(vm).toBeDefined()
})
