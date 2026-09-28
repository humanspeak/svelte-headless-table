import { readable } from 'svelte/store'
import { expectTypeOf } from 'vitest'
import { createTable } from './createTable.js'
import { addColumnFilters } from './plugins/addColumnFilters.js'
import { addColumnOrder } from './plugins/addColumnOrder.js'
import { addDataExport } from './plugins/addDataExport.js'
import { addExpandedRows } from './plugins/addExpandedRows.js'
import { addFlatten } from './plugins/addFlatten.js'
import { addGridLayout } from './plugins/addGridLayout.js'
import { addGroupBy } from './plugins/addGroupBy.js'
import { addHiddenColumns } from './plugins/addHiddenColumns.js'
import { addPagination } from './plugins/addPagination.js'
import { addResizedColumns } from './plugins/addResizedColumns.js'
import { addSelectedRows } from './plugins/addSelectedRows.js'
import { addSortBy } from './plugins/addSortBy.js'
import { addSubRows } from './plugins/addSubRows.js'
import { addTableFilter } from './plugins/addTableFilter.js'
import { addVirtualScroll } from './plugins/addVirtualScroll.js'

type IsAny<T> = 0 extends 1 & T ? true : false
// `true` if any key of T is typed `any`.
type AnyLeak<T> = { [K in keyof T]: IsAny<T[K]> }[keyof T]

// `cell.current.props.<plugin>` must be exactly typed for every shipped
// plugin: a plugin that omits its prop-set generic falls back to
// TablePropSet<any> and silently turns the whole key into `any`.
it('current.props is precisely typed for every plugin', () => {
    const table = createTable(
        readable([{ name: 'a', age: 1, children: [] as { name: string; age: number }[] }]),
        {
            sort: addSortBy(),
            select: addSelectedRows(),
            page: addPagination(),
            filter: addColumnFilters(),
            tableFilter: addTableFilter(),
            resize: addResizedColumns(),
            order: addColumnOrder(),
            exp: addDataExport(),
            expand: addExpandedRows(),
            flatten: addFlatten(),
            grid: addGridLayout(),
            group: addGroupBy(),
            hide: addHiddenColumns(),
            sub: addSubRows({ children: 'children' }),
            virtual: addVirtualScroll({})
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
    expectTypeOf(tr.current.props.select.selected).toEqualTypeOf<boolean>()
    expectTypeOf(th.current.props.resize.disabled).toEqualTypeOf<boolean>()
    expectTypeOf(td.current.props.group.repeated).toEqualTypeOf<boolean>()
    expectTypeOf(td.current.props.tableFilter.matches).toEqualTypeOf<boolean>()
    // Plugins without props resolve to `never`, not `any`, so a typo cannot compile.
    expectTypeOf(th.current.props.page).toEqualTypeOf<never>()
    expectTypeOf(th.current.props.exp).toEqualTypeOf<never>()
    expect(vm).toBeDefined()
})
