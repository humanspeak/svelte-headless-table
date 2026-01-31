import { NBSP } from '$lib/constants.js'
import type { TableState } from '$lib/createViewModel.js'
import { TableComponent } from '$lib/tableComponent.js'
import type { HeaderLabel } from '$lib/types/Label.js'
import type { AnyPlugins } from '$lib/types/TablePlugin.js'
import type { RenderConfig } from '@humanspeak/svelte-render'
import { derived } from 'svelte/store'

/**
 * Initialization options for creating a HeaderCell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type HeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    /** Unique identifier for the cell. */
    id: string
    /** Label content or render function for the header. */
    label: HeaderLabel<Item, Plugins>
    /** Number of columns this cell spans. */
    colspan: number
    /** Starting column index. */
    colstart: number
}

/**
 * HTML attributes for a header cell element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
/* trunk-ignore(eslint/@typescript-eslint/no-unused-vars) */
/* trunk-ignore(eslint/no-unused-vars) */
export type HeaderCellAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    role: 'columnheader'
    colspan: number
}

/**
 * Abstract base class representing a cell in the table header.
 * Extended by FlatHeaderCell, DataHeaderCell, GroupHeaderCell, etc.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export abstract class HeaderCell<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> extends TableComponent<Item, Plugins, 'thead.tr.th'> {
    /** Label content or render function for the header. */
    label: HeaderLabel<Item, Plugins>
    /** Number of columns this cell spans. */
    colspan: number
    /** Starting column index. */
    colstart: number

    /**
     * Creates a new HeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({ id, label, colspan, colstart }: HeaderCellInit<Item, Plugins>) {
        super({ id })
        this.label = label
        this.colspan = colspan
        this.colstart = colstart
    }

    /**
     * Renders the header cell content.
     *
     * @returns The render configuration for displaying this cell.
     * @throws Error if state reference is missing when using a function label.
     */
    render(): RenderConfig {
        if (this.label instanceof Function) {
            if (this.state === undefined) {
                throw new Error('Missing `state` reference')
            }
            return this.label(
                this as HeaderCell<Item, Plugins>,
                this.state as TableState<Item, Plugins>
            )
        }
        return this.label
    }

    /**
     * Gets the HTML attributes for this header cell.
     *
     * @returns A readable store of cell attributes.
     */
    attrs() {
        return derived(super.attrs(), ($baseAttrs) => {
            return {
                ...$baseAttrs,
                role: 'columnheader' as const,
                colspan: this.colspan
            }
        })
    }

    abstract clone(): HeaderCell<Item, Plugins>

    /**
     * Type guard to check if this is a flat header cell.
     *
     * @returns True if this is a FlatHeaderCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isFlat(): this is FlatHeaderCell<Item, Plugins> {
        return '__flat' in this
    }

    /**
     * Type guard to check if this is a data header cell.
     *
     * @returns True if this is a DataHeaderCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isData(): this is DataHeaderCell<Item, Plugins> {
        return '__data' in this
    }

    /**
     * Type guard to check if this is a flat display header cell.
     *
     * @returns True if this is a FlatDisplayHeaderCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isFlatDisplay(): this is FlatDisplayHeaderCell<Item, Plugins> {
        return '__flat' in this && '__display' in this
    }

    /**
     * Type guard to check if this is a group header cell.
     *
     * @returns True if this is a GroupHeaderCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isGroup(): this is GroupHeaderCell<Item, Plugins> {
        return '__group' in this
    }

    /**
     * Type guard to check if this is a group display header cell.
     *
     * @returns True if this is a GroupDisplayHeaderCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isGroupDisplay(): this is GroupDisplayHeaderCell<Item, Plugins> {
        return '__group' in this && '__display' in this
    }
}

/**
 * Initialization options for a flat (non-grouped) header cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type FlatHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    HeaderCellInit<Item, Plugins>,
    'colspan'
>

/**
 * HTML attributes for a flat header cell element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type FlatHeaderCellAttributes<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> = HeaderCellAttributes<Item, Plugins>

/**
 * A flat (non-grouped) header cell that spans a single column.
 * Base class for DataHeaderCell and FlatDisplayHeaderCell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class FlatHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends HeaderCell<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __flat = true

    /**
     * Creates a new FlatHeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({ id, label, colstart }: FlatHeaderCellInit<Item, Plugins>) {
        super({ id, label, colspan: 1, colstart })
    }

    /**
     * Creates a copy of this header cell.
     *
     * @returns A cloned FlatHeaderCell.
     */
    clone(): FlatHeaderCell<Item, Plugins> {
        return new FlatHeaderCell({
            id: this.id,
            label: this.label,
            colstart: this.colstart
        })
    }
}

/**
 * Initialization options for a data header cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DataHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = FlatHeaderCellInit<
    Item,
    Plugins
> & {
    /** The key used to access data from the item. */
    accessorKey?: keyof Item
    /** Function to extract data from the item. */
    /* trunk-ignore(eslint/no-unused-vars) */
    accessorFn?: (item: Item) => unknown
}

/**
 * A header cell for a data column that displays values from the data source.
 * Contains accessor information for retrieving cell values.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class DataHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends FlatHeaderCell<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __data = true

    /** The key used to access data from the item. */
    accessorKey?: keyof Item
    /** Function to extract data from the item. */
    /* trunk-ignore(eslint/no-unused-vars) */
    accessorFn?: (item: Item) => unknown

    /**
     * Creates a new DataHeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({
        id,
        label,
        accessorKey,
        accessorFn,
        colstart
    }: DataHeaderCellInit<Item, Plugins>) {
        super({ id, label, colstart })
        this.accessorKey = accessorKey
        this.accessorFn = accessorFn
    }

    /**
     * Creates a copy of this header cell.
     *
     * @returns A cloned DataHeaderCell.
     */
    clone(): DataHeaderCell<Item, Plugins> {
        return new DataHeaderCell({
            id: this.id,
            label: this.label,
            accessorFn: this.accessorFn,
            accessorKey: this.accessorKey,
            colstart: this.colstart
        })
    }
}

/**
 * Initialization options for a flat display header cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type FlatDisplayHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    FlatHeaderCellInit<Item, Plugins>,
    'label'
> & {
    /** Optional label content (defaults to non-breaking space). */
    label?: HeaderLabel<Item, Plugins>
}

/**
 * A flat header cell for display-only columns (e.g., action columns).
 * Does not contain data accessor information.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class FlatDisplayHeaderCell<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> extends FlatHeaderCell<Item, Plugins> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __display = true

    /**
     * Creates a new FlatDisplayHeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({ id, label = NBSP, colstart }: FlatDisplayHeaderCellInit<Item, Plugins>) {
        super({ id, label, colstart })
    }

    /**
     * Creates a copy of this header cell.
     *
     * @returns A cloned FlatDisplayHeaderCell.
     */
    clone(): FlatDisplayHeaderCell<Item, Plugins> {
        return new FlatDisplayHeaderCell({
            id: this.id,
            label: this.label,
            colstart: this.colstart
        })
    }
}

/**
 * Initialization options for a group header cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type GroupHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    HeaderCellInit<Item, Plugins>,
    'id'
> & {
    /** Current column IDs covered by this group. */
    ids: string[]
    /** All column IDs in the original group definition. */
    allIds: string[]
}

/**
 * A header cell that spans multiple columns, used for column grouping.
 * Contains information about which columns are part of the group.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class GroupHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends HeaderCell<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __group = true

    /** Current column IDs covered by this group. */
    ids: string[]
    /** Combined ID string for all columns in the original group. */
    allId: string
    /** All column IDs in the original group definition. */
    allIds: string[]

    /**
     * Creates a new GroupHeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({ label, ids, allIds, colspan, colstart }: GroupHeaderCellInit<Item, Plugins>) {
        super({ id: `[${ids.join(',')}]`, label, colspan, colstart })
        this.ids = ids
        this.allId = `[${allIds.join(',')}]`
        this.allIds = allIds
    }

    /**
     * Sets the column IDs covered by this group and updates the cell ID.
     *
     * @param ids - The new array of column IDs.
     */
    setIds(ids: string[]) {
        this.ids = ids
        this.id = `[${this.ids.join(',')}]`
    }

    /**
     * Adds a column ID to this group and updates the cell ID.
     *
     * @param id - The column ID to add.
     */
    pushId(id: string) {
        this.ids = [...this.ids, id]
        this.id = `[${this.ids.join(',')}]`
    }

    /**
     * Creates a copy of this header cell.
     *
     * @returns A cloned GroupHeaderCell.
     */
    clone(): GroupHeaderCell<Item, Plugins> {
        return new GroupHeaderCell({
            label: this.label,
            ids: this.ids,
            allIds: this.allIds,
            colspan: this.colspan,
            colstart: this.colstart
        })
    }
}

/**
 * Initialization options for a group display header cell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type GroupDisplayHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    GroupHeaderCellInit<Item, Plugins>,
    'label' | 'colspan'
> & {
    /** Optional label content (defaults to non-breaking space). */
    label?: HeaderLabel<Item, Plugins>
    /** Optional colspan (defaults to 1). */
    colspan?: number
}

/**
 * A group header cell for display purposes (e.g., empty group headers).
 * Used to fill gaps in the header row matrix.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class GroupDisplayHeaderCell<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> extends GroupHeaderCell<Item, Plugins> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __display = true

    /**
     * Creates a new GroupDisplayHeaderCell.
     *
     * @param init - Initialization options.
     */
    constructor({
        label = NBSP,
        ids,
        allIds,
        colspan = 1,
        colstart
    }: GroupDisplayHeaderCellInit<Item, Plugins>) {
        super({ label, ids, allIds, colspan, colstart })
    }

    /**
     * Creates a copy of this header cell.
     *
     * @returns A cloned GroupDisplayHeaderCell.
     */
    clone(): GroupDisplayHeaderCell<Item, Plugins> {
        return new GroupDisplayHeaderCell({
            label: this.label,
            ids: this.ids,
            allIds: this.allIds,
            colspan: this.colspan,
            colstart: this.colstart
        })
    }
}
