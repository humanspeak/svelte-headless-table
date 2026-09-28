import { type BodyCell, DataBodyCell, DisplayBodyCell } from '$lib/bodyCells.js'
import type { FlatColumn } from '$lib/columns.js'
import { TableComponent } from '$lib/tableComponent.svelte.js'
import type { AnyPlugins } from '$lib/types/TablePlugin.js'
import { nonUndefined } from '$lib/utils/filter.js'

/**
 * Initialization options for creating a BodyRow.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type BodyRowInit<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    id: string
    cells: BodyCell<Item, Plugins>[]
    cellForId: Record<string, BodyCell<Item, Plugins>>
    depth?: number
    parentRow?: BodyRow<Item, Plugins> | undefined
}

/**
 * HTML attributes for a body row element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type BodyRowAttributes<_Item, _Plugins extends AnyPlugins = AnyPlugins> = {
    role: 'row'
}

/**
 * Abstract base class representing a row in the table body.
 * Extended by DataBodyRow for data rows and DisplayBodyRow for display-only rows.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export abstract class BodyRow<Item, Plugins extends AnyPlugins = AnyPlugins> extends TableComponent<
    Item,
    Plugins,
    'tbody.tr'
> {
    cells: BodyCell<Item, Plugins>[]
    /**
     * Get the cell with a given column id.
     *
     * **This includes hidden cells.**
     */
    cellForId: Record<string, BodyCell<Item, Plugins>>
    depth: number
    parentRow?: BodyRow<Item, Plugins> | undefined
    subRows?: BodyRow<Item, Plugins>[] | undefined
    constructor({ id, cells, cellForId, depth = 0, parentRow }: BodyRowInit<Item, Plugins>) {
        super({ id })
        this.cells = cells
        this.cellForId = cellForId
        this.depth = depth
        this.parentRow = parentRow
    }

    /**
     * Adds the body row's fixed attributes to the merged plugin attributes.
     *
     * @param attrs - The merged plugin attributes.
     * @returns The attributes with `role` set.
     */
    protected override decorateAttrs(attrs: Record<string, unknown>) {
        return {
            ...attrs,
            role: 'row' as const
        }
    }

    abstract override clone(props?: BodyRowCloneProps): BodyRow<Item, Plugins>

    /**
     * Type guard to check if this row is a data row.
     *
     * @returns True if this is a DataBodyRow.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isData(): this is DataBodyRow<Item, Plugins> {
        return '__data' in this
    }

    /**
     * Type guard to check if this row is a display row.
     *
     * @returns True if this is a DisplayBodyRow.
     */
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    isDisplay(): this is DisplayBodyRow<Item, Plugins> {
        return '__display' in this
    }
}

/**
 * Options for cloning a BodyRow.
 */
type BodyRowCloneProps = {
    /** Whether to clone the cells as well. */
    includeCells?: boolean
    /** Whether to recursively clone sub-rows. */
    includeSubRows?: boolean
}

/**
 * Replaces a freshly cloned row's cells (including hidden ones in `cellForId`)
 * with clones that point back at the cloned row.
 *
 * @param clonedRow - The cloned row whose cells should be cloned.
 */
const cloneCellsInto = <Item, Plugins extends AnyPlugins>(clonedRow: BodyRow<Item, Plugins>) => {
    const clonedCellsForId: Record<string, BodyCell<Item, Plugins>> = {}
    for (const [id, cell] of Object.entries(clonedRow.cellForId)) {
        const clonedCell = cell.clone()
        clonedCell.row = clonedRow
        clonedCellsForId[id] = clonedCell
    }
    // Every visible cell is also in `cellForId`, so no lookup comes back empty.
    const clonedCellForId = (id: string): BodyCell<Item, Plugins> | undefined =>
        clonedCellsForId[id]
    clonedRow.cells = clonedRow.cells.map(({ id }) => clonedCellForId(id)).filter(nonUndefined)
    clonedRow.cellForId = clonedCellsForId
}

/**
 * Initialization options for creating a DataBodyRow.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DataBodyRowInit<Item, Plugins extends AnyPlugins = AnyPlugins> = BodyRowInit<
    Item,
    Plugins
> & {
    /** Unique identifier for the data item. */
    dataId: string
    /** The original data item. */
    original: Item
}

/**
 * A body row that contains actual data from the data source.
 * Provides access to the original data item and a unique data ID.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class DataBodyRow<Item, Plugins extends AnyPlugins = AnyPlugins> extends BodyRow<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __data = true

    /** Unique identifier for the data item. */
    dataId: string
    /** The original data item from the data source. */
    original: Item

    /**
     * Creates a new DataBodyRow.
     *
     * @param init - Initialization options.
     */
    constructor({
        id,
        dataId,
        original,
        cells,
        cellForId,
        depth = 0,
        parentRow
    }: DataBodyRowInit<Item, Plugins>) {
        super({ id, cells, cellForId, depth, parentRow })
        this.dataId = dataId
        this.original = original
    }

    /**
     * Creates a copy of this row with optional deep cloning of cells and sub-rows.
     *
     * @param props - Cloning options.
     * @returns A cloned DataBodyRow.
     */
    clone({ includeCells = false, includeSubRows = false }: BodyRowCloneProps = {}): DataBodyRow<
        Item,
        Plugins
    > {
        const clonedRow = new DataBodyRow({
            id: this.id,
            dataId: this.dataId,
            cellForId: this.cellForId,
            cells: this.cells,
            original: this.original,
            depth: this.depth
        })
        if (includeCells) {
            cloneCellsInto(clonedRow)
        }
        if (includeSubRows) {
            const clonedSubRows = this.subRows?.map((row) =>
                row.clone({ includeCells, includeSubRows })
            )
            clonedRow.subRows = clonedSubRows
        } else {
            clonedRow.subRows = this.subRows
        }
        return clonedRow
    }
}

/**
 * Initialization options for creating a DisplayBodyRow.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DisplayBodyRowInit<Item, Plugins extends AnyPlugins = AnyPlugins> = BodyRowInit<
    Item,
    Plugins
>

/**
 * A body row used for display purposes only (e.g., grouped rows, aggregate rows).
 * Does not contain direct data from the data source.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class DisplayBodyRow<Item, Plugins extends AnyPlugins = AnyPlugins> extends BodyRow<
    Item,
    Plugins
> {
    // TODO Workaround for https://github.com/vitejs/vite/issues/9528
    __display = true

    /**
     * Creates a new DisplayBodyRow.
     *
     * @param init - Initialization options.
     */
    constructor({ id, cells, cellForId, depth = 0, parentRow }: DisplayBodyRowInit<Item, Plugins>) {
        super({ id, cells, cellForId, depth, parentRow })
    }

    /**
     * Creates a copy of this row with optional deep cloning of cells and sub-rows.
     *
     * @param props - Cloning options.
     * @returns A cloned DisplayBodyRow.
     */
    clone({ includeCells = false, includeSubRows = false }: BodyRowCloneProps = {}): DisplayBodyRow<
        Item,
        Plugins
    > {
        const clonedRow = new DisplayBodyRow({
            id: this.id,
            cellForId: this.cellForId,
            cells: this.cells,
            depth: this.depth
        })
        clonedRow.subRows = this.subRows
        if (includeCells) {
            cloneCellsInto(clonedRow)
        }
        if (includeSubRows) {
            const clonedSubRows = this.subRows?.map((row) =>
                row.clone({ includeCells, includeSubRows })
            )
            clonedRow.subRows = clonedSubRows
        } else {
            clonedRow.subRows = this.subRows
        }
        return clonedRow
    }
}

/**
 * Options for creating body rows from data.
 *
 * @template Item - The type of data items.
 */
export interface BodyRowsOptions<Item> {
    /** Optional function to generate a unique ID for each data item. */
    rowDataId?: ((item: Item, index: number) => string) | undefined
}

/**
 * Creates the body cell for one column of a data row.
 *
 * @param row - The row the cell belongs to.
 * @param column - The column the cell belongs to.
 * @param item - The row's data item.
 * @returns A data cell for data columns, or a display cell for display columns.
 * @throws Error if the column is neither a data nor a display column.
 */
const createBodyCell = <Item, Plugins extends AnyPlugins>(
    row: BodyRow<Item, Plugins>,
    column: FlatColumn<Item, Plugins>,
    item: Item
): BodyCell<Item, Plugins> => {
    if (column.isData()) {
        return new DataBodyCell<Item, Plugins>({
            row,
            column,
            label: column.cell,
            value: column.getValue(item)
        })
    }
    if (column.isDisplay()) {
        return new DisplayBodyCell<Item, Plugins>({ row, column, label: column.cell })
    }
    throw new Error('Unrecognized `FlatColumn` implementation')
}

/**
 * Converts an array of items into an array of table `BodyRow`s based on the column structure.
 * @param data The data to display.
 * @param flatColumns The column structure.
 * @returns An array of `BodyRow`s representing the table structure.
 */
export const getBodyRows = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    data: Item[],
    /**
     * Flat columns before column transformations.
     */
    flatColumns: FlatColumn<Item, Plugins>[],
    { rowDataId }: BodyRowsOptions<Item> = {}
): DataBodyRow<Item, Plugins>[] => {
    const rows: DataBodyRow<Item, Plugins>[] = data.map((item, idx) => {
        const id = idx.toString()
        return new DataBodyRow({
            id,
            dataId: rowDataId !== undefined ? rowDataId(item, idx) : id,
            original: item,
            cells: [],
            cellForId: {}
        })
    })
    for (const row of rows) {
        const item = row.original
        row.cells = flatColumns.map((col) => {
            const cell = createBodyCell(row, col, item)
            row.cellForId[col.id] = cell
            return cell
        })
    }
    return rows
}

/**
 * Arranges and hides columns in an array of `BodyRow`s based on
 * `columnIdOrder` by transforming the `cells` property of each row.
 *
 * `cellForId` should remain unaffected.
 *
 * @param rows The rows to transform.
 * @param columnIdOrder The column order to transform to.
 * @returns A new array of `BodyRow`s with corrected row references.
 */
export const getColumnedBodyRows = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    rows: DataBodyRow<Item, Plugins>[],
    columnIdOrder: string[]
): DataBodyRow<Item, Plugins>[] => {
    if (rows.length === 0 || columnIdOrder.length === 0) return rows
    return rows.map((row) => {
        const columnedRow = row.clone()
        // Build `cellForId` directly during the clone pass so we don't
        // pay for an intermediate Map + Object.fromEntries detour
        // (which is what the previous shape did — see plan-1A in
        // .notes/performance-optimization-plan.md). The id-keyed object
        // gives us O(1) lookups for `visibleCells` and is the same shape
        // BodyRow.cellForId already expects.
        const cellForId: Record<string, BodyCell<Item, Plugins>> = {}
        row.cells.forEach((cell) => {
            const clonedCell = cell.clone()
            clonedCell.row = columnedRow
            cellForId[clonedCell.id] = clonedCell
        })
        const visibleCells = columnIdOrder.map((cid) => cellForId[cid]).filter(nonUndefined)
        columnedRow.cells = visibleCells
        // `cellForId` includes hidden cells so row transformations can
        // still reach them.
        columnedRow.cellForId = cellForId
        return columnedRow
    })
}

/**
 * Converts an array of items into an array of table `BodyRow`s based on a parent row.
 * @param subItems The sub data to display.
 * @param parentRow The parent row.
 * @returns An array of `BodyRow`s representing the child rows of `parentRow`.
 */
export const getSubRows = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    subItems: Item[],
    parentRow: BodyRow<Item, Plugins>,
    { rowDataId }: BodyRowsOptions<Item> = {}
): BodyRow<Item, Plugins>[] => {
    const subRows = subItems.map((item, idx) => {
        const id = `${parentRow.id}>${idx}`
        return new DataBodyRow<Item, Plugins>({
            id,
            dataId: rowDataId !== undefined ? rowDataId(item, idx) : id,
            original: item,
            cells: [],
            cellForId: {},
            depth: parentRow.depth + 1,
            parentRow
        })
    })
    for (const subRow of subRows) {
        const item = subRow.original
        // parentRow.cells only include visible cells.
        // We have to derive all cells from parentRow.cellForId
        const cellForId: Record<string, BodyCell<Item, Plugins>> = {}
        for (const { column } of Object.values(parentRow.cellForId)) {
            cellForId[column.id] = createBodyCell(subRow, column, item)
        }
        subRow.cellForId = cellForId
        // Visible cells are a subset of `cellForId`, so no lookup comes back empty.
        const cellFor = (id: string): BodyCell<Item, Plugins> | undefined => cellForId[id]
        subRow.cells = parentRow.cells.map((cell) => cellFor(cell.id)).filter(nonUndefined)
    }
    return subRows
}
