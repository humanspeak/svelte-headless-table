import type { NavSection } from '@humanspeak/docs-kit'
import {
    ArrowRightLeft,
    ArrowUpDown,
    BookOpen,
    Boxes,
    Columns3,
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
    SquareCheck,
    Table,
    Table2,
    WandSparkles,
    Zap
} from '@lucide/svelte'

export const docsSections: NavSection[] = [
    {
        title: 'Get Started',
        items: [
            { title: 'Overview', href: '/docs/getting-started/overview', icon: Info },
            { title: 'Quick Start', href: '/docs/getting-started/quick-start', icon: Rocket }
        ]
    },
    {
        title: 'API',
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
        title: 'Examples',
        items: [
            { title: 'Kitchen Sink', href: '/docs/examples/kitchen-sink', icon: Boxes },
            { title: 'Virtual Scroll', href: '/docs/examples/virtual-scroll', icon: ArrowUpDown }
        ]
    },
    {
        title: 'Guides',
        items: [{ title: 'shadcn-svelte', href: '/docs/guides/shadcn-svelte', icon: BookOpen }]
    }
]
