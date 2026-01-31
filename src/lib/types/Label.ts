import type { RenderConfig } from '@humanspeak/svelte-render'
import type { DataBodyCell, DisplayBodyCell } from '../bodyCells.js'
import type { TableState } from '../createViewModel.js'
import type { HeaderCell } from '../headerCells.js'
import type { AnyPlugins } from './TablePlugin.js'

/**
 * A render function for data body cells.
 * Receives the cell and table state, returns content to render.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Value - The type of the cell value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataLabel<Item, Plugins extends AnyPlugins = AnyPlugins, Value = any> = (
    _cell: DataBodyCell<Item, AnyPlugins, Value>,
    _state: TableState<Item, Plugins>
) => RenderConfig

/**
 * A render function for display body cells.
 * Receives the cell and table state, returns content to render.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type DisplayLabel<Item, Plugins extends AnyPlugins = AnyPlugins> = (
    _cell: DisplayBodyCell<Item>,
    _state: TableState<Item, Plugins>
) => RenderConfig

/**
 * A label for header cells. Can be static content or a render function.
 * If the function type is removed from the union, generics will not be
 * inferred for subtypes.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 */
export type HeaderLabel<Item, Plugins extends AnyPlugins = AnyPlugins> =
    | RenderConfig
    | ((_cell: HeaderCell<Item, Plugins>, _state: TableState<Item, Plugins>) => RenderConfig)
