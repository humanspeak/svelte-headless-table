// @vitest-environment node
import { render } from 'svelte/server'
import SnippetHost from './render/SnippetHost.test.svelte'

// SvelteKit renders tables on the server first; every render path must
// produce markup there, not just in the browser.
it('server-renders snippet cells, snippet headers and plain cells', () => {
    const { body } = render(SnippetHost)
    expect(body).toContain('data-testid="name-cell"')
    expect(body).toContain('ADA')
    expect(body).toContain('data-testid="age-header"')
    expect(body).toContain('36')
})
