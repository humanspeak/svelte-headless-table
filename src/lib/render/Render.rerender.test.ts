import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import Fixture from './Fixture.test.svelte'
import { createRender, createSnippetRender, Render } from './index.js'
import { textSnippet } from './SnippetHost.test.svelte'

// Cells re-evaluate `cell.render()` whenever rows re-derive, so a mounted
// Render instance regularly receives a new `of` of a different variant.
it('switches between every RenderConfig variant on the same instance', async () => {
    const { rerender, container } = render(Render, { props: { of: 'first' } })
    expect(container).toHaveTextContent('first')

    await rerender({ of: 42 })
    expect(container).toHaveTextContent('42')
    expect(container).not.toHaveTextContent('first')

    const store = writable('from-store')
    await rerender({ of: store })
    expect(container).toHaveTextContent('from-store')
    store.set('store-updated')
    await Promise.resolve()
    expect(container).toHaveTextContent('store-updated')

    await rerender({ of: createRender(Fixture, { label: 'comp', count: 3 }) })
    expect(screen.getByTestId('fixture')).toHaveTextContent('comp:3')
    expect(container).not.toHaveTextContent('store-updated')

    await rerender({ of: createSnippetRender(textSnippet, 'snip') })
    expect(screen.getByTestId('text-snippet')).toHaveTextContent('snip')
    expect(screen.queryByTestId('fixture')).toBeNull()

    await rerender({ of: 'back-to-text' })
    expect(container).toHaveTextContent('back-to-text')
    expect(screen.queryByTestId('text-snippet')).toBeNull()
})

it('swaps readable props for static props on the same component', async () => {
    const props = writable({ label: 'a', count: 1 })
    const { rerender } = render(Render, { props: { of: createRender(Fixture, props) } })
    expect(screen.getByTestId('fixture')).toHaveTextContent('a:1')

    await rerender({ of: createRender(Fixture, { label: 'b', count: 2 }) })
    expect(screen.getByTestId('fixture')).toHaveTextContent('b:2')

    // The old store must no longer drive the component.
    props.set({ label: 'stale', count: 9 })
    await Promise.resolve()
    expect(screen.getByTestId('fixture')).toHaveTextContent('b:2')
})
