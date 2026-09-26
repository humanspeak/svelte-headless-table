import { get, readable, writable } from 'svelte/store'
import { derivedKeys } from './store.js'

it('merges a map of stores into a single object', () => {
    const result = derivedKeys({ a: readable(1), b: writable('x') })
    expect(get(result)).toStrictEqual({ a: 1, b: 'x' })
})

it('updates when a member store changes', () => {
    const b = writable('x')
    const result = derivedKeys({ a: readable(1), b })
    b.set('y')
    expect(get(result).b).toBe('y')
})

it('preserves insertion order of keys', () => {
    const result = derivedKeys({ a: readable(1), b: writable('x') })
    expect(Object.keys(get(result))).toStrictEqual(['a', 'b'])
})

it('returns an empty object for an empty map', () => {
    const result = derivedKeys({})
    expect(get(result)).toStrictEqual({})
})
