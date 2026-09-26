<!--
    @component
    Renders a {@link RenderConfig}: a string or number as text, a `Readable`
    store of a string or number as its current value, a
    {@link SnippetRenderConfig} (from `createSnippetRender`) as the snippet
    called with its argument, or a {@link ComponentRenderConfig} (from
    `createRender`) as the configured component with its props and slotted
    children.
-->
<!-- trunk-ignore(eslint/@typescript-eslint/no-explicit-any) -->
<script lang="ts" generics="TComponent extends Component<any>">
    import type { Component } from 'svelte'
    import { readable, type Readable } from 'svelte/store'
    import { isReadable } from '$lib/utils/store.js'
    import Render from './Render.svelte'
    import {
        SnippetRenderConfig,
        type ComponentRenderConfig,
        type RenderConfig
    } from './createRender.js'

    const { of: config }: { of: RenderConfig<TComponent> } = $props()

    // Primitive-or-store branch: a store that always exists lets the template
    // use `$` auto-subscription on a $derived value (same trick the
    // dependency used) instead of manual subscribe/unsubscribe.
    const valueStore: Readable<string | number | undefined> = $derived(
        isReadable<string | number>(config) ? config : readable(undefined)
    )

    // Snippet branch. The instanceof check is the one place `config` is
    // inspected as a raw value; the store rule cannot see that a
    // SnippetRenderConfig is never a store, so it is suppressed here only.
    // trunk-ignore(eslint/svelte/require-store-reactive-access)
    const snippetConfig = $derived(config instanceof SnippetRenderConfig ? config : undefined)
    const snippetArgsStore: Readable<unknown> = $derived(
        snippetConfig === undefined
            ? readable(undefined)
            : isReadable(snippetConfig.args)
              ? snippetConfig.args
              : readable(snippetConfig.args)
    )

    // Component branch: normalise props to a store so the template can
    // spread `$propsStore` whether the caller passed a plain object or a Readable.
    const componentConfig = $derived(
        typeof config === 'object' && !isReadable(config) && snippetConfig === undefined
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
{:else if snippetConfig !== undefined}
    {@render snippetConfig.snippet($snippetArgsStore)}
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
