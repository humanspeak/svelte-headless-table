<script lang="ts">
    import { BrutIndexV2, getBreadcrumbContext, getSeoContext } from '@humanspeak/docs-kit'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import type { PageData } from './$types'

    type ExampleData = {
        title: string
        description: string
    }

    type ExamplesData = Record<string, ExampleData>

    const { data }: { data: PageData } = $props()

    const breadcrumbs = getBreadcrumbContext()
    const seo = getSeoContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [{ title: 'Examples' }]
    }
    if (seo) {
        seo.title = 'Examples | Svelte Headless Table'
        seo.description =
            'Live, copy-pasteable Svelte Headless Table examples — kitchen-sink plugins, virtual scroll, editable cells, and more.'
        seo.ogTitle = 'Examples'
        seo.ogTagline = 'Live Svelte Headless Table demos'
        seo.ogFeatures = ['Kitchen Sink', 'Virtual Scroll', 'Editable Cells', 'Plugin Composition']
        seo.ogSlug = 'examples'
        seo.h1 = undefined
    }

    const examples = $derived.by(() => {
        const exampleRoutes = Object.keys(sitemapManifest)
            .filter((route) => route.startsWith('/examples/') && route !== '/examples')
            .sort()

        return exampleRoutes.map((route) => {
            const slug = route.replace('/examples/', '')
            const exampleData = (data.examples as ExamplesData)[slug]
            const title = exampleData?.title || formatTitle(slug)
            return {
                route,
                slug,
                title,
                description:
                    exampleData?.description ||
                    `Live ${title.toLowerCase()} example built with @humanspeak/svelte-headless-table`
            }
        })
    })

    function formatTitle(slug: string): string {
        return slug
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

<BrutIndexV2
    hero={{
        figLabel: 'FIG-001 · EXAMPLES INDEX',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'demos', v: String(examples.length) },
            { k: 'format', v: 'live tables' },
            { k: 'tone', v: 'composable' },
            { rule: 'dashed' },
            { k: 'library', v: '@humanspeak/svelte-headless-table' },
            { k: 'framework', v: 'svelte 5', accent: true },
            { rule: 'dashed' }
        ],
        metaFooter: '// scroll for demos',
        kicker: '// examples / live tables',
        title: { accent: 'examples', end: '.' },
        subHtml:
            'Copy-pasteable demos of <b>@humanspeak/svelte-headless-table</b> in motion — every plugin composed in the kitchen-sink, virtual rendering for thousands of rows, inline cell editing, and more. Pick a card, fork the source, ship.',
        ctas: [
            {
                label: 'browse kitchen-sink ↗',
                href: '/examples/kitchen-sink',
                primary: true
            },
            { label: 'get started', href: '/docs/getting-started/overview' },
            { label: 'api reference', href: '/docs/api/create-table' }
        ]
    }}
    lede={{
        kicker: 'FIG-002 / DEMOS',
        title: { prefix: 'pick an ', accent: 'example', suffix: '.' },
        body: 'Each page is a self-contained, copy-pasteable demo with the source you need.'
    }}
    items={examples.map((example, i) => ({
        href: example.route,
        id: `№ ${pad2(i + 1)} / ${pad2(examples.length)}`,
        title: `${example.slug}.`,
        line: example.description
    }))}
    footer={{
        big: {
            prefix: 'start with ',
            accent: 'kitchen-sink',
            href: '/examples/kitchen-sink',
            hint: 'every plugin, one table'
        }
    }}
/>
