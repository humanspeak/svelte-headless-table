import type { TableState } from './createViewModel.svelte.js'
import { bindComponent, componentState, TableComponent } from './tableComponent.svelte.js'
import type { AnyPlugins } from './types/TablePlugin.js'

class TestComponent<Item> extends TableComponent<Item, AnyPlugins, 'tbody.tr'> {
    clone(): TableComponent<Item, AnyPlugins, 'tbody.tr'> {
        return new TestComponent({
            id: this.id
        })
    }
}

class DecoratedComponent<Item> extends TestComponent<Item> {
    protected override decorateAttrs(attrs: Record<string, unknown>) {
        return { ...attrs, role: 'row' as const }
    }
}

const state = {} as unknown as TableState<unknown>

it('hooks plugin props', () => {
    const component = new TestComponent({ id: '0' })
    const $props = {
        a: 1,
        b: 2
    }
    const props = () => $props
    bindComponent(component, { state, hooks: [['test', () => ({ props })]] })

    const actual = component.current.props

    const expected = {
        test: $props
    }

    expect(actual).toStrictEqual(expected)
})

it('hooks plugin attrs', () => {
    const component = new TestComponent({ id: '0' })
    const $attrs = {
        a: 1,
        b: 2
    }
    const attrs = () => $attrs
    bindComponent(component, { state, hooks: [['test', () => ({ attrs })]] })

    const actual = component.current.attrs

    const expected = $attrs

    expect(actual).toStrictEqual(expected)
})

it('hooks and merges plugin attrs', () => {
    const component = new TestComponent({ id: '0' })
    const $attrs1 = {
        a: 1,
        b: 2
    }
    const attrs1 = () => $attrs1
    const $attrs2 = {
        c: 3,
        b: 4
    }
    const attrs2 = () => $attrs2
    bindComponent(component, {
        state,
        hooks: [
            ['firstPlugin', () => ({ attrs: attrs1 })],
            ['secondPlugin', () => ({ attrs: attrs2 })]
        ]
    })

    const actual = component.current.attrs

    const expected = {
        a: 1,
        c: 3,
        b: 4
    }

    expect(actual).toStrictEqual(expected)
})

it('hooks and merges plugin attrs styles', () => {
    const component = new TestComponent({ id: '0' })
    const $attrs1 = {
        a: 1,
        b: 2,
        style: {
            x: '1',
            y: '2'
        }
    }
    const attrs1 = () => $attrs1
    const $attrs2 = {
        c: 3,
        b: 4,
        style: {
            z: '3',
            y: '4'
        }
    }
    const attrs2 = () => $attrs2
    bindComponent(component, {
        state,
        hooks: [
            ['firstPlugin', () => ({ attrs: attrs1 })],
            ['secondPlugin', () => ({ attrs: attrs2 })]
        ]
    })

    const actual = component.current.attrs

    const expected = {
        a: 1,
        b: 4,
        c: 3,
        style: 'x:1;y:4;z:3'
    }

    expect(actual).toStrictEqual(expected)
})

it('re-binding with a new hook for the same plugin replaces its attrs', () => {
    const component = new TestComponent({ id: '0' })
    bindComponent(component, { state, hooks: [['test', () => ({ attrs: () => ({ a: 1 }) })]] })
    expect(component.current.attrs).toStrictEqual({ a: 1 })

    bindComponent(component, {
        state,
        hooks: [['test', () => ({ attrs: () => ({ a: 2, b: 3 }) })]]
    })

    expect(component.current.attrs).toStrictEqual({ a: 2, b: 3 })
})

it('re-reads the hook getters on every current read (memo-free)', () => {
    const component = new TestComponent({ id: '0' })
    let n = 0
    bindComponent(component, { state, hooks: [['test', () => ({ props: () => ({ n: ++n }) })]] })

    expect(component.current.props).toStrictEqual({ test: { n: 1 } })
    expect(component.current.props).toStrictEqual({ test: { n: 2 } })
})

it('resolves hook factories lazily, once per component', () => {
    const component = new TestComponent({ id: '0' })
    let calls = 0
    bindComponent(component, {
        state,
        hooks: [
            [
                'test',
                () => {
                    calls++
                    return { props: () => ({ a: 1 }) }
                }
            ]
        ]
    })
    expect(calls).toBe(0)

    expect(component.current.props).toStrictEqual({ test: { a: 1 } })
    expect(calls).toBe(1)

    for (let i = 0; i < 10; i++) {
        expect(component.current.props).toStrictEqual({ test: { a: 1 } })
        expect(component.current.attrs).toStrictEqual({})
    }
    expect(calls).toBe(1)
})

it('a clone resolves its own hooks', () => {
    const component = new TestComponent({ id: '0' })
    const received: unknown[] = []
    const binding = {
        state,
        hooks: [
            [
                'test',
                (c: unknown) => {
                    received.push(c)
                    return { props: () => ({ a: 1 }) }
                }
            ] as const
        ]
    }
    bindComponent(component, binding)
    expect(component.current.props).toStrictEqual({ test: { a: 1 } })
    expect(received).toStrictEqual([component])

    const clone = component.clone()
    bindComponent(clone, binding)
    expect(clone.current.props).toStrictEqual({ test: { a: 1 } })

    expect(received).toHaveLength(2)
    expect(received[1]).toBe(clone)
    expect(received[1]).not.toBe(component)
})

it('re-binding replaces the hook set', () => {
    const component = new TestComponent({ id: '0' })
    bindComponent(component, { state, hooks: [['a', () => ({ props: () => 'A' })]] })
    expect(component.current.props).toStrictEqual({ a: 'A' })

    bindComponent(component, { state, hooks: [['b', () => ({ props: () => 'B' })]] })

    expect(component.current.props).toStrictEqual({ b: 'B' })
})

it('a component with no binding has empty props and only its fixed attrs', () => {
    const plain = new TestComponent({ id: '0' })
    expect(plain.current.props).toStrictEqual({})
    expect(plain.current.attrs).toStrictEqual({})

    const decorated = new DecoratedComponent({ id: '0' })
    expect(decorated.current.props).toStrictEqual({})
    expect(decorated.current.attrs).toStrictEqual({ role: 'row' })
})

it('componentState returns the bound state, or undefined when unbound', () => {
    const component = new TestComponent({ id: '0' })
    expect(componentState(component)).toBeUndefined()

    bindComponent(component, { state, hooks: [] })

    expect(componentState(component)).toBe(state)
})
