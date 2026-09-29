import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import CurrentHost from './CurrentHost.test.svelte'

// `current.attrs` / `current.props` are the only view of a component's plugin
// attrs and props in v7. These prove the values are reactive, not just
// rendered once.
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
    component.pluginStates.resize.columnWidths.current = { name: 123 }
    await tick()
    expect(screen.getByTestId('th-name').getAttribute('style')).toContain('width: 123px')
    expect(screen.getByTestId('th-age').getAttribute('style') ?? '').not.toContain('123px')
})
