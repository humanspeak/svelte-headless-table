<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getBreadcrumbContext,
        getSeoContext,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { Boxes, Layers, Puzzle } from '@lucide/svelte'
    import { demoCodeSample } from '$lib/demo-loaders'
    import KitchenSinkDefault from '$lib/examples/kitchen-sink/demos/Default.svelte'

    const breadcrumbs = getBreadcrumbContext()
    const seo = getSeoContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Kitchen Sink' }
        ]
    }
    if (seo) {
        seo.title = 'Kitchen Sink | Examples | Svelte Headless Table'
        seo.description =
            'Every Svelte Headless Table plugin composed onto one table — sorting, filtering, pagination, grouping, expansion, selection, column resizing, sub-rows, hidden columns, and column reordering.'
        seo.ogTitle = 'Kitchen Sink'
        seo.ogTagline = 'Every plugin, one table.'
        seo.ogFeatures = ['Sorting', 'Filtering', 'Selection', 'Custom Cells']
        seo.ogSlug = 'examples-kitchen-sink'
        seo.h1 = { title: seo.title.split('|')[0].trim(), mode: 'sr-only' }
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-headless-table/blob/main/docs/src/lib/examples/'

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'COMPOSE',
            title: { prefix: 'every ', accent: 'plugin', end: '.' },
            description:
                'A single table wired through `createTable` with the full plugin stack composed at once — text + column filters, sortable headers, pagination, sub-rows, group-by, expansion, selection, column resizing, hidden columns, column ordering, and data export.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
            barCells: [{ k: 'pattern', v: 'plugin composition' }],
            sourceUrl: `${SOURCE_URL}kitchen-sink/demos/Default.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <KitchenSinkDefault />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Puzzle />
            <span>
                Plugins compose declaratively on the second argument to <code>createTable</code> — each
                one returns a fresh instance, so order doesn't matter for setup, only for which derived
                state wraps which.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Header + body rows are produced by separate methods on the view model so you can
                inject merge, group, and resize behaviour without rewriting the render loop.
            </span>
        </li>
        <li>
            <Boxes />
            <span>
                Filter renderers (<code>TextFilter</code>, <code>NumberRangeFilter</code>,
                <code>SelectFilter</code>) are ordinary Svelte components passed through
                <code>createRender</code> — bring your own UI library.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'kitchen-sink/demos/Default.svelte',
                'kitchen-sink-default',
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
