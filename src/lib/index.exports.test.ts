import * as lib from './index.js'
import * as plugins from './plugins/index.js'

// The public surface is the contract consumers pin to. Any addition or
// removal must be a deliberate change to these snapshots.
it('exports the expected root API', () => {
    expect(Object.keys(lib).sort()).toMatchInlineSnapshot(`
      [
        "ArraySet",
        "BodyCell",
        "BodyRow",
        "Column",
        "ComponentRenderConfig",
        "DataBodyCell",
        "DataBodyRow",
        "DataColumn",
        "DataHeaderCell",
        "DisplayBodyCell",
        "DisplayBodyRow",
        "DisplayColumn",
        "FlatColumn",
        "FlatDisplayHeaderCell",
        "FlatHeaderCell",
        "GroupColumn",
        "GroupDisplayHeaderCell",
        "GroupHeaderCell",
        "HeaderCell",
        "HeaderRow",
        "RecordSet",
        "Render",
        "SnippetRenderConfig",
        "Table",
        "box",
        "createRender",
        "createSnippetRender",
        "createTable",
        "derivedBox",
        "getBodyRows",
        "getColumnedBodyRows",
        "getFlatColumnIds",
        "getFlatColumns",
        "getSubRows",
        "keyedBox",
      ]
    `)
})

it('exports the expected plugin API', () => {
    expect(Object.keys(plugins).sort()).toMatchInlineSnapshot(`
      [
        "SortKeys",
        "addColumnFilters",
        "addColumnOrder",
        "addDataExport",
        "addExpandedRows",
        "addFlatten",
        "addGridLayout",
        "addGroupBy",
        "addHiddenColumns",
        "addPagination",
        "addResizedColumns",
        "addSelectedRows",
        "addSortBy",
        "addSubRows",
        "addTableFilter",
        "addVirtualScroll",
        "createPageState",
        "createSortKeys",
        "getFlattenedRows",
        "getGroupedRows",
        "matchFilter",
        "numberRangeFilter",
        "rowMatchesFilter",
        "textPrefixFilter",
      ]
    `)
})

it('keeps the render primitives callable', () => {
    expect(typeof lib.Render).toBe('function')
    expect(typeof lib.createRender).toBe('function')
    expect(typeof lib.createSnippetRender).toBe('function')
    expect(typeof lib.ComponentRenderConfig).toBe('function')
    expect(typeof lib.SnippetRenderConfig).toBe('function')
})

it('exports the reactive primitives', () => {
    expect(typeof lib.box).toBe('function')
    expect(typeof lib.derivedBox).toBe('function')
    expect(typeof lib.keyedBox).toBe('function')
    expect(typeof lib.RecordSet).toBe('function')
    expect(typeof lib.ArraySet).toBe('function')
})
