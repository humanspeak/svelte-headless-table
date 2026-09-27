import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import VmCurrentHost from './VmCurrentHost.test.svelte'

// `vm.current.*` is the runes-native view of the view model's stores. The
// host renders the whole table through it with no `$store` reads.
const rowNames = () => screen.getAllByTestId('row').map((r) => r.firstElementChild?.textContent)

it('renders the first page through vm.current.pageRows', () => {
    render(VmCurrentHost)
    expect(screen.getAllByTestId('row')).toHaveLength(2)
    expect(rowNames()).toEqual(['Ada', 'Bea'])
})

it('updates vm.current.pageRows when the page index changes outside the template', async () => {
    const { component } = render(VmCurrentHost)
    component.pluginStates.page.pageIndex.set(1)
    await tick()
    expect(rowNames()).toEqual(['Cy', 'Di'])
})

it('flips the order after a header click', async () => {
    render(VmCurrentHost)
    await fireEvent.click(screen.getByTestId('th-age'))
    await tick()
    expect(rowNames()).toEqual(['Ed', 'Cy'])
    await fireEvent.click(screen.getByTestId('th-age'))
    await tick()
    expect(rowNames()).toEqual(['Di', 'Bea'])
})

it('exposes vm.current.tableAttrs as a plain value', () => {
    const { component } = render(VmCurrentHost)
    expect(component.viewModel.current.tableAttrs.role).toBe('table')
    expect(screen.getByTestId('table')).toHaveAttribute('role', 'table')
})
