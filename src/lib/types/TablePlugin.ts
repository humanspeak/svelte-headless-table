import type { Readable } from 'svelte/store'
import type { BodyCell, BodyCellAttributes } from '../bodyCells.js'
import type { BodyRow, BodyRowAttributes } from '../bodyRows.js'
import type { DataColumn, FlatColumn } from '../columns.js'
import type {
    PluginInitTableState,
    TableAttributes,
    TableBodyAttributes,
    TableHeadAttributes
} from '../createViewModel.js'
import type { HeaderCell, HeaderCellAttributes } from '../headerCells.js'
import type { HeaderRow, HeaderRowAttributes } from '../headerRows.js'

/**
 * A table plugin factory function.
 * Receives initialization options and returns a plugin instance.
 *
 * @template Item - The type of data items in the table.
 * @template PluginState - The state exposed by the plugin.
 * @template ColumnOptions - Per-column configuration options.
 * @template TablePropSet - Props added to table components.
 * @template TableAttributeSet - Attributes added to table components.
 */
export type TablePlugin<
    Item,
    PluginState,
    ColumnOptions,
    TablePropSet extends AnyTablePropSet = AnyTablePropSet,
    TableAttributeSet extends AnyTableAttributeSet = AnyTableAttributeSet
> = (
    _init: TablePluginInit<Item, ColumnOptions>
) => TablePluginInstance<Item, PluginState, ColumnOptions, TablePropSet, TableAttributeSet>

/**
 * Initialization options passed to a table plugin.
 *
 * @template Item - The type of data items in the table.
 * @template ColumnOptions - Per-column configuration options.
 */
export type TablePluginInit<Item, ColumnOptions> = {
    /** The name/key of this plugin in the plugins object. */
    pluginName: string
    /** The table state during plugin initialization. */
    tableState: PluginInitTableState<Item>
    /** Column options keyed by column ID. */
    columnOptions: Record<string, ColumnOptions>
}

/**
 * A plugin instance returned by a TablePlugin factory.
 * Contains state, transformation functions, and component hooks.
 *
 * @template Item - The type of data items in the table.
 * @template PluginState - The state exposed by the plugin.
 * @template ColumnOptions - Per-column configuration options.
 * @template TablePropSet - Props added to table components.
 * @template TableAttributeSet - Attributes added to table components.
 */
export type TablePluginInstance<
    Item,
    PluginState,
    ColumnOptions,
    TablePropSet extends AnyTablePropSet = AnyTablePropSet,
    TableAttributeSet extends AnyTableAttributeSet = AnyTableAttributeSet
> = {
    pluginState: PluginState
    transformFlatColumnsFn?: Readable<TransformFlatColumnsFn<Item>>
    deriveFlatColumns?: DeriveFlatColumnsFn<Item>
    deriveRows?: DeriveRowsFn<Item>
    derivePageRows?: DeriveRowsFn<Item>
    deriveTableAttrs?: DeriveFn<TableAttributes<Item>>
    deriveTableHeadAttrs?: DeriveFn<TableHeadAttributes<Item>>
    deriveTableBodyAttrs?: DeriveFn<TableBodyAttributes<Item>>
    columnOptions?: ColumnOptions
    hooks?: TableHooks<Item, TablePropSet, TableAttributeSet>
}

/**
 * A record of table plugins, keyed by plugin name.
 * Used as a type constraint for the plugins parameter.
 */
export type AnyPlugins = Record<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TablePlugin<any, any, any, any, any>
>

/**
 * A record of plugin instances, keyed by plugin name.
 * Used internally after plugins are initialized.
 */
export type AnyPluginInstances = Record<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TablePluginInstance<any, any, any, any, any>
>

/**
 * A synchronous function that transforms flat columns.
 *
 * @template Item - The type of data items in the table.
 */
export type TransformFlatColumnsFn<Item> = (_flatColumns: DataColumn<Item>[]) => DataColumn<Item>[]

/**
 * A reactive function that derives flat columns from a store.
 *
 * @template Item - The type of data items in the table.
 */
export type DeriveFlatColumnsFn<Item> = <Col extends FlatColumn<Item>>(
    _flatColumns: Readable<Col[]>
) => Readable<Col[]>

/**
 * A reactive function that derives rows from a store.
 *
 * @template Item - The type of data items in the table.
 */
export type DeriveRowsFn<Item> = <Row extends BodyRow<Item>>(
    _rows: Readable<Row[]>
) => Readable<Row[]>

/**
 * A generic reactive derivation function.
 *
 * @template T - The type being derived.
 */
export type DeriveFn<T> = (_obj: Readable<T>) => Readable<T>

/**
 * Maps component keys to their corresponding component types.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type Components<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    'thead.tr': HeaderRow<Item, Plugins>
    'thead.tr.th': HeaderCell<Item, Plugins>
    'tbody.tr': BodyRow<Item, Plugins>
    'tbody.tr.td': BodyCell<Item, Plugins>
}

/**
 * Maps component keys to their corresponding attribute types.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type AttributesForKey<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    'thead.tr': HeaderRowAttributes<Item, Plugins>
    'thead.tr.th': HeaderCellAttributes<Item, Plugins>
    'tbody.tr': BodyRowAttributes<Item, Plugins>
    'tbody.tr.td': BodyCellAttributes<Item, Plugins>
}

/**
 * Valid keys for table components: header rows, header cells, body rows, body cells.
 */
export type ComponentKeys = keyof Components<unknown>

type TablePropSet<
    PropSet extends {
        /* trunk-ignore(eslint/no-unused-vars) */
        [_K in ComponentKeys]?: unknown
    }
> = {
    [K in ComponentKeys]: PropSet[K]
}

/**
 * Creates a new table prop set type, filtering out undefined component props.
 *
 * @template PropSet - The prop set definition.
 */
export type NewTablePropSet<
    PropSet extends {
        /* trunk-ignore(eslint/no-unused-vars) */
        [_K in ComponentKeys]?: unknown
    }
> = {
    [K in ComponentKeys]: unknown extends PropSet[K] ? never : PropSet[K]
}

/**
 * A table prop set with any types. Used as a type constraint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTablePropSet = TablePropSet<any>

/**
 * Internal type for mapping component keys to attribute sets.
 * @internal
 */
type TableAttributeSet<
    AttributeSet extends {
        /* trunk-ignore(eslint/no-unused-vars) */
        [_K in ComponentKeys]?: unknown
    }
> = {
    [K in ComponentKeys]: AttributeSet[K]
}

/**
 * Creates a new table attribute set type, filtering out undefined component attributes.
 *
 * @template AttributeSet - The attribute set definition.
 */
export type NewTableAttributeSet<
    AttributeSet extends {
        /* trunk-ignore(eslint/no-unused-vars) */
        [_K in ComponentKeys]?: unknown
    }
> = {
    [K in ComponentKeys]: unknown extends AttributeSet[K] ? never : AttributeSet[K]
}

/**
 * A table attribute set with any types. Used as a type constraint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTableAttributeSet = TableAttributeSet<any>

/**
 * Hooks for attaching props and attributes to table components.
 * Each hook receives a component and returns props/attrs stores.
 *
 * @template Item - The type of data items in the table.
 * @template PropSet - The prop set type.
 * @template AttributeSet - The attribute set type.
 */
export type TableHooks<
    Item,
    PropSet extends AnyTablePropSet = AnyTablePropSet,
    AttributeSet extends AnyTableAttributeSet = AnyTableAttributeSet
> = {
    [ComponentKey in keyof Components<Item>]?: (
        _component: Components<Item>[ComponentKey]
    ) => ElementHook<PropSet[ComponentKey], AttributeSet[ComponentKey]>
}

/**
 * Return type for component hooks.
 * Contains optional readable stores for props and attributes.
 *
 * @template Props - The props type.
 * @template Attributes - The attributes type.
 */
export type ElementHook<Props, Attributes> = {
    /** Reactive props store. */
    props?: Readable<Props>
    /** Reactive attributes store. */
    attrs?: Readable<Attributes>
}

/**
 * Extracts the plugin state types from a plugins record.
 *
 * @template Plugins - The plugins record type.
 */
export type PluginStates<Plugins extends AnyPlugins> = {
    [K in keyof Plugins]: ReturnType<Plugins[K]>['pluginState']
}

/**
 * Internal type for extracting prop sets from plugins.
 * @internal
 */
type TablePropSetForPluginKey<Plugins extends AnyPlugins> = {
    // Plugins[K] does not extend TablePlugin<unknown, unknown, unknown, infer TablePropSet>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof Plugins]: Plugins[K] extends TablePlugin<any, any, any, infer TablePropSet>
        ? TablePropSet
        : never
}

/**
 * Combines prop sets from all plugins into a single type.
 * Props are grouped by component key, then by plugin key.
 *
 * @template Plugins - The plugins record type.
 */
export type PluginTablePropSet<Plugins extends AnyPlugins> = {
    [ComponentKey in ComponentKeys]: {
        [PluginKey in keyof Plugins]: TablePropSetForPluginKey<Plugins>[PluginKey][ComponentKey]
    }
}

/**
 * Extracts column configuration types from all plugins.
 * Used to type the `plugins` option in column definitions.
 *
 * @template Plugins - The plugins record type.
 */
export type PluginColumnConfigs<Plugins extends AnyPlugins> = Partial<{
    [K in keyof Plugins]: ReturnType<Plugins[K]>['columnOptions']
}>
