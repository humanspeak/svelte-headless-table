// @vitest-environment node
import { render } from 'svelte/server'
import CurrentHost from './CurrentHost.test.svelte'

// `current.*` must be populated on the server too: a subscriber-mirror
// implementation returns its empty seed there and crashes on `props.sort`.
it('server-renders current.attrs and current.props with plugin values applied', () => {
    const { body } = render(CurrentHost)
    expect(body).toContain('role="columnheader"')
    expect(body).toContain('data-order="none"')
    expect(body).toContain('role="row"')
    expect(body).toContain('Grace')
})
