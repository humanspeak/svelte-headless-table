import type { Component, ComponentProps, Snippet } from 'svelte'
import type { Getter } from '../reactivity.svelte.js'

// trunk-ignore(eslint/@typescript-eslint/no-explicit-any): props are contravariant; `any` is the only default every component is assignable to
type AnyComponent = Component<any>

/**
 * Configuration type for rendering Svelte components or primitive values.
 *
 * A `RenderConfig` is either a {@link ComponentRenderConfig} (created with
 * {@link createRender}), a {@link SnippetRenderConfig} (created with
 * {@link createSnippetRender}), a plain string or number, or a getter
 * returning a string or number (read inside `<Render>`, so rune state it reads
 * is tracked).
 *
 * @template TComponent - The Svelte component type.
 */
export type RenderConfig<TComponent extends Component = AnyComponent> =
    | ComponentRenderConfig<TComponent>
    // Snippet args are contravariant; `any` accepts a snippet of any argument type
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    | SnippetRenderConfig<any>
    | string
    | number
    | Getter<string | number>

/**
 * Configuration class for rendering Svelte components with props and slots.
 *
 * @template TComponent - The Svelte component type.
 */
export class ComponentRenderConfig<TComponent extends Component = AnyComponent> {
    /**
     * The Svelte component to render.
     */
    component: TComponent

    /**
     * Optional props to pass to the component: a plain object, or a getter
     * returning one (read inside `<Render>`, so rune state it reads is
     * tracked). Pass event handlers as ordinary `on<event>` props.
     */
    props?: Record<string, unknown> | Getter<Record<string, unknown>> | undefined

    /**
     * Creates a new component render configuration.
     *
     * @param component - The Svelte component to render.
     * @param props - Optional props, static or a getter.
     */
    constructor(
        component: TComponent,
        props?: Record<string, unknown> | Getter<Record<string, unknown>>
    ) {
        this.component = component
        this.props = props
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
 * @param props - Optional props to pass to the component, either a plain
 * object or a getter returning one (reactive when it reads rune state).
 * @returns A new {@link ComponentRenderConfig} instance.
 *
 * @example
 * ```ts
 * const config = createRender(MyComponent)
 * const withProps = createRender(MyComponent, { name: 'World' })
 * const reactive = createRender(MyComponent, () => ({ name: user.current }))
 * ```
 */
export function createRender<TComponent extends AnyComponent>(
    component: TComponent,
    props?: Partial<ComponentProps<TComponent>> | Getter<Partial<ComponentProps<TComponent>>>
): ComponentRenderConfig<TComponent> {
    return new ComponentRenderConfig(
        component,
        props as Record<string, unknown> | Getter<Record<string, unknown>> | undefined
    )
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
        /**
         * The single argument passed to the snippet: the value itself, or a
         * getter returning it (reactive when it reads rune state). A function
         * value is always treated as a getter, so to pass a function as the
         * argument wrap it: `() => fn`.
         */
        public args: Args | Getter<Args>
    ) {}
}

/**
 * Creates a render configuration for a snippet declared in the consumer's
 * markup. Top-level snippets are hoisted by Svelte, so they can be referenced
 * from the `<script>` block where columns are defined.
 *
 * @template Args - The type of the single argument passed to the snippet.
 * @param snippet - The snippet to render.
 * @param args - The single argument passed to the snippet, either the value or
 * a getter returning it. A function is always called as a getter; wrap a
 * function argument as `() => fn`. Omit for snippets that take no argument.
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
    args?: Args | Getter<Args>
): SnippetRenderConfig<Args> {
    return new SnippetRenderConfig(snippet, args as Args | Getter<Args>)
}
