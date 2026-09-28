// v7 design spike (plan 001): a getter-based derivation chain with sort and
// pagination. It shows the three patterns the real v7 plugins need:
//   1. derive functions take and return getters, backed by `$derived.by`;
//   2. "pre-X rows" are exposed by capturing the upstream getter, never by
//      writing state during derivation;
//   3. clamping happens when the value is read, not by writing it back.
// Throwaway: deleted by plan 004.
import { box, derivedBox, type Box, type Getter, type ReadonlyBox } from './reactivity.svelte.js'
import {
    SpikeRoleComponent,
    type ComponentView,
    type ElementHook
} from './spikeComponent.svelte.js'

// ---- Rows, cells, columns ---------------------------------------------------

export interface SpikeColumn<Item> {
    id: string
    header: string
    accessor: (item: Item) => unknown
}

export interface SpikeCell {
    id: string
    value: unknown
    component: SpikeRoleComponent<'tbody.tr.td'>
    readonly current: ComponentView
}

export interface SpikeRow<Item> {
    id: string
    original: Item
    cells: SpikeCell[]
    cellForId: Record<string, SpikeCell | undefined>
    component: SpikeRoleComponent<'tbody.tr'>
    readonly current: ComponentView
}

export interface SpikeHeaderCell {
    id: string
    label: string
    component: SpikeRoleComponent<'thead.tr.th'>
    readonly current: ComponentView
}

export interface SpikeHeaderRow {
    id: string
    cells: SpikeHeaderCell[]
    component: SpikeRoleComponent<'thead.tr'>
    readonly current: ComponentView
}

type Hook = ElementHook<unknown, Record<string, unknown>>

export interface SpikePlugin<Item, State> {
    pluginState: State
    deriveRows?: (rows: Getter<SpikeRow<Item>[]>) => Getter<SpikeRow<Item>[]>
    derivePageRows?: (rows: Getter<SpikeRow<Item>[]>) => Getter<SpikeRow<Item>[]>
    hooks?: {
        'thead.tr.th'?: (cell: SpikeHeaderCell) => Hook
        'tbody.tr'?: (row: SpikeRow<Item>) => Hook
        'tbody.tr.td'?: (cell: SpikeCell) => Hook
    }
}

// Objects built here expose `current` as a getter (never spread: spreading a
// getter would evaluate it and copy the value).
function currentOf(this: { component: { current: ComponentView } }): ComponentView {
    return this.component.current
}
const withCurrent = <T extends { component: { current: ComponentView } }>(
    obj: T
): T & { readonly current: ComponentView } =>
    Object.defineProperty(obj, 'current', { get: currentOf, enumerable: true }) as T & {
        readonly current: ComponentView
    }

// ---- Sort plugin -------------------------------------------------------------

export interface SortKey {
    id: string
    order: 'asc' | 'desc'
}

export interface SortKeysBox extends Box<SortKey[]> {
    toggleId(id: string): void
}

export interface SpikeSortState<Item> {
    sortKeys: SortKeysBox
    preSortedRows: ReadonlyBox<SpikeRow<Item>[]>
}

const createSortKeys = (initial: SortKey[]): SortKeysBox => {
    const keys = box(initial)
    return {
        get current() {
            return keys.current
        },
        set current(next) {
            keys.current = next
        },
        // none -> asc -> desc -> none, single-column (v6 default toggleOrder).
        toggleId(id) {
            const existing = keys.current.find((k) => k.id === id)
            if (existing === undefined) keys.current = [{ id, order: 'asc' }]
            else if (existing.order === 'asc') keys.current = [{ id, order: 'desc' }]
            else keys.current = []
        }
    }
}

// Same semantics as v6 `src/lib/utils/compare.ts` (`<` / `>`, not localeCompare).
const compareValues = (a: unknown, b: unknown): number => {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    const left = String(a)
    const right = String(b)
    return left < right ? -1 : left > right ? 1 : 0
}

const sortRows = <Item>(rows: SpikeRow<Item>[], keys: SortKey[]): SpikeRow<Item>[] => {
    if (keys.length === 0) return rows
    return [...rows].sort((a, b) => {
        for (const key of keys) {
            const order = compareValues(a.cellForId[key.id]?.value, b.cellForId[key.id]?.value)
            if (order !== 0) return key.order === 'asc' ? order : -order
        }
        return 0
    })
}

export const addSpikeSort = <Item>({
    initialSortKeys = []
}: { initialSortKeys?: SortKey[] } = {}): SpikePlugin<Item, SpikeSortState<Item>> => {
    const sortKeys = createSortKeys(initialSortKeys)
    // Pattern 2: the upstream getter is captured when the view model calls
    // deriveRows; `preSortedRows` reads through it. Nothing is written while
    // the chain derives (v6 called `preSortedRows.set($rows)` inside derived).
    let upstreamRows: Getter<SpikeRow<Item>[]> = () => []
    const preSortedRows: ReadonlyBox<SpikeRow<Item>[]> = {
        get current() {
            return upstreamRows()
        }
    }
    const orderOf = (id: string) => sortKeys.current.find((k) => k.id === id)?.order

    return {
        pluginState: { sortKeys, preSortedRows },
        // Pattern 1: getter in, getter out.
        deriveRows: (rows) => {
            upstreamRows = rows
            const sorted = $derived.by(() => sortRows(rows(), sortKeys.current))
            return () => sorted
        },
        hooks: {
            'thead.tr.th': (cell) => {
                // Handlers are allocated once per cell, not per read.
                const toggle = () => sortKeys.toggleId(cell.id)
                return { props: () => ({ order: orderOf(cell.id), toggle }) }
            },
            'tbody.tr.td': (cell) => ({ props: () => ({ order: orderOf(cell.id) }) })
        }
    }
}

// ---- Pagination plugin -------------------------------------------------------

export interface SpikePageState<Item> {
    pageSize: Box<number>
    pageIndex: Box<number>
    pageCount: ReadonlyBox<number>
    prePaginatedRows: ReadonlyBox<SpikeRow<Item>[]>
}

export const addSpikePagination = <Item>({
    initialPageSize = 10,
    initialPageIndex = 0
}: { initialPageSize?: number; initialPageIndex?: number } = {}): SpikePlugin<
    Item,
    SpikePageState<Item>
> => {
    const pageSize = box(initialPageSize)
    const rawPageIndex = box(initialPageIndex)
    let upstreamRows: Getter<SpikeRow<Item>[]> = () => []
    const prePaginatedRows: ReadonlyBox<SpikeRow<Item>[]> = {
        get current() {
            return upstreamRows()
        }
    }
    const pageCount = derivedBox(() =>
        Math.ceil(prePaginatedRows.current.length / Math.max(1, pageSize.current))
    )
    // Pattern 3: store the raw index, clamp on read. v6 called
    // `pageIndex.update(...)` from inside the pageCount derived.
    const pageIndex: Box<number> = {
        get current() {
            return Math.min(rawPageIndex.current, Math.max(0, pageCount.current - 1))
        },
        set current(next) {
            rawPageIndex.current = next
        }
    }

    return {
        pluginState: { pageSize, pageIndex, pageCount, prePaginatedRows },
        derivePageRows: (rows) => {
            upstreamRows = rows
            const paged = $derived.by(() => {
                const start = pageIndex.current * pageSize.current
                return rows().slice(start, start + pageSize.current)
            })
            return () => paged
        }
    }
}

// ---- View model --------------------------------------------------------------

// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
type AnyPlugins<Item> = Record<string, SpikePlugin<Item, any>>

export type SpikePluginStates<Plugins> = {
    [K in keyof Plugins]: Plugins[K] extends { pluginState: infer S } ? S : never
}

export interface SpikeViewModel<Item, Plugins> {
    readonly current: {
        readonly headerRows: SpikeHeaderRow[]
        readonly rows: SpikeRow<Item>[]
        readonly pageRows: SpikeRow<Item>[]
    }
    pluginStates: SpikePluginStates<Plugins>
}

export const createSpikeViewModel = <Item, Plugins extends AnyPlugins<Item>>(
    data: Getter<Item[]>,
    columns: SpikeColumn<Item>[],
    plugins: Plugins
): SpikeViewModel<Item, Plugins> => {
    const entries = Object.entries(plugins)

    const columnedRows = $derived.by(() =>
        data().map((original, index): SpikeRow<Item> => {
            const id = String(index)
            const cells = columns.map((column): SpikeCell =>
                withCurrent({
                    id: column.id,
                    value: column.accessor(original),
                    component: new SpikeRoleComponent<'tbody.tr.td'>(column.id, 'cell')
                })
            )
            const cellForId: Record<string, SpikeCell | undefined> = {}
            for (const cell of cells) cellForId[cell.id] = cell
            return withCurrent({
                id,
                original,
                cells,
                cellForId,
                component: new SpikeRoleComponent<'tbody.tr'>(id, 'row')
            })
        })
    )

    let rows: Getter<SpikeRow<Item>[]> = () => columnedRows
    for (const [, plugin] of entries) {
        if (plugin.deriveRows !== undefined) rows = plugin.deriveRows(rows)
    }
    const derivedRows = rows

    // Hooks are applied where v6 applies them. Mutating the row objects this
    // computation produced is fine; writing `$state` here would not be.
    const injectedRows = $derived.by(() => {
        const out = derivedRows()
        for (const [name, plugin] of entries) {
            const rowHook = plugin.hooks?.['tbody.tr']
            const cellHook = plugin.hooks?.['tbody.tr.td']
            if (rowHook === undefined && cellHook === undefined) continue
            for (const row of out) {
                if (rowHook !== undefined) row.component.applyHook(name, rowHook(row))
                if (cellHook !== undefined) {
                    for (const cell of row.cells) cell.component.applyHook(name, cellHook(cell))
                }
            }
        }
        return out
    })

    let pageRows: Getter<SpikeRow<Item>[]> = () => injectedRows
    for (const [, plugin] of entries) {
        if (plugin.derivePageRows !== undefined) pageRows = plugin.derivePageRows(pageRows)
    }
    const derivedPageRows = pageRows

    const headerRows = $derived.by((): SpikeHeaderRow[] => {
        const cells = columns.map((column): SpikeHeaderCell => {
            const cell: SpikeHeaderCell = withCurrent({
                id: column.id,
                label: column.header,
                component: new SpikeRoleComponent<'thead.tr.th'>(column.id, 'columnheader')
            })
            for (const [name, plugin] of entries) {
                const hook = plugin.hooks?.['thead.tr.th']
                if (hook !== undefined) cell.component.applyHook(name, hook(cell))
            }
            return cell
        })
        return [
            withCurrent({
                id: '0',
                cells,
                component: new SpikeRoleComponent<'thead.tr'>('0', 'row')
            })
        ]
    })

    const pluginStates = Object.fromEntries(
        entries.map(([name, plugin]) => [name, plugin.pluginState])
    ) as SpikePluginStates<Plugins>

    return {
        current: {
            get headerRows() {
                return headerRows
            },
            get rows() {
                return injectedRows
            },
            get pageRows() {
                return derivedPageRows()
            }
        },
        pluginStates
    }
}

/**
 * Runs `fn` inside a transient `$effect.root` and hands back its result plus
 * the root's cleanup. Lets plain `.test.ts` files (where runes are not
 * allowed) create a view model under an effect owner that is then destroyed.
 */
export const inTransientRoot = <T>(fn: () => T): { value: T; destroy: () => void } => {
    let value: T | undefined
    const destroy = $effect.root(() => {
        value = fn()
    })
    return { value: value as T, destroy }
}
