import { isClonable, unsafeClone } from './clone.js'

test('isClonable returns true for object with clone method', () => {
    const obj = { clone: () => ({}) }
    expect(isClonable(obj)).toBe(true)
})

test('isClonable returns false for plain object', () => {
    expect(isClonable({ name: 'test' })).toBe(false)
})

test('isClonable returns false for primitives', () => {
    expect(isClonable(42)).toBe(false)
})

test('unsafeClone creates shallow copy preserving prototype', () => {
    class Foo {
        value = 42
        greet() {
            return 'hello'
        }
    }
    const original = new Foo()
    const cloned = unsafeClone(original)
    expect(cloned).not.toBe(original)
    expect(cloned.value).toBe(42)
    expect(cloned.greet()).toBe('hello')
    expect(cloned).toBeInstanceOf(Foo)
})

test('unsafeClone with props override merges properties', () => {
    class Bar {
        x = 1
        y = 2
    }
    const original = new Bar()
    const cloned = unsafeClone(original, { x: 99 })
    expect(cloned.x).toBe(99)
    expect(cloned.y).toBe(2)
    expect(cloned).toBeInstanceOf(Bar)
})
