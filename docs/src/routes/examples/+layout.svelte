<script lang="ts">
    import { ExampleLayoutV2, PagerV2, enhanceCodeBlocks, type PagerItem } from '@humanspeak/docs-kit'
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import { headerNav } from '$lib/docsNav'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()
    const PKG_VERSION = rootPkg.version

    // Same source + ordering as the /examples index grid (sitemap manifest,
    // alphabetical), so the pager's № numbering matches the gallery. PagerV2
    // renders nothing on /examples itself — the index route isn't in `items`.
    const pagerItems: PagerItem[] = Object.keys(sitemapManifest)
        .filter((route) => route.startsWith('/examples/') && route !== '/examples')
        .sort()
        .map((route) => ({ href: route, label: `${route.replace('/examples/', '')}.` }))
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
<ExampleLayoutV2 config={docsConfig} {favicon} version={PKG_VERSION} nav={headerNav}>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
        <!-- Flush above FooterV2 (margin-top: auto pins it in this flex
             column); the brut tokens come from ExampleLayoutV2 itself. -->
        <PagerV2 items={pagerItems} counterLabel="demo" ariaLabel="Examples pagination" />
    </div>
</ExampleLayoutV2>
