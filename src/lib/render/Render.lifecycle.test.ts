import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/svelte'
import type { Readable } from 'svelte/store'
import SubscribeHost from '../subscribe/SubscribeHost.test.svelte'
import Fixture from './Fixture.test.svelte'
import { createRender, Render } from './index.js'

/** A store that counts how many times it was subscribed to and torn down. */
const countingStore = <T>(value: T) => {
    let subscribed = 0
    let unsubscribed = 0
    const store: Readable<T> = {
        subscribe(run) {
            subscribed += 1
            run(value)
            return () => {
                unsubscribed += 1
            }
        }
    }
    return { store, counts: () => ({ subscribed, unsubscribed }) }
}

// Virtualised tables mount and unmount thousands of cells; every
// subscription a cell opens must be closed when it goes away.
it('Render unsubscribes from a readable value on unmount', () => {
    const { store, counts } = countingStore('text')
    const { unmount } = render(Render, { props: { of: store } })
    expect(counts().subscribed).toBeGreaterThan(0)
    unmount()
    expect(counts().unsubscribed).toBe(counts().subscribed)
})

it('Render unsubscribes from readable component props on unmount', () => {
    const { store, counts } = countingStore({ label: 'p', count: 1 })
    const { unmount } = render(Render, { props: { of: createRender(Fixture, store) } })
    expect(counts().subscribed).toBeGreaterThan(0)
    unmount()
    expect(counts().unsubscribed).toBe(counts().subscribed)
})

it('Subscribe unsubscribes from every store prop on unmount', () => {
    const attrs = countingStore<Record<string, unknown>>({ role: 'cell' })
    const props = countingStore({ n: 1 })
    const { unmount } = render(SubscribeHost, {
        props: { attrs: attrs.store, props: props.store }
    })
    expect(attrs.counts().subscribed).toBeGreaterThan(0)
    expect(props.counts().subscribed).toBeGreaterThan(0)
    unmount()
    expect(attrs.counts().unsubscribed).toBe(attrs.counts().subscribed)
    expect(props.counts().unsubscribed).toBe(props.counts().subscribed)
})
