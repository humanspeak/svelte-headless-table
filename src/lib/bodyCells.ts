import type { BodyRow } from '$lib/bodyRows.js'
import type { DataColumn, DisplayColumn, FlatColumn } from '$lib/columns.js'
import { TableComponent } from '$lib/tableComponent.js'
import type { DataLabel, DisplayLabel } from '$lib/types/Label.js'
import type { AnyPlugins } from '$lib/types/TablePlugin.js'
import type { RenderConfig } from '@humanspeak/svelte-render'
import { derived, type Readable } from 'svelte/store'

/**
 * Initialization options for creating a BodyCell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type BodyCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    id: string
    row: BodyRow<Item, Plugins>
}

/**
 * HTML attributes for a body cell element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
/* trunk-ignore(eslint/@typescript-eslint/no-unused-vars,eslint/no-unused-vars) */
export type BodyCellAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    role: 'cell'
}

/**
 * Abstract base class representing a cell in the table body.
 * Extended by DataBodyCell for data cells and DisplayBodyCell for display-only cells.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export abstract class BodyCell<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> extends TableComponent<Item, Plugins, 'tbody.tr.td'> {
    abstract column: FlatColumn<Item, Plugins>
    row: BodyRow<Item, Plugins>
    constructor({ id, row }: BodyCellInit<Item, Plugins>) {
        super({ id })
        this.row = row
    }

    abstract render(): RenderConfig

    attrs(): Readable<BodyCellAttributes<Item, Plugins>> {
        return derived(super.attrs(), ($baseAttrs) => {
            return {
                ...$baseAttrs,
                role: 'cell' as const
            }
        })
    }

    abstract clone(): BodyCell<Item, Plugins>

    /**
     * Gets a unique identifier combining the row ID and column ID.
     *
     * @returns A string in the format "rowId:columnId".
     */
    rowColId(): string {
        return `${this.row.id}:${this.column.id}`
    }

    /**
     * Gets a unique identifier combining the data row ID and column ID.
     * Only available for cells in data rows.
     *
     * @returns A string in the format "dataId:columnId", or undefined if not a data row.
     */
    dataRowColId(): string | undefined {
        if (!this.row.isData()) {
            return undefined
        }
        return `${this.row.dataId}:${this.column.id}`
    }

    /**
     * Type guard to check if this cell is a data cell.
     *
     * @returns True if this is a DataBodyCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isData(): this is DataBodyCell<Item, Plugins> {
        return '__data' in this
    }

    /**
     * Type guard to check if this cell is a display cell.
     *
     * @returns True if this is a DisplayBodyCell.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isDisplay(): this is DisplayBodyCell<Item, Plugins> {
        return '__display' in this
    }
}

/**
 * Initialization options for creating a DataBodyCell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Value - The type of the cell value.
 */
export type DataBodyCellInit<Item, Plugins extends AnyPlugins = AnyPlugins, Value = unknown> = Omit<
    BodyCellInit<Item, Plugins>,
    'id'
> & {
    /** The data column this cell belongs to. */
    column: DataColumn<Item, Plugins>
    /** Optional custom label renderer for the cell. */
    label?: DataLabel<Item, Plugins, Value>
    /** The cell's value. */
    value: Value
}

/**
 * HTML attributes for a data body cell element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DataBodyCellAttributes<
    Item,
    Plugins extends AnyPlugins = AnyPlugins
> = BodyCellAttributes<Item, Plugins>

/**
 * A body cell that contains actual data from the data source.
 * Provides access to the cell value and custom rendering.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Value - The type of the cell value.
 */
export class DataBodyCell<
    Item,
    Plugins extends AnyPlugins = AnyPlugins,
    Value = unknown
> extends BodyCell<Item, Plugins> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __data = true

    /** The data column this cell belongs to. */
    column: DataColumn<Item, Plugins>
    /** Optional custom label renderer for the cell. */
    label?: DataLabel<Item, Plugins, Value>
    /** The cell's value. */
    value: Value

    /**
     * Creates a new DataBodyCell.
     *
     * @param init - Initialization options.
     */
    constructor({ row, column, label, value }: DataBodyCellInit<Item, Plugins, Value>) {
        super({ id: column.id, row })
        this.column = column
        this.label = label
        this.value = value
    }

    /**
     * Renders the cell content using the label function or the raw value.
     *
     * @returns The render configuration for displaying this cell.
     * @throws Error if state reference is missing when using a custom label.
     */
    render(): RenderConfig {
        if (this.label === undefined) {
            return `${this.value}`
        }
        if (this.state === undefined) {
            throw new Error('Missing `state` reference')
        }
        return this.label(this as DataBodyCell<Item, AnyPlugins, Value>, this.state)
    }

    /**
     * Creates a copy of this cell.
     *
     * @returns A cloned DataBodyCell.
     */
    clone(): DataBodyCell<Item, Plugins> {
        const clonedCell = new DataBodyCell({
            row: this.row,
            column: this.column,
            label: this.label,
            value: this.value
        })
        return clonedCell
    }
}

/**
 * Initialization options for creating a DisplayBodyCell.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DisplayBodyCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
    BodyCellInit<Item, Plugins>,
    'id'
> & {
    /** The display column this cell belongs to. */
    column: DisplayColumn<Item, Plugins>
    /** The label renderer for the cell. */
    label: DisplayLabel<Item, Plugins>
}

/**
 * A body cell used for display purposes only (e.g., action buttons, checkboxes).
 * Does not contain direct data from the data source.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class DisplayBodyCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends BodyCell<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __display = true

    /** The display column this cell belongs to. */
    column: DisplayColumn<Item, Plugins>
    /** The label renderer for the cell. */
    label: DisplayLabel<Item, Plugins>

    /**
     * Creates a new DisplayBodyCell.
     *
     * @param init - Initialization options.
     */
    constructor({ row, column, label }: DisplayBodyCellInit<Item, Plugins>) {
        super({ id: column.id, row })
        this.column = column
        this.label = label
    }

    /**
     * Renders the cell content using the label function.
     *
     * @returns The render configuration for displaying this cell.
     * @throws Error if state reference is missing.
     */
    render(): RenderConfig {
        if (this.state === undefined) {
            throw new Error('Missing `state` reference')
        }
        return this.label(this, this.state)
    }

    /**
     * Creates a copy of this cell.
     *
     * @returns A cloned DisplayBodyCell.
     */
    clone(): DisplayBodyCell<Item, Plugins> {
        const clonedCell = new DisplayBodyCell({
            row: this.row,
            column: this.column,
            label: this.label
        })
        return clonedCell
    }
}
