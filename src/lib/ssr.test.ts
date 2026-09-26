// @vitest-environment node
import { render } from 'svelte/server'
import { writable } from 'svelte/store'
import FromStoreHost from './FromStoreHost.test.svelte'
import SnippetHost from './render/SnippetHost.test.svelte'
import SubscribeHost from './subscribe/SubscribeHost.test.svelte'

// SvelteKit renders tables on the server first; every render path must
// produce markup there, not just in the browser.
it('server-renders snippet cells, snippet headers and plain cells', () => {
    const { body } = render(SnippetHost)
    expect(body).toContain('data-testid="name-cell"')
    expect(body).toContain('ADA')
    expect(body).toContain('data-testid="age-header"')
    expect(body).toContain('36')
})

it('server-renders Subscribe slot props from stores', () => {
    const { body } = render(SubscribeHost, {
        props: { attrs: writable({ role: 'cell' }), props: writable({ n: 7 }) }
    })
    expect(body).toContain('role="cell"')
    expect(body).toContain('>7<')
})

it('server-renders the fromStore idiom with plugin attrs applied', () => {
    const { body } = render(FromStoreHost)
    expect(body).toContain('role="columnheader"')
    expect(body).toContain('data-order="none"')
    expect(body).toContain('Grace')
    expect(body).toContain('Ada')
})
