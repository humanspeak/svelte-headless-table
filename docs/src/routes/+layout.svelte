<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`
</script>

<svelte:head>
    <title>Svelte Table - Headless Table Component</title>
    <meta
        name="description"
        content="Build better documentation and content-rich applications with this headless table component for Svelte 5"
    />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="Svelte Table - Headless Table Component" />
    <meta
        property="og:description"
        content="Build better documentation and content-rich applications with this headless table component for Svelte 5"
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://table.svelte.page" />
    <meta property="og:image" content="{imageLocation}svelte-table-opengraph.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Svelte Table - Headless Table Component" />
    <meta
        name="twitter:description"
        content="Build better documentation and content-rich applications with this headless table component for Svelte 5"
    />
    <meta name="twitter:image" content="{imageLocation}svelte-table-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, markdown, parser, typescript, svelte5, documentation, html, converter, marked, github-slugger, component, sveltekit, formatting, content management"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://table.svelte.page" />

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
            "description": "A powerful headless table component for Svelte 5 that transforms markdown into customizable Svelte components with TypeScript support and extensive testing coverage.",
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
<BreadcrumbContext>
    <MotionConfig transition={{ duration: 0.5 }}>
        {@render children?.()}
    </MotionConfig>
</BreadcrumbContext>
