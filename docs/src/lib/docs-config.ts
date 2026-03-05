import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Headless Table',
    slug: 'table',
    npmPackage: '@humanspeak/svelte-headless-table',
    repo: 'humanspeak/svelte-headless-table',
    url: 'https://table.svelte.page',
    description:
        'A powerful, headless table library for Svelte 5 with full TypeScript support, sorting, filtering, pagination, row grouping, column resizing, and composable plugins.',
    keywords: [
        'svelte',
        'table',
        'headless',
        'svelte-5',
        'typescript',
        'sorting',
        'filtering',
        'pagination',
        'plugins',
        'data-table'
    ],
    defaultFeatures: ['Svelte 5 Runes', 'TypeScript First', 'Composable Plugins', 'Headless'],
    fallbackStars: 200
}
