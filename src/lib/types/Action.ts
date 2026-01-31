/**
 * Return type for Svelte actions.
 * Contains optional lifecycle methods for updating and destroying the action.
 *
 * @template Props - The type of props passed to the action.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionReturnType<Props = any> = {
    /** Called when props change. */
    update?: (_newProps: Props) => void
    /** Called when the element is removed from the DOM. */
    destroy?: () => void
}

/**
 * A Svelte action function that can be applied to DOM elements.
 * Actions receive an element and optional props, returning lifecycle methods.
 *
 * @template Props - The type of props passed to the action.
 */
export type Action<Props> = (_node: Element, _props?: Props) => ActionReturnType<Props> | void
