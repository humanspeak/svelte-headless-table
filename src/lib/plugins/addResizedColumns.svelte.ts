import type { HeaderCell } from '../headerCells.js'
import { box, withoutKey, type Box } from '../reactivity.svelte.js'
import type { NewTableAttributeSet, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addResizedColumns plugin.
 */
export interface AddResizedColumnsConfig {
    /** Callback fired when a resize operation ends. */
    onResizeEnd?: ((_ev: Event) => void) | undefined
}

/**
 * State exposed by the addResizedColumns plugin.
 */
export type ResizedColumnsState = {
    /** The current column widths in pixels, keyed by column ID. Assign a new record to change them. */
    columnWidths: Box<Record<string, number>>
}

/**
 * Per-column configuration options for resizing.
 */
export type ResizedColumnsColumnOptions = {
    /** Initial width in pixels. */
    initialWidth?: number
    /** Minimum width in pixels. */
    minWidth?: number
    /** Maximum width in pixels. */
    maxWidth?: number
    /** If true, resizing is disabled for this column. */
    disable?: boolean
}

/**
 * The value returned by the resized columns actions.
 * @internal
 */
interface ResizeActionReturn {
    destroy: () => void
}

/**
 * Props added to table elements by the resized columns plugin.
 */
export type ResizedColumnsPropSet = NewTablePropSet<{
    'thead.tr.th': {
        /** Action to register the header cell element. */
        (_node: Element): void
        /** Action to enable drag-to-resize on an element. */
        drag: (_node: Element) => void
        /** Action to enable double-click-to-reset on an element. */
        reset: (_node: Element) => void
        /** Whether resizing is disabled for this column. */
        disabled: boolean
    }
}>

/**
 * Attributes added to table elements by the resized columns plugin.
 */
export type ResizedColumnsAttributeSet = NewTableAttributeSet<{
    'thead.tr.th': {
        style?: {
            width: string
            'min-width': string
            'max-width': string
            'box-sizing': 'border-box'
        }
    }
    'tbody.tr.td': {
        style?: {
            width: string
            'min-width': string
            'max-width': string
            'box-sizing': 'border-box'
        }
    }
}>

/**
 * Gets the X position from a mouse or touch event.
 * @internal
 */
const getDragXPos = (event: Event): number => {
    if (event instanceof MouseEvent) return event.clientX
    if (event instanceof TouchEvent) return event.targetTouches.item(0)?.pageX ?? 0
    return 0
}

const isCellDisabled = <Item>(cell: HeaderCell<Item>, disabledIds: string[]) => {
    if (disabledIds.includes(cell.id)) return true
    if (cell.isGroup() && cell.ids.every((id) => disabledIds.includes(id))) {
        return true
    }
    return false
}

/**
 * Returns a copy of `widths` with `id` set to `width`, or with `id` removed
 * when `width` is undefined.
 * @internal
 */
const withWidth = (
    widths: Record<string, number>,
    id: string,
    width: number | undefined
): Record<string, number> => {
    if (width !== undefined) {
        return { ...widths, [id]: width }
    }
    return withoutKey(widths, id)
}

/**
 * Sums the widths of a group's columns. Undefined until every column has a width
 * (a partial sum would be wrong, and a NaN width is not valid CSS).
 * @internal
 */
const groupWidth = (widths: Record<string, number>, ids: string[]): number | undefined => {
    let total = 0
    for (const id of ids) {
        const width = widths[id]
        if (width === undefined) return undefined
        total += width
    }
    return total
}

/**
 * The inline style for a width, or no attributes when the width is unknown.
 * @internal
 */
const styleFor = (width: number | undefined) => {
    if (width === undefined) {
        return {}
    }
    const widthPx = `${width}px`
    return {
        style: {
            width: widthPx,
            'min-width': widthPx,
            'max-width': widthPx,
            'box-sizing': 'border-box' as const
        }
    }
}

/**
 * Creates a resized columns plugin that enables drag-to-resize column widths.
 * Supports both mouse and touch interactions.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column resizing functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   resize: addResizedColumns({
 *     onResizeEnd: (event) => console.log('Resize ended')
 *   })
 * })
 *
 * // Configure per-column options
 * table.column({
 *   accessor: 'name',
 *   header: 'Name',
 *   plugins: {
 *     resize: {
 *       initialWidth: 200,
 *       minWidth: 100,
 *       maxWidth: 400
 *     }
 *   }
 * })
 * ```
 */
export const addResizedColumns =
    <Item>({ onResizeEnd }: AddResizedColumnsConfig = {}): TablePlugin<
        Item,
        ResizedColumnsState,
        ResizedColumnsColumnOptions,
        ResizedColumnsPropSet,
        ResizedColumnsAttributeSet
    > =>
    ({ columnOptions }) => {
        const disabledResizeIds = Object.entries(columnOptions)
            .filter(([, option]) => option.disable === true)
            .map(([columnId]) => columnId)

        const initialWidths: Record<string, number> = Object.fromEntries(
            Object.entries(columnOptions).flatMap(([columnId, { initialWidth }]) =>
                initialWidth === undefined ? [] : [[columnId, initialWidth] as const]
            )
        )

        const columnWidths = box(initialWidths)
        // Widths at the start of the drag in progress. Written by `dragStart`
        // and read by `dragMove`; nothing renders from it, so it is not state.
        let startWidths: Record<string, number> = {}

        const pluginState: ResizedColumnsState = { columnWidths }

        // Plain lookups, not rune state: they are written from DOM events and actions.
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
        const dragStartXPosForId = new Map<string, number>()
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
        const nodeForId = new Map<string, Element>()

        // Every handler below runs from a DOM event or an action, never while a
        // getter or `$derived` is evaluating, so writing state there is allowed.
        return {
            pluginState,
            hooks: {
                'thead.tr.th': (cell) => {
                    const dblClick = (event: Event) => {
                        if (isCellDisabled(cell, disabledResizeIds)) return
                        const { target } = event
                        if (target === null) return
                        event.stopPropagation()
                        event.preventDefault()
                        for (const id of cell.isGroup() ? cell.ids : [cell.id]) {
                            if (nodeForId.has(id)) {
                                columnWidths.current = withWidth(
                                    columnWidths.current,
                                    id,
                                    initialWidths[id]
                                )
                            }
                        }
                    }
                    let tapedTwice = false
                    const checkDoubleTap = (event: Event) => {
                        if (!tapedTwice) {
                            tapedTwice = true
                            setTimeout(function () {
                                tapedTwice = false
                            }, 300)
                            return false
                        }
                        event.preventDefault()
                        dblClick(event)
                    }
                    const dragStart = (event: Event) => {
                        if (isCellDisabled(cell, disabledResizeIds)) return
                        const { target } = event
                        if (target === null) return
                        event.stopPropagation()
                        event.preventDefault()
                        dragStartXPosForId.set(cell.id, getDragXPos(event))
                        const current = columnWidths.current
                        for (const id of cell.isGroup() ? cell.ids : [cell.id]) {
                            startWidths = withWidth(startWidths, id, current[id])
                        }
                        if (event instanceof MouseEvent) {
                            window.addEventListener('mousemove', dragMove)
                            window.addEventListener('mouseup', dragEnd)
                        } else {
                            window.addEventListener('touchmove', dragMove)
                            window.addEventListener('touchend', dragEnd)
                        }
                    }
                    const dragMove = (event: Event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        // Always set by `dragStart`, which registers this listener.
                        const dragStartXPos = dragStartXPosForId.get(cell.id)
                        if (dragStartXPos === undefined) return
                        const deltaWidth = getDragXPos(event) - dragStartXPos
                        const widths = { ...columnWidths.current }
                        if (cell.isGroup()) {
                            const enabledIds = cell.ids.filter(
                                (id) => !disabledResizeIds.includes(id)
                            )
                            let totalStartWidth = 0
                            for (const id of enabledIds) {
                                totalStartWidth += startWidths[id] ?? 0
                            }
                            enabledIds.forEach((id) => {
                                const startWidth = startWidths[id]
                                if (startWidth !== undefined) {
                                    widths[id] = Math.max(
                                        0,
                                        startWidth + deltaWidth * (startWidth / totalStartWidth)
                                    )
                                }
                            })
                        } else {
                            const startWidth = startWidths[cell.id]
                            const { minWidth = 0, maxWidth } = columnOptions[cell.id] ?? {}
                            if (startWidth !== undefined) {
                                widths[cell.id] = Math.min(
                                    Math.max(minWidth, startWidth + deltaWidth),
                                    ...(maxWidth === undefined ? [] : [maxWidth])
                                )
                            }
                        }
                        columnWidths.current = widths
                    }
                    const dragEnd = (event: Event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        for (const id of cell.isGroup() ? cell.ids : [cell.id]) {
                            const node = nodeForId.get(id)
                            if (node !== undefined) {
                                columnWidths.current = withWidth(
                                    columnWidths.current,
                                    id,
                                    node.getBoundingClientRect().width
                                )
                            }
                        }
                        onResizeEnd?.(event)
                        if (event instanceof MouseEvent) {
                            window.removeEventListener('mousemove', dragMove)
                            window.removeEventListener('mouseup', dragEnd)
                        } else {
                            window.removeEventListener('touchmove', dragMove)
                            window.removeEventListener('touchend', dragEnd)
                        }
                    }
                    // The action object is built once per cell, not per read.
                    const thProps = (node: Element): ResizeActionReturn => {
                        nodeForId.set(cell.id, node)
                        if (cell.isFlat()) {
                            columnWidths.current = withWidth(
                                columnWidths.current,
                                cell.id,
                                node.getBoundingClientRect().width
                            )
                        }
                        return {
                            destroy() {
                                nodeForId.delete(cell.id)
                            }
                        }
                    }
                    thProps.drag = (node: Element): ResizeActionReturn => {
                        node.addEventListener('mousedown', dragStart)
                        node.addEventListener('touchstart', dragStart)
                        return {
                            destroy() {
                                node.removeEventListener('mousedown', dragStart)
                                node.removeEventListener('touchstart', dragStart)
                            }
                        }
                    }
                    thProps.reset = (node: Element): ResizeActionReturn => {
                        node.addEventListener('dblclick', dblClick)
                        node.addEventListener('touchend', checkDoubleTap)
                        return {
                            destroy() {
                                node.removeEventListener('dblclick', dblClick)
                                node.removeEventListener('touchend', checkDoubleTap)
                            }
                        }
                    }
                    thProps.disabled = isCellDisabled(cell, disabledResizeIds)
                    return {
                        props: () => thProps,
                        attrs: () => {
                            const widths = columnWidths.current
                            return styleFor(
                                cell.isGroup() ? groupWidth(widths, cell.ids) : widths[cell.id]
                            )
                        }
                    }
                },
                'tbody.tr.td': (cell) => ({
                    attrs: () => styleFor(columnWidths.current[cell.id])
                })
            }
        }
    }
