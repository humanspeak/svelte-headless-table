import type { PageLoad } from './$types'

type ExampleEntry = {
    title: string
    description: string
}

/**
 * Static metadata for every example shipped under `/examples/<slug>`.
 *
 * Keyed by the URL slug. The landing page (`/examples`) reads
 * `sitemap-manifest.json` to discover the live routes and joins against
 * this map for human-readable titles + descriptions. Add an entry here
 * whenever you add a new `src/routes/examples/<slug>/` folder.
 */
const EXAMPLES: Record<string, ExampleEntry> = {
    'kitchen-sink': {
        title: 'Kitchen Sink',
        description:
            'Every plugin wired together at once — sorting, filtering, pagination, grouping, expansion, selection, and column resizing on one table.'
    },
    'virtual-scroll': {
        title: 'Virtual Scroll',
        description:
            'Render thousands of rows without DOM bloat — only the visible window is mounted, pagination + sorting still apply across the full dataset.'
    },
    'editable-table': {
        title: 'Editable Table',
        description:
            'Per-cell inline editing with custom cell renderers that read and write back into the source data store.'
    }
}

export const load: PageLoad = async () => {
    return { examples: EXAMPLES }
}
