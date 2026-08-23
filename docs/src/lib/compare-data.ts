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
        tagline: 'A focused Svelte table API vs a larger multi-framework ecosystem',
        description:
            'Both libraries are MIT-licensed, headless, TypeScript-first, and native to Svelte 5. TanStack Table v9 provides a runes-native Svelte adapter over a high-performance core shared across ten frameworks. @humanspeak/svelte-headless-table is the narrower option: its public API, documentation, stores, plugin state, and component renderers are designed only for Svelte. The choice is focus and familiarity versus ecosystem breadth and advanced features — not Svelte 5 support or licensing.',
        website: 'https://tanstack.com/table',
        github: 'https://github.com/TanStack/table',
        npm: '@tanstack/svelte-table',
        type: 'Headless table primitives (multi-framework)',
        approach: 'Framework-agnostic core + per-framework adapter',
        features: [
            {
                name: 'Svelte 5 Support',
                us: true,
                them: true,
                note: 'Both packages support Svelte 5 natively. `@tanstack/svelte-table@9.1.2` declares `svelte: ^5.0.0` and uses runes with Svelte-aware atom bindings.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Headless Rendering',
                us: true,
                them: true,
                note: 'Both libraries leave markup and styling entirely to the application.'
            },
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
                them: 'Column-order state; pair with a DnD library for drag controls'
            },
            { name: 'Column Visibility', us: 'addHiddenColumns plugin', them: true },
            { name: 'Column Pinning', us: false, them: true },
            { name: 'Row Pinning', us: false, them: true },
            {
                name: 'Virtualization',
                us: 'addVirtualScroll plugin',
                them: 'Pair with TanStack Virtual or another virtualizer'
            },
            { name: 'Editable Data', us: 'createRender(EditableCell)', them: 'Documented pattern' },
            {
                name: 'API Style',
                us: 'Svelte stores + named plugin builders + pluginStates',
                them: 'TanStack Store atoms + framework adapter'
            },
            { name: 'GitHub Stars', us: 'Smaller community', them: '28k+' },
            {
                name: 'Licence',
                us: 'MIT',
                them: 'MIT',
                note: 'Licence is parity, not a differentiator.'
            }
        ],
        prosUs: [
            'Svelte-only public API and documentation — there is no framework-neutral guide to translate into Svelte concepts',
            'Table behaviours are named plugins on one createTable call, with their stores grouped under pluginStates',
            'Cell renderers are ordinary Svelte components through createRender, and the view model exposes familiar Svelte stores',
            'Integrated addVirtualScroll plugin for semantic table virtualization without choosing and wiring a separate virtualizer'
        ],
        prosThem: [
            'Runes-native Svelte 5 adapter backed by TanStack Store atoms',
            'Battle-tested core shared across React, Vue, Solid, Svelte, Qwik, Angular, Lit, and other adapters',
            'Massive ecosystem (~28k GitHub stars) and rich third-party tooling',
            'Column pinning, row pinning, and a broader set of advanced table primitives',
            'Published large-table performance work and tree-shakable feature registration',
            'Cross-framework knowledge transfer — same mental model in every adapter'
        ],
        consUs: [
            'Much smaller community and third-party ecosystem',
            'No column pinning or row pinning yet — open feature requests',
            'No published large-table benchmark suite to compare with TanStack v9 claims',
            'Plugin order affects transformations and must be understood when composing complex tables'
        ],
        consThem: [
            'Framework-agnostic core plus a Svelte adapter introduces more concepts and type boundaries than a Svelte-only API',
            'Broader feature surface can mean more API to learn when you only need a focused data table',
            'Virtualization requires choosing and integrating TanStack Virtual or another virtualizer'
        ],
        verdict:
            'TanStack Table is the stronger default when you need pinning, a large ecosystem, published performance work, or one table model across frameworks. Choose @humanspeak/svelte-headless-table when your application is Svelte-only, its focused feature set covers the job, and you prefer named plugins, pluginStates, Svelte stores, and Svelte component renderers over adopting the broader TanStack model. Both are native to Svelte 5, headless, TypeScript-first, and MIT.',
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
        tagline: 'Server-friendly table handlers vs a broader plugin-composed table model',
        description:
            'Both libraries are MIT-licensed, TypeScript-first, and native to Svelte 5. @vincjo/datatables centres on a TableHandler with concise client- and server-side APIs plus optional prebuilt controls. @humanspeak/svelte-headless-table uses named plugins and a store-based view model to cover a broader set of structural table behaviours. Vincjo is the more direct fit for server-driven CRUD tables; ours is the stronger fit for grouped, hierarchical, resizable, reorderable, or virtualized tables.',
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
                note: '`@vincjo/datatables@2.8.1` declares `svelte: ^5.56.1` — both packages target Svelte 5.'
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
            { name: 'Hidden Columns', us: 'addHiddenColumns plugin', them: true },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: false },
            { name: 'GitHub Stars', us: 'Smaller community', them: '~585' },
            {
                name: 'Licence',
                us: 'MIT',
                them: 'MIT',
                note: 'Licence is parity, not a differentiator.'
            }
        ],
        prosUs: [
            'Group-by, expansion, column reorder / resize / hide, and virtual scroll are first-class plugins',
            'Named plugin stores expose each behaviour through one pluginStates object',
            'Cell renderers are ordinary Svelte components through createRender'
        ],
        prosThem: [
            'First-class lazy-loading / server-driven sort + filter + paginate handler',
            'Smaller surface to learn for common sort, filter, paginate, and select workflows',
            'Optional Datatable, Search, RowsPerPage, RowCount, and Pagination components reduce setup',
            'Rune-backed handler properties and concise setter methods minimise boilerplate'
        ],
        consUs: [
            'No dedicated server-side handler — you wire plugin state into data fetching yourself',
            'More concepts and markup to learn for a conventional CRUD table',
            'Plugin order affects row transformations'
        ],
        consThem: [
            'No documented group-by, sub-row hierarchy, column reorder / resize, or virtual scroll',
            'Smaller plugin surface — long-tail table features need DIY implementation'
        ],
        verdict:
            'Choose @vincjo/datatables for a conventional sort, filter, paginate, and select table — especially when the server owns the data operations or its optional controls save useful setup. Choose @humanspeak/svelte-headless-table when the table needs grouping, hierarchical rows, integrated virtual scrolling, or column resize and reorder. Svelte 5, TypeScript, headless markup, hidden columns, and MIT licensing are not reasons to choose between them.',
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
        tagline: 'A drop-in sortable component vs a composable table toolkit',
        description:
            'svelte-table by dasDaniel is a small, MIT-licensed component for sorting, filtering, searching, selecting, and expanding rows. Its last release was v0.6.5 in July 2025 and it declares no Svelte peer dependency. @humanspeak/svelte-headless-table requires more setup, but provides explicit Svelte 5 support, full markup ownership, and plugins for pagination, grouping, hierarchical data, column operations, and virtual scrolling.',
        website: 'https://github.com/dasDaniel/svelte-table',
        github: 'https://github.com/dasDaniel/svelte-table',
        npm: 'svelte-table',
        type: 'Headless table component',
        approach: 'Single `<SvelteTable>` component with extensive className + render props',
        features: [
            {
                name: 'Svelte 5 Support',
                us: true,
                them: 'Not declared',
                note: '`svelte-table@0.6.5` ships no `peerDependencies` field; flexibility is up to the runtime.'
            },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Markup Ownership',
                us: 'Application owns the complete table tree',
                them: 'Component-owned markup with slots, renderers, and class props'
            },
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
            {
                name: 'Licence',
                us: 'MIT',
                them: 'MIT',
                note: 'Licence is parity, not a differentiator.'
            }
        ],
        prosUs: [
            'Pagination, group-by, sub-rows, column resize / reorder, and virtual scroll are first-class plugins',
            'The application owns every table element rather than styling component-owned markup through class props',
            'Explicit Svelte 5 peer dependency and actively maintained Svelte 5 implementation'
        ],
        prosThem: [
            'Single-component API — drop in a `<SvelteTable>` and pass props',
            'Tiny bundle footprint',
            'Built-in sorting, filters, search, selection, and expandable content cover many small tables',
            'Components or functions can render custom cell content'
        ],
        consUs: [
            'More setup and concepts than a single component',
            'Not the fastest path to a simple sortable-table prototype',
            'Smaller community despite the broader feature surface'
        ],
        consThem: [
            'No pagination, group-by, sub-rows, column resize, or virtual scroll',
            'Single-component API limits markup customisation beyond `className*` props',
            'No declared Svelte 5 peer dependency — compatibility is implicit rather than contractual',
            'No release since July 2025'
        ],
        verdict:
            'Choose svelte-table when a tiny drop-in component with sorting, filtering, selection, and expandable content is enough and minimal setup matters most. Choose @humanspeak/svelte-headless-table when you need explicit Svelte 5 support, complete control of table markup, pagination, grouping, hierarchical rows, column resize or reorder, or virtual scrolling. TypeScript and MIT licensing are parity.',
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
        tagline: 'A ready-made Flowbite table vs complete markup and state control',
        description:
            '@flowbite-svelte-plugins/datatable is a Svelte 5 and Tailwind 4 component built for the Flowbite Svelte design system. It provides styled table chrome and practical datatable controls with little setup. @humanspeak/svelte-headless-table owns table state but renders no UI, making it a better foundation when the application must own every element or use another design system. Both are TypeScript-first and MIT-licensed.',
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
            { name: 'Row Selection', us: 'addSelectedRows plugin', them: true },
            { name: 'Prebuilt Table UI', us: false, them: 'Flowbite-styled component' },
            { name: 'Group By', us: 'addGroupBy plugin', them: 'Not documented' },
            {
                name: 'Sub-Rows / Expansion',
                us: 'addExpandedRows + addSubRows',
                them: 'Not documented'
            },
            { name: 'Column Resizing', us: 'addResizedColumns plugin', them: 'Not documented' },
            { name: 'Column Reordering', us: 'addColumnOrder plugin', them: 'Not documented' },
            { name: 'Virtual Scroll', us: 'addVirtualScroll plugin', them: 'Not documented' },
            {
                name: 'Licence',
                us: 'MIT',
                them: 'MIT',
                note: 'Licence is parity, not a differentiator.'
            }
        ],
        prosUs: [
            'Application owns every table element and can use any design system or CSS strategy',
            'Plugin set covers grouping, hierarchical rows, virtual scrolling, and column resize / reorder',
            'Cell content can be an ordinary Svelte component rather than a string-producing render callback'
        ],
        prosThem: [
            'Visually consistent with the rest of a Flowbite Svelte UI out of the box',
            'Prebuilt pagination, search, sorting, row selection, and table controls minimise setup',
            'Extensive simple-datatables options and render hooks for common datatable customisation',
            'Single-component experience inside Flowbite-based apps'
        ],
        consUs: [
            'No prebuilt chrome — you write the table markup, controls, and styles',
            'More setup than a ready-made Flowbite component',
            'Plugin order affects row transformations'
        ],
        consThem: [
            'Requires Tailwind 4 and is designed around the Flowbite Svelte visual system',
            'Component-owned markup offers less structural control than a headless view model',
            'No documented grouping, hierarchical rows, column resize / reorder, or virtual scrolling'
        ],
        verdict:
            'Choose Flowbite Svelte Datatable when the application already uses Flowbite and a styled, low-setup table is the goal. Choose @humanspeak/svelte-headless-table when you need complete markup ownership, another design system, Svelte component renderers, grouping, hierarchical rows, column operations, or integrated virtual scrolling. Svelte 5, TypeScript, sorting, filtering, pagination, selection, and MIT licensing are shared capabilities.',
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
