import { get, writable } from 'svelte/store'
import { keyedProp } from './store.js'

it('reads the property', () => {
    const parent = writable<Record<string, number>>({ a: 1, b: 2 })
    const actual = keyedProp(parent, 'a')

    expect(get(actual)).toBe(1)
})

it('set replaces the property and notifies the parent', () => {
    const parent = writable<Record<string, number>>({ a: 1 })
    const actual = keyedProp(parent, 'a')
    const seen: Record<string, number>[] = []
    const unsubscribe = parent.subscribe(($parent) => seen.push($parent))

    actual.set(5)
    unsubscribe()

    expect(get(actual)).toBe(5)
    expect(get(parent)).toStrictEqual({ a: 5 })
    expect(seen).toStrictEqual([{ a: 1 }, { a: 5 }])
})

it('update uses the previous value', () => {
    const parent = writable<Record<string, number>>({ a: 1 })
    const actual = keyedProp(parent, 'a')

    // Change the parent directly so a stale captured value would be wrong.
    parent.set({ a: 10 })
    actual.update((value) => value + 1)

    expect(get(parent)).toStrictEqual({ a: 11 })
})

it('stores a key containing a dot flat', () => {
    const parent = writable<Record<string, string>>({})
    const actual = keyedProp(parent, 'a.b')

    actual.set('x')

    expect(get(parent)).toStrictEqual({ 'a.b': 'x' })
    expect(get(actual)).toBe('x')
})

it('keeps unrelated keys when setting', () => {
    const parent = writable<Record<string, number>>({ a: 1, b: 2, c: 3 })
    const actual = keyedProp(parent, 'b')

    actual.set(20)

    expect(get(parent)).toStrictEqual({ a: 1, b: 20, c: 3 })
})
