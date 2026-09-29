import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import LabelStateHost from './LabelStateHost.test.svelte'

// `render((cell, state) => state.pageRows().length)`: TableState members are
// getters (v6 stores), and a label that reads one re-renders when it changes.
it('re-renders a header label that reads state.pageRows() when the page changes', async () => {
    const { component } = render(LabelStateHost)
    expect(screen.getByTestId('header')).toHaveTextContent('rows:2')

    component.pluginStates.page.pageIndex.current = 2
    await tick()
    expect(screen.getByTestId('header')).toHaveTextContent('rows:1')

    component.pluginStates.page.pageSize.current = 10
    await tick()
    expect(screen.getByTestId('header')).toHaveTextContent('rows:5')
})

it('passes the TableState, including plugin states, to cell labels', async () => {
    const { component } = render(LabelStateHost)
    expect(screen.getAllByTestId('cell').map((c) => c.textContent)).toEqual(['Ada@0/2', 'Bea@0/2'])

    component.pluginStates.page.pageIndex.current = 1
    await tick()
    expect(screen.getAllByTestId('cell').map((c) => c.textContent)).toEqual(['Cy@1/2', 'Di@1/2'])
})
