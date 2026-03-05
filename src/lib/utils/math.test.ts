import { mean, sum } from './math.js'

test('sum of array returns total', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15)
})

test('sum of empty array returns 0', () => {
    expect(sum([])).toBe(0)
})

test('mean of array returns average', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
})

test('mean of empty array returns 0', () => {
    expect(mean([])).toBe(0)
})
