import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { DataBodyCell } from '../bodyCells.js'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { compare } from '../utils/compare.js'
import { isShiftClick } from '../utils/event.js'

/**
 * Configuration options for the addSortBy plugin.
 */
export interface SortByConfig {
    /** Initial sort keys to apply on mount. */
    initialSortKeys?: SortKey[]
    /** If true, prevents sorting by multiple columns. Defaults to false. */
    disableMultiSort?: boolean
    /** Function to detect multi-sort events (e.g., shift+click). Defaults to isShiftClick. */
    isMultiSortEvent?: (_event: Event) => boolean
    /** Custom toggle order cycle. Defaults to ['asc', 'desc', undefined]. */
    toggleOrder?: ('asc' | 'desc' | undefined)[]
    /** If true, sorting is handled server-side and rows are returned as-is. */
    serverSide?: boolean
}

const DEFAULT_TOGGLE_ORDER: ('asc' | 'desc' | undefined)[] = ['asc', 'desc', undefined]

/**
 * State exposed by the addSortBy plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface SortByState<Item> {
    /** Writable store containing the current sort keys. */
    sortKeys: WritableSortKeys
    /** Readable store containing the rows before sorting was applied. */
    preSortedRows: Readable<BodyRow<Item>[]>
}

/**
 * Per-column configuration options for sorting.
 */
export interface SortByColumnOptions {
    /** If true, this column cannot be sorted. */
    disable?: boolean
    /** Custom function to extract the sortable value from the cell value. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSortValue?: (_value: any) => string | number | (string | number)[]
    /** Custom comparison function for sorting. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Creates a writable store for managing sort keys with toggle and clear methods.
 *
 * @param initKeys - Initial sort keys.
 * @returns A WritableSortKeys store with toggle and clear functionality.
 * @example
 * ```typescript
 * const sortKeys = createSortKeysStore([{ id: 'name', order: 'asc' }])
 * sortKeys.toggleId('age') // Adds ascending sort by age
 * sortKeys.clearId('name') // Removes sort by name
 * ```
 */
export const createSortKeysStore = (initKeys: SortKey[]): WritableSortKeys => {
    const { subscribe, update, set } = writable(initKeys)
    const toggleId = (
        id: string,
        { multiSort = true, toggleOrder = DEFAULT_TOGGLE_ORDER }: ToggleOptions = {}
    ) => {
        update(($sortKeys) => {
            const keyIdx = $sortKeys.findIndex((key) => key.id === id)
            const key = $sortKeys[keyIdx]
            const order = key?.order
            const orderIdx = toggleOrder.findIndex((o) => o === order)
            const nextOrderIdx = (orderIdx + 1) % toggleOrder.length
            const nextOrder = toggleOrder[nextOrderIdx]
            if (!multiSort) {
                if (nextOrder === undefined) {
                    return []
                }
                return [{ id, order: nextOrder }]
            }
            if (keyIdx === -1 && nextOrder !== undefined) {
                return [...$sortKeys, { id, order: nextOrder }]
            }
            if (nextOrder === undefined) {
                return [...$sortKeys.slice(0, keyIdx), ...$sortKeys.slice(keyIdx + 1)]
            }
            return [
                ...$sortKeys.slice(0, keyIdx),
                { id, order: nextOrder },
                ...$sortKeys.slice(keyIdx + 1)
            ]
        })
    }
    const clearId = (id: string) => {
        update(($sortKeys) => {
            const keyIdx = $sortKeys.findIndex((key) => key.id === id)
            if (keyIdx === -1) {
                return $sortKeys
            }
            return [...$sortKeys.slice(0, keyIdx), ...$sortKeys.slice(keyIdx + 1)]
        })
    }
    return {
        subscribe,
        update,
        set,
        toggleId,
        clearId
    }
}

/**
 * Options for the toggleId method.
 */
interface ToggleOptions {
    /** Whether to allow multiple sort keys. */
    multiSort?: boolean
    /** Custom toggle order cycle. */
    toggleOrder?: ('asc' | 'desc' | undefined)[]
}

/**
 * A writable store for sort keys with additional toggle and clear methods.
 */
export type WritableSortKeys = Writable<SortKey[]> & {
    /** Toggles the sort state for a column ID. */
    toggleId: (_id: string, _options: ToggleOptions) => void
    /** Clears the sort state for a column ID. */
    clearId: (_id: string) => void
}

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
    const sortConfig = sortKeys.map((key) => ({
        id: key.id,
        order: key.order,
        invert: columnOptions[key.id]?.invert ?? false,
        compareFn: columnOptions[key.id]?.compareFn,
        getSortValue: columnOptions[key.id]?.getSortValue,
        orderFactor: (key.order === 'desc' ? -1 : 1) * (columnOptions[key.id]?.invert ? -1 : 1)
    }))

    // Shallow clone to prevent sort affecting `preSortedRows`.
    const $sortedRows = [...rows] as typeof rows
    $sortedRows.sort((a, b) => {
        for (const config of sortConfig) {
            // TODO check why cellForId returns `undefined`.
            const cellA = a.cellForId[config.id]
            const cellB = b.cellForId[config.id]
            // Only need to check properties of `cellA` as both should have the same
            // properties.
            if (!cellA.isData()) {
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
    for (let i = 0; i < $sortedRows.length; i++) {
        const { subRows } = $sortedRows[i]
        if (subRows === undefined) {
            continue
        }
        const sortedSubRows = getSortedRows<Item, Row>(subRows as Row[], sortKeys, columnOptions)
        const clonedRow = $sortedRows[i].clone() as Row
        clonedRow.subRows = sortedSubRows
        $sortedRows[i] = clonedRow
    }
    return $sortedRows
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
 * const table = createTable(data, {
 *   sort: addSortBy({
 *     initialSortKeys: [{ id: 'name', order: 'asc' }],
 *     disableMultiSort: false
 *   })
 * })
 *
 * // Access sort state in your component
 * const { sortKeys } = table.pluginStates.sort
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

        const sortKeys = createSortKeysStore(initialSortKeys)
        const preSortedRows = writable<BodyRow<Item>[]>([])

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, sortKeys], ([$rows, $sortKeys]) => {
                preSortedRows.set($rows)
                // Early return if no sorting needed
                if (serverSide || $sortKeys.length === 0) {
                    return $rows
                }
                return getSortedRows<Item, (typeof $rows)[number]>($rows, $sortKeys, columnOptions)
            })
        }

        const pluginState: SortByState<Item> = { sortKeys, preSortedRows }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (cell) => {
                    const disabled = disabledSortIds.includes(cell.id)
                    const props = derived(sortKeys, ($sortKeys) => {
                        const key = $sortKeys.find((k) => k.id === cell.id)
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
                            if (disabledSortIds.includes(cell.id)) return
                            sortKeys.clearId(cell.id)
                        }
                        return {
                            order: key?.order,
                            toggle,
                            clear,
                            disabled
                        }
                    })
                    return { props }
                },
                'tbody.tr.td': (cell) => {
                    const props = derived(sortKeys, ($sortKeys) => {
                        const key = $sortKeys.find((k) => k.id === cell.id)
                        return {
                            order: key?.order
                        }
                    })
                    return { props }
                }
            }
        }
    }
