import { compare, compareArray } from './compare.js'

test('compare numbers returns negative when a < b', () => {
    expect(compare(1, 2)).toBeLessThan(0)
})

test('compare numbers returns positive when a > b', () => {
    expect(compare(5, 2)).toBeGreaterThan(0)
})

test('compare numbers returns 0 for equal values', () => {
    expect(compare(3, 3)).toBe(0)
})

test('compare strings uses lexicographic ordering', () => {
    expect(compare('apple', 'banana')).toBeLessThan(0)
    expect(compare('banana', 'apple')).toBeGreaterThan(0)
})

test('compare equal strings returns 0', () => {
    expect(compare('same', 'same')).toBe(0)
})

test('compare delegates arrays to compareArray', () => {
    expect(compare([1, 2], [1, 3])).toBeLessThan(0)
})

test('compareArray stops at first difference', () => {
    expect(compareArray([1, 2, 3], [1, 5, 0])).toBeLessThan(0)
    expect(compareArray([1, 5, 0], [1, 2, 3])).toBeGreaterThan(0)
})

test('compareArray returns 0 for equal arrays', () => {
    expect(compareArray([1, 2, 3], [1, 2, 3])).toBe(0)
})

test('compareArray with string elements', () => {
    expect(compareArray(['a', 'b'], ['a', 'c'])).toBeLessThan(0)
})
