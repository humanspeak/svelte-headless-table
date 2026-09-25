import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { tick, type Snippet } from 'svelte'
import { writable } from 'svelte/store'
import { Render, SnippetRenderConfig, createSnippetRender } from './index.js'
import SnippetHost, { textSnippet } from './SnippetHost.test.svelte'

it('renders a script-referenced snippet in a cell', () => {
    render(SnippetHost)
    expect(screen.getByTestId('name-cell')).toHaveTextContent('ADA')
    expect(screen.getByTestId('cell-age')).toHaveTextContent('36')
})

it('renders a snippet with reactive args and tracks updates', async () => {
    const args = writable('a')
    render(Render, { props: { of: createSnippetRender(textSnippet, args) } })
    expect(screen.getByTestId('text-snippet')).toHaveTextContent('a')
    args.set('b')
    await tick()
    expect(screen.getByTestId('text-snippet')).toHaveTextContent('b')
})

it('renders a snippet returned from a column header', () => {
    render(SnippetHost)
    expect(screen.getByTestId('age-header')).toHaveTextContent('Age')
    expect(screen.getByTestId('header-age')).toContainElement(screen.getByTestId('age-header'))
})

it('creates a no-arg snippet config without a second argument', () => {
    const noArg: Snippet = () => ({}) as ReturnType<Snippet>
    // Type-level check: `createSnippetRender(noArg)` must compile with no args.
    const config = createSnippetRender(noArg)
    expect(config).toBeInstanceOf(SnippetRenderConfig)
    expect(config.snippet).toBe(noArg)
    expect(config.args).toBeUndefined()
})
