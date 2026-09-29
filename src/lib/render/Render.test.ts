import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { Render, createRender } from '../index.js'
import { box } from '../reactivity.svelte.js'
import Fixture from './Fixture.test.svelte'
import Wrapper from './Wrapper.test.svelte'

it('renders a string config', () => {
    render(Render, { props: { of: 'hello' } })
    expect(screen.getByText('hello')).toBeInTheDocument()
})

it('renders a getter config and tracks updates', async () => {
    const value = box('one')
    render(Render, { props: { of: () => value.current } })
    expect(screen.getByText('one')).toBeInTheDocument()
    value.current = 'two'
    await tick()
    expect(screen.getByText('two')).toBeInTheDocument()
})

it('renders a component config with static props', () => {
    render(Render, { props: { of: createRender(Fixture, { label: 'a', count: 1 }) } })
    expect(screen.getByTestId('fixture')).toHaveTextContent('a:1')
})

it('renders a component config with getter props and tracks updates', async () => {
    const props = box({ label: 'a', count: 1 })
    render(Render, { props: { of: createRender(Fixture, () => props.current) } })
    expect(screen.getByTestId('fixture')).toHaveTextContent('a:1')
    props.current = { label: 'b', count: 2 }
    await tick()
    expect(screen.getByTestId('fixture')).toHaveTextContent('b:2')
})

it('renders slotted children', () => {
    render(Render, {
        props: { of: createRender(Fixture, { label: 'p' }).slot('child-text') }
    })
    // Fixture has no children outlet, so the child string is not rendered,
    // but the parent must still mount without error.
    expect(screen.getByTestId('fixture')).toHaveTextContent('p:0')
})

it('replaces children with .slot()', () => {
    const config = createRender(Fixture, { label: 'x' }).slot('a', 'b')
    expect(config.children).toEqual(['a', 'b'])
})

it('renders a number config', () => {
    render(Render, { props: { of: 42 } })
    expect(screen.getByText('42')).toBeInTheDocument()
})

it('renders nested children into the children snippet', () => {
    render(Render, {
        props: {
            of: createRender(Wrapper).slot('inner', createRender(Fixture, { label: 'n' }))
        }
    })
    const wrapper = screen.getByTestId('wrapper')
    expect(wrapper).toHaveTextContent('inner')
    expect(wrapper).toHaveTextContent('n:0')
})
