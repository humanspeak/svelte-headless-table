import type {
    TableAttributes,
    TableBodyAttributes,
    TableHeadAttributes
} from '../createViewModel.svelte.js'
import type { DeriveFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Creates a grid layout plugin that renders the table using CSS Grid.
 * This allows for more flexible layouts and better handling of complex headers.
 *
 * @template Item - The type of data items in the table.
 * @returns A TablePlugin that applies CSS Grid layout to the table.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   grid: addGridLayout()
 * })
 * ```
 */
export const addGridLayout =
    <Item>(): TablePlugin<
        Item,
        Record<string, never>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    ({ tableState }) => {
        const pluginState = {}

        const deriveTableAttrs: DeriveFn<TableAttributes<Item>> = (attrs) => () => ({
            ...attrs(),
            style: {
                display: 'grid',
                'grid-template-columns': `repeat(${tableState.visibleColumns().length}, auto)`
            }
        })

        const deriveTableHeadAttrs: DeriveFn<TableHeadAttributes<Item>> = (attrs) => () => ({
            ...attrs(),
            style: {
                display: 'contents'
            }
        })

        const deriveTableBodyAttrs: DeriveFn<TableBodyAttributes<Item>> = (attrs) => () => ({
            ...attrs(),
            style: {
                display: 'contents'
            }
        })

        // Constant attributes: allocated once and returned by every read.
        const contentsAttrs = { style: { display: 'contents' } }
        const getContentsAttrs = () => contentsAttrs

        return {
            pluginState,
            deriveTableAttrs,
            deriveTableHeadAttrs,
            deriveTableBodyAttrs,
            hooks: {
                'thead.tr': () => ({ attrs: getContentsAttrs }),
                'thead.tr.th': (cell) => {
                    // `colstart` / `colspan` are fixed once the header rows are built.
                    const attrs = {
                        style: {
                            'grid-column': `${cell.colstart + 1} / span ${cell.colspan}`
                        }
                    }
                    return { attrs: () => attrs }
                },
                'tbody.tr': () => ({ attrs: getContentsAttrs })
            }
        }
    }
