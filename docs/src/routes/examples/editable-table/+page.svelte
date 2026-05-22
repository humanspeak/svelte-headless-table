<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        getBreadcrumbContext,
        getSeoContext,
        type DemoManifestEntry,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { Keyboard, Pencil, Workflow } from '@lucide/svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import EditableTableDefault from '$lib/examples/editable-table/demos/Default.svelte'

    const breadcrumbs = getBreadcrumbContext()
    const seo = getSeoContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Editable Table' }
        ]
    }
    if (seo) {
        seo.title = 'Editable Table | Examples | Svelte Headless Table'
        seo.description =
            'Inline-editable table cells driven by a custom cell renderer that reads and writes the underlying Svelte store.'
        seo.ogTitle = 'Editable Table'
        seo.ogTagline = 'Click a cell, edit, commit.'
        seo.ogFeatures = ['Inline Edit', 'Custom Renderers', 'Store Round-Trip', 'Keyboard']
        seo.ogSlug = 'examples-editable-table'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-headless-table/blob/main/docs/src/lib/examples/'

    const manifest = demoManifest as Record<string, DemoManifestEntry>

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'EDIT',
            title: { prefix: 'inline ', accent: 'edit', end: '.' },
            description:
                'Cells render through a custom `EditableCell` component that swaps a `<span>` for an `<input>` on click and writes the new value back into the data store on blur.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
            barCells: [{ k: 'pattern', v: 'editable cells' }],
            sourceUrl: `${SOURCE_URL}editable-table/demos/Default.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <EditableTableDefault />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Pencil />
            <span>
                The cell renderer is an ordinary Svelte component handed to <code>createRender</code
                > — it owns its own focus state and writes back via a callback prop.
            </span>
        </li>
        <li>
            <Workflow />
            <span>
                Edits flow into the same writable store the table reads from; the table re-renders
                automatically through the reactive data subscription.
            </span>
        </li>
        <li>
            <Keyboard />
            <span>
                <code>Enter</code> commits and exits, <code>Escape</code> reverts. Add your own
                keyboard navigation by wiring <code>HTMLInputElement</code> events inside the cell renderer.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'editable-table-default',
                label: 'Default.svelte',
                ...manifest['editable-table/demos/Default.svelte']
            },
            {
                id: 'editable-table-cell',
                label: 'EditableCell.svelte',
                ...manifest['editable-table/demos/EditableCell.svelte']
            }
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
