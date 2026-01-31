import { keyed } from '@humanspeak/svelte-keyed'
import { derived, writable, type Writable } from 'svelte/store'
import type { HeaderCell } from '../headerCells.js'
import type { NewTableAttributeSet, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { sum } from '../utils/math.js'

/**
 * Configuration options for the addResizedColumns plugin.
 */
export interface AddResizedColumnsConfig {
    /** Callback fired when a resize operation ends. */
    onResizeEnd?: (_ev: Event) => void
}

/**
 * State exposed by the addResizedColumns plugin.
 */
export type ResizedColumnsState = {
    /** Writable store mapping column IDs to their current widths in pixels. */
    columnWidths: Writable<Record<string, number>>
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
    if (event instanceof TouchEvent) return event.targetTouches[0].pageX
    return 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCellDisabled = (cell: HeaderCell<any>, disabledIds: string[]) => {
    if (disabledIds.includes(cell.id)) return true
    if (cell.isGroup() && cell.ids.every((id) => disabledIds.includes(id))) {
        return true
    }
    return false
}

/**
 * Internal state for tracking column widths during resize operations.
 * @internal
 */
type ColumnsWidthState = {
    current: Record<string, number>
    start: Record<string, number>
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
 * const table = createTable(data, {
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

        const initialWidths = Object.fromEntries(
            Object.entries(columnOptions)
                .filter(([, option]) => option.initialWidth !== undefined)
                .map(([columnId, { initialWidth }]) => [columnId, initialWidth as number])
        )

        const columnsWidthState = writable<ColumnsWidthState>({
            current: initialWidths,
            start: {}
        })
        const columnWidths = keyed(columnsWidthState, 'current')

        const pluginState = { columnWidths }

        const dragStartXPosForId: Record<string, number> = {}
        const nodeForId: Record<string, Element> = {}

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
                        if (cell.isGroup()) {
                            cell.ids.forEach((id) => {
                                const node = nodeForId[id]
                                if (node !== undefined) {
                                    columnWidths.update(($columnWidths) => ({
                                        ...$columnWidths,
                                        [id]: initialWidths[id]
                                    }))
                                }
                            })
                        } else {
                            const node = nodeForId[cell.id]
                            if (node !== undefined) {
                                columnWidths.update(($columnWidths) => ({
                                    ...$columnWidths,
                                    [cell.id]: initialWidths[cell.id]
                                }))
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
                        dragStartXPosForId[cell.id] = getDragXPos(event)
                        columnsWidthState.update(($columnsWidthState) => {
                            const $updatedState = {
                                ...$columnsWidthState,
                                start: { ...$columnsWidthState.start }
                            }
                            if (cell.isGroup()) {
                                cell.ids.forEach((id) => {
                                    $updatedState.start[id] = $columnsWidthState.current[id]
                                })
                            } else {
                                $updatedState.start[cell.id] = $columnsWidthState.current[cell.id]
                            }
                            return $updatedState
                        })
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
                        const deltaWidth = getDragXPos(event) - dragStartXPosForId[cell.id]
                        columnsWidthState.update(($columnsWidthState) => {
                            const $updatedState = {
                                ...$columnsWidthState,
                                current: { ...$columnsWidthState.current }
                            }
                            if (cell.isGroup()) {
                                const enabledIds = cell.ids.filter(
                                    (id) => !disabledResizeIds.includes(id)
                                )
                                const totalStartWidth = sum(
                                    enabledIds.map((id) => $columnsWidthState.start[id])
                                )
                                enabledIds.forEach((id) => {
                                    const startWidth = $columnsWidthState.start[id]
                                    if (startWidth !== undefined) {
                                        $updatedState.current[id] = Math.max(
                                            0,
                                            startWidth + deltaWidth * (startWidth / totalStartWidth)
                                        )
                                    }
                                })
                            } else {
                                const startWidth = $columnsWidthState.start[cell.id]
                                const { minWidth = 0, maxWidth } = columnOptions[cell.id] ?? {}
                                if (startWidth !== undefined) {
                                    $updatedState.current[cell.id] = Math.min(
                                        Math.max(minWidth, startWidth + deltaWidth),
                                        ...(maxWidth === undefined ? [] : [maxWidth])
                                    )
                                }
                            }
                            return $updatedState
                        })
                    }
                    const dragEnd = (event: Event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        if (cell.isGroup()) {
                            cell.ids.forEach((id) => {
                                const node = nodeForId[id]
                                if (node !== undefined) {
                                    columnWidths.update(($columnWidths) => ({
                                        ...$columnWidths,
                                        [id]: node.getBoundingClientRect().width
                                    }))
                                }
                            })
                        } else {
                            const node = nodeForId[cell.id]
                            if (node !== undefined) {
                                columnWidths.update(($columnWidths) => ({
                                    ...$columnWidths,
                                    [cell.id]: node.getBoundingClientRect().width
                                }))
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
                    const $props = (node: Element) => {
                        nodeForId[cell.id] = node
                        if (cell.isFlat()) {
                            columnWidths.update(($columnWidths) => ({
                                ...$columnWidths,
                                [cell.id]: node.getBoundingClientRect().width
                            }))
                        }
                        return {
                            destroy() {
                                delete nodeForId[cell.id]
                            }
                        }
                    }
                    $props.drag = (node: Element) => {
                        node.addEventListener('mousedown', dragStart)
                        node.addEventListener('touchstart', dragStart)
                        return {
                            destroy() {
                                node.removeEventListener('mousedown', dragStart)
                                node.removeEventListener('touchstart', dragStart)
                            }
                        }
                    }
                    $props.reset = (node: Element) => {
                        node.addEventListener('dblclick', dblClick)
                        node.addEventListener('touchend', checkDoubleTap)
                        return {
                            destroy() {
                                node.removeEventListener('dblckick', dblClick)
                                node.removeEventListener('touchend', checkDoubleTap)
                            }
                        }
                    }
                    $props.disabled = isCellDisabled(cell, disabledResizeIds)
                    const props = derived([], () => {
                        return $props
                    })
                    const attrs = derived(columnWidths, ($columnWidths) => {
                        const width = cell.isGroup()
                            ? sum(cell.ids.map((id) => $columnWidths[id]))
                            : $columnWidths[cell.id]
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
                    })
                    return { props, attrs }
                },
                'tbody.tr.td': (cell) => {
                    const attrs = derived(columnWidths, ($columnWidths) => {
                        const width = $columnWidths[cell.id]
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
                    })
                    return { attrs }
                }
            }
        }
    }
