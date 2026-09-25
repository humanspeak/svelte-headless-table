<!--
    @component
    Renders a {@link RenderConfig}: a string or number as text, a `Readable`
    store of a string or number as its current value, or a
    {@link ComponentRenderConfig} (from `createRender`) as the configured
    component with its props and slotted children.
-->
<!-- trunk-ignore(eslint/@typescript-eslint/no-explicit-any) -->
<script lang="ts" generics="TComponent extends Component<any>">
    import type { Component } from 'svelte'
    import { readable, type Readable } from 'svelte/store'
    import { isReadable } from '$lib/utils/store.js'
    import Render from './Render.svelte'
    import type { ComponentRenderConfig, RenderConfig } from './createRender.js'

    const { of: config }: { of: RenderConfig<TComponent> } = $props()

    // Primitive-or-store branch: a store that always exists lets the template
    // use `$` auto-subscription on a $derived value (same trick the
    // dependency used) instead of manual subscribe/unsubscribe.
    const valueStore: Readable<string | number | undefined> = $derived(
        isReadable<string | number>(config) ? config : readable(undefined)
    )

    // Component branch: normalise props to a store so the template can
    // spread `$propsStore` whether the caller passed a plain object or a Readable.
    const componentConfig = $derived(
        typeof config === 'object' && !isReadable(config)
            ? (config as ComponentRenderConfig<TComponent>)
            : undefined
    )
    const propsStore: Readable<Record<string, unknown>> = $derived(
        componentConfig === undefined
            ? readable({})
            : isReadable<Record<string, unknown>>(componentConfig.props)
              ? componentConfig.props
              : readable(componentConfig.props ?? {})
    )
</script>

{#if isReadable(config)}
    {$valueStore}
{:else if componentConfig === undefined}
    <!-- Narrowed to string | number here; the store branch is handled above. -->
    <!-- trunk-ignore(eslint/svelte/require-store-reactive-access) -->
    {config}
{:else}
    <componentConfig.component {...$propsStore}>
        {#each componentConfig.children as child, i (i)}
            <Render of={child} />
        {/each}
    </componentConfig.component>
{/if}
