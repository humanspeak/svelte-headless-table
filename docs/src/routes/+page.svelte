<script lang="ts">
    import { AnimatePresence, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import { FooterV2, HeaderV2, getBreadcrumbContext, getSeoContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import githubStats from '$lib/github-stats.json'
    import VirtualScrollSample from '$lib/components/home/VirtualScrollSample.svelte'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'
    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const packageStats = $derived(data.packageStats)

    // Live package stats come from the npm registry via +page.server.ts —
    // so `pnpm publish` updates the masthead/footer without a docs redeploy.
    const PKG_NAME = $derived(packageStats.name)
    const PKG_VERSION = $derived(packageStats.version)
    const TARBALL_KB = $derived(
        packageStats.tarballBytes !== null
            ? Math.round(packageStats.tarballBytes / 102.4) / 10
            : null
    )

    // Plugin count is stable enough to hardcode — bump when a new plugin
    // ships under `@humanspeak/svelte-headless-table/plugins`.
    const PLUGIN_COUNT = 15
    const STARS = githubStats?.stars ?? 200

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) breadcrumbContext.breadcrumbs = []

    const seoContext = getSeoContext()
    if (seoContext) {
        seoContext.title = 'Svelte Headless Table — Build Custom Data Tables for Svelte 5'
        seoContext.description =
            'A powerful, headless table library for Svelte 5 — composable sorting, filtering, pagination, grouping, selection, column resizing, sub-rows, and virtual scroll plugins. TypeScript-first, zero markup opinions.'
        seoContext.ogTitle = 'Svelte Headless Table'
        seoContext.ogTagline = 'Headless tables for Svelte 5.'
        seoContext.ogFeatures = ['Svelte 5 Runes', 'Headless', 'Plugin Composition', 'TypeScript']
        seoContext.ogSlug = 'home'
    }

    interface StatItem {
        k: string
        v: string
        sup?: string
        n: string
        ac?: boolean
    }
    const stats: StatItem[] = $derived([
        { k: 'plugins', v: String(PLUGIN_COUNT), n: 'composable, plug-and-play', ac: true },
        {
            k: 'tarball',
            v: TARBALL_KB !== null ? String(TARBALL_KB) : '—',
            sup: TARBALL_KB !== null ? 'kB' : undefined,
            n: 'packed (npm gz)'
        },
        { k: 'runtime deps', v: '4', n: 'all humanspeak first-party' },
        { k: 'licence', v: 'MIT', n: 'on GitHub' },
        { k: 'types', v: '100', sup: '%', n: 'TypeScript end-to-end', ac: true },
        { k: 'stars', v: String(STARS), n: 'GitHub' }
    ])

    interface Feature {
        title: string
        body: string
    }
    const features: Feature[] = [
        {
            title: 'Headless by Design',
            body: 'No markup, no styles, no opinions. You own the `<table>`. The library produces reactive row + column view models and stays out of the way.'
        },
        {
            title: 'Plugin Composition',
            body: `${PLUGIN_COUNT} plugins — sorting, column + table filters, pagination, sub-rows, group-by, expanded rows, selection, column reordering, hidden columns, column resizing, grid layout, flatten, data export, and virtual scroll — composed declaratively on a single \`createTable\` call.`
        },
        {
            title: 'Svelte 5 Runes',
            body: 'Rebuilt from the ground up against Svelte 5. Internal state uses `$state`, derivations use `$derived`, and the public surface still ships ordinary stores so existing render code keeps working.'
        },
        {
            title: 'TypeScript First',
            body: 'Generics carry your row type through every plugin, every cell renderer, and every accessor. Misnamed columns, mistyped values, and broken filter functions all fail at compile time.'
        },
        {
            title: 'Virtual Scroll',
            body: 'Render windows of tens of thousands of rows with `addVirtualScroll`. Sorting, filtering, and pagination still iterate the full dataset upstream of the windowing layer.'
        },
        {
            title: 'Custom Cell Renderers',
            body: 'Bring any Svelte component into a cell via `createRender`. Editable cells, action menus, embedded charts, status pills — all just components handed to the view model.'
        }
    ]

    interface CompareRow {
        slug: string
        name: string
        href: string
        type: string
        svelte5: boolean | string
        headless: boolean | string
        plugins: boolean | string
        ts: boolean | string
        pricing: string
    }
    const compareRows: CompareRow[] = [
        {
            slug: 'tanstack-table',
            name: 'TanStack Table v8',
            href: 'https://tanstack.com/table',
            type: 'headless · multi-framework',
            svelte5: 'partial',
            headless: true,
            plugins: 'adapters',
            ts: true,
            pricing: 'free'
        },
        {
            slug: 'svelte-headless-treegrid',
            name: 'svelte-headless-treegrid',
            href: 'https://github.com/geoffrey-roberts/svelte-headless-treegrid',
            type: 'headless · treegrid',
            svelte5: false,
            headless: true,
            plugins: false,
            ts: true,
            pricing: 'free'
        },
        {
            slug: 'svelte-table',
            name: 'svelte-table',
            href: 'https://github.com/dasDaniel/svelte-table',
            type: 'styled · simple',
            svelte5: 'partial',
            headless: false,
            plugins: false,
            ts: 'partial',
            pricing: 'free'
        },
        {
            slug: 'vincjo-datatables',
            name: '@vincjo/datatables',
            href: 'https://vincjo.fr/datatables',
            type: 'styled · client + server',
            svelte5: true,
            headless: false,
            plugins: false,
            ts: true,
            pricing: 'free'
        },
        {
            slug: 'svelte-easy-table',
            name: 'svelte-easy-data-table',
            href: 'https://github.com/Topiya/svelte-easy-data-table',
            type: 'styled · prebuilt',
            svelte5: false,
            headless: false,
            plugins: false,
            ts: 'partial',
            pricing: 'free'
        },
        {
            slug: 'ag-grid',
            name: 'AG Grid',
            href: 'https://ag-grid.com',
            type: 'styled · multi-framework',
            svelte5: false,
            headless: false,
            plugins: true,
            ts: true,
            pricing: 'community + enterprise'
        },
        {
            slug: 'handsontable',
            name: 'Handsontable',
            href: 'https://handsontable.com',
            type: 'spreadsheet · multi-framework',
            svelte5: false,
            headless: false,
            plugins: true,
            ts: true,
            pricing: 'commercial'
        }
    ]

    const formatCell = (v: string | boolean): { text: string; cls: string } => {
        if (v === true) return { text: 'yes', cls: 'y' }
        if (v === false) return { text: 'no', cls: 'n' }
        return { text: String(v), cls: '' }
    }

    interface FeaturedExample {
        slug: string
        title: string
        body: string
    }
    const featuredExamples: FeaturedExample[] = [
        {
            slug: 'kitchen-sink',
            title: 'Kitchen Sink',
            body: 'Every plugin wired onto one table — sorting, filtering, pagination, group-by, expansion, selection, column resizing, hidden columns. The classic "show me everything" demo.'
        },
        {
            slug: 'virtual-scroll',
            title: 'Virtual Scroll',
            body: 'Render windows of 10k+ rows without mounting the full DOM. Sorting and pagination still iterate the full dataset upstream of the windowing layer.'
        },
        {
            slug: 'editable-table',
            title: 'Editable Table',
            body: 'Per-cell inline editing through a custom cell renderer that writes the new value back into the underlying writable store.'
        }
    ]

    const headerNav = [
        { label: 'docs', href: '/docs' },
        { label: 'examples', href: '/examples' }
    ]

    // ── Copy install command ─────────────────────────────────────────
    const installCmd = `npm i ${PKG_NAME}`
    let copied = $state(false)
    const copyInstall = async () => {
        if (typeof navigator === 'undefined') return
        try {
            await navigator.clipboard.writeText(installCmd)
            copied = true
            setTimeout(() => (copied = false), 1500)
        } catch {
            /* clipboard blocked — fail quiet */
        }
    }
</script>

<svelte:head>
    <title>svelte-headless-table · headless data tables for Svelte 5</title>
    <meta
        name="description"
        content="A headless, plugin-composed table library for Svelte 5. {PLUGIN_COUNT} plugins for sorting, filtering, pagination, grouping, selection, column resizing, sub-rows, and virtual scroll. TypeScript-first, MIT."
    />
</svelte:head>

<div id="top" class="brut-wrap flex min-h-svh flex-col">
    <HeaderV2 config={docsConfig} {favicon} version={PKG_VERSION} nav={headerNav} />

    <main class="brut">
        <!-- ── Coordinate strip (decorative grid markers) ────────────── -->
        <div class="brut-coord" aria-hidden="true">
            {#each Array(12) as _, i (i)}
                <div>{String(i + 1).padStart(2, '0')}</div>
            {/each}
        </div>

        <!-- ── FIG-001 · MASTHEAD ─────────────────────────────────── -->
        <section class="brut-hero">
            <div class="corner tr">FIG-001 · MASTHEAD</div>
            <aside class="meta">
                <div><span class="k">pkg</span> · <span class="v">{PKG_NAME}</span></div>
                <div><span class="k">version</span> · <span class="v">{PKG_VERSION}</span></div>
                <div>
                    <span class="k">tarball</span> ·
                    <span class="v">{TARBALL_KB !== null ? `${TARBALL_KB} kB gz` : '—'}</span>
                </div>
                <div><span class="k">deps</span> · <span class="v">4</span></div>
                <div><span class="k">licence</span> · <span class="v">MIT</span></div>
                <hr />
                <div>
                    <span class="k">plugins</span> ·
                    <span class="v accent">{PLUGIN_COUNT}</span>
                </div>
                <div>
                    <span class="k">svelte</span> ·
                    <span class="v">5 (runes)</span>
                </div>
                <div>
                    <span class="k">types</span> ·
                    <span class="v accent">100% TS</span>
                </div>
                <hr />
                <div class="k">// scroll for full spec</div>
            </aside>
            <div class="hero-body">
                <h1>
                    <span>svelte</span><span class="slash">/</span><span>headless table</span><span
                        class="end">.</span
                    >
                </h1>
                <p class="sub">
                    A <b>powerful, composable</b> table library for Svelte 5 — bring your own
                    markup, bring your own styles, and snap on as many of the {PLUGIN_COUNT} plugins as
                    you need. Sorting, filtering, pagination, grouping, expansion, selection, column resizing,
                    sub-rows, virtual scroll. Fully typed, MIT, zero opinions about how the table renders.
                </p>
                <div class="cta-row">
                    <a class="pri" href="/docs/getting-started/overview">get started ↗</a>
                    <a href="/docs/api/create-table">api reference</a>
                    <a href="/examples">examples</a>
                    <a href="/examples/kitchen-sink">kitchen sink</a>
                    <MotionButton
                        class="inst"
                        type="button"
                        onclick={copyInstall}
                        aria-label="Copy install command"
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                    >
                        <span class="inst-prompt">$</span>
                        <span class="inst-cmd">npm i <span class="pkg">{PKG_NAME}</span></span>
                        <span class="inst-copy {copied ? 'is-copied' : ''}">
                            <AnimatePresence initial={false}>
                                <MotionSpan
                                    key={copied ? 'copied' : 'idle'}
                                    class="inst-copy-label"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                    {copied ? '✓ copied' : 'copy'}
                                </MotionSpan>
                            </AnimatePresence>
                        </span>
                    </MotionButton>
                </div>
            </div>
            <div class="corner bl">FIG-001</div>
            <div class="corner br">SHEET 01 / 07</div>
        </section>

        <!-- ── Stats row ───────────────────────────────────────────── -->
        <section class="brut-stats">
            {#each stats as s, i (s.k)}
                <div class="s {s.ac ? 'ac' : ''}" data-idx="/0{i + 1}">
                    <div class="k">{s.k}</div>
                    <div class="v">
                        <span class="v-num">{s.v}</span>{#if s.sup}<span class="v-unit"
                                >{s.sup}</span
                            >{/if}
                    </div>
                    <div class="note">{s.n}</div>
                </div>
            {/each}
        </section>

        <!-- ── FIG-002 · VIRTUAL SCROLL DEMO ───────────────────────── -->
        <section class="brut-vs">
            <div class="lede">
                <div class="k">FIG-002 / VIRTUAL SCROLL</div>
                <h2>render <span>thousands</span> of rows.</h2>
                <p>
                    10,000 rows handed to the table, only the viewport-visible window mounts.
                    Sorting and filtering still iterate the full dataset — the windowing layer sits
                    downstream. Drop in <code>addVirtualScroll</code> and you're done.
                </p>
            </div>
            <div class="panel">
                <VirtualScrollSample />
            </div>
        </section>

        <!-- ── FIG-003 · CAPABILITIES ──────────────────────────────── -->
        <section class="brut-feat">
            <div class="lede">
                <div class="k">FIG-003 / CAPABILITIES</div>
                <h2>why <span>svelte-headless-table</span>.</h2>
                <p>The most complete headless table primitive for Svelte 5.</p>
            </div>
            <div class="grid">
                {#each features as f, i (f.title)}
                    <div class="cell">
                        <div class="id">
                            № {String(i + 1).padStart(2, '0')} / {String(features.length).padStart(
                                2,
                                '0'
                            )}
                        </div>
                        <div class="corner">↗</div>
                        <h3>{f.title}</h3>
                        <p>{f.body}</p>
                        <div class="marker"></div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- ── FIG-004 · COMPARISON MATRIX ─────────────────────────── -->
        <section class="brut-comp">
            <div class="k">FIG-004 / COMPARISON MATRIX</div>
            <h2>how we <span>compare</span>.</h2>
            <p class="lede-p">
                Honest, side-by-side comparisons with every major Svelte (and a couple of
                multi-framework) table libraries.
            </p>
            <div class="comp-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>library</th>
                            <th>category</th>
                            <th>svelte 5</th>
                            <th>headless</th>
                            <th>plugins</th>
                            <th>typescript</th>
                            <th>pricing</th>
                            <th class="comp-read-th">read more</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="us-row">
                            <td class="us">{PKG_NAME} ●</td>
                            <td class="us">headless · svelte 5</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="y">{PLUGIN_COUNT}</td>
                            <td class="y">yes</td>
                            <td class="y">free · MIT</td>
                            <td class="comp-read"><span class="comp-read-self">this row</span></td>
                        </tr>
                        {#each compareRows as row (row.slug)}
                            {@const svelte5 = formatCell(row.svelte5)}
                            {@const headless = formatCell(row.headless)}
                            {@const plugins = formatCell(row.plugins)}
                            {@const ts = formatCell(row.ts)}
                            <tr>
                                <td>{row.name}</td>
                                <td>{row.type}</td>
                                <td class={svelte5.cls}>{svelte5.text}</td>
                                <td class={headless.cls}>{headless.text}</td>
                                <td class={plugins.cls}>{plugins.text}</td>
                                <td class={ts.cls}>{ts.text}</td>
                                <td>{row.pricing}</td>
                                <td class="comp-read">
                                    <a
                                        href={row.href}
                                        class="comp-read-link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Visit {row.name} homepage"
                                    >
                                        visit ↗
                                    </a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ── FIG-005 · AI-READY DOCS ─────────────────────────────── -->
        <section class="brut-ai" id="ai-ready">
            <div class="lede">
                <div class="k">FIG-005 / AI-READY</div>
                <h2>built for <span>ai-assisted</span> code.</h2>
                <p>
                    Point Cursor, Claude Code, or any LLM at the manifests below and they know the
                    full svelte-headless-table API — every plugin, every accessor, every cell
                    renderer pattern. Migration prompts from TanStack Table just work.
                </p>
            </div>
            <div class="ai-panel">
                <div class="ai-head">
                    <span class="ai-tab on">llms.txt</span>
                    <span class="ai-tab">llms-full.txt</span>
                    <span class="grow"></span>
                    <span class="ai-meta">/llmstxt.org</span>
                </div>
                <div class="ai-grid">
                    <a class="ai-cell" href="/llms.txt" target="_blank" rel="noopener">
                        <div class="ai-cell-k">01 · index</div>
                        <h3>
                            <code>/llms.txt</code>
                        </h3>
                        <p>
                            Compact map. Project blurb, doc URLs, link to the full reference. Drop
                            into any agent for ground-truth lookup before fetching individual pages.
                        </p>
                        <div class="ai-cell-foot">~4 kB · open ↗</div>
                    </a>
                    <a class="ai-cell" href="/llms-full.txt" target="_blank" rel="noopener">
                        <div class="ai-cell-k">02 · full</div>
                        <h3>
                            <code>/llms-full.txt</code>
                        </h3>
                        <p>
                            Full reference, one document. Every plugin, every accessor, every cell
                            renderer pattern — concatenated from the per-page mirrors. Optimised for
                            "paste the whole library into one context window" prompts.
                        </p>
                        <div class="ai-cell-foot">~120 kB · open ↗</div>
                    </a>
                    <a
                        class="ai-cell"
                        href="/docs/api-create-table.md"
                        target="_blank"
                        rel="noopener"
                    >
                        <div class="ai-cell-k">03 · per-page mirrors</div>
                        <h3>
                            <code>/docs/&lt;slug&gt;.md</code>
                        </h3>
                        <p>
                            Every doc page mirrored as raw markdown — Svelte scripts stripped,
                            fenced code preserved. The citation surface ChatGPT, Perplexity, and
                            Claude prefer over rendered HTML.
                        </p>
                        <div class="ai-cell-foot">35 docs · open ↗</div>
                    </a>
                </div>
                <div class="ai-prompt">
                    <span class="ai-prompt-k">// example prompt</span>
                    <code>
                        Use https://table.svelte.page/llms.txt as the source for
                        <em>@humanspeak/svelte-headless-table</em>. Build a Svelte 5 admin table
                        with <em>addSortBy</em>, <em>addColumnFilters</em>, <em>addPagination</em>,
                        and a custom cell renderer for the status column.
                    </code>
                </div>
            </div>
        </section>

        <!-- ── FIG-006 · EXAMPLES ──────────────────────────────────── -->
        <section class="brut-ex">
            <div class="lede">
                <div class="k">FIG-006 / EXAMPLES</div>
                <h2>explore <span>live examples</span>.</h2>
                <p>
                    Three self-contained demos — every plugin composed, virtual-scroll over 10k
                    rows, and per-cell inline editing — all with the full source one click away.
                </p>
            </div>
            <div>
                <div class="grid">
                    {#each featuredExamples as ex, i (ex.slug)}
                        <a class="cell" href="/examples/{ex.slug}">
                            <div class="id">
                                № {String(i + 1).padStart(2, '0')} / {String(
                                    featuredExamples.length
                                ).padStart(2, '0')}
                            </div>
                            <div class="corner">↗</div>
                            <h3>{ex.title}</h3>
                            <p>{ex.body}</p>
                            <div class="marker"></div>
                        </a>
                    {/each}
                </div>
                <a class="ex-all" href="/examples">view all examples →</a>
            </div>
        </section>

        <!-- ── Big-type footer ─────────────────────────────────────── -->
        <section class="brut-foot">
            <div class="info">
                <div>SET / JETBRAINS MONO + INTER</div>
                <div>HUMANSPEAK · 2026</div>
                <div>MIT LICENCE</div>
                <div class="v">● {PKG_VERSION}</div>
            </div>
            <MotionButton
                class="big"
                type="button"
                onclick={copyInstall}
                aria-label="Copy install command"
                whileTap={{ scale: 0.985 }}
                whileHover={{ scale: 1.005 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
                npm&nbsp;i&nbsp;<span>@humanspeak/</span><br />svelte-headless-table
                <span class="copy-hint">
                    <AnimatePresence initial={false}>
                        <MotionSpan
                            key={copied ? 'copied' : 'idle'}
                            class="copy-hint-label"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            {copied ? '✓ copied to clipboard' : 'click to copy'}
                        </MotionSpan>
                    </AnimatePresence>
                </span>
            </MotionButton>
            <div class="info right">
                <div>SHEET 07 / 07</div>
                <div>END OF DOCUMENT</div>
                <a class="v" href="#top">↩ TO TOP</a>
            </div>
        </section>
    </main>

    <FooterV2 version={PKG_VERSION} />
</div>

<style>
    /* Brutalist tokens + .brut / .brut-wrap base styles live in
       @humanspeak/docs-kit/styles/brutalist.css (imported via app.css). */
    .brut .sans {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }

    /* ── Coordinate strip ─────────────────────────────────────────── */
    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    /* ── Hero ─────────────────────────────────────────────────────── */
    .brut-hero {
        padding: 80px 24px 32px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .brut-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
        margin: 0;
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .v {
        color: var(--brut-ink);
    }
    .brut-hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .brut-hero h1 {
        margin: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(56px, 11vw, 152px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }
    .brut-hero h1 .slash {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero .sub {
        margin: 28px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .brut-hero .sub b {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-hero .cta-row {
        margin-top: 28px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        align-items: stretch;
        width: fit-content;
        max-width: 100%;
    }
    /* Each cell owns its border (so MotionButton transforms stay visible
       inside their own outline). Adjacent cells share a seam via
       `margin-left: -1px` so the row reads as one continuous strip
       without doubled hairlines. On hover, `z-index: 2` lifts the
       scaled button above the neighbouring cells so the transform is
       never clipped. */
    .brut-hero .cta-row > * {
        padding: 10px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--brut-ink);
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row > *:hover {
        z-index: 2;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
        border-color: var(--brut-accent);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
    }
    /* Scope the muted hover to non-primary anchors only — without :not(.pri)
       the rule clobbered the primary CTA's accent background and left dark
       ink on a dark surface (unreadable in both themes). */
    .brut-hero .cta-row a:not(.pri):hover,
    .brut-hero .cta-row :global(.inst:hover) {
        background: var(--brut-bg-2);
        border-color: var(--brut-rule-2);
    }
    /* MotionButton renders into a plain <button> without our scoped
       Svelte hash, so the `.cta-row > *` styles don't reach it and
       Tailwind's preflight leaves it borderless. Re-state the shared
       box styles here through `:global()` so the install cell matches
       the surrounding anchors. */
    .brut-hero .cta-row :global(.inst) {
        padding: 10px 18px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-2);
        font-family: inherit;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        margin-left: -1px;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row :global(.inst:hover) {
        z-index: 2;
    }
    .brut-hero .cta-row :global(.inst .inst-prompt) {
        color: var(--brut-ink-3);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd) {
        color: var(--brut-ink-2);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd .pkg) {
        color: var(--brut-ink);
    }
    .brut-hero .cta-row :global(.inst .inst-copy) {
        margin-left: 4px;
        padding: 2px 8px;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-accent);
        border: 1px solid var(--brut-rule);
        display: inline-grid;
        align-items: center;
        justify-items: center;
        /* Width sized to hold the wider "✓ copied" label so the box does
           not resize when AnimatePresence cross-fades between states. */
        min-width: 84px;
        height: 20px;
        overflow: hidden;
        transition:
            border-color 0.2s,
            background 0.2s;
    }
    .brut-hero .cta-row :global(.inst .inst-copy.is-copied) {
        border-color: var(--brut-accent);
        background: var(--brut-accent-soft);
    }
    .brut-hero .cta-row :global(.inst .inst-copy-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── Stats row ────────────────────────────────────────────────── */
    .brut-stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stats .s {
        padding: 28px 24px;
        border-right: 1px solid var(--brut-rule);
        position: relative;
        min-height: 160px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .brut-stats .s:last-child {
        border-right: 0;
    }
    .brut-stats .s .k {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
    }
    .brut-stats .s .v {
        font-size: 64px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: -0.04em;
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        white-space: nowrap;
    }
    .brut-stats .s .v-num {
        line-height: 1;
    }
    .brut-stats .s .v-unit {
        font-size: 22px;
        letter-spacing: 0;
        font-weight: 500;
        color: inherit;
        line-height: 1;
    }
    .brut-stats .s .note {
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .brut-stats .s.ac .v {
        color: var(--brut-accent);
    }
    .brut-stats .s::after {
        content: attr(data-idx);
        position: absolute;
        top: 12px;
        right: 14px;
        font-size: 10px;
        color: var(--brut-ink-3);
    }

    /* ── FIG-002 · Virtual scroll demo (side-by-side lede + panel) ── */
    .brut-vs {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-vs .panel {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    /* Mirror the shared section-lede look (matches .brut-feat .lede, etc.) */
    .brut-vs .lede {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-vs .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-vs .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-vs .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        letter-spacing: 0;
    }
    .brut-vs .lede p code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.9em;
        color: var(--brut-accent);
        background: transparent;
        padding: 0;
    }
    /* ── Section lede (shared by stream/feat/play/ai) ─────────────── */
    .brut-stream .lede,
    .brut-feat .lede,
    .brut-play .lede,
    .brut-ai .lede {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-stream .lede h2,
    .brut-feat .lede h2,
    .brut-play .lede h2,
    .brut-ai .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-stream .lede h2 span,
    .brut-feat .lede h2 span,
    .brut-play .lede h2 span,
    .brut-ai .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-stream .lede p,
    .brut-play .lede p,
    .brut-ai .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        letter-spacing: 0;
    }

    /* ── Features grid ────────────────────────────────────────────── */
    .brut-feat {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-feat .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-feat .cell {
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px;
        min-height: 200px;
        position: relative;
    }
    .brut-feat .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-feat .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-feat .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-feat .cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 30px 0 8px;
        color: var(--brut-ink);
    }
    .brut-feat .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 0;
        max-width: 320px;
    }
    .brut-feat .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 10.5px;
        color: var(--brut-ink-3);
    }
    .brut-feat .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-feat .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Compare table ────────────────────────────────────────────── */
    .brut-comp {
        padding: 28px 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-comp .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-comp h2 {
        font-size: 28px;
        margin: 12px 0 24px;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
        color: var(--brut-ink);
    }
    .brut-comp h2 span {
        color: var(--brut-accent);
    }
    .brut-comp .comp-scroll {
        overflow-x: auto;
    }
    .brut-comp table {
        width: 100%;
        border-collapse: collapse;
        min-width: 720px;
    }
    .brut-comp table th,
    .brut-comp table td {
        text-align: left;
        padding: 12px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 13px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-ink);
    }
    .brut-comp table th {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        font-weight: 400;
        text-transform: lowercase;
    }
    .brut-comp table td.us {
        color: var(--brut-accent);
    }
    .brut-comp table .y {
        color: var(--brut-accent);
    }
    .brut-comp table .n {
        color: var(--brut-ink-3);
    }
    .brut-comp table tbody tr:hover {
        background: var(--brut-bg-2);
    }
    .brut-comp table tr.us-row {
        background: var(--brut-accent-soft);
    }
    .brut-comp table tr.us-row:hover {
        background: var(--brut-accent-soft);
    }
    .brut-comp .lede-p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        margin: 0 0 24px;
        line-height: 1.55;
        max-width: 720px;
    }
    .brut-comp .comp-read-th {
        text-align: right !important;
    }
    .brut-comp .comp-read {
        text-align: right;
        white-space: nowrap;
    }
    .brut-comp .comp-read-link {
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
    }
    .brut-comp .comp-read-link:hover {
        text-decoration: underline;
    }
    .brut-comp .comp-read-self {
        color: var(--brut-ink-3);
        font-size: 11.5px;
        letter-spacing: 0.04em;
    }
    .brut-comp .comp-all {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 12px;
        letter-spacing: 0.08em;
    }
    .brut-comp .comp-all:hover {
        text-decoration: underline;
    }

    /* ── Examples grid (mirrors FIG-003 features) ─────────────────── */
    .brut-ex {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-ex .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-ex .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-ex .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-ex .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 640px;
    }
    .brut-ex .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-ex .cell {
        display: block;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px;
        min-height: 200px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
    }
    .brut-ex .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-ex .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-ex .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-ex .cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 30px 0 8px;
        color: var(--brut-ink);
    }
    .brut-ex .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 0;
        max-width: 320px;
    }
    .brut-ex .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition: color 0.2s;
    }
    .brut-ex .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-ex .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-ex .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .brut-ex .ex-all {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 12px;
        letter-spacing: 0.08em;
    }
    .brut-ex .ex-all:hover {
        text-decoration: underline;
    }

    /* ── AI-ready docs section ────────────────────────────────────── */
    .brut-ai {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-panel {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .brut-ai .ai-head {
        display: flex;
        align-items: center;
        gap: 0;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-ai .ai-tab {
        padding: 9px 14px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-tab.on {
        background: var(--brut-bg);
        color: var(--brut-ink);
    }
    .brut-ai .grow {
        flex: 1;
    }
    .brut-ai .ai-meta {
        padding: 9px 14px;
        border-left: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }
    .brut-ai .ai-cell {
        position: relative;
        padding: 20px 22px 56px;
        min-height: 200px;
        border-right: 1px solid var(--brut-rule);
        color: var(--brut-ink);
        text-decoration: none;
        transition: background-color 0.15s;
    }
    .brut-ai .ai-cell:last-child {
        border-right: 0;
    }
    .brut-ai .ai-cell:hover {
        background: color-mix(in oklab, var(--brut-accent) 6%, transparent);
    }
    .brut-ai .ai-cell-k {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }
    .brut-ai .ai-cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 22px 0 10px;
        color: var(--brut-ink);
    }
    .brut-ai .ai-cell h3 code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: transparent;
        padding: 0;
        font-size: 0.85em;
        color: var(--brut-accent);
    }
    .brut-ai .ai-cell p {
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        margin: 0;
    }
    .brut-ai .ai-cell p code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        background: var(--brut-bg-2);
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 0.92em;
    }
    .brut-ai .ai-cell-foot {
        position: absolute;
        left: 22px;
        bottom: 18px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .brut-ai .ai-prompt {
        padding: 16px 22px;
        border-top: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--brut-ink-2);
    }
    .brut-ai .ai-prompt-k {
        display: block;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-bottom: 6px;
    }
    .brut-ai .ai-prompt code {
        background: transparent;
        padding: 0;
        color: var(--brut-ink);
    }
    .brut-ai .ai-prompt em {
        color: var(--brut-accent);
        font-style: normal;
    }

    /* ── Footer big-type ──────────────────────────────────────────── */
    .brut-foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .brut-foot :global(.big) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
        letter-spacing: -0.06em;
        text-transform: lowercase;
        background: transparent;
        border: 0;
        color: var(--brut-ink);
        text-align: left;
        cursor: pointer;
        padding: 0;
        position: relative;
    }
    .brut-foot :global(.big span) {
        color: var(--brut-accent);
    }
    .brut-foot :global(.big .copy-hint) {
        display: inline-grid;
        align-items: center;
        justify-items: start;
        margin-top: 16px;
        height: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        overflow: hidden;
        min-width: 200px;
    }
    .brut-foot :global(.big .copy-hint-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-foot :global(.big:hover .copy-hint) {
        color: var(--brut-accent);
    }
    .brut-foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .brut-foot .info.right {
        text-align: right;
    }
    .brut-foot .info .v,
    .brut-foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .brut-foot .info a.v:hover {
        color: var(--brut-accent);
    }

    /* ── Responsive collapse ─────────────────────────────────────── */
    @media (max-width: 1024px) {
        .brut-stats {
            grid-template-columns: repeat(3, 1fr);
        }
        .brut-stats .s:nth-child(3n) {
            border-right: 0;
        }
        .brut-stats .s:nth-child(-n + 3) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .grid,
        .brut-ex .grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stream .panel .grid,
        .brut-play .panel .body {
            grid-template-columns: 1fr;
        }
        .brut-stream .panel .grid {
            height: auto;
        }
        .brut-stream .panel .pane {
            height: 320px;
        }
        .brut-stream .panel .pane + .pane,
        .brut-play .panel .body .col + .col {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
        .brut-ai .ai-grid {
            grid-template-columns: 1fr;
        }
        .brut-ai .ai-cell {
            border-right: 0;
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-ai .ai-cell:last-child {
            border-bottom: 0;
        }
        .brut-ex,
        .brut-ai {
            grid-template-columns: 1fr;
        }
    }
    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-stream,
        .brut-feat,
        .brut-play,
        .brut-ai,
        .brut-ex {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 56px;
        }
        .brut-stats {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stats .s {
            min-height: 130px;
            padding: 20px 16px;
        }
        .brut-stats .s .v {
            font-size: 44px;
        }
        .brut-stats .s:nth-child(2n) {
            border-right: 0;
        }
        .brut-stats .s:not(:nth-last-child(-n + 2)) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .grid,
        .brut-ex .grid {
            grid-template-columns: 1fr;
        }
        .brut-foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .brut-foot .info.right {
            text-align: left;
        }
    }
</style>
