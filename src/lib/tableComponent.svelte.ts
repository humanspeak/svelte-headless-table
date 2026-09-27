import type { TableState } from '$lib/createViewModel.js'
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
import { derived, fromStore, type Readable } from 'svelte/store'

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

    // Bumped by applyHook so `current.*` re-derives over the new hook set.
    #hookVersion = $state(0)

    /**
     * Runes-native view of the same values the `attrs()` / `props()` stores
     * expose. Read inside a template or `$derived` to track updates; reads
     * outside any effect return the current value (fromStore falls back to
     * `get(store)`), and the values are also correct under SSR.
     */
    readonly current: {
        /** The merged HTML attributes from all applied plugins. */
        readonly attrs: Record<string, unknown>
        /** The plugin props keyed by plugin name. */
        readonly props: PluginTablePropSet<Plugins>[Key]
    }

    /**
     * Creates a new TableComponent.
     *
     * @param init - Initialization options.
     */
    constructor({ id }: TableComponentInit) {
        this.id = id
        // TS2729 forbids `$derived` referencing `this.#x` in a field initializer;
        // Svelte 5 accepts the rune as an assignment in the constructor.
        const attrs = $derived.by(() => {
            void this.#hookVersion
            return fromStore(this.attrs()).current
        })
        const props = $derived.by(() => {
            void this.#hookVersion
            return fromStore(this.props()).current
        })
        this.current = {
            get attrs() {
                return attrs
            },
            get props() {
                return props
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
    }

    abstract clone(): TableComponent<Item, Plugins, Key>
}
