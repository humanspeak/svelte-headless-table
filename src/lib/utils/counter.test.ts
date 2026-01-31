import { describe, expect, it } from 'vitest'
import { getCounter } from './counter.js'

describe('getCounter', () => {
    describe('positive cases', () => {
        it('counts occurrences of numbers', () => {
            const actual = getCounter([1, 2, 2, 3, 1, 1])

            expect(actual.get(1)).toBe(3)
            expect(actual.get(2)).toBe(2)
            expect(actual.get(3)).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('counts occurrences of strings', () => {
            const actual = getCounter(['a', 'b', 'a', 'c', 'a'])

            expect(actual.get('a')).toBe(3)
            expect(actual.get('b')).toBe(1)
            expect(actual.get('c')).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('preserves insertion order of keys', () => {
            const actual = getCounter([3, 1, 2, 1, 3, 2])
            const keys = Array.from(actual.keys())

            expect(keys).toStrictEqual([3, 1, 2])
        })

        it('counts mixed types correctly', () => {
            const actual = getCounter([1, '1', 2, '2', 1, '1'])

            expect(actual.get(1)).toBe(2)
            expect(actual.get('1')).toBe(2)
            expect(actual.get(2)).toBe(1)
            expect(actual.get('2')).toBe(1)
            expect(actual.size).toBe(4)
        })

        it('returns correct entries', () => {
            const actual = getCounter(['x', 'y', 'x'])
            const entries = Array.from(actual.entries())

            expect(entries).toStrictEqual([
                ['x', 2],
                ['y', 1]
            ])
        })
    })

    describe('negative cases', () => {
        it('counts unique items as 1 each', () => {
            const actual = getCounter([1, 2, 3, 4, 5])

            expect(actual.get(1)).toBe(1)
            expect(actual.get(2)).toBe(1)
            expect(actual.get(3)).toBe(1)
            expect(actual.get(4)).toBe(1)
            expect(actual.get(5)).toBe(1)
            expect(actual.size).toBe(5)
        })

        it('returns undefined for items not in array', () => {
            const actual = getCounter([1, 2, 3])

            expect(actual.get(4)).toBeUndefined()
            expect(actual.get(0)).toBeUndefined()
        })
    })

    describe('edge cases', () => {
        it('returns empty Map for empty input', () => {
            const actual = getCounter([])

            expect(actual.size).toBe(0)
            expect(Array.from(actual.keys())).toStrictEqual([])
        })

        it('handles single element array', () => {
            const actual = getCounter([42])

            expect(actual.get(42)).toBe(1)
            expect(actual.size).toBe(1)
        })

        it('handles all identical elements', () => {
            const actual = getCounter([5, 5, 5, 5, 5])

            expect(actual.get(5)).toBe(5)
            expect(actual.size).toBe(1)
        })

        it('counts null values', () => {
            const actual = getCounter([null, 1, null, 2, null])

            expect(actual.get(null)).toBe(3)
            expect(actual.get(1)).toBe(1)
            expect(actual.get(2)).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('counts undefined values', () => {
            const actual = getCounter([undefined, 1, undefined, 2])

            expect(actual.get(undefined)).toBe(2)
            expect(actual.get(1)).toBe(1)
            expect(actual.get(2)).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('distinguishes null from undefined', () => {
            const actual = getCounter([null, undefined, null, undefined])

            expect(actual.get(null)).toBe(2)
            expect(actual.get(undefined)).toBe(2)
            expect(actual.size).toBe(2)
        })

        it('counts boolean values', () => {
            const actual = getCounter([true, false, true, false, true])

            expect(actual.get(true)).toBe(3)
            expect(actual.get(false)).toBe(2)
            expect(actual.size).toBe(2)
        })

        it('treats 0 and -0 as equal (SameValueZero)', () => {
            const actual = getCounter([0, -0, 1])

            expect(actual.get(0)).toBe(2)
            expect(actual.get(-0)).toBe(2) // Same key as 0
            expect(actual.size).toBe(2)
        })

        it('treats NaN values as equal (SameValueZero)', () => {
            const actual = getCounter([NaN, 1, NaN, 2])

            expect(actual.get(NaN)).toBe(2)
            expect(actual.size).toBe(3)
        })

        it('counts object references (not by value)', () => {
            const obj1 = { id: 1 }
            const obj2 = { id: 1 }
            const obj3 = obj1
            const actual = getCounter([obj1, obj2, obj3])

            expect(actual.get(obj1)).toBe(2) // obj1 and obj3 are same reference
            expect(actual.get(obj2)).toBe(1)
            expect(actual.get(obj3)).toBe(2) // Same as obj1
            expect(actual.size).toBe(2)
        })

        it('counts same object reference multiple times', () => {
            const obj = { id: 1 }
            const actual = getCounter([obj, obj, obj])

            expect(actual.get(obj)).toBe(3)
            expect(actual.size).toBe(1)
        })

        it('counts array references (not by value)', () => {
            const arr1 = [1, 2]
            const arr2 = [1, 2]
            const actual = getCounter([arr1, arr2, arr1])

            expect(actual.get(arr1)).toBe(2)
            expect(actual.get(arr2)).toBe(1)
            expect(actual.size).toBe(2)
        })

        it('handles symbols', () => {
            const sym1 = Symbol('test')
            const sym2 = Symbol('test')
            const actual = getCounter([sym1, sym2, sym1])

            expect(actual.get(sym1)).toBe(2)
            expect(actual.get(sym2)).toBe(1)
            expect(actual.size).toBe(2)
        })

        it('handles bigint values', () => {
            const actual = getCounter([1n, 2n, 1n, 3n, 1n])

            expect(actual.get(1n)).toBe(3)
            expect(actual.get(2n)).toBe(1)
            expect(actual.get(3n)).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('distinguishes number from bigint', () => {
            const actual = getCounter([1, 1n, 1, 1n])

            expect(actual.get(1)).toBe(2)
            expect(actual.get(1n)).toBe(2)
            expect(actual.size).toBe(2)
        })

        it('handles functions as keys', () => {
            const fn1 = () => 1
            const fn2 = () => 1
            const actual = getCounter([fn1, fn2, fn1])

            expect(actual.get(fn1)).toBe(2)
            expect(actual.get(fn2)).toBe(1)
            expect(actual.size).toBe(2)
        })

        it('handles empty string', () => {
            const actual = getCounter(['', 'a', '', 'b'])

            expect(actual.get('')).toBe(2)
            expect(actual.get('a')).toBe(1)
            expect(actual.get('b')).toBe(1)
            expect(actual.size).toBe(3)
        })

        it('handles whitespace strings distinctly', () => {
            const actual = getCounter(['', ' ', '  ', ' '])

            expect(actual.get('')).toBe(1)
            expect(actual.get(' ')).toBe(2)
            expect(actual.get('  ')).toBe(1)
            expect(actual.size).toBe(3)
        })
    })

    describe('performance', () => {
        it('handles large arrays efficiently', () => {
            const size = 100_000
            const input = Array.from({ length: size }, (_, i) => i % 1000)

            const start = performance.now()
            const actual = getCounter(input)
            const duration = performance.now() - start

            expect(actual.size).toBe(1000)
            expect(actual.get(0)).toBe(100)
            expect(actual.get(999)).toBe(100)
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays with no duplicates', () => {
            const size = 50_000
            const input = Array.from({ length: size }, (_, i) => i)

            const start = performance.now()
            const actual = getCounter(input)
            const duration = performance.now() - start

            expect(actual.size).toBe(size)
            for (let i = 0; i < 100; i++) {
                expect(actual.get(i)).toBe(1)
            }
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays with all duplicates', () => {
            const size = 100_000
            const input = Array(size).fill(42)

            const start = performance.now()
            const actual = getCounter(input)
            const duration = performance.now() - start

            expect(actual.size).toBe(1)
            expect(actual.get(42)).toBe(size)
            expect(duration).toBeLessThan(100)
        })

        it('handles large arrays of strings', () => {
            const size = 50_000
            const input = Array.from({ length: size }, (_, i) => `item-${i % 500}`)

            const start = performance.now()
            const actual = getCounter(input)
            const duration = performance.now() - start

            expect(actual.size).toBe(500)
            expect(actual.get('item-0')).toBe(100)
            expect(duration).toBeLessThan(100)
        })

        it('handles very high count for single item', () => {
            const size = 1_000_000
            const input = Array(size).fill('x')

            const start = performance.now()
            const actual = getCounter(input)
            const duration = performance.now() - start

            expect(actual.get('x')).toBe(size)
            expect(actual.size).toBe(1)
            expect(duration).toBeLessThan(200)
        })
    })

    describe('return type verification', () => {
        it('returns a Map instance', () => {
            const actual = getCounter([1, 2, 3])

            expect(actual).toBeInstanceOf(Map)
        })

        it('returned Map is mutable', () => {
            const actual = getCounter([1, 2, 3])

            actual.set(1, 100)
            expect(actual.get(1)).toBe(100)

            actual.delete(2)
            expect(actual.has(2)).toBe(false)
        })

        it('does not modify input array', () => {
            const input = [1, 2, 2, 3]
            const inputCopy = [...input]

            getCounter(input)

            expect(input).toStrictEqual(inputCopy)
        })
    })
})
