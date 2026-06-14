<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getBreadcrumbContext,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { Database, Gauge, Layers } from '@lucide/svelte'
    import { demoCodeSample } from '$lib/demo-loaders'
    import VirtualScrollDefault from '$lib/examples/virtual-scroll/demos/Default.svelte'

    const breadcrumbs = getBreadcrumbContext()
    const seo = getSeoContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Virtual Scroll' }
        ]
    }
    if (seo) {
        seo.title = 'Virtual Scroll | Examples | Svelte Headless Table'
        seo.description =
            'Virtualised row rendering for tens of thousands of rows — only the viewport-visible window mounts in the DOM while sorting and pagination still apply across the full dataset.'
        seo.ogTitle = 'Virtual Scroll'
        seo.ogTagline = 'Thousands of rows, a few mounted at a time.'
        seo.ogFeatures = ['Windowed Rendering', 'Sticky Headers', 'Sorting', 'Pagination']
        seo.ogSlug = 'examples-virtual-scroll'
        seo.h1 = { title: seo.title.split('|')[0].trim(), mode: 'sr-only' }
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-headless-table/blob/main/docs/src/lib/examples/'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'VIRTUALIZE',
            title: { prefix: 'render ', accent: 'thousands', end: '.' },
            description:
                'A 10,000-row table that mounts only the viewport-visible rows. Sorting, filtering, and pagination still see every row — but the DOM stays small.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
            barCells: [{ k: 'pattern', v: 'windowed rendering' }],
            sourceUrl: `${SOURCE_URL}virtual-scroll/demos/Default.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <VirtualScrollDefault />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Gauge />
            <span>
                <code>addVirtualScroll</code> measures the scroll container and produces a thin
                window of <code>visibleRows</code> — your render loop iterates that instead of the full
                dataset.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Spacer rows above and below the window hold the scrollbar position, so a 10,000-row
                table still scrolls naturally even with 30 rows mounted.
            </span>
        </li>
        <li>
            <Database />
            <span>
                Sorting and filtering still iterate the full dataset — they're upstream of the
                windowing layer — so derived totals stay correct.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'virtual-scroll/demos/Default.svelte',
                'virtual-scroll-default',
                'Default.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2
        figId={section.figId}
        tag={section.tag}
        title={section.title}
        description={section.description}
        mode={section.mode ?? 'live'}
        sheetLabel={formatSheetLabel(i, sections.length)}
        barCells={section.barCells}
        sourceUrl={section.sourceUrl}
        codeSnippet={section.codeSnippet}
        codeLabel="show code"
        notes={section.notes}
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}
