import type { Component, ComponentProps, Snippet } from 'svelte'
import type { Readable } from 'svelte/store'

/**
 * Configuration type for rendering Svelte components or primitive values.
 *
 * A `RenderConfig` is either a {@link ComponentRenderConfig} (created with
 * {@link createRender}), a {@link SnippetRenderConfig} (created with
 * {@link createSnippetRender}), a plain string or number, or a `Readable`
 * store of a string or number.
 *
 * @template TComponent - The Svelte component type.
 */
// Component props are contravariant; `any` is the only default every component is assignable to
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export type RenderConfig<TComponent extends Component = Component<any>> =
    | ComponentRenderConfig<TComponent>
    // Snippet args are contravariant; `any` accepts a snippet of any argument type
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    | SnippetRenderConfig<any>
    | string
    | number
    | Readable<string | number>

/**
 * Configuration class for rendering Svelte components with props and slots.
 *
 * @template TComponent - The Svelte component type.
 */
// Component props are contravariant; `any` is the only default every component is assignable to
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export class ComponentRenderConfig<TComponent extends Component = Component<any>> {
    /**
     * The Svelte component to render.
     */
    component: TComponent

    /**
     * Optional props to pass to the component.
     */
    props?: Record<string, unknown> | undefined

    /**
     * Creates a new component render configuration.
     *
     * @param component - The Svelte component to render.
     * @param props - Optional props to pass to the component.
     */
    constructor(component: TComponent, props?: Record<string, unknown>) {
        this.component = component
        this.props = props
    }

    /**
     * @deprecated This method will be removed in the next major release. Please use svelte-5 event syntax instead.
     * List of event handlers to attach to the component.
     */
    // Deprecated API; handlers of any event type are stored together
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    eventHandlers: [string, (ev: any) => void][] = []

    /**
     * @deprecated This method will be removed in the next major release. Please use svelte-5 event syntax instead.
     *
     * Attaches an event handler to the component by setting the
     * `on<type>` prop.
     *
     * @param type - The event type to listen for.
     * @param handler - The event handler function.
     * @returns this - For method chaining.
     */
    // Type parameters kept so callers passing explicit type arguments to this
    // deprecated method still compile; `any` is the untyped-handler default.
    // trunk-ignore(eslint/@typescript-eslint/no-unnecessary-type-parameters,eslint/@typescript-eslint/no-explicit-any)
    on<TEventType extends string, TEvent = any>(
        type: TEventType,
        handler: (ev: TEvent) => void
    ): this {
        // The deprecated method maintains its own deprecated field
        // trunk-ignore(eslint/@typescript-eslint/no-deprecated)
        this.eventHandlers.push([type, handler])
        this.props ??= {}
        this.props[`on${type}`] = handler
        return this
    }

    /**
     * List of child configs to render in the component's default slot
     * (the `children` snippet in Svelte 5).
     */
    children: RenderConfig[] = []

    /**
     * Sets the children to render in the component's default slot,
     * replacing any previously set children.
     *
     * @param children - The child render configs.
     * @returns this - For method chaining.
     */
    slot(...children: RenderConfig[]): this {
        this.children = children
        return this
    }
}

/**
 * Creates a render configuration for a Svelte component, optionally with props.
 *
 * @template TComponent - The Svelte component type.
 * @param component - The component to render.
 * @param props - Optional props to pass to the component, either static or a `Readable` store.
 * @returns A new {@link ComponentRenderConfig} instance.
 *
 * @example
 * ```ts
 * const config = createRender(MyComponent)
 * const withProps = createRender(MyComponent, { name: 'World' })
 * const reactive = createRender(MyComponent, derived(store, ($s) => ({ name: $s })))
 * ```
 */
// Component props are contravariant; `any` is the only default every component is assignable to
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export function createRender<TComponent extends Component<any>>(
    component: TComponent,
    props?: Partial<ComponentProps<TComponent>> | Readable<ComponentProps<TComponent>>
): ComponentRenderConfig<TComponent> {
    return new ComponentRenderConfig(component, props as Record<string, unknown> | undefined)
}

/**
 * Render configuration for a Svelte 5 snippet with a single argument.
 * Created with {@link createSnippetRender}.
 *
 * @template Args - The type of the single argument passed to the snippet.
 */
export class SnippetRenderConfig<Args = void> {
    constructor(
        /** The snippet to render. */
        public snippet: Snippet<[Args]>,
        /** The single argument passed to the snippet, static or reactive. */
        public args: Args | Readable<Args>
    ) {}
}

/**
 * Creates a render configuration for a snippet declared in the consumer's
 * markup. Top-level snippets are hoisted by Svelte, so they can be referenced
 * from the `<script>` block where columns are defined.
 *
 * @template Args - The type of the single argument passed to the snippet.
 * @param snippet - The snippet to render.
 * @param args - The single argument passed to the snippet, either static or a
 * `Readable` store. Omit for snippets that take no argument.
 * @returns A new {@link SnippetRenderConfig} instance.
 *
 * @example
 * ```svelte
 * <script>
 *   const columns = table.createColumns([
 *     table.column({ accessor: 'name', header: 'Name',
 *       cell: ({ value }) => createSnippetRender(nameCell, value) })
 *   ])
 * </script>
 * {#snippet nameCell(name)}<strong>{name}</strong>{/snippet}
 * ```
 */
export function createSnippetRender<Args = void>(
    snippet: Snippet<[Args]>,
    args?: Args | Readable<Args>
): SnippetRenderConfig<Args> {
    return new SnippetRenderConfig(snippet, args as Args)
}
