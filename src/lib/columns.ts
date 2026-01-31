import type { DisplayBodyCell } from '$lib/bodyCells.js'
import type { TableState } from '$lib/createViewModel.js'
import type { DataLabel, DisplayLabel, HeaderLabel } from '$lib/types/Label.js'
import type { AnyPlugins, PluginColumnConfigs } from '$lib/types/TablePlugin.js'

/**
 * Initialization options for a Column.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 */
export interface ColumnInit<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** The header label or render function. */
    header: HeaderLabel<Item, Plugins>
    /** Optional footer label or render function. */
    footer?: HeaderLabel<Item, Plugins>
    /** The height of the column in header rows (for grouping). */
    height: number
    /** Plugin-specific column configuration. */
    plugins?: PluginColumnConfigs<Plugins>
}

/**
 * Base class for all column types in the table.
 * Provides type guards for determining the specific column type.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 */
export class Column<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** The header label or render function. */
    header: HeaderLabel<Item, Plugins>
    /** Optional footer label or render function. */
    footer?: HeaderLabel<Item, Plugins>
    /** The height of the column in header rows. */
    height: number
    /** Plugin-specific column configuration. */
    plugins?: PluginColumnConfigs<Plugins>

    /**
     * Creates a new Column instance.
     *
     * @param init - The column initialization options.
     */
    constructor({ header, footer, height, plugins }: ColumnInit<Item, Plugins>) {
        this.header = header
        this.footer = footer
        this.height = height
        this.plugins = plugins
    }

    /**
     * Type guard to check if this column is a FlatColumn (DataColumn or DisplayColumn).
     *
     * @returns True if this is a FlatColumn.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isFlat(): this is FlatColumn<Item, Plugins> {
        return '__flat' in this
    }

    /**
     * Type guard to check if this column is a DataColumn.
     *
     * @returns True if this is a DataColumn.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isData(): this is DataColumn<Item, Plugins> {
        return '__data' in this
    }

    /**
     * Type guard to check if this column is a DisplayColumn.
     *
     * @returns True if this is a DisplayColumn.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isDisplay(): this is DisplayColumn<Item, Plugins> {
        return '__display' in this
    }

    /**
     * Type guard to check if this column is a GroupColumn.
     *
     * @returns True if this is a GroupColumn.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isGroup(): this is GroupColumn<Item, Plugins> {
        return '__group' in this
    }
}

/**
 * Initialization options for a FlatColumn.
 * Height is always 1 for flat columns.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 */
export type FlatColumnInit<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Id extends string = any
> = Omit<ColumnInit<Item, Plugins>, 'height'> & {
    /** Optional unique identifier for the column. Defaults to the header string. */
    id?: Id
}

/**
 * A column that occupies a single row in the header (not a group).
 * Base class for DataColumn and DisplayColumn.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 */
export class FlatColumn<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Id extends string = any
> extends Column<Item, Plugins> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __flat = true

    /** The unique identifier for this column. */
    id: Id

    /**
     * Creates a new FlatColumn instance.
     *
     * @param init - The column initialization options.
     */
    constructor({ header, footer, plugins, id }: FlatColumnInit<Item, Plugins>) {
        super({ header, footer, plugins, height: 1 })
        this.id = id ?? String(header)
    }
}

/**
 * Full initialization type for a DataColumn.
 * Supports three accessor patterns: key only, key with ID, or function with ID.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 * @template Value - The type of the cell value.
 */
export type DataColumnInit<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    Id extends string = string,
    Value = unknown
> = DataColumnInitBase<Item, Plugins, Value> &
    (
        | (Id extends keyof Item ? DataColumnInitKey<Item, Id> : never)
        | DataColumnInitIdAndKey<Item, Id, keyof Item>
        | DataColumnInitFnAndId<Item, Id, Value>
    )

/**
 * Base initialization options for a DataColumn.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Value - The type of the cell value.
 */
export type DataColumnInitBase<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    Value = unknown
> = Omit<ColumnInit<Item, Plugins>, 'height'> & {
    /** Optional custom cell renderer. */
    cell?: DataLabel<Item, Plugins, Value>
}

/**
 * DataColumn init when using an accessor key that matches Item property.
 *
 * @template Item - The type of data items.
 * @template Id - The key of Item to access.
 */
export type DataColumnInitKey<Item, Id extends keyof Item> = {
    /** The property key to access on each item. */
    accessor: Id
    /** Optional ID override. Defaults to accessor key. */
    id?: Id
}

/**
 * DataColumn init when using an accessor key with a custom ID.
 *
 * @template Item - The type of data items.
 * @template Id - The column ID type.
 * @template Key - The key of Item to access.
 */
export type DataColumnInitIdAndKey<Item, Id extends string, Key extends keyof Item> = {
    /** The property key to access on each item. */
    accessor: Key
    /** Optional custom ID for the column. */
    id?: Id
}

/**
 * DataColumn init when using an accessor function.
 *
 * @template Item - The type of data items.
 * @template Id - The column ID type.
 * @template Value - The return type of the accessor function.
 */
export type DataColumnInitFnAndId<Item, Id extends string, Value> = {
    /** Function to extract the value from each item, or a property key. */
    /* trunk-ignore(eslint/no-unused-vars) */
    accessor: keyof Item | ((item: Item) => Value)
    /** Optional custom ID for the column. */
    id?: Id
}

/**
 * A column that displays data from the table items.
 * Uses an accessor (key or function) to extract values from each row.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 * @template Value - The type of the cell value.
 */
export class DataColumn<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Id extends string = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Value = any
> extends FlatColumn<Item, Plugins, Id> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __data = true

    /** Optional custom cell renderer. */
    cell?: DataLabel<Item, Plugins, Value>
    /** The property key used to access values (if using key accessor). */
    accessorKey?: keyof Item
    /** The function used to extract values (if using function accessor). */
    /* trunk-ignore(eslint/no-unused-vars) */
    accessorFn?: (item: Item) => Value

    /**
     * Creates a new DataColumn instance.
     *
     * @param init - The column initialization options.
     * @throws Error if no id, accessor key, or header is provided.
     */
    constructor({
        header,
        footer,
        plugins,
        cell,
        accessor,
        id
    }: DataColumnInit<Item, Plugins, Id, Value>) {
        super({ header, footer, plugins, id: 'Initialization not complete' })
        this.cell = cell
        if (accessor instanceof Function) {
            this.accessorFn = accessor
        } else {
            this.accessorKey = accessor
        }
        if (id === undefined && this.accessorKey === undefined && header === undefined) {
            throw new Error('A column id, string accessor, or header is required')
        }
        const accessorKeyId = typeof this.accessorKey === 'string' ? this.accessorKey : null
        this.id = (id ?? accessorKeyId ?? String(header)) as Id
    }

    /**
     * Extracts the value from a data item using the configured accessor.
     *
     * @param item - The data item to extract the value from.
     * @returns The extracted value, or undefined if no accessor is configured.
     */
    /* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */
    getValue(item: Item): any {
        if (this.accessorFn !== undefined) {
            return this.accessorFn(item)
        }
        if (this.accessorKey !== undefined) {
            return item[this.accessorKey]
        }
        return undefined
    }
}

/**
 * Function type for getting custom data from a DisplayColumn cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 */
export type DisplayColumnDataGetter<Item, Plugins extends AnyPlugins = AnyPlugins> = (
    /* trunk-ignore(eslint/no-unused-vars) */
    cell: DisplayBodyCell<Item>,
    /* trunk-ignore(eslint/no-unused-vars) */
    state?: TableState<Item, Plugins>
) => unknown

/**
 * Initialization options for a DisplayColumn.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 */
export type DisplayColumnInit<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Id extends string = any
> = FlatColumnInit<Item, Plugins, Id> & {
    /** The cell renderer function. */
    cell: DisplayLabel<Item, Plugins>
    /** Optional function to provide custom data to the cell. */
    data?: DisplayColumnDataGetter<Item, Plugins>
}

/**
 * A column for displaying non-data content like actions, checkboxes, or custom UI.
 * Unlike DataColumn, it doesn't extract values from the data items automatically.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @template Id - The column ID type.
 */
export class DisplayColumn<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Id extends string = any
> extends FlatColumn<Item, Plugins, Id> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __display = true

    /** The cell renderer function. */
    cell: DisplayLabel<Item, Plugins>
    /** Optional function to provide custom data to the cell. */
    data?: DisplayColumnDataGetter<Item, Plugins>

    /**
     * Creates a new DisplayColumn instance.
     *
     * @param init - The column initialization options.
     */
    constructor({ header, footer, plugins, id, cell, data }: DisplayColumnInit<Item, Plugins, Id>) {
        super({ header, footer, plugins, id })
        this.cell = cell
        this.data = data
    }
}

/**
 * Initialization options for a GroupColumn.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 */
export type GroupColumnInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    ColumnInit<Item, Plugins>,
    'height'
> & {
    /** The child columns contained within this group. */
    columns: Column<Item, Plugins>[]
}

/**
 * A column that groups other columns under a shared header.
 * Creates a hierarchical header structure.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 */
export class GroupColumn<Item, Plugins extends AnyPlugins = AnyPlugins> extends Column<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __group = true

    /** The child columns contained within this group. */
    columns: Column<Item, Plugins>[]
    /** The IDs of all flat columns within this group (recursively). */
    ids: string[]

    /**
     * Creates a new GroupColumn instance.
     * Height is calculated as max child height + 1.
     *
     * @param init - The column initialization options.
     */
    constructor({ header, footer, columns, plugins }: GroupColumnInit<Item, Plugins>) {
        const height = Math.max(...columns.map((c) => c.height)) + 1
        super({ header, footer, height, plugins })
        this.columns = columns
        this.ids = getFlatColumnIds(columns)
    }
}

/**
 * Extracts all flat column IDs from an array of columns (including nested groups).
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @param columns - The array of columns to extract IDs from.
 * @returns An array of column ID strings.
 */
export const getFlatColumnIds = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columns: Column<Item, Plugins>[]
): string[] => columns.flatMap((c) => (c.isFlat() ? [c.id] : c.isGroup() ? c.ids : []))

/**
 * Extracts all FlatColumns from an array of columns (including nested groups).
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @param columns - The array of columns to flatten.
 * @returns An array of FlatColumn instances.
 */
export const getFlatColumns = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columns: Column<Item, Plugins>[]
): FlatColumn<Item, Plugins>[] => {
    return columns.flatMap((c) => (c.isFlat() ? [c] : c.isGroup() ? getFlatColumns(c.columns) : []))
}
