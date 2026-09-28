// v7 design spike (plan 001): a memo-free replacement for `TableComponent`.
// Hooks are getters; `current.attrs` / `current.props` call them on every read
// and allocate nothing reactive per component. Throwaway: deleted by plan 004.
import type { Getter } from './reactivity.svelte.js'

export interface ElementHook<Props, Attrs> {
    props?: Getter<Props>
    attrs?: Getter<Attrs>
}

type AnyHook = ElementHook<unknown, Record<string, unknown>>

export interface ComponentView {
    readonly attrs: Record<string, unknown>
    readonly props: Record<string, unknown>
}

// Copied from `src/lib/utils/attributes.ts` (`mergeAttributes`); the spike does
// not import from `$lib`.
const mergeAttributes = (
    a: Record<string, unknown>,
    b: Record<string, unknown>
): Record<string, unknown> => {
    if (a.style === undefined && b.style === undefined) {
        return { ...a, ...b }
    }
    return {
        ...a,
        ...b,
        style: {
            ...(typeof a.style === 'object' ? a.style : {}),
            ...(typeof b.style === 'object' ? b.style : {})
        }
    }
}

export class SpikeComponent<Key extends string> {
    id: string
    /** Phantom marker for the component key ('thead.tr.th', 'tbody.tr.td', ...). */
    declare readonly key?: Key
    // A plain record, not rune state: applyHook runs inside the view model's
    // `$derived.by`, where writing `$state` is illegal (state_unsafe_mutation).
    #hooks: Record<string, AnyHook> = {}
    #currentView?: ComponentView

    constructor(id: string) {
        this.id = id
    }

    applyHook(pluginName: string, hook: AnyHook) {
        this.#hooks[pluginName] = hook
    }

    /** Fixed attributes every instance of this component carries (role etc.). */
    protected decorateAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
        return attrs
    }

    #readAttrs(): Record<string, unknown> {
        let merged: Record<string, unknown> = {}
        for (const hook of Object.values(this.#hooks)) {
            if (hook.attrs !== undefined) merged = mergeAttributes(merged, hook.attrs())
        }
        return this.decorateAttrs(merged)
    }

    #readProps(): Record<string, unknown> {
        const props: Record<string, unknown> = {}
        for (const [pluginName, hook] of Object.entries(this.#hooks)) {
            if (hook.props !== undefined) props[pluginName] = hook.props()
        }
        return props
    }

    /**
     * Memo-free view: every read of `attrs` / `props` re-runs the hook getters.
     * Reads inside a template effect are tracked because the getters read
     * plugin `$state`; no `$derived` and no cache live on the component.
     */
    get current(): ComponentView {
        if (this.#currentView === undefined) {
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
}

/** A component that always carries a fixed ARIA role (rows, cells, headers). */
export class SpikeRoleComponent<Key extends string> extends SpikeComponent<Key> {
    #role: string

    constructor(id: string, role: string) {
        super(id)
        this.#role = role
    }

    protected override decorateAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
        return { ...attrs, role: this.#role }
    }
}
