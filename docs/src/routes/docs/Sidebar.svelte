<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { onMount } from 'svelte'

    const { currentPath } = $props()

    type NavItem = {
        title: string
        href: string
        icon: string
        external?: boolean
    }

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])

    // Navigation aligned with current documentation structure
    let navigation = $derived([
        {
            title: 'Get Started',
            items: [
                {
                    title: 'Overview',
                    href: '/docs/getting-started/overview',
                    icon: 'fa-solid fa-circle-info'
                },
                {
                    title: 'Quick Start',
                    href: '/docs/getting-started/quick-start',
                    icon: 'fa-solid fa-rocket'
                }
            ]
        },
        {
            title: 'API',
            items: [
                { title: 'createTable', href: '/docs/api/create-table', icon: 'fa-solid fa-table' },
                {
                    title: 'createColumns',
                    href: '/docs/api/create-columns',
                    icon: 'fa-solid fa-columns'
                },
                {
                    title: 'createViewModel',
                    href: '/docs/api/create-view-model',
                    icon: 'fa-solid fa-diagram-project'
                },
                { title: 'Table', href: '/docs/api/table', icon: 'fa-solid fa-list' },
                {
                    title: 'TableViewModel',
                    href: '/docs/api/table-view-model',
                    icon: 'fa-solid fa-diagram-predecessor'
                },
                {
                    title: 'TableState',
                    href: '/docs/api/table-state',
                    icon: 'fa-solid fa-database'
                },
                { title: 'Render', href: '/docs/api/render', icon: 'fa-solid fa-shapes' },
                {
                    title: 'createRender',
                    href: '/docs/api/create-render',
                    icon: 'fa-solid fa-wand-magic-sparkles'
                },
                { title: 'Subscribe', href: '/docs/api/subscribe', icon: 'fa-solid fa-bolt' },
                {
                    title: 'HeaderRow',
                    href: '/docs/api/header-row',
                    icon: 'fa-solid fa-grip-lines'
                },
                {
                    title: 'HeaderCell',
                    href: '/docs/api/header-cell',
                    icon: 'fa-solid fa-table-cells-header'
                },
                { title: 'BodyRow', href: '/docs/api/body-row', icon: 'fa-solid fa-list-ul' },
                { title: 'BodyCell', href: '/docs/api/body-cell', icon: 'fa-solid fa-table-cells' }
            ]
        },
        {
            title: 'Plugins',
            items: [
                {
                    title: 'Overview',
                    href: '/docs/plugins/overview',
                    icon: 'fa-solid fa-puzzle-piece'
                },
                { title: 'addSortBy', href: '/docs/plugins/add-sort-by', icon: 'fa-solid fa-sort' },
                {
                    title: 'addColumnFilters',
                    href: '/docs/plugins/add-column-filters',
                    icon: 'fa-solid fa-filter'
                },
                {
                    title: 'addTableFilter',
                    href: '/docs/plugins/add-table-filter',
                    icon: 'fa-solid fa-magnifying-glass'
                },
                {
                    title: 'addColumnOrder',
                    href: '/docs/plugins/add-column-order',
                    icon: 'fa-solid fa-arrow-right-arrow-left'
                },
                {
                    title: 'addHiddenColumns',
                    href: '/docs/plugins/add-hidden-columns',
                    icon: 'fa-solid fa-eye-slash'
                },
                {
                    title: 'addPagination',
                    href: '/docs/plugins/add-pagination',
                    icon: 'fa-solid fa-pager'
                },
                {
                    title: 'addSubRows',
                    href: '/docs/plugins/add-sub-rows',
                    icon: 'fa-solid fa-sitemap'
                },
                {
                    title: 'addGroupBy',
                    href: '/docs/plugins/add-group-by',
                    icon: 'fa-solid fa-object-group'
                },
                {
                    title: 'addExpandedRows',
                    href: '/docs/plugins/add-expanded-rows',
                    icon: 'fa-solid fa-down-left-and-up-right-to-center'
                },
                {
                    title: 'addSelectedRows',
                    href: '/docs/plugins/add-selected-rows',
                    icon: 'fa-solid fa-check-square'
                },
                {
                    title: 'addResizedColumns',
                    href: '/docs/plugins/add-resized-columns',
                    icon: 'fa-solid fa-up-down-left-right'
                },
                {
                    title: 'addGridLayout',
                    href: '/docs/plugins/add-grid-layout',
                    icon: 'fa-solid fa-border-all'
                },
                {
                    title: 'addFlatten',
                    href: '/docs/plugins/add-flatten',
                    icon: 'fa-solid fa-layer-group'
                },
                {
                    title: 'addDataExport',
                    href: '/docs/plugins/add-data-export',
                    icon: 'fa-solid fa-file-export'
                },
                {
                    title: 'addVirtualScroll',
                    href: '/docs/plugins/add-virtual-scroll',
                    icon: 'fa-solid fa-arrows-up-down'
                }
            ]
        },
        {
            title: 'Examples',
            items: [
                {
                    title: 'Kitchen Sink',
                    href: '/docs/examples/kitchen-sink',
                    icon: 'fa-solid fa-cubes'
                },
                {
                    title: 'Virtual Scroll',
                    href: '/docs/examples/virtual-scroll',
                    icon: 'fa-solid fa-arrows-up-down'
                }
            ]
        },
        {
            title: 'Guides',
            items: [
                {
                    title: 'shadcn-svelte',
                    href: '/docs/guides/shadcn-svelte',
                    icon: 'fa-solid fa-book'
                }
            ]
        },
        {
            title: 'Love and Respect',
            items: [
                {
                    title: 'Beye.ai',
                    href: 'https://beye.ai',
                    icon: 'fa-solid fa-heart',
                    external: true
                }
            ]
        },
        ...(otherProjects.length > 0
            ? [
                  {
                      title: 'Other Projects',
                      items: otherProjects
                  }
              ]
            : [])
    ])

    onMount(async () => {
        try {
            const response = await fetch('/api/other-projects')
            if (!response.ok) {
                return
            }
            const projects: OtherProject[] = await response.json()

            // Convert to nav items format
            otherProjects = projects.map((project) => ({
                title: formatTitle(project.slug),
                href: project.url,
                icon: 'fa-solid fa-heart',
                external: true
            }))
        } catch (error) {
            console.error('Failed to load other projects:', error)
        }
    })

    function formatTitle(slug: string): string {
        return `/${slug.toLowerCase()}`
    }

    /**
     * @param {string} href
     * @returns {boolean}
     */
    function isActive(href: string) {
        const basePath = currentPath.split(/[?#]/)[0]
        if (href === '/docs') {
            // Only mark the root Docs link active for the exact page or when query/hash is present
            return (
                basePath === href ||
                currentPath.startsWith(`${href}?`) ||
                currentPath.startsWith(`${href}#`)
            )
        }
        // Exact match, same page with query/hash, or a true nested path ("href/...")
        return (
            basePath === href ||
            currentPath.startsWith(`${href}?`) ||
            currentPath.startsWith(`${href}#`) ||
            basePath.startsWith(`${href}/`)
        )
    }
</script>

<nav class="p-6">
    <div class="space-y-8">
        {#each navigation as section (section.title)}
            <div>
                <h3 class="mb-3 text-sm font-semibold tracking-wide text-text-primary uppercase">
                    {section.title}
                </h3>
                <ul class="space-y-1">
                    {#each section.items as item (item.href)}
                        <motion.li
                            whileHover={{ x: 2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                            <a
                                href={item.href}
                                target={item?.external ? '_blank' : undefined}
                                rel={item?.external ? 'noopener' : undefined}
                                class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
						     	{isActive(item.href)
                                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                                    : 'text-sidebar-foreground hover:bg-muted hover:text-text-primary'}"
                            >
                                {#if item.icon}
                                    <motion.span
                                        class="mr-3 inline-flex"
                                        whileHover={{ scale: 1.25 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    >
                                        <i
                                            class="{item.icon} fa-fw text-sm {isActive(item.href)
                                                ? 'text-sidebar-active-foreground'
                                                : 'text-text-muted group-hover:text-text-secondary'}"
                                        ></i>
                                    </motion.span>
                                {:else}
                                    <i
                                        class="fa-solid fa-arrow-right fa-fw mr-3 text-xs text-text-muted"
                                    ></i>
                                {/if}
                                {item.title}
                                {#if item?.external}
                                    <i
                                        class="fa-solid fa-arrow-up-right-from-square ml-2 text-xs opacity-50"
                                    ></i>
                                {/if}
                            </a>
                        </motion.li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</nav>
