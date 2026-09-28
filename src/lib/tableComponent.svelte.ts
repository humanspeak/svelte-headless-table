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

/**
 * Initialization options for a TableComponent.
 */
export interface TableComponentInit {
    /** Unique identifier for the component. */
    id: string
}

type AnyElementHook = ElementHook<unknown, Record<string, unknown>>

/**
 * The reactive view of a component: the merged plugin attributes and the
 * plugin props keyed by plugin name.
 *
 * @template Item - The type of data items in the table.
 * @template Plugins - The plugins used by the table.
 * @template Key - The component key type (e.g., 'tbody.tr', 'tbody.tr.td').
 */
export interface TableComponentCurrent<
    Item,
    Plugins extends AnyPlugins,
    Key extends ComponentKeys
> {
    /** The merged HTML attributes from all applied plugins. */
    readonly attrs: AttributesForKey<Item, Plugins>[Key]
    /** The plugin props keyed by plugin name. */
    readonly props: PluginTablePropSet<Plugins>[Key]
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

    // A plain record, not rune state: hooks are applied inside the view
    // model's `$derived`s, where writing `$state` would throw
    // `state_unsafe_mutation`. Constructing a component allocates nothing
    // reactive.
    #hooks: Record<string, AnyElementHook> = {}

    #currentView?: TableComponentCurrent<Item, Plugins, Key>

    /**
     * Creates a new TableComponent.
     *
     * @param init - Initialization options.
     */
    constructor({ id }: TableComponentInit) {
        this.id = id
    }

    /**
     * The component's reactive attributes and props, created on first access.
     *
     * Memo-free: every read of `attrs` / `props` calls the plugin hook
     * getters, which read plugin rune state, so a read inside a template or an
     * effect is tracked and a read outside any effect (or under SSR) returns
     * the current value. Nothing reactive is allocated per component.
     */
    get current(): TableComponentCurrent<Item, Plugins, Key> {
        if (this.#currentView === undefined) {
            // Arrow functions capture `this`, so the getters below can delegate to them.
            const readAttrs = () => this.#readAttrs()
            const readProps = () => this.#readProps()
            this.#currentView = {
                get attrs() {
                    return readAttrs()
                },
                get props() {
                    return readProps()
                }
            }
        }
        return this.#currentView
    }

    #readAttrs(): AttributesForKey<Item, Plugins>[Key] {
        let mergedAttrs: Record<string, unknown> = {}
        // `for...in` over the plain record avoids allocating an entries array on
        // every read; the own-property check satisfies guard-for-in.
        for (const pluginName in this.#hooks) {
            if (!Object.hasOwn(this.#hooks, pluginName)) continue
            const attrs = this.#hooks[pluginName]?.attrs
            if (attrs !== undefined) {
                mergedAttrs = mergeAttributes(mergedAttrs, attrs())
            }
        }
        return this.decorateAttrs(finalizeAttributes(mergedAttrs)) as AttributesForKey<
            Item,
            Plugins
        >[Key]
    }

    #readProps(): PluginTablePropSet<Plugins>[Key] {
        const props: Record<string, unknown> = {}
        for (const pluginName in this.#hooks) {
            if (!Object.hasOwn(this.#hooks, pluginName)) continue
            const getProps = this.#hooks[pluginName]?.props
            if (getProps !== undefined) {
                props[pluginName] = getProps()
            }
        }
        return props as PluginTablePropSet<Plugins>[Key]
    }

    /**
     * Adds the component's fixed attributes (such as `role`) to the merged
     * plugin attributes. Subclasses override this.
     *
     * @param attrs - The merged and finalized plugin attributes.
     * @returns The attributes to expose.
     */
    protected decorateAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
        return attrs
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
     * Applies a plugin hook to this component, replacing any hook previously
     * applied under the same plugin name.
     *
     * The view model calls this while deriving rows and header rows, so every
     * `current` read sees the complete hook set of the derivation that produced
     * the component. The hook record is plain data: a hook applied after
     * `current` was rendered is visible to the next read, but does not by
     * itself re-render a template that already read it.
     *
     * @internal
     * @param pluginName - The name of the plugin.
     * @param hook - The element hook containing props and/or attrs getters.
     */
    applyHook(pluginName: string, hook: ElementHook<unknown, Record<string, unknown>>) {
        this.#hooks[pluginName] = hook
    }

    abstract clone(): TableComponent<Item, Plugins, Key>
}
