import { isNumber, nonNull, nonNullish, nonUndefined } from './filter.js'

test('nonNull filters null values', () => {
    const items = [1, null, 2, null, 3]
    expect(items.filter(nonNull)).toEqual([1, 2, 3])
})

test('nonUndefined filters undefined values', () => {
    const items = [1, undefined, 2, undefined, 3]
    expect(items.filter(nonUndefined)).toEqual([1, 2, 3])
})

test('nonNullish filters both null and undefined', () => {
    const items = [1, null, 2, undefined, 3]
    expect(items.filter(nonNullish)).toEqual([1, 2, 3])
})

test('isNumber returns true for numbers', () => {
    expect(isNumber(42)).toBe(true)
    expect(isNumber(0)).toBe(true)
    expect(isNumber(-1.5)).toBe(true)
})

test('isNumber returns false for non-numbers', () => {
    expect(isNumber('42')).toBe(false)
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
})
