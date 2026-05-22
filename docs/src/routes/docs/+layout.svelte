<script lang="ts">
    import { afterNavigate } from '$app/navigation'
    import { page } from '$app/state'
    import {
        DocSlugStrip,
        FooterV2,
        HeaderV2,
        SidebarV2,
        TableOfContentsV2,
        enhanceCodeBlocks,
        extractHeadings,
        getBreadcrumbContext,
        getDocsTitleByPath,
        type TocHeading
    } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { docsSections, headerNav, tableLoveAndRespect } from '$lib/docsNav'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const BASE_URL = docsConfig.url
    const PKG_VERSION = rootPkg.version

    const { children, data } = $props()

    /** Pretty slug for DocSlugStrip — "/docs" → "index", "/docs/api/table" → "api-table". */
    const docSlug = $derived.by(() => {
        const path = page.url.pathname.replace(/\/+$/, '')
        if (path === '/docs' || path === '') return 'index'
        return path.replace('/docs/', '').replace(/\//g, '-')
    })

    // Breadcrumb context. Top-level assignment populates the context during
    // SSR so HeaderV2 + BreadcrumbJsonLd see the crumbs in the server HTML.
    // The $effect catches client-side navigation between sibling docs pages
    // where the layout doesn't remount.
    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        const title = getDocsTitleByPath(docsSections, page.url.pathname)
        breadcrumbs.breadcrumbs =
            title && page.url.pathname !== '/docs'
                ? [{ title: 'Docs', href: '/docs' }, { title }]
                : [{ title: 'Docs' }]
    }
    $effect(() => {
        if (!breadcrumbs) return
        const title = getDocsTitleByPath(docsSections, page.url.pathname)
        breadcrumbs.breadcrumbs =
            title && page.url.pathname !== '/docs'
                ? [{ title: 'Docs', href: '/docs' }, { title }]
                : [{ title: 'Docs' }]
    })

    // FAQPage JSON-LD for /docs root only. These four disambiguation
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

    // `/docs` 307s to `/docs/getting-started/overview` (see /docs/+page.ts),
    // so the FAQ has to ride the redirect destination — that's the URL
    // crawlers and LLM indexers actually see and cache.
    const FAQ_ROUTE = '/docs/getting-started/overview'
    const faqJsonLd = $derived.by(() => {
        if (page.url.pathname !== FAQ_ROUTE) return ''
        return `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a }
            }))
        })}</${'script'}>`
    })

    const techArticleJsonLd = $derived.by(() => {
        const title = page.data?.title as string | undefined
        const description = page.data?.description as string | undefined
        if (!title) return ''
        const pathname = page.url.pathname
        const lastmod =
            (sitemapManifest as Record<string, string>)[pathname] ??
            new Date().toISOString().split('T')[0]
        return `<${'script'} type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: title,
            description: description || title,
            url: `${BASE_URL}${pathname}`,
            dateModified: lastmod,
            author: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak',
                url: 'https://humanspeak.com'
            },
            proficiencyLevel: 'Beginner'
        })}</${'script'}>`
    })

    let contentElement: HTMLElement | undefined = $state(undefined)
    let headings: TocHeading[] = $state([])

    // Heading extraction. Re-runs on initial mount and after each navigation.
    // The MutationObserver approach used previously fired on every prose
    // mutation; afterNavigate + the initial $effect cover every real case
    // (route change swaps the whole content tree).
    const refreshHeadings = () => {
        if (contentElement) headings = extractHeadings(contentElement)
    }

    $effect(() => {
        if (contentElement) refreshHeadings()
    })

    afterNavigate(() => {
        requestAnimationFrame(refreshHeadings)
    })
</script>

<svelte:head>
    {#if techArticleJsonLd}
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags): static JSON-LD, no user input -->
        {@html techArticleJsonLd}
    {/if}
    {#if faqJsonLd}
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags): static JSON-LD, no user input -->
        {@html faqJsonLd}
    {/if}
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background">
    <HeaderV2 config={docsConfig} {favicon} version={PKG_VERSION} nav={headerNav} />

    <DocSlugStrip slug={docSlug} />

    <div class="flex flex-1">
        <!-- Left sidebar - Navigation -->
        <aside
            class="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background/95 shadow-sm lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto"
        >
            <SidebarV2
                config={docsConfig}
                sections={docsSections}
                currentPath={page.url.pathname}
                otherProjects={data.otherProjects}
                loveAndRespect={tableLoveAndRespect}
            />
        </aside>

        <!-- Main content area -->
        <main class="min-w-0 flex-1">
            <div class="flex min-w-0">
                <!-- Content -->
                <article
                    bind:this={contentElement}
                    use:enhanceCodeBlocks
                    class="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8"
                >
                    <div
                        class="prose-v2 prose max-w-none text-text-primary prose-slate dark:prose-invert prose-headings:scroll-mt-20"
                    >
                        {@render children()}
                    </div>
                </article>

                <!-- Right sidebar - Table of Contents -->
                <aside
                    class="hidden w-56 shrink-0 border-l border-sidebar-border bg-sidebar-background/95 shadow-sm xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto"
                >
                    <TableOfContentsV2 {headings} />
                </aside>
            </div>
        </main>
    </div>
    <FooterV2 version={PKG_VERSION} />
</div>
