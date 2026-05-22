<script lang="ts">
    import { ExampleLayoutV2, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()
    const PKG_VERSION = rootPkg.version
</script>

<!--
    Brutalist examples shell. `ExampleLayoutV2` is the docs-kit-provided
    `.brut-wrap` surface that supplies the `--brut-bg` / `--brut-rule` /
    `--brut-accent` CSS tokens every `ExampleV2` sheet needs to render its
    hairline-bordered chrome. Without this wrapper the panel chrome
    disappears and demos float on the raw page background.

    `enhanceCodeBlocks` decorates inline `<code>` chips with the brutalist
    "filled with thin rule" treatment so references like
    `<code>addPagination</code>` inside notes columns visually pop.
-->
<ExampleLayoutV2
    config={docsConfig}
    {favicon}
    version={PKG_VERSION}
    nav={[
        { label: 'docs', href: '/docs' },
        { label: 'examples', href: '/examples' }
    ]}
>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
</ExampleLayoutV2>
