import type { DataBodyCell } from '../bodyCells.js'
import type { BodyRow } from '../bodyRows.js'
import type { Box, Getter, ReadonlyBox } from '../reactivity.svelte.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { compare } from '../utils/compare.js'
import { isShiftClick } from '../utils/event.js'

/**
 * Configuration options for the addSortBy plugin.
 */
export interface SortByConfig {
    /** Initial sort keys to apply on mount. */
    initialSortKeys?: SortKey[] | undefined
    /** If true, prevents sorting by multiple columns. Defaults to false. */
    disableMultiSort?: boolean | undefined
    /** Function to detect multi-sort events (e.g., shift+click). Defaults to isShiftClick. */
    isMultiSortEvent?: ((_event: Event) => boolean) | undefined
    /** Custom toggle order cycle. Defaults to ['asc', 'desc', undefined]. */
    toggleOrder?: ('asc' | 'desc' | undefined)[] | undefined
    /** If true, sorting is handled server-side and rows are returned as-is. */
    serverSide?: boolean | undefined
}

const DEFAULT_TOGGLE_ORDER: ('asc' | 'desc' | undefined)[] = ['asc', 'desc', undefined]

/**
 * State exposed by the addSortBy plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface SortByState<Item> {
    /** The current sort keys, with `toggleId` / `clearId` helpers. */
    sortKeys: SortKeys
    /** The rows before sorting was applied. */
    preSortedRows: ReadonlyBox<BodyRow<Item>[]>
}

/**
 * Per-column configuration options for sorting.
 */
export interface SortByColumnOptions {
    /** If true, this column cannot be sorted. */
    disable?: boolean
    /** Custom function to extract the sortable value from the cell value. */
    // `any` is the user-facing cell value: column options are not tied to the column's
    // value type, and callbacks such as `(item) => item.salary` must keep compiling.
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    getSortValue?: (_value: any) => string | number | (string | number)[]
    /** Custom comparison function for sorting. */
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    compareFn?: (_left: any, _right: any) => number
    /** If true, inverts the sort order for this column. */
    invert?: boolean
}

/**
 * Props added to table elements by the sort plugin.
 */
export type SortByPropSet = NewTablePropSet<{
    'thead.tr.th': {
        /** Current sort order for this column. */
        order: 'asc' | 'desc' | undefined
        /** Function to toggle sorting on this column. */
        toggle: (_event: Event) => void
        /** Function to clear sorting on this column. */
        clear: () => void
        /** Whether sorting is disabled for this column. */
        disabled: boolean
    }
    'tbody.tr.td': {
        /** Current sort order for this column. */
        order: 'asc' | 'desc' | undefined
    }
}>

/**
 * Represents a single sort key with column ID and direction.
 */
export interface SortKey {
    /** The column ID to sort by. */
    id: string
    /** The sort direction. */
    order: 'asc' | 'desc'
}

/**
 * Options for {@link SortKeys.toggleId}.
 */
export interface SortToggleOptions {
    /** Whether to allow multiple sort keys. Defaults to true. */
    multiSort?: boolean | undefined
    /** Custom toggle order cycle. Undefined uses the default order. */
    toggleOrder?: ('asc' | 'desc' | undefined)[] | undefined
}

/**
 * The sort keys of a table: a {@link Box} of {@link SortKey}s with helpers to
 * toggle and clear a column. Every write assigns a new array.
 */
export class SortKeys implements Box<SortKey[]> {
    #keys = $state.raw<SortKey[]>([])

    /**
     * @param initialKeys - The initial sort keys.
     */
    constructor(initialKeys: SortKey[] = []) {
        this.#keys = initialKeys
    }

    /** The current sort keys, in priority order. */
    get current(): SortKey[] {
        return this.#keys
    }

    set current(next: SortKey[]) {
        this.#keys = next
    }

    /**
     * Advances the sort order of a column through the toggle cycle.
     *
     * @param id - The column ID.
     * @param options - Multi-sort and toggle-order options.
     */
    toggleId(
        id: string,
        { multiSort = true, toggleOrder = DEFAULT_TOGGLE_ORDER }: SortToggleOptions = {}
    ): void {
        const keys = this.#keys
        const keyIdx = keys.findIndex((key) => key.id === id)
        const order = keyIdx === -1 ? undefined : keys[keyIdx]?.order
        const orderIdx = toggleOrder.findIndex((o) => o === order)
        const nextOrderIdx = (orderIdx + 1) % toggleOrder.length
        const nextOrder = toggleOrder[nextOrderIdx]
        if (!multiSort) {
            this.#keys = nextOrder === undefined ? [] : [{ id, order: nextOrder }]
            return
        }
        if (keyIdx === -1 && nextOrder !== undefined) {
            this.#keys = [...keys, { id, order: nextOrder }]
            return
        }
        if (nextOrder === undefined) {
            this.#keys = [...keys.slice(0, keyIdx), ...keys.slice(keyIdx + 1)]
            return
        }
        this.#keys = [...keys.slice(0, keyIdx), { id, order: nextOrder }, ...keys.slice(keyIdx + 1)]
    }

    /**
     * Removes the sort key of a column, if any.
     *
     * @param id - The column ID.
     */
    clearId(id: string): void {
        const keyIdx = this.#keys.findIndex((key) => key.id === id)
        if (keyIdx === -1) {
            return
        }
        this.#keys = [...this.#keys.slice(0, keyIdx), ...this.#keys.slice(keyIdx + 1)]
    }
}

/**
 * Creates the sort keys state used by {@link addSortBy}.
 *
 * @param initialKeys - Initial sort keys.
 * @returns A {@link SortKeys} instance.
 * @example
 * ```typescript
 * const sortKeys = createSortKeys([{ id: 'name', order: 'asc' }])
 * sortKeys.toggleId('age') // Adds ascending sort by age
 * sortKeys.clearId('name') // Removes sort by name
 * ```
 */
export const createSortKeys = (initialKeys: SortKey[] = []): SortKeys => new SortKeys(initialKeys)

/**
 * Sorts rows based on the provided sort keys and column options.
 * Recursively sorts subRows as well.
 *
 * @template Item - The type of data items.
 * @template Row - The row type.
 * @param rows - The rows to sort.
 * @param sortKeys - The sort keys to apply.
 * @param columnOptions - Per-column sort configuration.
 * @returns A new array of sorted rows.
 * @internal
 */
const getSortedRows = <Item, Row extends BodyRow<Item>>(
    rows: Row[],
    sortKeys: SortKey[],
    columnOptions: Record<string, SortByColumnOptions>
): Row[] => {
    // Pre-compute sort config for each key to avoid repeated lookups during comparison
    const sortConfig = sortKeys.map((key) => {
        const options = columnOptions[key.id]
        return {
            id: key.id,
            order: key.order,
            invert: options?.invert ?? false,
            compareFn: options?.compareFn,
            getSortValue: options?.getSortValue,
            orderFactor: (key.order === 'desc' ? -1 : 1) * (options?.invert ? -1 : 1)
        }
    })

    // Shallow clone to prevent sort affecting `preSortedRows`.
    const sortedRows = [...rows] as typeof rows
    sortedRows.sort((a, b) => {
        for (const config of sortConfig) {
            // TODO check why cellForId returns `undefined`.
            const cellA = a.cellForId[config.id]
            const cellB = b.cellForId[config.id]
            // Only need to check properties of `cellA` as both should have the same
            // properties.
            if (!cellA?.isData()) {
                return 0
            }
            const valueA = cellA.value
            const valueB = (cellB as DataBodyCell<Item>).value
            let order = 0
            if (config.compareFn !== undefined) {
                order = config.compareFn(valueA, valueB)
            } else if (config.getSortValue !== undefined) {
                const sortValueA = config.getSortValue(valueA)
                const sortValueB = config.getSortValue(valueB)
                order = compare(sortValueA, sortValueB)
            } else if (typeof valueA === 'string' || typeof valueA === 'number') {
                // typeof `cellB.value` is logically equal to `cellA.value`.
                order = compare(valueA, valueB as string | number)
            } else if (valueA instanceof Date || valueB instanceof Date) {
                const sortValueA = valueA instanceof Date ? valueA.getTime() : 0
                const sortValueB = valueB instanceof Date ? valueB.getTime() : 0
                order = compare(sortValueA, sortValueB)
            }
            if (order !== 0) {
                return order * config.orderFactor
            }
        }
        return 0
    })
    for (const [i, row] of sortedRows.entries()) {
        const { subRows } = row
        if (subRows === undefined) {
            continue
        }
        const sortedSubRows = getSortedRows<Item, Row>(subRows as Row[], sortKeys, columnOptions)
        const clonedRow = row.clone() as Row
        clonedRow.subRows = sortedSubRows
        sortedRows[i] = clonedRow
    }
    return sortedRows
}

/**
 * Creates a sort plugin that enables sorting table rows by one or more columns.
 * Supports ascending, descending, and unsorted states with customizable toggle order.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options for sorting behavior.
 * @returns A TablePlugin that provides sorting functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   sort: addSortBy({
 *     initialSortKeys: [{ id: 'name', order: 'asc' }],
 *     disableMultiSort: false
 *   })
 * })
 *
 * // Access sort state in your component
 * const { sortKeys } = viewModel.pluginStates.sort
 * sortKeys.current // [{ id: 'name', order: 'asc' }]
 * ```
 */
export const addSortBy =
    <Item>({
        initialSortKeys = [],
        disableMultiSort = false,
        isMultiSortEvent = isShiftClick,
        toggleOrder,
        serverSide = false
    }: SortByConfig = {}): TablePlugin<
        Item,
        SortByState<Item>,
        SortByColumnOptions,
        SortByPropSet
    > =>
    ({ columnOptions }) => {
        const disabledSortIds = Object.entries(columnOptions)
            .filter(([, option]) => option.disable === true)
            .map(([columnId]) => columnId)

        const sortKeys = createSortKeys(initialSortKeys)

        // "Pre-sorted rows" read through the upstream getter captured when the
        // view model calls `deriveRows`; nothing is written while deriving.
        let upstreamRows: Getter<BodyRow<Item>[]> = () => []
        const preSortedRows: ReadonlyBox<BodyRow<Item>[]> = {
            get current() {
                return upstreamRows()
            }
        }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            upstreamRows = rows
            const sorted = $derived.by(() => {
                const rowsValue = rows()
                const keys = sortKeys.current
                // Early return if no sorting needed
                if (serverSide || keys.length === 0) {
                    return rowsValue
                }
                return getSortedRows<Item, (typeof rowsValue)[number]>(
                    rowsValue,
                    keys,
                    columnOptions
                )
            })
            return () => sorted
        }

        const pluginState: SortByState<Item> = { sortKeys, preSortedRows }

        const orderOf = (id: string) => sortKeys.current.find((k) => k.id === id)?.order

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (cell) => {
                    const disabled = disabledSortIds.includes(cell.id)
                    // Handlers are allocated once per cell, not per read.
                    const toggle = (event: Event) => {
                        if (!cell.isData()) return
                        if (disabled) return
                        sortKeys.toggleId(cell.id, {
                            multiSort: disableMultiSort ? false : isMultiSortEvent(event),
                            toggleOrder
                        })
                    }
                    const clear = () => {
                        if (!cell.isData()) return
                        if (disabled) return
                        sortKeys.clearId(cell.id)
                    }
                    return {
                        props: () => ({ order: orderOf(cell.id), toggle, clear, disabled })
                    }
                },
                'tbody.tr.td': (cell) => ({
                    props: () => ({ order: orderOf(cell.id) })
                })
            }
        }
    }
