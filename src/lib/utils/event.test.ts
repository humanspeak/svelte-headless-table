import { afterAll, beforeAll } from 'vitest'
import { isShiftClick } from './event.js'

// MouseEvent is not available in Node, so we create minimal mock objects
class MockMouseEvent extends Event {
    shiftKey: boolean
    constructor(type: string, init: { shiftKey?: boolean } = {}) {
        super(type)
        this.shiftKey = init.shiftKey ?? false
    }
}

// Patch global so instanceof MouseEvent works in the source code
const originalMouseEvent = globalThis.MouseEvent
beforeAll(() => {
    globalThis.MouseEvent = MockMouseEvent as unknown as typeof MouseEvent
})
afterAll(() => {
    globalThis.MouseEvent = originalMouseEvent
})

test('returns true for MouseEvent with shiftKey', () => {
    const event = new MockMouseEvent('click', { shiftKey: true })
    expect(isShiftClick(event)).toBe(true)
})

test('returns false for MouseEvent without shiftKey', () => {
    const event = new MockMouseEvent('click', { shiftKey: false })
    expect(isShiftClick(event)).toBe(false)
})

test('returns false for non-MouseEvent', () => {
    const event = new Event('click')
    expect(isShiftClick(event)).toBe(false)
})
