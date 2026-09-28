import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { box } from '../reactivity.svelte.js'
import Fixture from './Fixture.test.svelte'
import { createRender, Render } from './index.js'

/** A getter over rune state that counts how often it is called. */
const countingGetter = <T>(initial: T) => {
    const value = box(initial)
    let calls = 0
    const get = () => {
        calls += 1
        return value.current
    }
    return { value, get, calls: () => calls }
}

// Virtualised tables mount and unmount thousands of cells; a cell that went
// away must stop tracking the state its getters read (v6 checked that every
// store subscription was closed).
it('Render stops tracking a getter config on unmount', () => {
    const { value, get, calls } = countingGetter('text')
    const { unmount } = render(Render, { props: { of: get } })
    expect(calls()).toBeGreaterThan(0)
    // While mounted, a change is re-read (so the check below is not vacuous).
    const mounted = calls()
    value.current = 'mounted-change'
    flushSync()
    expect(calls()).toBeGreaterThan(mounted)
    unmount()
    const before = calls()
    value.current = 'changed'
    flushSync()
    expect(calls()).toBe(before)
})

it('Render stops tracking getter component props on unmount', () => {
    const { value, get, calls } = countingGetter({ label: 'p', count: 1 })
    const { unmount } = render(Render, { props: { of: createRender(Fixture, get) } })
    expect(calls()).toBeGreaterThan(0)
    const mounted = calls()
    value.current = { label: 'm', count: 5 }
    flushSync()
    expect(calls()).toBeGreaterThan(mounted)
    unmount()
    const before = calls()
    value.current = { label: 'q', count: 2 }
    flushSync()
    expect(calls()).toBe(before)
})
