import type { ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

export type { ComparisonFeature, ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

/**
 * Brand identity passed to `CompareIndexV2` + `ComparisonPageV2` on
 * every compare route. Keeping the literal here (not at each call site)
 * means changing the canonical URL once updates the index page, every
 * /compare/<slug> page, and the JSON-LD inside them.
 *
 * Data accuracy note: every claim about a competitor in this file is
 * sourced from their public npm metadata + README + docs (verified
 * 2026-05-22). Versions, peer-dep ranges, and licence terms are
 * directly quoted from the registry / repo, not paraphrased from
 * memory.
 */
export const ours: ComparisonOurs = {
    name: 'Svelte Headless Table',
    npmPackage: '@humanspeak/svelte-headless-table',
    slug: 'svelte-headless-table',
    url: 'https://table.svelte.page'
}

/**
 * Strengths + weaknesses that apply across every comparison — saves
 * repeating the same lines under each competitor while letting each
 * page append competitor-specific bullets via spread.
 */
const shared = {
    prosUs: [
        'Svelte 5 runes-native — peer-dependency is `svelte: ^5`, rebuilt for runes (not retrofitted)',
        'Truly headless — you own the `<table>` markup and every cell',
        'TypeScript-first with generics that carry the row type through every plugin',
        '15 composable plugins on one `createTable` call — sorting, filtering, pagination, grouping, expansion, selection, column resize, sub-rows, virtual scroll, and more',
        'Custom cell renderers via `createRender` — any Svelte component becomes a cell',
        'Store-based view model — composes with whatever state library you already use',
        'MIT — zero licence fees and no Enterprise tier'
    ],
    consUs: [
        'Headless by design — you write more markup than a prebuilt styled table',
        'Smaller community than TanStack Table or AG Grid',
        'Plugin order matters — composition is powerful but takes a few minutes to learn'
    ]
}

export const competitors: Competitor[] = [
    {
        slug: 'vs-tanstack-table',
        name: 'TanStack Table',
        tagline: 'Multi-framework adapter (Svelte 3/4) vs Svelte 5-native headless',
        description:
            'TanStack Table is the multi-framework headless table primitive that powers React, Vue, Solid, Angular, Qwik, Lit, and Svelte through adapters. The official `@tanstack/svelte-table` adapter targets Svelte 3 / 4 — Svelte 5 support is community-supplied via `tanstack-table-8-svelte-5`. @humanspeak/svelte-headless-table is purpose-built for Svelte 5, no adapter layer, no React-flavoured patterns leaking through.',
        website: 'https://tanstack.com/table',
        github: 'https://github.com/TanStack/table',
        npm: '@tanstack/svelte-table',
        type: 'Headless table primitives (multi-framework)',
        approach: 'Framework-agnostic core + per-framework adapter',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: false,
                note: '`@tanstack/svelte-table@8.21.3` peerDependency is `svelte: ^4.0.0 || ^3.49.0`. Svelte 5 requires the community drop-in `tanstack-table-8-svelte-5` (peer `svelte: ^5`).'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Headless Rendering', us: true, them: true },
            { name: 'Sorting', us: true, them: true },
            { name: 'Column Filters', us: true, them: true },
            { name: 'Global Filter', us: 'addTableFilter plugin', them: true },
            { name: 'Pagination', us: true, them: true },
            { name: 'Group By', us: 'addGroupBy plugin', them: true },
            { name: 'Expanded / Sub-Rows', us: 'addExpandedRows + addSubRows', them: true },
            { name: 'Row Selection', us: 'addSelectedRows plugin', them: true },
            { name: 'Column Resizing', us: 'addResizedColumns plugin', them: true },
            {
                name: 'Column Ordering',
                us: 'addColumnOrder plugin',
                them: 'Drag-and-drop reordering'
            },
            { name: 'Column Visibility', us: 'addHiddenColumns plugin', them: true },
            { name: 'Column Pinning', us: false, them: true },
            { name: 'Row Pinning', us: false, them: true },
            {
                name: 'Virtualization',
                us: 'addVirtualScroll plugin',
                them: 'Integrated (incl. virtualized infinite scroll)'
            },
            { name: 'Editable Data', us: 'createRender(EditableCell)', them: 'Documented pattern' },
            {
                name: 'API Style',
                us: 'Svelte stores + plugin builders',
                them: 'Framework-agnostic core ported to each adapter'
            },
            { name: 'GitHub Stars', us: 'Smaller community', them: '28k+' },
            { name: 'Licence', us: 'MIT', them: 'MIT' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Officially supports Svelte 5 today via the package peer dependency',
            'API designed against Svelte 5 patterns — runes, stores, snippets — not ported from a React-shaped core'
        ],
        prosThem: [
            'Battle-tested at scale across React, Vue, Solid, Svelte, Qwik, Angular, and Lit',
            'Massive ecosystem (~28k GitHub stars) and rich third-party tooling',
            'Column pinning, row pinning, and virtualized infinite scroll built into the core',
            'Cross-framework knowledge transfer — same mental model in every adapter'
        ],
        consUs: [...shared.consUs, 'No column pinning or row pinning yet — open feature requests'],
        consThem: [
            'Official `@tanstack/svelte-table` adapter does not list Svelte 5 in its peer dependencies as of v8.21.3',
            'Svelte 5 users rely on the community drop-in `tanstack-table-8-svelte-5` (maintained by a Svelte core team member, but separate package)',
            'API is a port of the framework-agnostic core — still feels secondhand in Svelte',
            'Heavier mental overhead juggling core types + adapter types'
        ],
        verdict:
            'Choose TanStack Table when you need the same primitive across multiple frameworks, or when column pinning is a hard requirement today. Choose @humanspeak/svelte-headless-table when first-class Svelte 5 support — straight from the package peer dependency, not via a community drop-in — matters more than cross-framework reach.',
        keywords: [
            'tanstack table',
            'tanstack svelte table',
            'tanstack table svelte 5',
            'svelte headless table',
            'tanstack table vs svelte headless table'
        ]
    },
    {
        slug: 'vs-vincjo-datatables',
        name: '@vincjo/datatables',
        tagline: 'Svelte 5-native datatable toolkit vs plugin-composed primitive',
        description:
            '@vincjo/datatables is an actively maintained Svelte 5-native headless toolkit for datatables — pagination, filter, sort, selection, lazy-loading. @humanspeak/svelte-headless-table covers the same surface as composable plugins plus group-by, expanded rows, sub-rows, column resize / reorder / hide, and a virtual-scroll plugin.',
        website: 'https://vincjo.fr/datatables',
        github: 'https://github.com/vincjo/datatables',
        npm: '@vincjo/datatables',
        type: 'Headless datatable toolkit',
        approach: 'Data handler + slot-driven table HTML you write yourself',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: true,
                note: '`@vincjo/datatables@2.8.0` peerDependency is `svelte: ^5.16.0` — Svelte 5 only.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Headless Rendering', us: true, them: true },
            { name: 'Sorting', us: true, them: true },
            { name: 'Column Filters', us: true, them: true },
            { name: 'Global Filter', us: true, them: true },
            { name: 'Pagination', us: true, them: true },
            {
                name: 'Server-Side / Lazy Mode',
                us: 'BYO — store handles the fetch',
                them: 'First-class lazy-loading mode'
            },
            { name: 'Row Selection', us: true, them: true },
            { name: 'Group By', us: 'addGroupBy plugin', them: false },
            { name: 'Sub-Rows / Expansion', us: 'addExpandedRows + addSubRows', them: false },
            { name: 'Column Resizing', us: 'addResizedColumns plugin', them: false },
            { name: 'Column Reordering', us: 'addColumnOrder plugin', them: false },
            { name: 'Hidden Columns', us: 'addHiddenColumns plugin', them: false },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: false },
            { name: 'GitHub Stars', us: 'Smaller community', them: '~585' },
            { name: 'Licence', us: 'MIT', them: 'MIT' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Group-by, expansion, column reorder / resize / hide, and virtual scroll are first-class plugins',
            'Cell renderers are real Svelte components — embed charts, action menus, status pills',
            'Reactive store-based view model — fits any state library, no special "handler" abstraction'
        ],
        prosThem: [
            'First-class lazy-loading / server-driven sort + filter + paginate handler',
            'Smaller surface to learn — pagination, filter, sort, selection covers most CRUD UIs',
            'Strong out-of-box ergonomics for table-as-form patterns'
        ],
        consUs: [...shared.consUs, 'No built-in server-side handler — you wire the fetch yourself'],
        consThem: [
            'No group-by, sub-rows, column reorder / resize / hide, or virtual scroll',
            'Smaller plugin surface — long-tail table features need DIY implementation'
        ],
        verdict:
            'Choose @vincjo/datatables when your needs are sort + filter + paginate + select (especially with a server-driven backend) and the smaller surface area is a feature, not a limitation. Choose @humanspeak/svelte-headless-table when you need group-by, true virtual scroll, column resize / reorder, or sub-row hierarchies.',
        keywords: [
            '@vincjo/datatables',
            'vincjo datatables',
            'svelte 5 datatable',
            'svelte server-side datatable',
            'svelte lazy-loading table'
        ]
    },
    {
        slug: 'vs-svelte-table',
        name: 'svelte-table',
        tagline: 'Minimal sortable table vs full plugin suite',
        description:
            'svelte-table (by dasDaniel) is a small, actively maintained headless table component with sortable headers, filters, search, custom cell rendering, and row select / expand. @humanspeak/svelte-headless-table gives up the single-component API in exchange for plugin composition that covers the long-tail features svelte-table does not.',
        website: 'https://github.com/dasDaniel/svelte-table',
        github: 'https://github.com/dasDaniel/svelte-table',
        npm: 'svelte-table',
        type: 'Headless table component',
        approach: 'Single `<SvelteTable>` component with extensive className + render props',
        features: [
            {
                name: 'Latest Version',
                us: '6.0.6',
                them: '0.6.5 (Jul 2025)'
            },
            {
                name: 'Svelte 5 Native',
                us: true,
                them: 'Not declared',
                note: '`svelte-table@0.6.5` ships no `peerDependencies` field; flexibility is up to the runtime.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Headless Rendering', us: true, them: true },
            { name: 'Sorting', us: true, them: true },
            { name: 'Column Filters', us: true, them: true },
            { name: 'Search', us: 'addTableFilter plugin', them: true },
            { name: 'Row Selection', us: 'addSelectedRows plugin', them: true },
            { name: 'Row Expanding', us: 'addExpandedRows plugin', them: true },
            { name: 'Pagination', us: 'addPagination plugin', them: false },
            { name: 'Group By', us: 'addGroupBy plugin', them: false },
            { name: 'Sub-Rows / Tree Data', us: 'addSubRows plugin', them: false },
            { name: 'Column Resizing', us: 'addResizedColumns plugin', them: false },
            { name: 'Column Reordering', us: 'addColumnOrder plugin', them: false },
            { name: 'Hidden Columns', us: 'addHiddenColumns plugin', them: false },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: false },
            {
                name: 'Custom Cell Renderers',
                us: 'createRender(Component)',
                them: 'Components or functions'
            },
            { name: 'GitHub Stars', us: 'Smaller community', them: '~560' },
            { name: 'Licence', us: 'MIT', them: 'MIT' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Pagination, group-by, sub-rows, column resize / reorder, and virtual scroll are first-class plugins',
            'Hidden columns are a runtime setting, not a re-render gymnastics exercise'
        ],
        prosThem: [
            'Single-component API — drop in a `<SvelteTable>` and pass props',
            'Tiny bundle footprint',
            'Actively maintained — latest release July 2025',
            'Friendly first-time experience for simple sortable tables'
        ],
        consUs: [...shared.consUs, 'Not the fastest path to a "just a sortable table" prototype'],
        consThem: [
            'No pagination, group-by, sub-rows, column resize, or virtual scroll',
            'Single-component API limits markup customisation beyond `className*` props',
            'No declared Svelte 5 peer-dependency — flexibility is implicit, not contractual'
        ],
        verdict:
            'Choose svelte-table when you want a single drop-in component for a sortable, filterable, selectable table with minimal ceremony. Choose @humanspeak/svelte-headless-table when you need pagination, group-by, sub-rows, column resize / reorder, virtual scroll, or any feature beyond what a one-component API can express.',
        keywords: [
            'svelte-table',
            'dasDaniel svelte-table',
            'svelte sortable table',
            'svelte simple table',
            'svelte minimal table component'
        ]
    },
    {
        slug: 'vs-flowbite-svelte-datatable',
        name: 'Flowbite Svelte Datatable',
        tagline: 'Tailwind-styled Flowbite datatable vs design-system-agnostic headless',
        description:
            '@flowbite-svelte-plugins/datatable is an advanced datatable plugin for the Flowbite Svelte design system, built against Svelte 5 + Tailwind 4. @humanspeak/svelte-headless-table is design-system-agnostic — drop it into Flowbite, shadcn-svelte, bits-ui, or your own CSS without fighting class names.',
        website: 'https://github.com/shinokada/flowbite-svelte-plugins',
        github: 'https://github.com/shinokada/flowbite-svelte-plugins',
        npm: '@flowbite-svelte-plugins/datatable',
        type: 'Tailwind-styled datatable plugin',
        approach: 'Pre-styled component bound to the Flowbite Svelte design system',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: true,
                note: '`@flowbite-svelte-plugins/datatable@0.4.1` peerDependencies: `svelte: ^5.0.0`, `tailwindcss: ^4.1.4`.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Headless Rendering',
                us: true,
                them: false,
                note: 'Plugin renders Flowbite-styled table chrome; intended to be visually consistent with the Flowbite Svelte ecosystem.'
            },
            {
                name: 'Design System Lock-in',
                us: 'None — drop into any CSS',
                them: 'Tied to Flowbite Svelte + Tailwind 4'
            },
            { name: 'Sorting', us: true, them: true },
            { name: 'Filtering', us: true, them: true },
            { name: 'Pagination', us: true, them: true },
            { name: 'Group By', us: 'addGroupBy plugin', them: 'Not documented' },
            {
                name: 'Sub-Rows / Expansion',
                us: 'addExpandedRows + addSubRows',
                them: 'Not documented'
            },
            { name: 'Column Resizing', us: 'addResizedColumns plugin', them: 'Not documented' },
            { name: 'Column Reordering', us: 'addColumnOrder plugin', them: 'Not documented' },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: 'Not documented' },
            { name: 'Licence', us: 'MIT', them: 'MIT' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Bring your own design system — Flowbite, shadcn-svelte, bits-ui, or hand-rolled CSS all work',
            'Plugin set covers the long tail (group-by, virtual scroll, column resize / reorder) Flowbite Datatable does not document'
        ],
        prosThem: [
            'Visually consistent with the rest of a Flowbite Svelte UI out of the box',
            'Pre-styled — no Tailwind utility classes to write yourself',
            'Single-import experience inside Flowbite-based apps'
        ],
        consUs: [...shared.consUs, 'No prebuilt Flowbite-styled chrome — you write the markup'],
        consThem: [
            'Requires Tailwind 4 + the Flowbite Svelte design system to integrate cleanly',
            'Visual style is tied to Flowbite — overriding the look means fighting the design system',
            'Plugin is early-stage (v0.4.1) — feature coverage and stability are still maturing'
        ],
        verdict:
            'Choose @flowbite-svelte-plugins/datatable when you are already shipping a Flowbite Svelte UI and want the datatable to match. Choose @humanspeak/svelte-headless-table when your app uses a different design system (or none), or when you need the long-tail features the Flowbite plugin does not yet ship.',
        keywords: [
            'flowbite svelte datatable',
            'flowbite-svelte-plugins',
            'svelte tailwind datatable',
            'flowbite table',
            'svelte 5 styled datatable'
        ]
    },
    {
        slug: 'vs-ag-grid',
        name: 'AG Grid',
        tagline: 'Enterprise multi-framework grid vs Svelte 5-native headless primitive',
        description:
            'AG Grid is the gold standard for enterprise data grids — pivot tables, master/detail, range selection, integrated charts, server-side row model. It officially supports React, Angular, and Vue; Svelte usage is via the unofficial community wrapper `ag-grid-svelte`. @humanspeak/svelte-headless-table is a focused, MIT-licensed, Svelte 5-native headless primitive that stays out of your markup and your budget.',
        website: 'https://www.ag-grid.com',
        github: 'https://github.com/ag-grid/ag-grid',
        npm: 'ag-grid-community',
        type: 'Multi-framework enterprise grid',
        approach: 'Configuration-driven `ag-grid-community` core + framework wrappers',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: false,
                note: '`ag-grid-svelte@0.3.0` (unofficial community wrapper) peerDependency: `svelte: ^3`, `ag-grid-community: ^28 || ^29 || ^30`. Current `ag-grid-community` is v35 — the wrapper trails by five major versions.'
            },
            { name: 'First-Party Svelte Support', us: true, them: false },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Headless Rendering', us: true, them: false },
            { name: 'Sorting', us: true, them: true },
            { name: 'Column Filters', us: true, them: 'Set / number / date filters' },
            { name: 'Pagination', us: true, them: true },
            {
                name: 'Group By',
                us: 'addGroupBy plugin',
                them: 'Row + value grouping (Enterprise)'
            },
            { name: 'Pivot Tables', us: false, them: 'Enterprise only' },
            { name: 'Tree Data / Sub-Rows', us: true, them: 'Enterprise only' },
            { name: 'Master / Detail', us: false, them: 'Enterprise only' },
            { name: 'Row Selection', us: true, them: true },
            { name: 'Column Resizing', us: true, them: true },
            { name: 'Column Reordering', us: true, them: true },
            {
                name: 'Virtual Scroll',
                us: 'addVirtualScroll plugin',
                them: 'First-class row virtualisation'
            },
            {
                name: 'Server-Side Row Model',
                us: 'BYO — store handles fetch',
                them: 'Enterprise only'
            },
            { name: 'Range / Cell Selection', us: false, them: 'Enterprise only' },
            { name: 'Licence', us: 'MIT', them: 'Community MIT, Enterprise commercial' },
            { name: 'GitHub Stars', us: 'Smaller community', them: '~15k' }
        ],
        prosUs: [
            ...shared.prosUs,
            'No licensing tier — every plugin is MIT, no surprise paid features',
            'First-party Svelte 5 support via the package peer dependency — no community wrapper required',
            'Tree-shakeable — pay only for the plugins you import'
        ],
        prosThem: [
            'Industry-leading feature set — pivot, master/detail, range selection, integrated charts',
            'Server-Side Row Model handles infinite / large datasets through the framework, not the app',
            'Enterprise support contracts available with SLAs',
            'Battle-tested in financial, analytics, and BI dashboards at very large scale'
        ],
        consUs: [
            ...shared.consUs,
            'No pivot tables, range selection, or master/detail out of the box',
            'No managed server-side row model — you wire data fetching yourself'
        ],
        consThem: [
            'No first-party Svelte integration; the unofficial `ag-grid-svelte` wrapper is stuck on Svelte 3 + AG Grid v28–30 (current AG Grid is v35)',
            'Pivot, tree data, master/detail, and server-side row model are gated behind the paid Enterprise licence',
            'Heavy bundle for use cases that don’t need pivot / charts',
            'Theming requires AG Grid theme APIs — not a Tailwind / shadcn-svelte drop-in'
        ],
        verdict:
            'Choose AG Grid when your product centres on heavyweight enterprise grid features — pivots, master/detail, range selection, server-side row model — and the Enterprise budget fits. Choose @humanspeak/svelte-headless-table when you want first-party Svelte 5 support, MIT licensing across every feature, and a markup surface you control.',
        keywords: [
            'ag-grid svelte',
            'ag-grid alternative',
            'ag-grid enterprise',
            'svelte enterprise data grid',
            'ag-grid community'
        ]
    },
    {
        slug: 'vs-handsontable',
        name: 'Handsontable',
        tagline: 'JavaScript spreadsheet (React/Angular/Vue) vs Svelte 5-native data table',
        description:
            'Handsontable is a JavaScript spreadsheet component — cell formulas, range selection, copy/paste from Excel — with first-party React, Angular, and Vue wrappers. There is no first-party Svelte integration; Svelte users mount it on a div ref like a vanilla JS widget. @humanspeak/svelte-headless-table is a focused Svelte 5-native data-table primitive — not a spreadsheet.',
        website: 'https://handsontable.com',
        github: 'https://github.com/handsontable/handsontable',
        npm: 'handsontable',
        type: 'JavaScript spreadsheet component',
        approach: 'Spreadsheet UI with Excel-compatible interactions, mounted on a DOM node',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: false,
                note: 'Handsontable advertises itself as a Data Grid for React, Angular, and Vue — no first-party Svelte wrapper exists on npm.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Headless Rendering', us: true, them: false },
            { name: 'Sorting', us: true, them: true },
            { name: 'Filtering', us: true, them: true },
            {
                name: 'Pagination',
                us: true,
                them: false,
                note: 'Spreadsheets scroll the full sheet; pagination is not a typical pattern.'
            },
            { name: 'Inline Cell Editing', us: 'createRender(EditableCell)', them: 'First-class' },
            { name: 'Cell Formulas', us: false, them: 'HyperFormula engine' },
            { name: 'Range / Cell Selection', us: false, them: true },
            { name: 'Copy / Paste from Excel', us: false, them: true },
            { name: 'Merged Cells', us: false, them: true },
            { name: 'Frozen Rows + Cols', us: 'BYO via CSS', them: true },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: true },
            { name: 'Group By', us: 'addGroupBy plugin', them: false },
            { name: 'GitHub Stars', us: 'Smaller community', them: '~22k' },
            { name: 'Licence', us: 'MIT', them: 'Non-commercial free / Commercial paid' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Truly headless — drop into Tailwind / shadcn-svelte / bits-ui without fighting a theme',
            'MIT — no commercial licence required for commercial use'
        ],
        prosThem: [
            'Excel-like interactions out of the box — formulas, range selection, copy/paste from Excel',
            'HyperFormula engine for spreadsheet-grade calculation',
            'Excellent fit for data-entry-heavy admin UIs and CRUD spreadsheets',
            'Long history (since 2012) with active commercial support'
        ],
        consUs: [
            ...shared.consUs,
            'Not a spreadsheet — no formulas, range selection, or Excel paste'
        ],
        consThem: [
            'No first-party Svelte integration — mount on a div ref like a vanilla JS widget',
            'Commercial use requires a paid licence',
            'Heavy bundle for table-only use cases',
            'CSS is theme-locked; integrating with a design system means custom theme work'
        ],
        verdict:
            'Choose Handsontable when your product is fundamentally a spreadsheet — formulas, range selection, Excel-style interactions are core to the workflow — and you accept the commercial licence + DIY Svelte mount. Choose @humanspeak/svelte-headless-table when you are displaying rows of data, not building a spreadsheet: lighter, MIT, Svelte 5-native.',
        keywords: [
            'handsontable svelte',
            'svelte spreadsheet',
            'handsontable alternative',
            'svelte data grid',
            'svelte excel-like table'
        ]
    }
]

export function getCompetitor(slug: string): Competitor | undefined {
    return competitors.find((c) => c.slug === slug)
}
