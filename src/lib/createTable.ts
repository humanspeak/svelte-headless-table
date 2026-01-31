import {
    DataColumn,
    DisplayColumn,
    getFlatColumnIds,
    GroupColumn,
    type Column,
    type DataColumnInit,
    type DataColumnInitBase,
    type DataColumnInitFnAndId,
    type DataColumnInitIdAndKey,
    type DataColumnInitKey,
    type DisplayColumnInit,
    type GroupColumnInit
} from '$lib/columns.js'
import {
    createViewModel,
    type CreateViewModelOptions,
    type TableViewModel
} from '$lib/createViewModel.js'
import type { AnyPlugins } from '$lib/types/TablePlugin.js'
import { getDuplicates } from '$lib/utils/array.js'
import type { ReadOrWritable } from '$lib/utils/store.js'

/**
 * Core table class that provides methods for defining columns and creating view models.
 * Use the `createTable` factory function to instantiate.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @example
 * ```typescript
 * const table = createTable(data, { sort: addSortBy(), filter: addTableFilter() })
 * const columns = table.createColumns([
 *   table.column({ accessor: 'name', header: 'Name' }),
 *   table.column({ accessor: 'age', header: 'Age' })
 * ])
 * const viewModel = table.createViewModel(columns)
 * ```
 */
export class Table<Item, Plugins extends AnyPlugins = AnyPlugins> {
    /** The data source, either a Readable or Writable Svelte store. */
    data: ReadOrWritable<Item[]>
    /** The plugins configuration object. */
    plugins: Plugins

    /**
     * Creates a new Table instance.
     *
     * @param data - A Svelte store containing the table data.
     * @param plugins - The plugins to use with this table.
     */
    constructor(data: ReadOrWritable<Item[]>, plugins: Plugins) {
        this.data = data
        this.plugins = plugins
    }

    /**
     * Validates and returns the column definitions.
     * Throws an error if duplicate column IDs are detected.
     *
     * @param columns - Array of column definitions.
     * @returns The same columns array if validation passes.
     * @throws Error if duplicate column IDs are found.
     */
    createColumns(columns: Column<Item, Plugins>[]): Column<Item, Plugins>[] {
        const ids = getFlatColumnIds(columns)
        const duplicateIds = getDuplicates(ids)
        if (duplicateIds.length !== 0) {
            throw new Error(`Duplicate column ids not allowed: "${duplicateIds.join('", "')}"`)
        }
        return columns
    }

    /**
     * Creates a data column that displays values from the data items.
     * Supports three initialization patterns:
     * - `accessorKey` only: Uses a property key from Item
     * - `accessorKey` and `id`: Uses a property key with a custom ID
     * - `accessorFn` and `id`: Uses a function to extract values
     *
     * @param def - The column definition object.
     * @returns A new DataColumn instance.
     * @example
     * ```typescript
     * table.column({ accessor: 'name', header: 'Name' })
     * table.column({ accessor: (item) => item.firstName + ' ' + item.lastName, header: 'Full Name', id: 'fullName' })
     * ```
     */
    // `accessorKey` only
    column<Id extends Exclude<keyof Item, symbol>>(
        /* trunk-ignore(eslint/no-unused-vars) */
        def: DataColumnInitBase<Item, Plugins, Item[Id]> & DataColumnInitKey<Item, Id>
    ): DataColumn<Item, Plugins, `${Id}`, Item[Id]>
    // `accessorKey` and `id`
    column<Id extends string, Key extends keyof Item>(
        /* trunk-ignore(eslint/no-unused-vars) */
        def: DataColumnInitBase<Item, Plugins, Item[Key]> & DataColumnInitIdAndKey<Item, Id, Key>
    ): DataColumn<Item, Plugins, Id, Item[Key]>
    // `accessorFn` and `id`
    column<Id extends string, Value>(
        /* trunk-ignore(eslint/no-unused-vars) */
        def: DataColumnInitBase<Item, Plugins, Value> & DataColumnInitFnAndId<Item, Id, Value>
    ): DataColumn<Item, Plugins, Id, Value>
    column<Id extends string, Value>(def: DataColumnInit<Item, Plugins, Id, Value>) {
        return new DataColumn(def)
    }

    /**
     * Creates a group column that contains other columns.
     * Used for creating hierarchical column headers.
     *
     * @param def - The group column definition.
     * @returns A new GroupColumn instance.
     * @example
     * ```typescript
     * table.group({
     *   header: 'Personal Info',
     *   columns: [
     *     table.column({ accessor: 'firstName', header: 'First Name' }),
     *     table.column({ accessor: 'lastName', header: 'Last Name' })
     *   ]
     * })
     * ```
     */
    group(def: GroupColumnInit<Item, Plugins>): GroupColumn<Item, Plugins> {
        return new GroupColumn(def)
    }

    /**
     * Creates a display column for non-data content like actions or selection checkboxes.
     *
     * @param def - The display column definition.
     * @returns A new DisplayColumn instance.
     * @example
     * ```typescript
     * table.display({
     *   id: 'actions',
     *   header: '',
     *   cell: ({ row }) => createRender(ActionButtons, { row })
     * })
     * ```
     */
    display(def: DisplayColumnInit<Item, Plugins>): DisplayColumn<Item, Plugins> {
        return new DisplayColumn(def)
    }

    /**
     * Creates a reactive view model from the table and columns.
     * The view model provides all the data needed to render the table.
     *
     * @param columns - The column definitions.
     * @param options - Optional configuration for the view model.
     * @returns A TableViewModel with reactive stores for rendering.
     */
    createViewModel(
        columns: Column<Item, Plugins>[],
        options?: CreateViewModelOptions<Item>
    ): TableViewModel<Item, Plugins> {
        return createViewModel(this, columns, options)
    }
}

/**
 * Factory function to create a new Table instance.
 * This is the main entry point for using svelte-headless-table.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins configuration type.
 * @param data - A Svelte store containing the table data.
 * @param plugins - Optional plugins configuration object.
 * @returns A new Table instance.
 * @example
 * ```typescript
 * import { createTable } from 'svelte-headless-table'
 * import { addSortBy, addPagination } from 'svelte-headless-table/plugins'
 *
 * const data = writable([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }])
 * const table = createTable(data, {
 *   sort: addSortBy(),
 *   page: addPagination({ initialPageSize: 10 })
 * })
 * ```
 */
export const createTable = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    data: ReadOrWritable<Item[]>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: Plugins = {} as any
): Table<Item, Plugins> => {
    return new Table(data, plugins)
}
