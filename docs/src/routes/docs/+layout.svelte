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
