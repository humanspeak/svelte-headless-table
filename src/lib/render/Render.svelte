<!--
    @component
    Renders a {@link RenderConfig}: a string or number as text, a getter as the
    string or number it returns, a {@link SnippetRenderConfig} (from
    `createSnippetRender`) as the snippet called with its argument, or a
    {@link ComponentRenderConfig} (from `createRender`) as the configured
    component with its props and slotted children. Getters are called inside
    `$derived`s, so the rune state they read is tracked.
-->
<script lang="ts">
    import Render from './Render.svelte'
    import {
        SnippetRenderConfig,
        type ComponentRenderConfig,
        type RenderConfig
    } from './createRender.js'

    const { of: config }: { of: RenderConfig } = $props()

    // Snippet branch.
    const snippetConfig = $derived(config instanceof SnippetRenderConfig ? config : undefined)
    const snippetArgs: unknown = $derived.by(() => {
        if (snippetConfig === undefined) return undefined
        const args: unknown = snippetConfig.args
        return typeof args === 'function' ? (args as () => unknown)() : args
    })

    // Component branch: any remaining object is a component config.
    const componentConfig = $derived(
        typeof config === 'object' && snippetConfig === undefined
            ? (config as ComponentRenderConfig)
            : undefined
    )
    const componentProps: Record<string, unknown> = $derived.by(() => {
        const props = componentConfig?.props
        return typeof props === 'function' ? props() : (props ?? {})
    })

    // Text branch: a string, a number, or a getter returning one.
    const text: string | number | undefined = $derived(
        typeof config === 'function' ? config() : typeof config === 'object' ? undefined : config
    )
</script>

{#if snippetConfig !== undefined}
    {@render snippetConfig.snippet(snippetArgs)}
{:else if componentConfig !== undefined}
    <componentConfig.component {...componentProps}>
        {#each componentConfig.children as child, i (i)}
            <Render of={child} />
        {/each}
    </componentConfig.component>
{:else}
    {text}
{/if}
