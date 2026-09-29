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
import { untrack } from 'svelte'

/**
 * Initialization options for a TableComponent.
 */
export interface TableComponentInit {
    /** Unique identifier for the component. */
    id: string
}

type AnyElementHook = ElementHook<unknown, Record<string, unknown>>

/** A plugin's hook factory for one component kind, with the plugin's name. */
export type HookEntry<Component> = readonly [
    pluginName: string,
    factory: (_component: Component) => AnyElementHook
]

/**
 * What a view model shares with every component of one kind: the table
 * state and the hook factories of the plugins that decorate that kind. One
 * object per kind per view model; a component holds a pointer to it.
 */
export interface ComponentBinding<Item, Plugins extends AnyPlugins, Component> {
    readonly state: TableState<Item, Plugins>
    readonly hooks: readonly HookEntry<Component>[]
}

// Assigned by `TableComponent`'s static block, the only code that can reach
// the private binding field.
let setBinding: <
    Item,
    Plugins extends AnyPlugins,
    Component extends TableComponent<Item, Plugins, ComponentKeys>
>(
    _component: Component,
    _binding: ComponentBinding<Item, Plugins, Component>
) => void
let getState: <Item, Plugins extends AnyPlugins>(
    _component: TableComponent<Item, Plugins, ComponentKeys>
) => TableState<Item, Plugins> | undefined

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
 *
 * A view model binds each component to a shared {@link ComponentBinding}: the
 * table state plus the hook factories of the plugins that decorate the
 * component's kind. The factories run lazily, once per component, the first
 * time `current` is read; `current` then merges the hooks' attributes and
 * collects their props on every read.
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
    static {
        setBinding = (component, binding) => {
            component.#binding = binding
            component.#hooks = undefined
        }
        getState = (component) => component.#binding?.state
    }

    /** Unique identifier for the component. */
    id: string

    // The component type is erased (`never`): a field typed with `this` would
    // make every subclass incompatible with its base. `setBinding` checks the
    // pairing at the call site instead.
    #binding: ComponentBinding<Item, Plugins, never> | undefined

    // Resolved from the binding on the first `current` read and reset when
    // the binding changes. Plain data, not rune state: nothing reactive is
    // allocated per component.
    #hooks: [string, AnyElementHook][] | undefined

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

    /**
     * Returns the component's hooks, calling each bound factory with this
     * component on first use. Untracked, so whatever a factory reads while it
     * is created does not subscribe the template that triggered the first
     * `current` read.
     */
    #resolveHooks(): [string, AnyElementHook][] {
        if (this.#hooks === undefined) {
            const entries = this.#binding?.hooks ?? []
            this.#hooks = untrack(() =>
                entries.map(([name, factory]): [string, AnyElementHook] => [
                    name,
                    factory(this as never)
                ])
            )
        }
        return this.#hooks
    }

    #readAttrs(): AttributesForKey<Item, Plugins>[Key] {
        let mergedAttrs: Record<string, unknown> = {}
        for (const [, hook] of this.#resolveHooks()) {
            const attrs = hook.attrs
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
        for (const [pluginName, hook] of this.#resolveHooks()) {
            const getProps = hook.props
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

    /** The table state of the view model this component is bound to. */
    protected get state(): TableState<Item, Plugins> | undefined {
        return this.#binding?.state
    }

    abstract clone(): TableComponent<Item, Plugins, Key>
}

/**
 * Binds a component to a view model. Internal: exported from this module for
 * the view model and tests, not re-exported from the package entry.
 */
export const bindComponent = setBinding

/**
 * Returns the table state a component is bound to, or `undefined` when it is
 * unbound. Internal: exported from this module for plugins and tests, not
 * re-exported from the package entry.
 */
export const componentState = getState
