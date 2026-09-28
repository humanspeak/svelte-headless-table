import type { DataBodyCell, DisplayBodyCell } from '../bodyCells.js'
import type { TableState } from '../createViewModel.svelte.js'
import type { HeaderCell } from '../headerCells.js'
import type { RenderConfig } from '../render/createRender.js'
import type { AnyPlugins } from './TablePlugin.js'

/**
 * A render function for data body cells.
 * Receives the cell and table state, returns content to render.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Value - The type of the cell value.
 */
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any): `any` keeps labels bivariant in the cell value type
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
    RenderConfig | HeaderLabelFn<Item, Plugins>

/**
 * The render-function form of {@link HeaderLabel}, declared through a method
 * signature so it is bivariant in its parameters. A plain function type would
 * make `HeaderCell` invariant in `Plugins`, and plugin hooks (typed against the
 * default plugins) could no longer accept a table's concrete header cells.
 */
export type HeaderLabelFn<Item, Plugins extends AnyPlugins = AnyPlugins> = {
    bivarianceHack(
        _cell: HeaderCell<Item, Plugins>,
        _state: TableState<Item, Plugins>
    ): RenderConfig
}['bivarianceHack']
