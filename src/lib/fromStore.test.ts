import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import FromStoreHost from './FromStoreHost.test.svelte'

// The docs recommend `fromStore(cell.attrs()).current` / `.props()` in place
// of <Subscribe>. These tests prove that idiom is reactive, not just that it
// renders once.
it('renders attrs and props through fromStore on first paint', () => {
    render(FromStoreHost)
    expect(screen.getByTestId('th-name')).toHaveAttribute('role', 'columnheader')
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'none')
    const rows = screen.getAllByTestId('row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Grace')
    expect(rows[0]).toHaveAttribute('role', 'row')
})

it('updates props.current when a plugin toggles state', async () => {
    render(FromStoreHost)
    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'asc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Ada')

    await fireEvent.click(screen.getByTestId('th-name'))
    await tick()
    expect(screen.getByTestId('th-name')).toHaveAttribute('data-order', 'desc')
    expect(screen.getAllByTestId('row')[0]).toHaveTextContent('Grace')
})

it('updates attrs.current when plugin state changes outside the template', async () => {
    const { component } = render(FromStoreHost)
    component.pluginStates.resize.columnWidths.set({ name: 123 })
    await tick()
    expect(screen.getByTestId('th-name').getAttribute('style')).toContain('width: 123px')
    expect(screen.getByTestId('th-age').getAttribute('style') ?? '').not.toContain('123px')
})
