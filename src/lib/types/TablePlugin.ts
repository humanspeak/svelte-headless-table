import type { BodyCell, BodyCellAttributes } from '../bodyCells.js'
import type { BodyRow, BodyRowAttributes } from '../bodyRows.js'
import type { FlatColumn } from '../columns.js'
import type {
    PluginInitTableState,
    TableAttributes,
    TableBodyAttributes,
    TableHeadAttributes
} from '../createViewModel.svelte.js'
import type { HeaderCell, HeaderCellAttributes } from '../headerCells.js'
import type { HeaderRow, HeaderRowAttributes } from '../headerRows.js'
import type { Getter } from '../reactivity.svelte.js'

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
    /**
     * The table state. Its members are getters that resolve lazily, so a
     * plugin may read values the view model produces after the plugin was
     * created (for example `tableState.rows()` inside a hook getter).
     */
    tableState: PluginInitTableState<Item>
    /** Column options keyed by column ID. */
    columnOptions: Record<string, ColumnOptions>
    /**
     * The values entering this plugin's position in each derivation chain:
     * what its own `deriveRows` / `derivePageRows` / `deriveFlatColumns`
     * receives, available from the moment the plugin is created. Read them
     * inside a getter, a `$derived` or a hook so the read is tracked.
     */
    upstream: PluginUpstream<Item>
}

/**
 * The inputs of one plugin's position in the view model's derivation chains.
 * Every member is a getter the view model resolves lazily, so it is safe to
 * keep from the moment the plugin is created.
 *
 * @template Item - The type of data items in the table.
 */
export interface PluginUpstream<Item> {
    /** The rows before this plugin's `deriveRows`. */
    rows: Getter<BodyRow<Item>[]>
    /** The rows before this plugin's `derivePageRows`. */
    pageRows: Getter<BodyRow<Item>[]>
    /** The columns before this plugin's `deriveFlatColumns`. */
    flatColumns: Getter<FlatColumn<Item>[]>
}

/**
 * A plugin instance returned by a TablePlugin factory.
 * Contains state, transformation functions, and component hooks.
 *
 * The derive functions take a {@link Getter} for the upstream value and return
 * a getter for the transformed value, usually backed by a `$derived.by`.
 * Getters are read inside a `$derived` or a template so their dependencies are
 * tracked. Rules for plugin authors:
 *
 * - Never write rune state (`$state`, a `Box`) while a getter or `$derived` is
 *   being evaluated; Svelte throws `state_unsafe_mutation`. Clamp on read
 *   instead of writing back, and expose "pre-transform" values by reading
 *   the init argument's `upstream` getters rather than copying them into state.
 * - Allocate event handlers once per component in the hook factory and return
 *   them from the `props` getter; do not allocate them on every read.
 *
 * @template Item - The type of data items in the table.
 * @template PluginState - The state exposed by the plugin.
 * @template _ColumnOptions - Per-column configuration options (kept for inference by
 *   {@link PluginColumnConfigs}; not used by the instance shape).
 * @template TablePropSet - Props added to table components.
 * @template TableAttributeSet - Attributes added to table components.
 */
export type TablePluginInstance<
    Item,
    PluginState,
    _ColumnOptions,
    TablePropSet extends AnyTablePropSet = AnyTablePropSet,
    TableAttributeSet extends AnyTableAttributeSet = AnyTableAttributeSet
> = {
    /** State exposed on `viewModel.pluginStates[pluginName]`. */
    pluginState: PluginState
    deriveFlatColumns?: DeriveFlatColumnsFn<Item>
    deriveRows?: DeriveRowsFn<Item>
    derivePageRows?: DeriveRowsFn<Item>
    deriveTableAttrs?: DeriveFn<TableAttributes<Item>>
    deriveTableHeadAttrs?: DeriveFn<TableHeadAttributes<Item>>
    deriveTableBodyAttrs?: DeriveFn<TableBodyAttributes<Item>>
    hooks?: TableHooks<Item, TablePropSet, TableAttributeSet>
}

/**
 * A record of table plugins, keyed by plugin name.
 * Used as a type constraint for the plugins parameter.
 */
export type AnyPlugins = Record<
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    any,
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    TablePlugin<any, any, any, any, any>
>

/**
 * Derives the visible flat columns from the upstream columns.
 * Receives a getter for the upstream columns and returns a getter for the result.
 *
 * @template Item - The type of data items in the table.
 */
export type DeriveFlatColumnsFn<Item> = <Col extends FlatColumn<Item>>(
    _flatColumns: Getter<Col[]>
) => Getter<Col[]>

/**
 * Derives rows from the upstream rows.
 * Receives a getter for the upstream rows and returns a getter for the result.
 *
 * @template Item - The type of data items in the table.
 */
export type DeriveRowsFn<Item> = <Row extends BodyRow<Item>>(_rows: Getter<Row[]>) => Getter<Row[]>

/**
 * A generic derivation: a getter for the upstream value in, a getter for the
 * derived value out.
 *
 * @template T - The type being derived.
 */
export type DeriveFn<T> = (_value: Getter<T>) => Getter<T>

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

type TablePropSet<PropSet extends Partial<Record<ComponentKeys, unknown>>> = {
    [K in ComponentKeys]: PropSet[K]
}

/**
 * Creates a new table prop set type, filtering out undefined component props.
 *
 * @template PropSet - The prop set definition.
 */
export type NewTablePropSet<PropSet extends Partial<Record<ComponentKeys, unknown>>> = {
    [K in ComponentKeys]: unknown extends PropSet[K] ? never : PropSet[K]
}

/**
 * A table prop set with any types. Used as a type constraint.
 */
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export type AnyTablePropSet = TablePropSet<any>

/**
 * Internal type for mapping component keys to attribute sets.
 * @internal
 */
type TableAttributeSet<AttributeSet extends Partial<Record<ComponentKeys, unknown>>> = {
    [K in ComponentKeys]: AttributeSet[K]
}

/**
 * Creates a new table attribute set type, filtering out undefined component attributes.
 *
 * @template AttributeSet - The attribute set definition.
 */
export type NewTableAttributeSet<AttributeSet extends Partial<Record<ComponentKeys, unknown>>> = {
    [K in ComponentKeys]: unknown extends AttributeSet[K] ? never : AttributeSet[K]
}

/**
 * A table attribute set with any types. Used as a type constraint.
 */
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export type AnyTableAttributeSet = TableAttributeSet<any>

/**
 * Hooks for attaching props and attributes to table components.
 * Each hook receives a component and returns props/attrs getters.
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
 * Contains optional getters for props and attributes. They are called on every
 * read of `component.current.props` / `component.current.attrs`, so they
 * should be cheap and must not write rune state.
 *
 * @template Props - The props type.
 * @template Attributes - The attributes type.
 */
export type ElementHook<Props, Attributes> = {
    /** Returns the plugin's props for the component. */
    props?: Getter<Props>
    /** Returns the plugin's attributes for the component. */
    attrs?: Getter<Attributes>
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
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
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
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    [K in keyof Plugins]: Plugins[K] extends TablePlugin<any, any, infer ColumnOptions, any, any>
        ? ColumnOptions | undefined
        : never
}>
