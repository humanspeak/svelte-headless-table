// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionReturnType<Props = any> = {
    update?: (_newProps: Props) => void
    destroy?: () => void
}

export type Action<Props> = (_node: Element, _props?: Props) => ActionReturnType<Props> | void
