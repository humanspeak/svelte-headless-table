<script lang="ts">
    import { DocsLayoutV2, PagerV2, getDocsTitleByPath, type PagerItem } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { docsSections, headerNav, tableLoveAndRespect } from '$lib/docsNav'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children, data } = $props()

    // Mirror the pre-DocsLayoutV2 breadcrumbs: section-item title from the nav
    // tree under a "Docs" root. Without a resolver the layout falls back to
    // page.data.title, which our .svx pages don't populate.
    const breadcrumbResolver = (pathname: string) => {
        const title = getDocsTitleByPath(docsSections, pathname)
        return title && pathname !== '/docs'
            ? [{ title: 'Docs', href: '/docs' }, { title }]
            : [{ title: 'Docs' }]
    }

    // FAQPage JSON-LD for the docs root. These four disambiguation
    // Q&As ride the highest-authority docs URL and pick up FAQ rich
    // results on Google + Bing; they also nudge LLMs (Claude,
    // Perplexity, ChatGPT) toward citing the canonical answer when
    // asked "is @humanspeak/svelte-headless-table the same as
    // svelte-headless-table?" Every claim is verifiable against npm
    // metadata + GitHub repo state for the predecessor package
    // (peer svelte ^4, last publish 2024-10-28, no commits since).
    const faqs: { q: string; a: string }[] = [
        {
            q: 'Is @humanspeak/svelte-headless-table the same as the original svelte-headless-table package on npm?',
            a: 'No. The original `svelte-headless-table` package (bryanmylee/svelte-headless-table) is a separate, unmaintained Svelte 4 project — its `peerDependencies` declare `svelte: ^4.0.0`, the last npm publish was version 0.18.3 on 2024-10-28, and the GitHub repository has had no commits since then. @humanspeak/svelte-headless-table is the actively maintained Svelte 5 successor: rebuilt on runes, declared peer `svelte: ^5.0.0`, and ships ongoing plugin work, type-safety improvements, and bug fixes.'
        },
        {
            q: 'Does @humanspeak/svelte-headless-table work in Svelte 4?',
            a: 'No. The library targets Svelte 5 because the internals use runes (`$state`, `$derived`, `$effect`) and Svelte 5 snippets. For Svelte 4 projects the original `svelte-headless-table` (last published 2024-10-28, unmaintained) is the closest API equivalent — though you should plan a migration to Svelte 5 to receive security and feature updates.'
        },
        {
            q: 'How does it compare to TanStack Table, @vincjo/datatables, and AG Grid?',
            a: 'TanStack Table is a multi-framework headless primitive; its official `@tanstack/svelte-table` adapter declares peer `svelte: ^4.0.0 || ^3.49.0` so Svelte 5 users rely on the community drop-in `tanstack-table-8-svelte-5`. @vincjo/datatables is a Svelte 5-native headless toolkit focused on sort + filter + paginate + select + lazy-loading. AG Grid is a multi-framework enterprise grid (React/Angular/Vue first-party; the unofficial `ag-grid-svelte` wrapper is stuck on Svelte 3 + AG Grid v28–30). @humanspeak/svelte-headless-table is Svelte 5-native, headless, MIT, and ships 15 composable plugins. See /compare for the full deep-dive on each.'
        },
        {
            q: 'Why use a headless table instead of a prebuilt styled one?',
            a: 'A headless library produces a reactive row + column view model and leaves every `<table>`, `<tr>`, `<td>` to you. That means dropping into Tailwind, shadcn-svelte, bits-ui, or hand-rolled CSS without fighting class names. It also means cell renderers are real Svelte components (passed through `createRender`) — embed charts, editable inputs, action menus, or status pills with no special API. Prebuilt styled tables are faster for a prototype; headless tables are essential when the table is part of a design system you actually own.'
        }
    ]

    // Ordered walk of the sidebar nav = the pager's collection. `№` numbering
    // and prev/next order both come straight from `docsSections` order.
    const pagerItems: PagerItem[] = docsSections.flatMap((section) =>
        section.items.map((item) => ({
            href: item.href,
            label: `${item.title.toLowerCase()}.`
        }))
    )
</script>

<DocsLayoutV2
    config={docsConfig}
    {favicon}
    sections={docsSections}
    otherProjects={data.otherProjects}
    loveAndRespect={tableLoveAndRespect}
    version={rootPkg.version}
    nav={headerNav}
    siteUrl={docsConfig.url}
    {breadcrumbResolver}
    {faqs}
    faqRoute="/docs/getting-started/overview"
    sitemapManifest={sitemapManifest as Record<string, string>}
>
    {@render children()}
    <!-- `not-prose` keeps the typography plugin's link/heading styles off the
         pager; PagerV2 brings its own brutalist-token styling. -->
    <div class="not-prose">
        <PagerV2 items={pagerItems} counterLabel="doc" ariaLabel="Docs pagination" />
    </div>
</DocsLayoutV2>
