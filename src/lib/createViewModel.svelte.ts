import type { BodyCell } from '$lib/bodyCells.js'
import { getBodyRows, getColumnedBodyRows, type BodyRow, type DataBodyRow } from '$lib/bodyRows.js'
import { getFlatColumns, type Column, type FlatColumn } from '$lib/columns.js'
import type { Table } from '$lib/createTable.js'
import type { HeaderCell } from '$lib/headerCells.js'
import { getHeaderRows, type HeaderRow } from '$lib/headerRows.js'
import type { Getter } from '$lib/reactivity.svelte.js'
import { bindComponent, type ComponentBinding } from '$lib/tableComponent.svelte.js'
import type {
    AnyPlugins,
    DeriveFn,
    PluginStates,
    PluginUpstream,
    TablePluginInstance
} from '$lib/types/TablePlugin.js'
import { finalizeAttributes } from '$lib/utils/attributes.js'
import { nonUndefined } from '$lib/utils/filter.js'

/**
 * HTML attributes for the table element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type TableAttributes<_Item, _Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
> & {
    role: 'table'
}

/**
 * HTML attributes for the table head element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type TableHeadAttributes<_Item, _Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
>

/**
 * HTML attributes for the table body element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type TableBodyAttributes<_Item, _Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
> & {
    role: 'rowgroup'
}

/**
 * Debug information for performance analysis of the table view model.
 * Provides metrics about derivation chains and call counts.
 */
export interface ViewModelDebug {
    /** Number of plugins active */
    pluginCount: number
    /** Names of active plugins */
    pluginNames: string[]
    /** Number of derivations in each chain (plugin derivations plus the view model's own) */
    derivedCount: {
        tableAttrs: number
        tableHeadAttrs: number
        tableBodyAttrs: number
        visibleColumns: number
        rows: number
        pageRows: number
    }
    /** Counters that increment on each derivation execution */
    derivationCalls: {
        tableAttrs: number
        tableHeadAttrs: number
        tableBodyAttrs: number
        visibleColumns: number
        columnedRows: number
        rows: number
        injectedRows: number
        pageRows: number
        injectedPageRows: number
        headerRows: number
    }
    /**
     * Per-derivation cumulative wall-clock in milliseconds, accumulated
     * via `performance.now()` deltas inside each `$derived` body.
     * Mirrors `derivationCalls` so the perf bench can attribute a
     * scenario's render budget to a specific derivation rather than the
     * aggregated `firstPaintMs`. Reset by `resetCounters()`.
     */
    derivationTimings: {
        tableAttrs: number
        tableHeadAttrs: number
        tableBodyAttrs: number
        visibleColumns: number
        columnedRows: number
        rows: number
        injectedRows: number
        pageRows: number
        injectedPageRows: number
        headerRows: number
    }
    /** Reset all derivation call counters and timings to 0 */
    resetCounters: () => void
    /** Get total derivation calls since last reset */
    getTotalCalls: () => number
    /** Get total derivation wall-clock (ms) since last reset */
    getTotalMs: () => number
}

/**
 * The reactive values of a view model. Each property is backed by a
 * `$derived`: read it inside a template or an effect to track updates; a read
 * outside any effect (and under SSR) returns the current value.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export interface ViewModelCurrent<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** The finalized attributes for the `<table>` element. */
    readonly tableAttrs: TableAttributes<Item, Plugins>
    /** The finalized attributes for the `<thead>` element. */
    readonly tableHeadAttrs: TableHeadAttributes<Item, Plugins>
    /** The finalized attributes for the `<tbody>` element. */
    readonly tableBodyAttrs: TableBodyAttributes<Item, Plugins>
    /** The columns left after every plugin's column derivation. */
    readonly visibleColumns: FlatColumn<Item, Plugins>[]
    /** The header rows for the visible columns. */
    readonly headerRows: HeaderRow<Item, Plugins>[]
    /** The rows built from the data, before any column or row derivation. */
    readonly originalRows: BodyRow<Item, Plugins>[]
    /** All rows after every plugin's row derivation. */
    readonly rows: DataBodyRow<Item, Plugins>[]
    /** The rows of the current page. */
    readonly pageRows: DataBodyRow<Item, Plugins>[]
}

/**
 * The view model for a table. Created by `createViewModel` and used to render
 * the table through its reactive `current` properties.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export interface TableViewModel<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** The reactive table values (rows, header rows, attributes, ...). */
    readonly current: ViewModelCurrent<Item, Plugins>
    /** Every flat column, before any column derivation. */
    readonly flatColumns: FlatColumn<Item, Plugins>[]
    /** The state each plugin exposes, keyed by plugin name. */
    readonly pluginStates: PluginStates<Plugins>
    /** Debug information for performance analysis (always available) */
    readonly _debug: ViewModelDebug
}

/**
 * The table state passed to plugins when they are created. Every reactive
 * member is a getter that resolves lazily, so a plugin may read values the
 * view model produces after the plugin was created. Call the getters inside a
 * `$derived`, a hook getter or a template so their dependencies are tracked.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export interface PluginInitTableState<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** Returns the table's data array. */
    data: Getter<Item[]>
    /** The column definitions. */
    columns: Column<Item, Plugins>[]
    /** Every flat column, before any column derivation. */
    flatColumns: FlatColumn<Item, Plugins>[]
    /** Returns the finalized `<table>` attributes. */
    tableAttrs: Getter<TableAttributes<Item, Plugins>>
    /** Returns the finalized `<thead>` attributes. */
    tableHeadAttrs: Getter<TableHeadAttributes<Item, Plugins>>
    /** Returns the finalized `<tbody>` attributes. */
    tableBodyAttrs: Getter<TableBodyAttributes<Item, Plugins>>
    /** Returns the columns left after every plugin's column derivation. */
    visibleColumns: Getter<FlatColumn<Item, Plugins>[]>
    /** Returns the header rows. */
    headerRows: Getter<HeaderRow<Item, Plugins>[]>
    /** Returns the rows built from the data, before any derivation. */
    originalRows: Getter<BodyRow<Item, Plugins>[]>
    /** Returns all rows after every plugin's row derivation. */
    rows: Getter<DataBodyRow<Item, Plugins>[]>
    /** Returns the rows of the current page. */
    pageRows: Getter<DataBodyRow<Item, Plugins>[]>
}

/**
 * The complete table state including plugin states. Labels receive it as
 * their second argument: `cell: (cell, state) => state.pageRows().length`.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export interface TableState<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> extends PluginInitTableState<Item, Plugins> {
    /** The state each plugin exposes, keyed by plugin name. */
    pluginStates: PluginStates<Plugins>
}

/**
 * Options for creating a table view model.
 *
 * @template Item - The type of data items in the table.
 */
export interface CreateViewModelOptions<Item> {
    /** Optional function to generate a unique ID for each data item. */
    rowDataId?: ((item: Item, index: number) => string) | undefined
    /**
     * Opt into reusing the previously built view model.
     *
     * Building a view model instantiates every plugin, so a caller that
     * rebuilds on each reactive pass — a derived column array with a new
     * identity but the same columns in it — loses plugin state such as the
     * current page index or sort order. Passing the same `reuseKey` as the
     * previous call declares the columns unchanged and returns that call's view
     * model instead, state intact. A different key, or no key, builds fresh.
     *
     * Honored by `Table#createViewModel` only; the standalone `createViewModel`
     * function has nowhere to cache and ignores it.
     */
    reuseKey?: string | undefined
}

type DerivationName = keyof ViewModelDebug['derivationCalls']

type PluginHooks<Item> = NonNullable<TablePluginInstance<Item, unknown, unknown>['hooks']>

/**
 * Binds every row in `rows` and every visible cell of those rows. Binding is
 * two pointer writes per component and idempotent, so re-binding a row the
 * view model has seen before costs nothing more.
 */
const bindRows = <
    Item,
    Plugins extends AnyPlugins,
    Row extends BodyRow<Item, Plugins> | HeaderRow<Item, Plugins>
>(
    rows: readonly Row[],
    rowBinding: ComponentBinding<Item, Plugins, Row>,
    cellBinding: ComponentBinding<Item, Plugins, Row['cells'][number]>
) => {
    for (const row of rows) {
        bindComponent(row, rowBinding)
        for (const cell of row.cells) bindComponent(cell, cellBinding)
    }
}

/**
 * The `[pluginName, hook]` pairs of the plugins that define a hook for `key`.
 * Plugin shape is static after `createTable`, so this is resolved once per
 * view model instead of per row.
 */
const hookEntriesFor = <Item, Key extends keyof PluginHooks<Item>>(
    pluginEntries: [string, TablePluginInstance<Item, unknown, unknown>][],
    key: Key
): [string, NonNullable<PluginHooks<Item>[Key]>][] =>
    pluginEntries.flatMap(([name, instance]) => {
        const hook = instance.hooks?.[key]
        return hook === undefined
            ? []
            : [[name, hook] as [string, NonNullable<PluginHooks<Item>[Key]>]]
    })

/**
 * Creates a view model for rendering a table.
 *
 * The derivation chain is built from `$derived`s: data → original rows →
 * visible columns → columned rows → plugin row derivations → hooks → page
 * rows, plus header rows and the three attribute chains. Nothing in it writes
 * rune state.
 *
 * Call it in a component `<script>`, at module level or in a load function —
 * never inside a transient `$effect` / `$effect.root` that is destroyed before
 * the view model is dropped (its derivations would go inert).
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @param table - The table instance created by `createTable`.
 * @param columns - The column definitions.
 * @param options - Optional configuration options.
 * @returns A TableViewModel whose `current` properties are reactive.
 */
export const createViewModel = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    table: Table<Item, Plugins>,
    columns: Column<Item, Plugins>[],
    { rowDataId }: CreateViewModelOptions<Item> = {}
): TableViewModel<Item, Plugins> => {
    const { data, plugins } = table

    // Initialize derivation call counters for debug instrumentation
    const derivationCalls = {
        tableAttrs: 0,
        tableHeadAttrs: 0,
        tableBodyAttrs: 0,
        visibleColumns: 0,
        columnedRows: 0,
        rows: 0,
        injectedRows: 0,
        pageRows: 0,
        injectedPageRows: 0,
        headerRows: 0
    }
    // Per-derivation cumulative ms, populated alongside derivationCalls.
    // `rows` / `pageRows` stay at 0 — they're plugin-pipeline
    // pass-throughs that don't run a body of their own.
    const derivationTimings = {
        tableAttrs: 0,
        tableHeadAttrs: 0,
        tableBodyAttrs: 0,
        visibleColumns: 0,
        columnedRows: 0,
        rows: 0,
        injectedRows: 0,
        pageRows: 0,
        injectedPageRows: 0,
        headerRows: 0
    }
    // Plain counters, not rune state: they are written while deriving.
    const measure = <T>(name: DerivationName, fn: () => T): T => {
        const t0 = performance.now()
        derivationCalls[name]++
        const result = fn()
        derivationTimings[name] += performance.now() - t0
        return result
    }

    const flatColumns = getFlatColumns(columns)

    const originalRows = $derived(getBodyRows(data(), flatColumns, { rowDataId }))

    // The getters resolve lazily, so plugins created below can read values
    // the chain produces later. They
    // reference `const`s declared further down; nothing calls them before the
    // chain is built.
    const pluginInitTableState: PluginInitTableState<Item, Plugins> = {
        data,
        columns,
        flatColumns,
        tableAttrs: () => finalizedTableAttrs,
        tableHeadAttrs: () => finalizedTableHeadAttrs,
        tableBodyAttrs: () => finalizedTableBodyAttrs,
        visibleColumns: () => visibleColumns,
        headerRows: () => headerRows,
        originalRows: () => originalRows,
        rows: () => injectedRows,
        pageRows: () => injectedPageRows
    }

    // Each plugin's input in the three chains, recorded by the folds below
    // and handed to the plugin as `upstream`. Plain lookups filled once while
    // the view model is built, never written while anything derives; the
    // getters resolve them lazily, so a plugin may keep them from creation.
    const emptyRows: Getter<DataBodyRow<Item, Plugins>[]> = () => []
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const upstreamRowsFor = new Map<string, Getter<DataBodyRow<Item, Plugins>[]>>()
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const upstreamPageRowsFor = new Map<string, Getter<DataBodyRow<Item, Plugins>[]>>()
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const upstreamFlatColumnsFor = new Map<string, Getter<FlatColumn<Item, Plugins>[]>>()

    const pluginEntries: [string, TablePluginInstance<Item, unknown, unknown>][] = Object.entries(
        plugins
    ).map(([pluginName, plugin]) => {
        const columnOptions = Object.fromEntries(
            flatColumns
                .map((c) => {
                    const option = c.plugins?.[pluginName]
                    if (option === undefined) return undefined
                    return [c.id, option] as const
                })
                .filter(nonUndefined)
        )
        const upstream: PluginUpstream<Item> = {
            rows: () => (upstreamRowsFor.get(pluginName) ?? emptyRows)(),
            pageRows: () => (upstreamPageRowsFor.get(pluginName) ?? emptyRows)(),
            flatColumns: () => (upstreamFlatColumnsFor.get(pluginName) ?? (() => flatColumns))()
        }
        return [
            pluginName,
            plugin({ pluginName, tableState: pluginInitTableState, columnOptions, upstream })
        ]
    })
    const pluginInstances = pluginEntries.map(([, pluginInstance]) => pluginInstance)

    const pluginStates = Object.fromEntries(
        pluginEntries.map(([key, pluginInstance]) => [key, pluginInstance.pluginState])
    ) as PluginStates<Plugins>

    const tableState: TableState<Item, Plugins> = { ...pluginInitTableState, pluginStates }

    // ---- Table attributes ---------------------------------------------------

    // Folds each plugin's derive function over the base getter, first to last.
    const chain = <T>(fns: DeriveFn<T>[], base: Getter<T>): Getter<T> =>
        fns.reduce((getter, fn) => fn(getter), base)

    const deriveTableAttrsFns: DeriveFn<TableAttributes<Item>>[] = pluginInstances
        .map((pluginInstance) => pluginInstance.deriveTableAttrs)
        .filter(nonUndefined)
    const tableAttrsFn = chain<TableAttributes<Item>>(deriveTableAttrsFns, () => ({
        role: 'table'
    }))
    const finalizedTableAttrs = $derived.by(() =>
        measure(
            'tableAttrs',
            () => finalizeAttributes(tableAttrsFn()) as TableAttributes<Item, Plugins>
        )
    )

    const deriveTableHeadAttrsFns: DeriveFn<TableHeadAttributes<Item>>[] = pluginInstances
        .map((pluginInstance) => pluginInstance.deriveTableHeadAttrs)
        .filter(nonUndefined)
    const tableHeadAttrsFn = chain<TableHeadAttributes<Item>>(deriveTableHeadAttrsFns, () => ({}))
    const finalizedTableHeadAttrs = $derived.by(() =>
        measure(
            'tableHeadAttrs',
            () => finalizeAttributes(tableHeadAttrsFn()) as TableHeadAttributes<Item, Plugins>
        )
    )

    const deriveTableBodyAttrsFns: DeriveFn<TableBodyAttributes<Item>>[] = pluginInstances
        .map((pluginInstance) => pluginInstance.deriveTableBodyAttrs)
        .filter(nonUndefined)
    const tableBodyAttrsFn = chain<TableBodyAttributes<Item>>(deriveTableBodyAttrsFns, () => ({
        role: 'rowgroup'
    }))
    const finalizedTableBodyAttrs = $derived.by(() =>
        measure(
            'tableBodyAttrs',
            () => finalizeAttributes(tableBodyAttrsFn()) as TableBodyAttributes<Item, Plugins>
        )
    )

    // ---- Columns --------------------------------------------------------------

    // Every fold records each plugin's input, whether or not the plugin
    // defines the derive function, so `upstream` works for all of them.
    let derivedColumns: Getter<FlatColumn<Item, Plugins>[]> = () => flatColumns
    for (const [name, instance] of pluginEntries) {
        upstreamFlatColumnsFor.set(name, derivedColumns)
        if (instance.deriveFlatColumns !== undefined) {
            derivedColumns = instance.deriveFlatColumns(derivedColumns)
        }
    }
    const derivedColumnsFn = derivedColumns
    const visibleColumns = $derived.by(() => measure('visibleColumns', derivedColumnsFn))

    // ---- Rows -----------------------------------------------------------------

    const columnedRows = $derived.by(() =>
        measure('columnedRows', () =>
            getColumnedBodyRows(
                originalRows,
                visibleColumns.map((c) => c.id)
            )
        )
    )

    let rows: Getter<DataBodyRow<Item, Plugins>[]> = () => columnedRows
    for (const [name, instance] of pluginEntries) {
        upstreamRowsFor.set(name, rows)
        if (instance.deriveRows !== undefined) rows = instance.deriveRows(rows)
    }
    const rowsFn = rows

    // One binding per component kind, shared by every component of that
    // kind. Plugin shape is static after createTable, so the hook factories
    // are resolved once here; each component calls them lazily, on its first
    // `current` read.
    const bodyRowBinding: ComponentBinding<Item, Plugins, BodyRow<Item, Plugins>> = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'tbody.tr')
    }
    const bodyCellBinding: ComponentBinding<Item, Plugins, BodyCell<Item, Plugins>> = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'tbody.tr.td')
    }
    const headerRowBinding: ComponentBinding<Item, Plugins, HeaderRow<Item, Plugins>> = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'thead.tr')
    }
    const headerCellBinding: ComponentBinding<Item, Plugins, HeaderCell<Item, Plugins>> = {
        state: tableState,
        hooks: hookEntriesFor(pluginEntries, 'thead.tr.th')
    }

    // Binding mutates the row and cell objects this derivation produced,
    // which is allowed; assigning rune state here is not.
    const injectedRows = $derived.by(() =>
        measure('injectedRows', () => {
            const rowsValue = rowsFn()
            bindRows(rowsValue, bodyRowBinding, bodyCellBinding)
            return rowsValue
        })
    )

    // Derive from `injectedRows` so page rows carry state and hooks.
    let pageRows: Getter<DataBodyRow<Item, Plugins>[]> = () => injectedRows
    for (const [name, instance] of pluginEntries) {
        upstreamPageRowsFor.set(name, pageRows)
        if (instance.derivePageRows !== undefined) pageRows = instance.derivePageRows(pageRows)
    }
    const pageRowsFn = pageRows

    // Bound too, so a `derivePageRows` plugin that produces new row objects
    // still hands out rows with state and hooks.
    const injectedPageRows = $derived.by(() =>
        measure('injectedPageRows', () => {
            const pageRowsValue = pageRowsFn()
            bindRows(pageRowsValue, bodyRowBinding, bodyCellBinding)
            return pageRowsValue
        })
    )

    // ---- Header rows ------------------------------------------------------------

    const headerRows = $derived.by(() =>
        measure('headerRows', () => {
            const headerRowsValue = getHeaderRows(
                columns,
                visibleColumns.map((c) => c.id)
            )
            bindRows(headerRowsValue, headerRowBinding, headerCellBinding)
            return headerRowsValue
        })
    )

    const countDefined = (key: 'deriveFlatColumns' | 'deriveRows' | 'derivePageRows') =>
        pluginInstances.filter((pluginInstance) => pluginInstance[key] !== undefined).length

    const _debug: ViewModelDebug = {
        pluginCount: Object.keys(plugins).length,
        pluginNames: Object.keys(plugins),
        derivedCount: {
            tableAttrs: deriveTableAttrsFns.length + 1, // +1 for finalized
            tableHeadAttrs: deriveTableHeadAttrsFns.length + 1,
            tableBodyAttrs: deriveTableBodyAttrsFns.length + 1,
            visibleColumns: countDefined('deriveFlatColumns') + 1, // +1 for the view model's own
            rows: countDefined('deriveRows') + 2, // +2 for columned + injected
            pageRows: countDefined('derivePageRows') + 1 // +1 for injected
        },
        derivationCalls,
        derivationTimings,
        resetCounters: () => {
            Object.keys(derivationCalls).forEach((key) => {
                derivationCalls[key as DerivationName] = 0
                derivationTimings[key as DerivationName] = 0
            })
        },
        getTotalCalls: () => {
            return Object.values(derivationCalls).reduce((sum, count) => sum + count, 0)
        },
        getTotalMs: () => {
            return Object.values(derivationTimings).reduce((sum, ms) => sum + ms, 0)
        }
    }

    const current: ViewModelCurrent<Item, Plugins> = {
        get tableAttrs() {
            return finalizedTableAttrs
        },
        get tableHeadAttrs() {
            return finalizedTableHeadAttrs
        },
        get tableBodyAttrs() {
            return finalizedTableBodyAttrs
        },
        get visibleColumns() {
            return visibleColumns
        },
        get headerRows() {
            return headerRows
        },
        get originalRows() {
            return originalRows
        },
        get rows() {
            return injectedRows
        },
        get pageRows() {
            return injectedPageRows
        }
    }

    return {
        current,
        flatColumns,
        pluginStates,
        _debug
    }
}
