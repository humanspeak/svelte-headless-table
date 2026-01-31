/**
 * Determines if an event is a mouse click with the Shift key held down.
 *
 * @param event - The DOM event to check.
 * @returns True if the event is a MouseEvent with shiftKey pressed, false otherwise.
 * @example
 * ```typescript
 * element.addEventListener('click', (e) => {
 *   if (isShiftClick(e)) {
 *     // Handle shift+click
 *   }
 * })
 * ```
 */
export const isShiftClick = (event: Event) => {
    if (!(event instanceof MouseEvent)) return false
    return event.shiftKey
}
