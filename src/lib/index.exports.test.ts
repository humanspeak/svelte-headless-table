import * as lib from './index.js'
import * as plugins from './plugins/index.js'

// The public surface is the contract consumers pin to. Any addition or
// removal must be a deliberate change to these snapshots.
it('exports the expected root API', () => {
    expect(Object.keys(lib).sort()).toMatchInlineSnapshot(`
      [
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
        "Render",
        "SnippetRenderConfig",
        "Subscribe",
        "Table",
        "createRender",
        "createSnippetRender",
        "createTable",
        "getBodyRows",
        "getColumnedBodyRows",
        "getFlatColumnIds",
        "getFlatColumns",
        "getSubRows",
      ]
    `)
})

it('exports the expected plugin API', () => {
    expect(Object.keys(plugins).sort()).toMatchInlineSnapshot(`
      [
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
        "createPageStore",
        "createSortKeysStore",
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
    expect(typeof lib.Subscribe).toBe('function')
    expect(typeof lib.createRender).toBe('function')
    expect(typeof lib.createSnippetRender).toBe('function')
    expect(typeof lib.ComponentRenderConfig).toBe('function')
    expect(typeof lib.SnippetRenderConfig).toBe('function')
})
