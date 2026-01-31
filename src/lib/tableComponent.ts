import type { TableState } from '$lib/createViewModel.js'
import type {
    AnyPlugins,
    ComponentKeys,
    ElementHook,
    PluginTablePropSet
} from '$lib/types/TablePlugin.js'
import { finalizeAttributes, mergeAttributes } from '$lib/utils/attributes.js'
import type { Clonable } from '$lib/utils/clone.js'
import { derivedKeys } from '@humanspeak/svelte-subscribe'
import { derived, type Readable } from 'svelte/store'

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

    /**
     * Creates a new TableComponent.
     *
     * @param init - Initialization options.
     */
    constructor({ id }: TableComponentInit) {
        this.id = id
    }

    private attrsForName: Record<string, Readable<Record<string, unknown>>> = {}

    /**
     * Gets the merged HTML attributes from all applied plugins.
     *
     * @returns A readable store of merged attributes.
     */
    attrs(): Readable<Record<string, unknown>> {
        return derived(Object.values(this.attrsForName), ($attrsArray) => {
            let $mergedAttrs: Record<string, unknown> = {}
            $attrsArray.forEach(($attrs) => {
                $mergedAttrs = mergeAttributes($mergedAttrs, $attrs)
            })
            return finalizeAttributes($mergedAttrs)
        })
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
    }

    abstract clone(): TableComponent<Item, Plugins, Key>
}
