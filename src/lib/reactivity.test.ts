import {
    ArraySet,
    box,
    derivedBox,
    keyedBox,
    RecordSet,
    withoutKey,
    withoutKeys
} from './reactivity.svelte.js'

describe('box', () => {
    it('reads and writes current', () => {
        const actual = box(1)
        expect(actual.current).toBe(1)
        actual.current = 2
        expect(actual.current).toBe(2)
    })

    it('keeps the identity of the written value (no deep proxy)', () => {
        const value = { a: 1 }
        const actual = box(value)
        expect(actual.current).toBe(value)
        const next = { a: 2 }
        actual.current = next
        expect(actual.current).toBe(next)
    })
})

describe('derivedBox', () => {
    it('recomputes on a plain read after a dependency changes', () => {
        const source = box(2)
        const doubled = derivedBox(() => source.current * 2)
        expect(doubled.current).toBe(4)
        source.current = 5
        expect(doubled.current).toBe(10)
    })
})

describe('keyedBox', () => {
    it('reads the property', () => {
        const parent = box<Record<string, number>>({ a: 1, b: 2 })
        expect(keyedBox(parent, 'a').current).toBe(1)
    })

    it('writing replaces the parent with a copy', () => {
        const parent = box<Record<string, number>>({ a: 1 })
        const before = parent.current
        const actual = keyedBox(parent, 'a')
        actual.current = 5
        expect(actual.current).toBe(5)
        expect(parent.current).toStrictEqual({ a: 5 })
        expect(parent.current).not.toBe(before)
        expect(before).toStrictEqual({ a: 1 })
    })

    it('stores a key containing a dot flat', () => {
        const parent = box<Record<string, string>>({})
        const actual = keyedBox(parent, 'a.b')
        actual.current = 'x'
        expect(parent.current).toStrictEqual({ 'a.b': 'x' })
        expect(actual.current).toBe('x')
    })

    it('keeps unrelated keys when setting', () => {
        const parent = box<Record<string, number>>({ a: 1, b: 2, c: 3 })
        keyedBox(parent, 'b').current = 20
        expect(parent.current).toStrictEqual({ a: 1, b: 20, c: 3 })
    })

    it('writing undefined removes the key', () => {
        const parent = box<Record<string, number>>({ a: 1, b: 2 })
        keyedBox(parent, 'a').current = undefined
        expect(parent.current).toStrictEqual({ b: 2 })
    })

    it('reads through the parent, so parent writes are visible', () => {
        const parent = box<Record<string, number>>({ a: 1 })
        const actual = keyedBox(parent, 'a')
        parent.current = { a: 10 }
        expect(actual.current).toBe(10)
    })
})

describe('withoutKey / withoutKeys', () => {
    it('drops one key without mutating the input', () => {
        const input = { a: 1, b: 2 }
        expect(withoutKey(input, 'a')).toStrictEqual({ b: 2 })
        expect(input).toStrictEqual({ a: 1, b: 2 })
    })

    it('drops several keys without mutating the input', () => {
        const input = { a: 1, b: 2, c: 3 }
        expect(withoutKeys(input, ['a', 'c'])).toStrictEqual({ b: 2 })
        expect(input).toStrictEqual({ a: 1, b: 2, c: 3 })
    })
})

// Ported from the v6 `utils/store.arraySetStore.test.ts`.
describe('ArraySet', () => {
    it('initializes correctly', () => {
        const actual = new ArraySet()
        const expected: never[] = []
        expect(actual.current).toStrictEqual(expected)
    })

    it('initializes with values correctly', () => {
        const actual = new ArraySet([1, 2, 3])
        expect(actual.current).toStrictEqual([1, 2, 3])
    })

    it('toggles an existing value to remove it', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(1)
        expect(actual.current).toStrictEqual([2, 3])
    })

    it('toggles the last value to remove it', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(3)
        expect(actual.current).toStrictEqual([1, 2])
    })

    it('toggles a non-existing value to add it', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(4)
        expect(actual.current).toStrictEqual([1, 2, 3, 4])
    })

    it('toggles an existing value to remove it and clears others', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(1, { clearOthers: true })
        expect(actual.current).toStrictEqual([])
    })

    it('toggles the last value to remove it and clears others', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(3, { clearOthers: true })
        expect(actual.current).toStrictEqual([])
    })

    it('toggles a non-existing value to add it and clears others', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.toggle(4, { clearOthers: true })
        expect(actual.current).toStrictEqual([4])
    })

    it('adds a value', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.add(4)
        expect(actual.current).toStrictEqual([1, 2, 3, 4])
    })

    it('adds an existing value and changes nothing', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.add(3)
        expect(actual.current).toStrictEqual([1, 2, 3])
    })

    it('removes a value', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.remove(3)
        expect(actual.current).toStrictEqual([1, 2])
    })

    it('removes a non-existing value and changes nothing', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.remove(4)
        expect(actual.current).toStrictEqual([1, 2, 3])
    })

    it('resets the set', () => {
        const actual = new ArraySet([1, 2, 3])
        actual.clear()
        expect(actual.current).toStrictEqual([])
    })

    it('has reports membership', () => {
        const actual = new ArraySet([1, 2])
        expect(actual.has(1)).toBe(true)
        expect(actual.has(3)).toBe(false)
    })

    it('assigning current replaces the items', () => {
        const actual = new ArraySet([1, 2])
        actual.current = [5]
        expect(actual.current).toStrictEqual([5])
    })

    it('finds the right element with a custom isEqual function', () => {
        type User = {
            id: number
            name: string
        }
        const actual = new ArraySet<User>(
            [
                { id: 0, name: 'Ada' },
                { id: 1, name: 'Alan' }
            ],
            { isEqual: (a, b) => a.id === b.id }
        )
        actual.add({ id: 0, name: 'Ken' })
        expect(actual.current).toStrictEqual([
            { id: 0, name: 'Ada' },
            { id: 1, name: 'Alan' }
        ])
    })
})

// Ported from the v6 record set store tests (`utils/store.*.test.ts`).
describe('RecordSet', () => {
    const initial = () => ({ 1: true, 2: true, 3: true })

    it('initializes correctly', () => {
        const actual = new RecordSet()
        const expected: Record<string, never> = {}
        expect(actual.current).toStrictEqual(expected)
    })

    it('initializes with values correctly', () => {
        const actual = new RecordSet(initial())
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true })
    })

    it('toggles an existing value to remove it', () => {
        const actual = new RecordSet(initial())
        actual.toggle('1')
        expect(actual.current).toStrictEqual({ 2: true, 3: true })
    })

    it('toggles the last value to remove it', () => {
        const actual = new RecordSet(initial())
        actual.toggle('3')
        expect(actual.current).toStrictEqual({ 1: true, 2: true })
    })

    it('toggles a non-existing value to add it', () => {
        const actual = new RecordSet(initial())
        actual.toggle('4')
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true, 4: true })
    })

    it('adds a value', () => {
        const actual = new RecordSet(initial())
        actual.add('4')
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true, 4: true })
    })

    it('adds an existing value and changes nothing', () => {
        const actual = new RecordSet(initial())
        actual.add('3')
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true })
    })

    it('adds several values', () => {
        const actual = new RecordSet<string>({ 1: true })
        actual.addAll(['2', '3'])
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true })
    })

    it('removes a value', () => {
        const actual = new RecordSet(initial())
        actual.remove('3')
        expect(actual.current).toStrictEqual({ 1: true, 2: true })
    })

    it('removes a non-existing value and changes nothing', () => {
        const actual = new RecordSet(initial())
        actual.remove('4')
        expect(actual.current).toStrictEqual({ 1: true, 2: true, 3: true })
    })

    it('removes several values', () => {
        const actual = new RecordSet(initial())
        actual.removeAll(['1', '3'])
        expect(actual.current).toStrictEqual({ 2: true })
    })

    it('resets the set', () => {
        const actual = new RecordSet(initial())
        actual.clear()
        expect(actual.current).toStrictEqual({})
    })

    it('has reports membership', () => {
        const actual = new RecordSet(initial())
        expect(actual.has('1')).toBe(true)
        expect(actual.has('4')).toBe(false)
    })

    it('removes false values on init', () => {
        const actual = new RecordSet({ 1: false, 2: true, 3: true })
        expect(actual.current).toStrictEqual({ 2: true, 3: true })
    })

    it('removes false values on update', () => {
        const actual = new RecordSet(initial())
        actual.current = { ...actual.current, 1: false }
        expect(actual.current).toStrictEqual({ 2: true, 3: true })
    })
})
