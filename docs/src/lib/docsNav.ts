import type { NavSection } from '@humanspeak/docs-kit'
import {
    ArrowRightLeft,
    ArrowUpDown,
    BookOpen,
    Box,
    Columns3,
    Compass,
    Database,
    EyeOff,
    FileOutput,
    Filter,
    GitFork,
    GitMerge,
    Grid2x2,
    GripHorizontal,
    Info,
    Layers,
    LayoutGrid,
    List,
    Minimize2,
    Move,
    Network,
    Puzzle,
    Rocket,
    Search,
    Shapes,
    Sparkles,
    SquareCheck,
    Table,
    Table2,
    WandSparkles,
    Zap
} from '@lucide/svelte'

/**
 * Single source of truth for the top header links used by every layout
 * (`HeaderV2 nav={...}` on /, /docs, /examples, /compare). Keeping the
 * literal here means a new top-level surface gets added in one place
 * and the rest of the site picks it up automatically.
 */
export const headerNav: { label: string; href: string }[] = [
    { label: 'docs', href: '/docs' },
    { label: 'examples', href: '/examples' },
    { label: 'compare', href: '/compare' }
]

export const docsSections: NavSection[] = [
    {
        title: 'Get Started',
        icon: Rocket,
        items: [
            { title: 'Overview', href: '/docs/getting-started/overview', icon: Info },
            { title: 'Quick Start', href: '/docs/getting-started/quick-start', icon: Rocket }
        ]
    },
    {
        title: 'API',
        icon: BookOpen,
        items: [
            { title: 'createTable', href: '/docs/api/create-table', icon: Table },
            { title: 'createColumns', href: '/docs/api/create-columns', icon: Columns3 },
            { title: 'createViewModel', href: '/docs/api/create-view-model', icon: GitFork },
            { title: 'Table', href: '/docs/api/table', icon: List },
            { title: 'TableViewModel', href: '/docs/api/table-view-model', icon: GitMerge },
            { title: 'TableState', href: '/docs/api/table-state', icon: Database },
            { title: 'Render', href: '/docs/api/render', icon: Shapes },
            { title: 'createRender', href: '/docs/api/create-render', icon: WandSparkles },
            { title: 'Subscribe', href: '/docs/api/subscribe', icon: Zap },
            { title: 'HeaderRow', href: '/docs/api/header-row', icon: GripHorizontal },
            { title: 'HeaderCell', href: '/docs/api/header-cell', icon: LayoutGrid },
            { title: 'BodyRow', href: '/docs/api/body-row', icon: List },
            { title: 'BodyCell', href: '/docs/api/body-cell', icon: Table2 }
        ]
    },
    {
        title: 'Plugins',
        icon: Puzzle,
        items: [
            { title: 'Overview', href: '/docs/plugins/overview', icon: Puzzle },
            { title: 'addSortBy', href: '/docs/plugins/add-sort-by', icon: ArrowUpDown },
            {
                title: 'addColumnFilters',
                href: '/docs/plugins/add-column-filters',
                icon: Filter
            },
            { title: 'addTableFilter', href: '/docs/plugins/add-table-filter', icon: Search },
            {
                title: 'addColumnOrder',
                href: '/docs/plugins/add-column-order',
                icon: ArrowRightLeft
            },
            {
                title: 'addHiddenColumns',
                href: '/docs/plugins/add-hidden-columns',
                icon: EyeOff
            },
            { title: 'addPagination', href: '/docs/plugins/add-pagination', icon: BookOpen },
            { title: 'addSubRows', href: '/docs/plugins/add-sub-rows', icon: Network },
            { title: 'addGroupBy', href: '/docs/plugins/add-group-by', icon: Layers },
            {
                title: 'addExpandedRows',
                href: '/docs/plugins/add-expanded-rows',
                icon: Minimize2
            },
            {
                title: 'addSelectedRows',
                href: '/docs/plugins/add-selected-rows',
                icon: SquareCheck
            },
            {
                title: 'addResizedColumns',
                href: '/docs/plugins/add-resized-columns',
                icon: Move
            },
            { title: 'addGridLayout', href: '/docs/plugins/add-grid-layout', icon: Grid2x2 },
            { title: 'addFlatten', href: '/docs/plugins/add-flatten', icon: Layers },
            { title: 'addDataExport', href: '/docs/plugins/add-data-export', icon: FileOutput },
            {
                title: 'addVirtualScroll',
                href: '/docs/plugins/add-virtual-scroll',
                icon: ArrowUpDown
            }
        ]
    },
    {
        title: 'Guides',
        icon: Compass,
        items: [{ title: 'shadcn-svelte', href: '/docs/guides/shadcn-svelte', icon: BookOpen }]
    }
]

/**
 * External community / sibling-project links surfaced at the bottom of
 * `SidebarV2`. Mirrors the `motionLoveAndRespect` list in
 * `svelte-motion/docs/src/lib/docsNav.ts` — the "Things we love and respect"
 * cluster that nudges visitors toward neighboring tools.
 */
export const tableLoveAndRespect = [
    { title: 'Beye.ai', href: 'https://beye.ai', icon: Sparkles, external: true },
    {
        title: 'shadcn-svelte',
        href: 'https://www.shadcn-svelte.com',
        icon: Box,
        external: true
    }
]
