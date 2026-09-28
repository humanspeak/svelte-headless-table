import { TableComponent } from './tableComponent.svelte.js'
import type { AnyPlugins } from './types/TablePlugin.js'

class TestComponent<Item> extends TableComponent<Item, AnyPlugins, 'tbody.tr'> {
    clone(): TableComponent<Item, AnyPlugins, 'tbody.tr'> {
        return new TestComponent({
            id: this.id
        })
    }
}

it('hooks plugin props', () => {
    const component = new TestComponent({ id: '0' })
    const $props = {
        a: 1,
        b: 2
    }
    const props = () => $props
    component.applyHook('test', { props })

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
    component.applyHook('test', { attrs })

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
    component.applyHook('firstPlugin', { attrs: attrs1 })
    component.applyHook('secondPlugin', { attrs: attrs2 })

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
    component.applyHook('firstPlugin', { attrs: attrs1 })
    component.applyHook('secondPlugin', { attrs: attrs2 })

    const actual = component.current.attrs

    const expected = {
        a: 1,
        b: 4,
        c: 3,
        style: 'x:1;y:4;z:3'
    }

    expect(actual).toStrictEqual(expected)
})

it('re-applying a hook for the same plugin replaces its attrs', () => {
    const component = new TestComponent({ id: '0' })
    component.applyHook('test', { attrs: () => ({ a: 1 }) })
    expect(component.current.attrs).toStrictEqual({ a: 1 })

    component.applyHook('test', { attrs: () => ({ a: 2, b: 3 }) })

    expect(component.current.attrs).toStrictEqual({ a: 2, b: 3 })
})

it('re-reads the hook getters on every current read (memo-free)', () => {
    const component = new TestComponent({ id: '0' })
    let n = 0
    component.applyHook('test', { props: () => ({ n: ++n }) })

    expect(component.current.props).toStrictEqual({ test: { n: 1 } })
    expect(component.current.props).toStrictEqual({ test: { n: 2 } })
})
