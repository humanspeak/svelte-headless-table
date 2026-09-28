import type { TableState } from '$lib/createViewModel.svelte.js'
import type {
    AnyPlugins,
    AttributesForKey,
    ComponentKeys,
    ElementHook,
    PluginTablePropSet
} from '$lib/types/TablePlugin.js'
import { finalizeAttributes, mergeAttributes } from '$lib/utils/attributes.js'
import type { Clonable } from '$lib/utils/clone.js'
import { derivedKeys } from '$lib/utils/store.js'
import { derived, fromStore, writable, type Readable, type Writable } from 'svelte/store'

/**
 * Initialization options for a TableComponent.
 */
export interface TableComponentInit {
    /** Unique identifier for the component. */
    id: string
}

/**
 * Abstract base class for all table components (rows, cells, etc.).
 * Provides common functionality for state injection, hook application, and attribute merging.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Key - The component key type (e.g., 'tbody.tr', 'tbody.tr.td').
 */
export abstract class TableComponent<
    Item,
    Plugins extends AnyPlugins,
    Key extends ComponentKeys
> implements Clonable<TableComponent<Item, Plugins, Key>> {
    /** Unique identifier for the component. */
    id: string

    // Bumped by applyHook so `current.*` re-reads over the new hook set. A
    // plain counter: constructing a row or cell allocates nothing reactive.
    // The store that lets a reading effect track it is created lazily on the
    // first `current` read and kept in step by applyHook.
    #hookVersion = 0
    #version?: { store: Writable<number>; handle: { readonly current: number } }

    // `fromStore` handles cached per hook version. A handle owns no reactive
    // state of its own: its subscription is opened under whichever effect
    // reads `.current` and closed when that effect goes away. Nothing here is
    // owned by the context that constructed the component, so a row built
    // inside a short-lived effect cannot go inert when that effect ends.
    #attrsHandle?: {
        version: number
        handle: { readonly current: AttributesForKey<Item, Plugins>[Key] }
    }
    #propsHandle?: {
        version: number
        handle: { readonly current: PluginTablePropSet<Plugins>[Key] }
    }

    #currentView?: {
        readonly attrs: AttributesForKey<Item, Plugins>[Key]
        readonly props: PluginTablePropSet<Plugins>[Key]
    }

    /**
     * Creates a new TableComponent.
     *
     * @param init - Initialization options.
     */
    constructor({ id }: TableComponentInit) {
        this.id = id
    }

    /**
     * Runes-native view of the same values the `attrs()` / `props()` stores
     * expose, created on first access. Read inside a template or an effect to
     * track updates; reads outside any effect return the current value
     * (fromStore falls back to `get(store)`), and the values are also correct
     * under SSR.
     */
    get current(): {
        /** The merged HTML attributes from all applied plugins. */
        readonly attrs: AttributesForKey<Item, Plugins>[Key]
        /** The plugin props keyed by plugin name. */
        readonly props: PluginTablePropSet<Plugins>[Key]
    } {
        return (this.#currentView ??= this.#createCurrentView())
    }

    // The version must be observable by the reaction that first reads it, so
    // it cannot be rune state created inside that read (Svelte does not let a
    // reaction depend on a signal it created). A writable read through
    // fromStore is tracked via createSubscriber, outside that capture path.
    #trackVersion(): number {
        if (this.#version === undefined) {
            const store = writable(this.#hookVersion)
            this.#version = { store, handle: fromStore(store) }
        }
        return this.#version.handle.current // tracked by the reading effect
    }

    #createCurrentView() {
        // Arrow functions capture `this`, so the getters below can delegate to them.
        const readAttrs = (): AttributesForKey<Item, Plugins>[Key] => {
            const version = this.#trackVersion()
            if (this.#attrsHandle?.version !== version) {
                this.#attrsHandle = { version, handle: fromStore(this.attrs()) }
            }
            return this.#attrsHandle.handle.current
        }
        const readProps = (): PluginTablePropSet<Plugins>[Key] => {
            const version = this.#trackVersion()
            if (this.#propsHandle?.version !== version) {
                this.#propsHandle = { version, handle: fromStore(this.props()) }
            }
            return this.#propsHandle.handle.current
        }
        return {
            get attrs() {
                return readAttrs()
            },
            get props() {
                return readProps()
            }
        }
    }

    private attrsForName: Record<string, Readable<Record<string, unknown>>> = {}

    /**
     * Gets the merged HTML attributes from all applied plugins, decorated with
     * the component's own fixed attributes (see `decorateAttrs`).
     *
     * @returns A readable store of merged attributes.
     */
    attrs(): Readable<AttributesForKey<Item, Plugins>[Key]> {
        return derived(Object.values(this.attrsForName), (attrsArray) => {
            let mergedAttrs: Record<string, unknown> = {}
            attrsArray.forEach((hookAttrs) => {
                mergedAttrs = mergeAttributes(mergedAttrs, hookAttrs)
            })
            return this.decorateAttrs(finalizeAttributes(mergedAttrs))
        }) as Readable<AttributesForKey<Item, Plugins>[Key]>
    }

    /**
     * Adds the component's fixed attributes (such as `role`) to the merged
     * plugin attributes. Shared by `attrs()` and `current.attrs`, so both
     * views apply the same decoration. Subclasses override this instead of
     * wrapping `attrs()`.
     *
     * @param attrs - The merged and finalized plugin attributes.
     * @returns The attributes to expose.
     */
    protected decorateAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
        return attrs
    }

    private propsForName: Record<string, Readable<Record<string, unknown>>> = {}

    /**
     * Gets the merged props from all applied plugins.
     *
     * @returns A readable store of plugin props keyed by plugin name.
     */
    props(): Readable<PluginTablePropSet<Plugins>[Key]> {
        return derivedKeys(this.propsForName) as Readable<PluginTablePropSet<Plugins>[Key]>
    }

    /** Reference to the table state, injected after creation. */
    state?: TableState<Item, Plugins>

    /**
     * Injects the table state reference into this component.
     *
     * @param state - The table state to inject.
     */
    injectState(state: TableState<Item, Plugins>) {
        this.state = state
    }

    /**
     * Applies a plugin hook to this component.
     * Hooks can provide both props and attributes.
     *
     * @param pluginName - The name of the plugin.
     * @param hook - The element hook containing props and/or attrs.
     */
    applyHook(
        pluginName: string,
        hook: ElementHook<Record<string, unknown>, Record<string, unknown>>
    ) {
        if (hook.props !== undefined) {
            this.propsForName[pluginName] = hook.props
        }
        if (hook.attrs !== undefined) {
            this.attrsForName[pluginName] = hook.attrs
        }
        this.#hookVersion += 1
        if (this.#version !== undefined) {
            this.#version.store.set(this.#hookVersion)
        }
    }

    abstract clone(): TableComponent<Item, Plugins, Key>
}
