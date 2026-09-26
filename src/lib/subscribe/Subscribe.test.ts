import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { writable } from 'svelte/store'
import SubscribeHost from './SubscribeHost.test.svelte'

const setup = () => {
    const attrs = writable<Record<string, unknown>>({ role: 'cell' })
    const props = writable({ n: 1 })
    render(SubscribeHost, { props: { attrs, props } })
    return { attrs, props }
}

it('exposes store values as let: slot props', () => {
    setup()
    const out = screen.getByTestId('out')
    expect(out).toHaveAttribute('role', 'cell')
    expect(out).toHaveTextContent('1')
})

it('tracks updates to the props store', async () => {
    const { props } = setup()
    props.set({ n: 2 })
    await tick()
    expect(screen.getByTestId('out')).toHaveTextContent('2')
})

it('tracks updates to the attrs store', async () => {
    const { attrs } = setup()
    attrs.set({ role: 'gridcell' })
    await tick()
    expect(screen.getByTestId('out')).toHaveAttribute('role', 'gridcell')
})
