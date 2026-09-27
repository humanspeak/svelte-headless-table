// @vitest-environment node
import { render } from 'svelte/server'
import VmCurrentHost from './VmCurrentHost.test.svelte'

// `vm.current.*` must be populated on the server: rendering reads it outside
// any effect, where fromStore falls back to `get(store)`.
it('server-renders the table through vm.current', () => {
    const { body } = render(VmCurrentHost)
    expect(body).toContain('role="table"')
    expect(body).toContain('role="rowgroup"')
    expect(body).toContain('data-order="none"')
    expect(body).toContain('Ada')
    expect(body).toContain('Bea')
    expect(body).not.toContain('Cy')
})
