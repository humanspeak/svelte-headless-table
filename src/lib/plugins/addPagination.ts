import { derived, writable, type Readable, type Updater, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addPagination plugin.
 * Supports both client-side and server-side pagination modes.
 */
export type PaginationConfig = {
    /** Initial page index (0-based). Defaults to 0. */
    initialPageIndex?: number
    /** Initial page size. Defaults to 10. */
    initialPageSize?: number
} & (
    | {
          /** Client-side pagination mode. */
          serverSide?: false | undefined
          serverItemCount?: undefined
      }
    | {
          /** Server-side pagination mode. */
          serverSide: true
          /** A readable store containing the total item count from the server. */
          serverItemCount: Readable<number>
      }
)

/**
 * State exposed by the addPagination plugin.
 */
export interface PaginationState {
    /** Writable store for the current page size. */
    pageSize: Writable<number>
    /** Writable store for the current page index (0-based). */
    pageIndex: Writable<number>
    /** Readable store for the total number of pages. */
    pageCount: Readable<number>
    /** Readable store indicating if there's a previous page. */
    hasPreviousPage: Readable<boolean>
    /** Readable store indicating if there's a next page. */
    hasNextPage: Readable<boolean>
}

const MIN_PAGE_SIZE = 1

/**
 * Creates a page store with pagination state and navigation helpers.
 *
 * @param config - Configuration for the page store.
 * @returns An object containing pagination state stores.
 */
export const createPageStore = ({
    items,
    initialPageSize,
    initialPageIndex,
    serverSide,
    serverItemCount
}: PageStoreConfig) => {
    const pageSize = writable(initialPageSize)
    const updatePageSize = (fn: Updater<number>) => {
        pageSize.update(($pageSize) => {
            const newPageSize = fn($pageSize)
            return Math.max(newPageSize, MIN_PAGE_SIZE)
        })
    }
    const setPageSize = (newPageSize: number) => updatePageSize(() => newPageSize)

    const pageIndex = writable(initialPageIndex)

    function calcPageCountAndLimitIndex([$pageSize, $itemCount]: [
        $pageSize: number,
        $itemCount: number
    ]) {
        const $pageCount = Math.ceil($itemCount / $pageSize)
        pageIndex.update(($pageIndex) => {
            if ($pageCount > 0 && $pageIndex >= $pageCount) {
                return $pageCount - 1
            }
            return $pageIndex
        })
        return $pageCount
    }

    let pageCount
    if (serverSide && serverItemCount != null) {
        pageCount = derived([pageSize, serverItemCount], calcPageCountAndLimitIndex)
    } else {
        const itemCount = derived(items, ($items) => $items.length)
        pageCount = derived([pageSize, itemCount], calcPageCountAndLimitIndex)
    }

    const hasPreviousPage = derived(pageIndex, ($pageIndex) => {
        return $pageIndex > 0
    })
    const hasNextPage = derived([pageIndex, pageCount], ([$pageIndex, $pageCount]) => {
        return $pageIndex < $pageCount - 1
    })

    return {
        pageSize: {
            subscribe: pageSize.subscribe,
            update: updatePageSize,
            set: setPageSize
        },
        pageIndex,
        pageCount,
        serverItemCount,
        hasPreviousPage,
        hasNextPage
    }
}

/**
 * Configuration for createPageStore.
 */
export interface PageStoreConfig {
    /** Readable store of items to paginate. */
    items: Readable<unknown[]>
    /** Initial page size. */
    initialPageSize?: number
    /** Initial page index (0-based). */
    initialPageIndex?: number
    /** Whether pagination is server-side. */
    serverSide?: boolean
    /** Total item count from server (for server-side pagination). */
    serverItemCount?: Readable<number>
}

/**
 * Creates a pagination plugin that enables paged navigation through table rows.
 * Supports both client-side and server-side pagination.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options for pagination.
 * @returns A TablePlugin that provides pagination functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   page: addPagination({
 *     initialPageSize: 20,
 *     initialPageIndex: 0
 *   })
 * })
 *
 * // Navigate pages
 * const { pageIndex, pageCount, hasNextPage } = table.pluginStates.page
 * if ($hasNextPage) {
 *   pageIndex.update(n => n + 1)
 * }
 * ```
 */
export const addPagination =
    <Item>({
        initialPageIndex = 0,
        initialPageSize = 10,
        serverSide = false,
        serverItemCount
    }: PaginationConfig = {}): TablePlugin<
        Item,
        PaginationState,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const prePaginatedRows = writable<BodyRow<Item>[]>([])
        const paginatedRows = writable<BodyRow<Item>[]>([])
        const { pageSize, pageIndex, pageCount, hasPreviousPage, hasNextPage } = createPageStore({
            items: prePaginatedRows,
            initialPageIndex,
            initialPageSize,
            serverSide,
            serverItemCount
        })
        const pluginState: PaginationState = {
            pageSize,
            pageIndex,
            pageCount,
            hasPreviousPage,
            hasNextPage
        }

        const derivePageRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, pageSize, pageIndex], ([$rows, $pageSize, $pageIndex]) => {
                prePaginatedRows.set($rows)
                if (serverSide) {
                    paginatedRows.set($rows)
                    return $rows
                }
                const startIdx = $pageIndex * $pageSize
                const _paginatedRows = $rows.slice(startIdx, startIdx + $pageSize)
                paginatedRows.set(_paginatedRows)
                return _paginatedRows
            })
        }

        return {
            pluginState,
            derivePageRows
        }
    }
