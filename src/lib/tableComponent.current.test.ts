import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { get, writable } from 'svelte/store'
import CurrentHost from './CurrentHost.test.svelte'

// `current.attrs` / `current.props` are the runes-native view of the same
// values `attrs()` / `props()` expose. These mirror fromStore.test.ts and
// prove the values are reactive, not just rendered once.
it('renders current.attrs and current.props on first paint', () => {
    render(CurrentHost)
    expect(screen.getByTestId('th-name')).toHaveAttribute('role', 'columnheader')
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'none')
    const rows = screen.getAllByTestId('row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Grace')
    expect(rows[0]).toHaveAttribute('role', 'row')
})

it('updates current.props when a plugin toggles state', async () => {
    render(CurrentHost)
    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'asc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Ada')

    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'desc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Grace')
})

it('updates current.attrs when plugin state changes outside the template', async () => {
    const { component } = render(CurrentHost)
    component.pluginStates.resize.columnWidths.set({ name: 123 })
    await tick()
    expect(screen.getByTestId('th-name').getAttribute('style')).toContain('width: 123px')
    expect(screen.getByTestId('th-age').getAttribute('style') ?? '').not.toContain('123px')
})

it('picks up a hook applied after current was first read', async () => {
    const { component } = render(CurrentHost)
    expect(screen.getByTestId('th-name')).not.toHaveAttribute('data-late')

    const cell = get(component.viewHeaderRows)[0].cells.find((c) => c.id === 'name')!
    cell.applyHook('late', { attrs: writable({ 'data-late': '1' }) })
    await tick()

    expect(screen.getByTestId('th-name')).toHaveAttribute('data-late', '1')
})
