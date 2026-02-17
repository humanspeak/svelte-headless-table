<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'
    import SeoContext from '$lib/components/contexts/Seo/SeoContext.svelte'
    import type { SeoContext as SeoContextType } from '$lib/components/contexts/Seo/type'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`
    const canonicalUrl = $derived(`${page.url.origin}${page.url.pathname}`)

    const seo = $state<SeoContextType>({
        title: 'Svelte Table - Headless Table Component',
        description:
            'Build better documentation and content-rich applications with this powerful, fully typed headless table component for Svelte 5 featuring sorting, filtering, and pagination'
    })
</script>

<svelte:head>
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content="{imageLocation}svelte-table-opengraph.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content="{imageLocation}svelte-table-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, markdown, parser, typescript, svelte5, documentation, html, converter, marked, github-slugger, component, sveltekit, formatting, content management"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href={canonicalUrl} />

    <!-- JSON-LD structured data -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "applicationCategory": "DeveloperApplication",
            "author": {
                "@type": "Organization",
                "name": "Humanspeak, Inc.",
                "url": "https://humanspeak.com"
            },
            "description": "A powerful headless table component for Svelte 5 with full TypeScript support, sorting, filtering, pagination, row grouping, and column resizing capabilities.",
            "downloadUrl": "https://www.npmjs.com/package/@humanspeak/svelte-table",
            "keywords": "svelte, table, headless, typescript, documentation",
            "license": "MIT",
            "name": "Svelte Headless Table",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "operatingSystem": "Any",
            "programmingLanguage": ["Svelte", "TypeScript"],
            "releaseNotes": "https://github.com/humanspeak/svelte-table/releases",
            "requirements": "Svelte 5.0 or higher",
            "url": "https://table.svelte.page"
        }
    </script>
</svelte:head>

<ModeWatcher />
<SeoContext {seo}>
    <BreadcrumbContext>
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children?.()}
        </MotionConfig>
    </BreadcrumbContext>
</SeoContext>
