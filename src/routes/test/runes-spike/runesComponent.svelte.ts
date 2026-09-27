/**
 * Design spike (plan runes-core/001): two candidate mechanisms for exposing a
 * store-based `TableComponent`'s `attrs()` / `props()` as plain reactive
 * values readable from runes templates without `<Subscribe>` or `fromStore`.
 *
 * Throwaway fixture: not packaged, not part of `src/lib`.
 */
import { createSubscriber } from 'svelte/reactivity'
import type { Readable } from 'svelte/store'
import { fromStore } from 'svelte/store'

/**
 * The structural slice of a store-based `TableComponent` the wrappers use.
 * (Deviation from the plan's snippet, which typed the constructor parameter
 * as `TableComponent<Item, Plugins, Key>`: concrete `HeaderRow<Item, P>` /
 * `DataBodyRow<Item, P>` are not assignable to
 * `TableComponent<unknown, AnyPlugins, ComponentKeys>` (svelte-check
 * rejected the call), and the row type must be preserved so templates can
 * still call `cell.render()`.
 * Any `TableComponent` satisfies this interface.)
 */
export interface StoreBackedComponent {
    id: string
    attrs(): Readable<Record<string, unknown>>
    props(): Readable<unknown>
}

/** Minimal surface shared by both mechanisms. */
export interface RunesWrapper {
    readonly attrs: Record<string, unknown>
    readonly props: Record<string, any>
}

/**
 * Mechanism A: read the component's existing derived stores through
 * fromStore inside class-field $derived. Whether this tracks updates when
 * the instance is created outside a component effect is the open question.
 */
export class RunesViaFromStore implements RunesWrapper {
    #attrsStore: Readable<Record<string, unknown>>
    #propsStore: Readable<Record<string, unknown>>
    // Deviation from the plan's verbatim snippet: TypeScript rejects
    // `readonly attrs = $derived(fromStore(this.#attrsStore).current)` as a
    // field initializer with TS2729 ("Property '#attrsStore' is used before
    // its initialization"), because it cannot know $derived is lazy. Svelte
    // 5 allows the rune as the first assignment in the constructor instead;
    // the semantics (a class-owned, lazily-evaluated $derived over fromStore)
    // are unchanged.
    readonly attrs: Record<string, unknown>
    readonly props: Record<string, any>
    constructor(component: StoreBackedComponent) {
        this.#attrsStore = component.attrs()
        this.#propsStore = component.props() as Readable<Record<string, unknown>>
        this.attrs = $derived(fromStore(this.#attrsStore).current)
        this.props = $derived(fromStore(this.#propsStore).current)
    }
}

/**
 * Mechanism B: mirror each store into $state through an explicit
 * subscription started by createSubscriber, so the subscription lives
 * exactly as long as something reads the value inside an effect.
 */
export class RunesViaSubscriber implements RunesWrapper {
    #attrs = $state.raw<Record<string, unknown>>({})
    #props = $state.raw<Record<string, unknown>>({})
    #subscribeAttrs: () => void
    #subscribeProps: () => void
    constructor(component: StoreBackedComponent) {
        const attrsStore = component.attrs()
        const propsStore = component.props() as Readable<Record<string, unknown>>
        this.#subscribeAttrs = createSubscriber(() =>
            attrsStore.subscribe((value) => {
                this.#attrs = value
            })
        )
        this.#subscribeProps = createSubscriber(() =>
            propsStore.subscribe((value) => {
                this.#props = value
            })
        )
    }
    get attrs() {
        this.#subscribeAttrs()
        return this.#attrs
    }
    get props() {
        this.#subscribeProps()
        return this.#props
    }
}

/** Which prototype mechanism to build wrappers with. */
export type Mechanism = 'fromStore' | 'subscriber'

/**
 * Wraps a single table component with the chosen mechanism.
 *
 * @param component - Any store-based row or cell.
 * @param mechanism - The prototype mechanism to use.
 * @returns A wrapper exposing `attrs` / `props` as plain reactive values.
 */
export function wrap(component: StoreBackedComponent, mechanism: Mechanism): RunesWrapper {
    return mechanism === 'fromStore'
        ? new RunesViaFromStore(component)
        : new RunesViaSubscriber(component)
}

/** A row paired with its wrapper and a wrapper per cell id. */
export interface WrappedRow<Row> {
    row: Row
    wrapper: RunesWrapper
    cells: Map<string, RunesWrapper>
}

/**
 * Wraps each row and each of its cells.
 *
 * @param rows - Header or body rows from the view model.
 * @param mechanism - The prototype mechanism to use.
 * @returns One entry per row: `{ row, wrapper, cells }`.
 */
export function wrapRows<Row extends StoreBackedComponent & { cells: StoreBackedComponent[] }>(
    rows: Row[],
    mechanism: Mechanism
): WrappedRow<Row>[] {
    return rows.map((row) => ({
        row,
        wrapper: wrap(row, mechanism),
        cells: new Map(row.cells.map((cell) => [cell.id, wrap(cell, mechanism)]))
    }))
}

/**
 * Spike probe: runs `read` inside a `$effect.root` + `$effect` and records
 * every value the effect observes, so a test can check whether a wrapper
 * read outside any component still tracks. Returns the log and a disposer.
 *
 * @param read - The reactive read to observe.
 * @returns The observed values (appended on each effect run) and a cleanup.
 */
export function observeInEffectRoot<T>(read: () => T): { log: T[]; dispose: () => void } {
    const log: T[] = []
    const dispose = $effect.root(() => {
        $effect(() => {
            log.push(read())
        })
    })
    return { log, dispose }
}
