import { resolveAlignedOffset } from './scrollAlign.js'
describe('resolveAlignedOffset', () => {
    // rowStart 500, rowHeight 40, viewport 300, currentTop 100
    it('start aligns the row to the top', () => {
        expect(resolveAlignedOffset('start', 500, 40, 300, 100)).toBe(500)
    })

    it('center puts the row in the middle of the viewport', () => {
        expect(resolveAlignedOffset('center', 500, 40, 300, 100)).toBe(500 - (300 - 40) / 2)
    })

    it('end aligns the row bottom to the viewport bottom', () => {
        expect(resolveAlignedOffset('end', 500, 40, 300, 100)).toBe(500 - 300 + 40)
    })

    it('auto returns undefined when the row is already fully visible', () => {
        expect(resolveAlignedOffset('auto', 150, 40, 300, 100)).toBeUndefined()
    })

    it('auto scrolls up to a row above the viewport', () => {
        expect(resolveAlignedOffset('auto', 50, 40, 300, 100)).toBe(50)
    })

    it('auto scrolls down just enough for a row below the viewport', () => {
        expect(resolveAlignedOffset('auto', 500, 40, 300, 100)).toBe(500 + 40 - 300)
    })
})
