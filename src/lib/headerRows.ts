import type { Column } from '$lib/columns.js'
import {
    DataHeaderCell,
    FlatDisplayHeaderCell,
    GroupDisplayHeaderCell,
    GroupHeaderCell,
    type HeaderCell
} from '$lib/headerCells.js'
import { TableComponent } from '$lib/tableComponent.svelte.js'
import type { Matrix } from '$lib/types/Matrix.js'
import type { AnyPlugins } from '$lib/types/TablePlugin.js'
import { sum } from '$lib/utils/math.js'
import { getNullMatrix, getTransposed } from '$lib/utils/matrix.js'

/**
 * HTML attributes for a header row element.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type HeaderRowAttributes<_Item, _Plugins extends AnyPlugins = AnyPlugins> = {
    role: 'row'
}

/**
 * Initialization options for creating a HeaderRow.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export interface HeaderRowInit<Item, Plugins extends AnyPlugins = AnyPlugins> {
    id: string
    cells: HeaderCell<Item, Plugins>[]
}

/**
 * Represents a row in the table header.
 * Contains header cells for column labels and group headers.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export class HeaderRow<Item, Plugins extends AnyPlugins = AnyPlugins> extends TableComponent<
    Item,
    Plugins,
    'thead.tr'
> {
    /** The header cells in this row. */
    cells: HeaderCell<Item, Plugins>[]

    /**
     * Creates a new HeaderRow.
     *
     * @param init - Initialization options.
     */
    constructor({ id, cells }: HeaderRowInit<Item, Plugins>) {
        super({ id })
        this.cells = cells
    }

    /**
     * Adds the header row's fixed attributes to the merged plugin attributes.
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

    /**
     * Creates a copy of this header row.
     *
     * @returns A cloned HeaderRow.
     */
    clone(): HeaderRow<Item, Plugins> {
        return new HeaderRow({
            id: this.id,
            cells: this.cells
        })
    }
}

/**
 * Converts an array of columns into header rows for rendering.
 * Handles nested column groups by creating multiple header rows.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @param columns - The column definitions.
 * @param flatColumnIds - Optional array of column IDs for ordering.
 * @returns An array of HeaderRow objects.
 */
export const getHeaderRows = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columns: Column<Item, Plugins>[],
    flatColumnIds: string[] = []
): HeaderRow<Item, Plugins>[] => {
    const rowMatrix = getHeaderRowMatrix(columns)
    // Perform all column operations on the transposed columnMatrix. This helps
    // to reduce the number of expensive transpose operations required.
    let columnMatrix = getTransposed(rowMatrix)
    columnMatrix = getOrderedColumnMatrix(columnMatrix, flatColumnIds)
    populateGroupHeaderCellIds(columnMatrix)
    return headerRowsForRowMatrix(getTransposed(columnMatrix))
}

/**
 * Creates a matrix of header cells from column definitions.
 * Each row in the matrix represents a header row, with cells positioned
 * according to their column spans.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @param columns - The column definitions.
 * @returns A matrix of HeaderCell objects.
 */
export const getHeaderRowMatrix = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columns: Column<Item, Plugins>[]
): Matrix<HeaderCell<Item, Plugins>> => {
    const maxColspan = sum(columns.map((c) => (c.isGroup() ? c.ids.length : 1)))
    const maxHeight = Math.max(...columns.map((c) => c.height))
    const rowMatrix: Matrix<HeaderCell<Item, Plugins> | null> = getNullMatrix(maxColspan, maxHeight)
    let cellOffset = 0
    columns.forEach((c) => {
        const heightOffset = maxHeight - c.height
        loadHeaderRowMatrix(rowMatrix, c, heightOffset, cellOffset)
        cellOffset += c.isGroup() ? c.ids.length : 1
    })
    const lastRow = rowMatrix.at(maxHeight - 1)
    // Replace null cells with blank display cells.
    return rowMatrix.map((cells, rowIdx) =>
        cells.map((cell, columnIdx) => {
            if (cell !== null) return cell
            if (rowIdx === maxHeight - 1)
                return new FlatDisplayHeaderCell({ id: columnIdx.toString(), colstart: columnIdx })
            const flatId = lastRow?.[columnIdx]?.id ?? columnIdx.toString()
            return new GroupDisplayHeaderCell({ ids: [], allIds: [flatId], colstart: columnIdx })
        })
    )
}

/**
 * Writes a value into a matrix cell.
 *
 * @throws RangeError if the row does not exist.
 */
const setMatrixCell = <T>(matrix: Matrix<T>, rowIdx: number, columnIdx: number, value: T) => {
    const row = matrix.at(rowIdx)
    if (row === undefined) {
        throw new RangeError(`Header row ${rowIdx} is out of bounds`)
    }
    row[columnIdx] = value
}

const loadHeaderRowMatrix = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    rowMatrix: Matrix<HeaderCell<Item, Plugins> | undefined | null>,
    column: Column<Item, Plugins>,
    rowOffset: number,
    cellOffset: number
) => {
    if (column.isData()) {
        // `DataHeaderCell` should always be in the last row.
        setMatrixCell(
            rowMatrix,
            rowMatrix.length - 1,
            cellOffset,
            new DataHeaderCell<Item, Plugins>({
                label: column.header,
                accessorFn: column.accessorFn,
                accessorKey: column.accessorKey,
                id: column.id,
                colstart: cellOffset
            })
        )
        return
    }
    if (column.isDisplay()) {
        setMatrixCell(
            rowMatrix,
            rowMatrix.length - 1,
            cellOffset,
            new FlatDisplayHeaderCell<Item, Plugins>({
                id: column.id,
                label: column.header,
                colstart: cellOffset
            })
        )
        return
    }
    if (column.isGroup()) {
        // Fill multi-colspan cells.
        for (let i = 0; i < column.ids.length; i++) {
            setMatrixCell(
                rowMatrix,
                rowOffset,
                cellOffset + i,
                new GroupHeaderCell<Item, Plugins>({
                    label: column.header,
                    colspan: 1,
                    allIds: column.ids,
                    ids: [],
                    colstart: cellOffset
                })
            )
        }
        let childCellOffset = 0
        column.columns.forEach((c) => {
            loadHeaderRowMatrix(rowMatrix, c, rowOffset + 1, cellOffset + childCellOffset)
            childCellOffset += c.isGroup() ? c.ids.length : 1
        })
        return
    }
}

/**
 * Reorders a column matrix according to the specified column ID order.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @param columnMatrix - The original column matrix.
 * @param flatColumnIds - The desired order of column IDs.
 * @returns A reordered column matrix.
 */
export const getOrderedColumnMatrix = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    columnMatrix: Matrix<HeaderCell<Item, Plugins>>,
    flatColumnIds: string[]
): Matrix<HeaderCell<Item, Plugins>> => {
    if (flatColumnIds.length === 0) {
        return columnMatrix
    }
    const orderedColumnMatrix: Matrix<HeaderCell<Item, Plugins>> = []
    // Each row of the transposed matrix represents a column.
    // The `FlatHeaderCell` should be the last cell of each column.
    flatColumnIds.forEach((key, columnIdx) => {
        const nextColumn = columnMatrix.find((columnCells) => {
            const flatCell = columnCells.at(-1)
            if (!flatCell?.isFlat()) {
                throw new Error('The last element of each column must be a `FlatHeaderCell`')
            }
            return flatCell.id === key
        })
        if (nextColumn !== undefined) {
            orderedColumnMatrix.push(
                nextColumn.map((column) => {
                    const clonedColumn = column.clone()
                    clonedColumn.colstart = columnIdx
                    return clonedColumn
                })
            )
        }
    })
    return orderedColumnMatrix
}

const populateGroupHeaderCellIds = <Item, Plugins extends AnyPlugins>(
    columnMatrix: Matrix<HeaderCell<Item, Plugins>>
) => {
    columnMatrix.forEach((columnCells) => {
        const lastCell = columnCells.at(-1)
        if (!lastCell?.isFlat()) {
            throw new Error('The last element of each column must be a `FlatHeaderCell`')
        }
        columnCells.forEach((c) => {
            if (c.isGroup()) {
                c.pushId(lastCell.id)
            }
        })
    })
}

/**
 * Converts a row matrix into an array of HeaderRow objects.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @param rowMatrix - The matrix of header cells organized by rows.
 * @returns An array of HeaderRow objects.
 */
export const headerRowsForRowMatrix = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    rowMatrix: Matrix<HeaderCell<Item, Plugins>>
): HeaderRow<Item, Plugins>[] => {
    return rowMatrix.map((rowCells, rowIdx) => {
        return new HeaderRow({ id: rowIdx.toString(), cells: getMergedRow(rowCells) })
    })
}

/**
 * Multi-colspan cells will appear as multiple adjacent cells on the same row.
 * Join these adjacent multi-colspan cells and update the colspan property.
 *
 * Non-adjacent multi-colspan cells (due to column ordering) must be cloned
 * from the original .
 *
 * @param cells An array of cells.
 * @returns An array of cells with no duplicate consecutive cells.
 */
export const getMergedRow = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    cells: HeaderCell<Item, Plugins>[]
): HeaderCell<Item, Plugins>[] => {
    if (cells.length === 0) {
        return cells
    }
    const mergedCells: HeaderCell<Item, Plugins>[] = []
    // The group cell currently absorbing adjacent cells of the same group.
    let openGroup: GroupHeaderCell<Item, Plugins> | undefined
    let openIds: string[] = []
    for (const cell of cells) {
        if (openGroup !== undefined && cell.isGroup() && cell.allId === openGroup.allId) {
            openIds.push(...cell.ids)
            openGroup.setIds(openIds)
            openGroup.colspan += 1
            continue
        }
        const clonedCell = cell.clone()
        mergedCells.push(clonedCell)
        if (clonedCell.isGroup()) {
            openGroup = clonedCell
            openIds = [...clonedCell.ids]
            openGroup.setIds(openIds)
            openGroup.colspan = 1
        } else {
            openGroup = undefined
        }
    }
    return mergedCells
}
