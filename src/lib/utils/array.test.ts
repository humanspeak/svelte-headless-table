import { describe, expect, it } from 'vitest'
import { getDistinct, getDuplicates } from './array.js'

describe('getDistinct', () => {
    describe('positive cases', () => {
        it('removes duplicate numbers', () => {
            const actual = getDistinct([1, 2, 2, 3, 1])
            const expected = [1, 2, 3]
            expect(actual).toStrictEqual(expected)
        })

        it('removes duplicate strings', () => {
            const actual = getDistinct(['a', 'b', 'a', 'c', 'b'])
            const expected = ['a', 'b', 'c']
            expect(actual).toStrictEqual(expected)
        })

        it('preserves order of first occurrence', () => {
            const actual = getDistinct([3, 1, 2, 1, 3, 2])
            const expected = [3, 1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('handles mixed types that are comparable', () => {
            const actual = getDistinct([1, '1', 2, '2', 1, '1'])
            const expected = [1, '1', 2, '2']
            expect(actual).toStrictEqual(expected)
        })
    })

    describe('negative cases', () => {
        it('returns same elements when no duplicates exist', () => {
            const actual = getDistinct([1, 2, 3, 4, 5])
            const expected = [1, 2, 3, 4, 5]
            expect(actual).toStrictEqual(expected)
        })

        it('returns same strings when no duplicates exist', () => {
            const actual = getDistinct(['a', 'b', 'c'])
            const expected = ['a', 'b', 'c']
            expect(actual).toStrictEqual(expected)
        })
    })

    describe('edge cases', () => {
        it('returns empty array for empty input', () => {
            const actual = getDistinct([])
            const expected: never[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('returns single element array unchanged', () => {
            const actual = getDistinct([42])
            const expected = [42]
            expect(actual).toStrictEqual(expected)
        })

        it('returns single element when all elements are identical', () => {
            const actual = getDistinct([5, 5, 5, 5, 5])
            const expected = [5]
            expect(actual).toStrictEqual(expected)
        })

        it('handles null values', () => {
            const actual = getDistinct([null, 1, null, 2, null])
            const expected = [null, 1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('handles undefined values', () => {
            const actual = getDistinct([undefined, 1, undefined, 2])
            const expected = [undefined, 1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('handles mixed null and undefined', () => {
            const actual = getDistinct([null, undefined, null, undefined])
            const expected = [null, undefined]
            expect(actual).toStrictEqual(expected)
        })

        it('handles boolean values', () => {
            const actual = getDistinct([true, false, true, false, true])
            const expected = [true, false]
            expect(actual).toStrictEqual(expected)
        })

        it('treats 0 and -0 as equal', () => {
            // Map uses SameValueZero comparison, so 0 and -0 are equal
            const actual = getDistinct([0, -0, 1])
            const expected = [0, 1]
            expect(actual).toStrictEqual(expected)
        })

        it('treats NaN values as equal', () => {
            // Map uses SameValueZero comparison, so NaN equals NaN
            const actual = getDistinct([NaN, 1, NaN, 2])
            const expected = [NaN, 1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('does not deduplicate objects by value (reference equality)', () => {
            const obj1 = { id: 1 }
            const obj2 = { id: 1 }
            const obj3 = obj1
            const actual = getDistinct([obj1, obj2, obj3])
            // obj1 and obj3 are same reference, obj2 is different
            expect(actual).toStrictEqual([obj1, obj2])
            expect(actual).toHaveLength(2)
        })

        it('deduplicates same object references', () => {
            const obj = { id: 1 }
            const actual = getDistinct([obj, obj, obj])
            expect(actual).toStrictEqual([obj])
            expect(actual).toHaveLength(1)
        })

        it('handles arrays with large consecutive duplicates', () => {
            const input = Array(100).fill('x')
            const actual = getDistinct(input)
            expect(actual).toStrictEqual(['x'])
        })
    })

    describe('performance', () => {
        it('handles large arrays efficiently', () => {
            const size = 100_000
            const input = Array.from({ length: size }, (_, i) => i % 1000)

            const start = performance.now()
            const actual = getDistinct(input)
            const duration = performance.now() - start

            expect(actual).toHaveLength(1000)
            expect(duration).toBeLessThan(100) // Should complete in under 100ms
        })

        it('handles large arrays with no duplicates', () => {
            const size = 50_000
            const input = Array.from({ length: size }, (_, i) => i)

            const start = performance.now()
            const actual = getDistinct(input)
            const duration = performance.now() - start

            expect(actual).toHaveLength(size)
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays with all duplicates', () => {
            const size = 100_000
            const input = Array(size).fill(42)

            const start = performance.now()
            const actual = getDistinct(input)
            const duration = performance.now() - start

            expect(actual).toHaveLength(1)
            expect(duration).toBeLessThan(100)
        })
    })
})

describe('getDuplicates', () => {
    describe('positive cases', () => {
        it('finds duplicate numbers', () => {
            const actual = getDuplicates([1, 2, 2, 3, 1])
            const expected = [1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('finds duplicate strings', () => {
            const actual = getDuplicates(['a', 'b', 'a', 'c', 'b'])
            const expected = ['a', 'b']
            expect(actual).toStrictEqual(expected)
        })

        it('preserves order of first occurrence for duplicates', () => {
            const actual = getDuplicates([3, 1, 2, 1, 3, 2])
            const expected = [3, 1, 2]
            expect(actual).toStrictEqual(expected)
        })

        it('includes items that appear more than twice', () => {
            const actual = getDuplicates([1, 1, 1, 2, 2, 3])
            const expected = [1, 2]
            expect(actual).toStrictEqual(expected)
        })
    })

    describe('negative cases', () => {
        it('returns empty array when no duplicates exist', () => {
            const actual = getDuplicates([1, 2, 3, 4, 5])
            const expected: number[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('returns empty array for unique strings', () => {
            const actual = getDuplicates(['a', 'b', 'c'])
            const expected: string[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('distinguishes between similar but different types', () => {
            const actual = getDuplicates([1, '1', 2, '2'])
            const expected: (number | string)[] = []
            expect(actual).toStrictEqual(expected)
        })
    })

    describe('edge cases', () => {
        it('returns empty array for empty input', () => {
            const actual = getDuplicates([])
            const expected: never[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('returns empty array for single element', () => {
            const actual = getDuplicates([42])
            const expected: number[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('returns single element when all elements are identical', () => {
            const actual = getDuplicates([5, 5, 5, 5, 5])
            const expected = [5]
            expect(actual).toStrictEqual(expected)
        })

        it('handles duplicate null values', () => {
            const actual = getDuplicates([null, 1, null, 2])
            const expected = [null]
            expect(actual).toStrictEqual(expected)
        })

        it('returns empty when null appears once', () => {
            const actual = getDuplicates([null, 1, 2, 3])
            const expected: (number | null)[] = []
            expect(actual).toStrictEqual(expected)
        })

        it('handles duplicate undefined values', () => {
            const actual = getDuplicates([undefined, 1, undefined, 2])
            const expected = [undefined]
            expect(actual).toStrictEqual(expected)
        })

        it('handles duplicate boolean values', () => {
            const actual = getDuplicates([true, false, true])
            const expected = [true]
            expect(actual).toStrictEqual(expected)
        })

        it('handles NaN duplicates', () => {
            const actual = getDuplicates([NaN, 1, NaN, 2])
            const expected = [NaN]
            expect(actual).toStrictEqual(expected)
        })

        it('does not find duplicates for different object references', () => {
            const obj1 = { id: 1 }
            const obj2 = { id: 1 }
            const actual = getDuplicates([obj1, obj2])
            expect(actual).toStrictEqual([])
        })

        it('finds duplicates for same object references', () => {
            const obj = { id: 1 }
            const actual = getDuplicates([obj, obj])
            expect(actual).toStrictEqual([obj])
        })

        it('handles two-element array with duplicates', () => {
            const actual = getDuplicates([1, 1])
            const expected = [1]
            expect(actual).toStrictEqual(expected)
        })

        it('handles two-element array without duplicates', () => {
            const actual = getDuplicates([1, 2])
            const expected: number[] = []
            expect(actual).toStrictEqual(expected)
        })
    })

    describe('performance', () => {
        it('handles large arrays efficiently', () => {
            const size = 100_000
            const input = Array.from({ length: size }, (_, i) => i % 1000)

            const start = performance.now()
            const actual = getDuplicates(input)
            const duration = performance.now() - start

            // All 1000 unique values appear 100 times each, so all are duplicates
            expect(actual).toHaveLength(1000)
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays with no duplicates', () => {
            const size = 50_000
            const input = Array.from({ length: size }, (_, i) => i)

            const start = performance.now()
            const actual = getDuplicates(input)
            const duration = performance.now() - start

            expect(actual).toHaveLength(0)
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays with all duplicates', () => {
            const size = 100_000
            const input = Array(size).fill(42)

            const start = performance.now()
            const actual = getDuplicates(input)
            const duration = performance.now() - start

            expect(actual).toStrictEqual([42])
            expect(duration).toBeLessThan(100)
        })

        it('handles sparse duplicates in large array', () => {
            const size = 50_000
            // Only first and last elements are duplicates
            const input = Array.from({ length: size }, (_, i) =>
                i === 0 || i === size - 1 ? 'duplicate' : i
            )

            const start = performance.now()
            const actual = getDuplicates(input)
            const duration = performance.now() - start

            expect(actual).toStrictEqual(['duplicate'])
            expect(duration).toBeLessThan(100)
        })
    })
})
