import type { BodyRow } from '../bodyRows.js'
import {
    box,
    derivedBox,
    toGetter,
    type Box,
    type Getter,
    type ReadonlyBox
} from '../reactivity.svelte.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addPagination plugin.
 * Supports both client-side and server-side pagination modes.
 */
export type PaginationConfig = {
    /** Initial page index (0-based). Defaults to 0. */
    initialPageIndex?: number | undefined
    /** Initial page size. Defaults to 10. */
    initialPageSize?: number | undefined
} & (
    | {
          /** Client-side pagination mode. */
          serverSide?: false | undefined
          serverItemCount?: undefined
      }
    | {
          /** Server-side pagination mode. */
          serverSide: true
          /**
           * The total item count on the server: a number, a getter returning
           * it (reactive when it reads rune state) or a box holding it. Svelte
           * stores are not accepted; wrap one with `fromStore` and pass
           * `() => wrapped.current`.
           */
          serverItemCount: number | Getter<number> | ReadonlyBox<number>
      }
)

/**
 * State exposed by the addPagination plugin.
 */
export interface PaginationState {
    /** The page size. Writes below 1 are clamped to 1. */
    pageSize: Box<number>
    /**
     * The page index (0-based). The written value is kept; reads clamp it to
     * the last page, so shrinking the data or growing the page size never
     * shows an empty page.
     */
    pageIndex: Box<number>
    /** The total number of pages. */
    pageCount: ReadonlyBox<number>
    /** Whether there is a previous page. */
    hasPreviousPage: ReadonlyBox<boolean>
    /** Whether there is a next page. */
    hasNextPage: ReadonlyBox<boolean>
}

const MIN_PAGE_SIZE = 1

const SERVER_ITEM_COUNT_STORE_ERROR =
    'addPagination: serverItemCount must be a number, a getter or a box, e.g. serverItemCount: () => total; Svelte stores are not accepted in v7 — see the migration guide'

const isNumber = (value: unknown): value is number => typeof value === 'number'

/**
 * Configuration for {@link createPageState}.
 */
export interface PageStateConfig {
    /** Returns the items to paginate (client-side mode). */
    items: Getter<unknown[]>
    /** Initial page size. Defaults to 10. */
    initialPageSize?: number | undefined
    /** Initial page index (0-based). Defaults to 0. */
    initialPageIndex?: number | undefined
    /** Whether pagination is server-side. */
    serverSide?: boolean | undefined
    /** Total item count from the server (server-side mode). */
    serverItemCount?: number | Getter<number> | ReadonlyBox<number> | undefined
}

/**
 * Creates the pagination state used by {@link addPagination}: page size and
 * index boxes plus derived page count and navigation flags. Nothing is written
 * while deriving: the page index is clamped when it is read.
 *
 * @param config - Configuration for the page state.
 * @returns The pagination state.
 * @throws Error if `serverItemCount` is a Svelte store.
 */
export const createPageState = ({
    items,
    initialPageSize = 10,
    initialPageIndex = 0,
    serverSide = false,
    serverItemCount
}: PageStateConfig): PaginationState => {
    const rawPageSize = box(initialPageSize)
    const pageSize: Box<number> = {
        get current() {
            return rawPageSize.current
        },
        set current(next) {
            rawPageSize.current = Math.max(next, MIN_PAGE_SIZE)
        }
    }

    const itemCount: Getter<number> =
        serverSide && serverItemCount !== undefined
            ? toGetter(serverItemCount, isNumber, SERVER_ITEM_COUNT_STORE_ERROR)
            : () => items().length
    const pageCount = derivedBox(() => Math.ceil(itemCount() / pageSize.current))

    const rawPageIndex = box(initialPageIndex)
    const pageIndex: Box<number> = {
        get current() {
            const count = pageCount.current
            const index = rawPageIndex.current
            return count > 0 && index >= count ? count - 1 : index
        },
        set current(next) {
            rawPageIndex.current = next
        }
    }

    const hasPreviousPage = derivedBox(() => pageIndex.current > 0)
    const hasNextPage = derivedBox(() => pageIndex.current < pageCount.current - 1)

    return { pageSize, pageIndex, pageCount, hasPreviousPage, hasNextPage }
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
 * const table = createTable(() => data, {
 *   page: addPagination({
 *     initialPageSize: 20,
 *     initialPageIndex: 0
 *   })
 * })
 *
 * // Navigate pages
 * const { pageIndex, hasNextPage } = viewModel.pluginStates.page
 * if (hasNextPage.current) {
 *   pageIndex.current += 1
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
        // The rows before pagination, read through the upstream getter the view
        // model hands to `derivePageRows` (captured below, never copied into
        // state). The view model calls `derivePageRows` before it exposes
        // `pluginStates`, so `pageCount` always reads the captured getter.
        let upstreamRows: Getter<BodyRow<Item>[]> = () => []
        const pluginState = createPageState({
            items: () => upstreamRows(),
            initialPageIndex,
            initialPageSize,
            serverSide,
            serverItemCount
        })
        const { pageSize, pageIndex } = pluginState

        const derivePageRows: DeriveRowsFn<Item> = (rows) => {
            upstreamRows = rows
            const paginated = $derived.by(() => {
                const rowsValue = rows()
                if (serverSide) {
                    return rowsValue
                }
                const startIdx = pageIndex.current * pageSize.current
                return rowsValue.slice(startIdx, startIdx + pageSize.current)
            })
            return () => paginated
        }

        return {
            pluginState,
            derivePageRows
        }
    }
