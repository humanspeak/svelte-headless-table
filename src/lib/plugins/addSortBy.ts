import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { DataBodyCell } from '../bodyCells.js'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { compare } from '../utils/compare.js'
import { isShiftClick } from '../utils/event.js'

export interface SortByConfig {
    initialSortKeys?: SortKey[]
    disableMultiSort?: boolean
    isMultiSortEvent?: (_event: Event) => boolean
    toggleOrder?: ('asc' | 'desc' | undefined)[]
    serverSide?: boolean
}

const DEFAULT_TOGGLE_ORDER: ('asc' | 'desc' | undefined)[] = ['asc', 'desc', undefined]

export interface SortByState<Item> {
    sortKeys: WritableSortKeys
    preSortedRows: Readable<BodyRow<Item>[]>
}

export interface SortByColumnOptions {
    disable?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSortValue?: (_value: any) => string | number | (string | number)[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compareFn?: (_left: any, _right: any) => number
    invert?: boolean
}

export type SortByPropSet = NewTablePropSet<{
    'thead.tr.th': {
        order: 'asc' | 'desc' | undefined
        toggle: (_event: Event) => void
        clear: () => void
        disabled: boolean
    }
    'tbody.tr.td': {
        order: 'asc' | 'desc' | undefined
    }
}>

export interface SortKey {
    id: string
    order: 'asc' | 'desc'
}

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

interface ToggleOptions {
    multiSort?: boolean
    toggleOrder?: ('asc' | 'desc' | undefined)[]
}

export type WritableSortKeys = Writable<SortKey[]> & {
    toggleId: (_id: string, _options: ToggleOptions) => void
    clearId: (_id: string) => void
}

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
