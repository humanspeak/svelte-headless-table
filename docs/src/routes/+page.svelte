<script lang="ts">
    import { AnimatePresence, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import { FooterV2, HeaderV2, getBreadcrumbContext, getSeoContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import githubStats from '$lib/github-stats.json'
    import rootPkg from '../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const PKG_NAME = '@humanspeak/svelte-headless-table'
    const PKG_VERSION = rootPkg.version

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
    const stats: StatItem[] = [
        { k: 'plugins', v: String(PLUGIN_COUNT), n: 'composable, plug-and-play', ac: true },
        { k: 'svelte', v: '5', n: 'runes-native' },
        { k: 'runtime deps', v: '4', n: 'all humanspeak first-party' },
        { k: 'licence', v: 'MIT', n: 'on GitHub' },
        { k: 'types', v: '100', sup: '%', n: 'TypeScript end-to-end', ac: true },
        { k: 'stars', v: String(STARS), n: 'GitHub' }
    ]

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
                <div><span class="k">runtime deps</span> · <span class="v">4</span></div>
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
            <div class="corner br">SHEET 01 / 06</div>
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

        <!-- ── FIG-002 · CAPABILITIES ──────────────────────────────── -->
        <section class="brut-feat">
            <div class="lede">
                <div class="k">FIG-002 / CAPABILITIES</div>
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
                        <div class="corner">▢</div>
                        <h3>{f.title}</h3>
                        <p>{f.body}</p>
                        <div class="marker"></div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- ── FIG-003 · COMPARISON MATRIX ─────────────────────────── -->
        <section class="brut-comp">
            <div class="k">FIG-003 / COMPARISON MATRIX</div>
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

        <!-- ── FIG-004 · AI-READY DOCS ─────────────────────────────── -->
        <section class="brut-ai" id="ai-ready">
            <div class="lede">
                <div class="k">FIG-004 / AI-READY</div>
                <h2>built for <span>ai-assisted</span> code.</h2>
                <p>
                    Point Cursor, Claude Code, or any LLM at the manifests below and they know the
                    full svelte-headless-table API — every plugin, every accessor, every cell
                    renderer pattern. Migration prompts from TanStack Table just work.
                </p>
            </div>
            <div class="ai-panel">
                <div class="ai-head">
                    <span class="ai-tab on">/docs/&lt;slug&gt;.md</span>
                    <span class="grow"></span>
                    <span class="ai-meta">/llmstxt.org</span>
                </div>
                <div class="ai-grid">
                    <a
                        class="ai-cell"
                        href="/docs/api-create-table.md"
                        target="_blank"
                        rel="noopener"
                    >
                        <div class="ai-cell-k">01 · per-page mirrors</div>
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
                    <a
                        class="ai-cell"
                        href="/docs/getting-started-quick-start.md"
                        target="_blank"
                        rel="noopener"
                    >
                        <div class="ai-cell-k">02 · quick start</div>
                        <h3>
                            <code>quick-start.md</code>
                        </h3>
                        <p>
                            The full quick-start walkthrough, stripped to clean markdown so an LLM
                            can read your install + first-table-in-30s flow without parsing the site
                            shell.
                        </p>
                        <div class="ai-cell-foot">~12 kB · open ↗</div>
                    </a>
                    <a
                        class="ai-cell"
                        href="/docs/plugins-overview.md"
                        target="_blank"
                        rel="noopener"
                    >
                        <div class="ai-cell-k">03 · plugins overview</div>
                        <h3>
                            <code>plugins-overview.md</code>
                        </h3>
                        <p>
                            All {PLUGIN_COUNT} plugins on one page — composition rules, plugin order semantics,
                            and the canonical examples. Optimised for LLM context windows.
                        </p>
                        <div class="ai-cell-foot">~9 kB · open ↗</div>
                    </a>
                </div>
                <div class="ai-prompt">
                    <span class="ai-prompt-k">// example prompt</span>
                    <code>
                        Use https://table.svelte.page/docs/api-create-table.md and
                        https://table.svelte.page/docs/plugins-overview.md as the source for
                        <em>@humanspeak/svelte-headless-table</em>. Build a Svelte 5 admin table
                        with `addSortBy`, `addColumnFilters`, `addPagination`, and a custom cell
                        renderer for the status column.
                    </code>
                </div>
            </div>
        </section>

        <!-- ── FIG-005 · EXAMPLES ──────────────────────────────────── -->
        <section class="brut-ex">
            <div class="lede">
                <div class="k">FIG-005 / EXAMPLES</div>
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
                <div>SHEET 06 / 06</div>
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
        border-right: 1px dashed var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    /* ── Hero ─────────────────────────────────────────────────────── */
    .brut-hero {
        position: relative;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 40px;
        padding: 56px 32px 72px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-hero .meta {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-2);
        line-height: 1.9;
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .brut-hero .meta .v {
        color: var(--brut-ink-1);
    }
    .brut-hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 10px 0;
    }

    .brut-hero h1 {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-weight: 500;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 1;
        letter-spacing: -0.04em;
        text-transform: lowercase;
        margin: 0;
        color: var(--brut-ink-1);
    }
    .brut-hero h1 .slash {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-accent);
    }
    .brut-hero .sub {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: clamp(15px, 1.4vw, 18px);
        line-height: 1.55;
        color: var(--brut-ink-2);
        max-width: 60ch;
        margin: 18px 0 0;
    }
    .brut-hero .sub b {
        color: var(--brut-ink-1);
        font-weight: 600;
    }
    .brut-hero .cta-row {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        gap: 0;
        margin-top: 26px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 13px;
    }
    /* Each cell owns its border (so MotionButton transforms stay visible
       without clipping). */
    .brut-hero .cta-row > * {
        display: inline-flex;
        align-items: center;
        padding: 8px 14px;
        text-decoration: none;
        color: var(--brut-ink-1);
        background: transparent;
        border: 1px solid var(--brut-rule);
        cursor: pointer;
        transition:
            background 100ms ease,
            color 100ms ease,
            border-color 100ms ease;
        text-transform: lowercase;
        letter-spacing: 0.01em;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row > *:hover {
        z-index: 1;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-ink-1);
        color: var(--brut-bg);
        border-color: var(--brut-ink-1);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
        color: var(--brut-bg);
    }
    .brut-hero .cta-row a:not(.pri):hover,
    .brut-hero .cta-row :global(.inst:hover) {
        background: var(--brut-rule-soft);
    }
    /* MotionButton renders into a plain <button> without our scoped
       class hierarchy — :global() lets us reach in. */
    .brut-hero .cta-row :global(.inst) {
        position: relative;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        background: transparent;
        border: 1px solid var(--brut-rule);
        cursor: pointer;
        padding: 8px 14px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        text-transform: lowercase;
    }
    .brut-hero .cta-row :global(.inst:hover) {
        background: var(--brut-rule-soft);
    }
    .brut-hero .cta-row :global(.inst .inst-prompt) {
        color: var(--brut-accent);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd) {
        color: var(--brut-ink-1);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd .pkg) {
        color: var(--brut-accent);
    }
    .brut-hero .cta-row :global(.inst .inst-copy) {
        position: relative;
        margin-left: 6px;
        padding-left: 8px;
        border-left: 1px dashed var(--brut-rule);
        color: var(--brut-ink-3);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 10px;
        min-width: 56px;
        height: 1em;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
    }
    .brut-hero .cta-row :global(.inst .inst-copy.is-copied) {
        color: var(--brut-accent);
    }
    .brut-hero .cta-row :global(.inst .inst-copy-label) {
        position: absolute;
        inset: 0;
        display: inline-flex;
        align-items: center;
    }

    .brut-hero .corner {
        position: absolute;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 16px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 16px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 16px;
    }

    /* ── Stats row ────────────────────────────────────────────────── */
    .brut-stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stats .s {
        padding: 18px 20px 22px;
        border-right: 1px solid var(--brut-rule);
        position: relative;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
    }
    .brut-stats .s:last-child {
        border-right: 0;
    }
    .brut-stats .s .k {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .brut-stats .s .v {
        display: flex;
        align-items: baseline;
        gap: 4px;
        margin-top: 8px;
        line-height: 1;
        color: var(--brut-ink-1);
    }
    .brut-stats .s .v-num {
        font-size: 36px;
        font-weight: 500;
        letter-spacing: -0.03em;
    }
    .brut-stats .s .v-unit {
        font-size: 14px;
        color: var(--brut-ink-2);
    }
    .brut-stats .s.ac .v-num {
        color: var(--brut-accent);
    }
    .brut-stats .s .note {
        margin-top: 6px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .brut-stats .s::after {
        content: attr(data-idx);
        position: absolute;
        top: 8px;
        right: 10px;
        font-size: 9px;
        color: var(--brut-ink-3);
        opacity: 0.6;
    }

    /* ── Section lede (shared by feat/ai) ─────────────────────────── */
    .lede {
        padding: 56px 32px 18px;
        border-bottom: 1px dashed var(--brut-rule);
    }
    .lede .k {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .lede h2 {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: clamp(32px, 5vw, 64px);
        line-height: 1;
        letter-spacing: -0.04em;
        text-transform: lowercase;
        font-weight: 500;
        margin: 12px 0 0;
        color: var(--brut-ink-1);
    }
    .lede h2 span {
        color: var(--brut-accent);
    }
    .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        max-width: 60ch;
        margin: 16px 0 0;
    }

    /* ── Features grid ────────────────────────────────────────────── */
    .brut-feat {
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-feat .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-feat .cell {
        position: relative;
        padding: 28px 24px 36px;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .brut-feat .cell:nth-child(3n) {
        border-right: 0;
    }
    .brut-feat .cell:nth-last-child(-n + 3) {
        border-bottom: 0;
    }
    .brut-feat .cell .id {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
    }
    .brut-feat .cell .corner {
        position: absolute;
        top: 18px;
        right: 18px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 14px;
        color: var(--brut-ink-3);
    }
    .brut-feat .cell h3 {
        margin: 14px 0 8px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 20px;
        line-height: 1.1;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
        color: var(--brut-ink-1);
    }
    .brut-feat .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        margin: 0;
    }
    .brut-feat .cell .marker {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--brut-accent);
        transform-origin: left;
        transform: scaleX(0);
        transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .brut-feat .cell:hover .marker {
        transform: scaleX(1);
    }

    /* ── Compare table ────────────────────────────────────────────── */
    .brut-comp {
        padding: 56px 32px 64px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-comp > .k {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .brut-comp h2 {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: clamp(32px, 5vw, 64px);
        line-height: 1;
        letter-spacing: -0.04em;
        text-transform: lowercase;
        font-weight: 500;
        margin: 12px 0 0;
        color: var(--brut-ink-1);
    }
    .brut-comp h2 span {
        color: var(--brut-accent);
    }
    .brut-comp .lede-p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 15px;
        color: var(--brut-ink-2);
        margin: 14px 0 28px;
        max-width: 60ch;
    }
    .brut-comp .comp-scroll {
        overflow-x: auto;
        border: 1px solid var(--brut-rule);
    }
    .brut-comp table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 13px;
    }
    .brut-comp th,
    .brut-comp td {
        text-align: left;
        padding: 10px 14px;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        white-space: nowrap;
        color: var(--brut-ink-2);
    }
    .brut-comp th:last-child,
    .brut-comp td:last-child {
        border-right: 0;
    }
    .brut-comp thead th {
        background: var(--brut-rule-soft);
        color: var(--brut-ink-3);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 10px;
    }
    .brut-comp tbody tr:last-child td {
        border-bottom: 0;
    }
    .brut-comp .us {
        color: var(--brut-ink-1);
        font-weight: 600;
    }
    .brut-comp .us-row {
        background: color-mix(in srgb, var(--brut-accent) 10%, transparent);
    }
    .brut-comp .y {
        color: var(--brut-accent);
        font-weight: 500;
    }
    .brut-comp .n {
        color: var(--brut-ink-3);
    }
    .brut-comp .comp-read-link {
        color: var(--brut-ink-2);
        text-decoration: none;
        border-bottom: 1px dashed var(--brut-rule);
        padding-bottom: 1px;
    }
    .brut-comp .comp-read-link:hover {
        color: var(--brut-accent);
        border-bottom-color: var(--brut-accent);
    }
    .brut-comp .comp-read-self {
        color: var(--brut-ink-3);
        font-style: italic;
    }

    /* ── AI-ready docs section ────────────────────────────────────── */
    .brut-ai {
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-panel {
        margin: 0;
        border-top: 1px solid var(--brut-rule);
    }
    .brut-ai .ai-head {
        display: flex;
        align-items: stretch;
        gap: 0;
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 11px;
    }
    .brut-ai .ai-tab {
        padding: 10px 18px;
        border-right: 1px solid var(--brut-rule);
        color: var(--brut-ink-3);
        text-transform: lowercase;
        letter-spacing: 0.04em;
    }
    .brut-ai .ai-tab.on {
        background: var(--brut-rule-soft);
        color: var(--brut-ink-1);
    }
    .brut-ai .ai-head .grow {
        flex: 1 1 0;
    }
    .brut-ai .ai-meta {
        padding: 10px 18px;
        border-left: 1px solid var(--brut-rule);
        color: var(--brut-ink-3);
        letter-spacing: 0.04em;
    }
    .brut-ai .ai-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }
    .brut-ai .ai-cell {
        position: relative;
        padding: 24px 22px 30px;
        border-right: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
    }
    .brut-ai .ai-cell:last-child {
        border-right: 0;
    }
    .brut-ai .ai-cell:hover {
        background: var(--brut-rule-soft);
    }
    .brut-ai .ai-cell-k {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-ai .ai-cell h3 {
        margin: 14px 0 8px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 18px;
        letter-spacing: -0.02em;
        font-weight: 500;
        color: var(--brut-ink-1);
        text-transform: none;
    }
    .brut-ai .ai-cell h3 code {
        font-family: inherit;
        background: transparent;
        padding: 0;
        color: var(--brut-accent);
    }
    .brut-ai .ai-cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        flex: 1 1 0;
        margin: 0;
    }
    .brut-ai .ai-cell-foot {
        margin-top: 16px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.04em;
    }
    .brut-ai .ai-prompt {
        padding: 24px 32px 32px;
        border-top: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
    }
    .brut-ai .ai-prompt-k {
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-ai .ai-prompt code {
        display: block;
        font-family: inherit;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        background: transparent;
        padding: 10px 0 0;
        white-space: normal;
    }
    .brut-ai .ai-prompt code em {
        color: var(--brut-accent);
        font-style: normal;
    }

    /* ── Examples grid (mirrors features grid) ────────────────────── */
    .brut-ex {
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-ex .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-ex .cell {
        position: relative;
        padding: 28px 24px 36px;
        border-right: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        transition: background 120ms ease;
    }
    .brut-ex .cell:last-child {
        border-right: 0;
    }
    .brut-ex .cell:hover {
        background: var(--brut-rule-soft);
    }
    .brut-ex .cell .id {
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
    }
    .brut-ex .cell .corner {
        position: absolute;
        top: 18px;
        right: 18px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 14px;
        color: var(--brut-ink-3);
    }
    .brut-ex .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-ex .cell h3 {
        margin: 14px 0 8px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 20px;
        letter-spacing: -0.02em;
        font-weight: 500;
        text-transform: lowercase;
        color: var(--brut-ink-1);
    }
    .brut-ex .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--brut-ink-2);
        flex: 1 1 0;
        margin: 0;
    }
    .brut-ex .cell .marker {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--brut-accent);
        transform-origin: left;
        transform: scaleX(0);
        transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .brut-ex .cell:hover .marker {
        transform: scaleX(1);
    }
    .brut-ex .ex-all {
        display: block;
        padding: 18px 32px 28px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 12px;
        letter-spacing: 0.04em;
        color: var(--brut-ink-2);
        text-decoration: none;
        text-transform: lowercase;
    }
    .brut-ex .ex-all:hover {
        color: var(--brut-accent);
    }

    /* ── Footer big-type ──────────────────────────────────────────── */
    .brut-foot {
        position: relative;
        padding: 64px 32px 96px;
        text-align: center;
    }
    .brut-foot .info {
        display: flex;
        gap: 18px;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
        margin-bottom: 28px;
    }
    .brut-foot .info.right {
        justify-content: flex-end;
        margin-top: 28px;
        margin-bottom: 0;
    }
    .brut-foot .info .v {
        color: var(--brut-accent);
        text-decoration: none;
    }
    .brut-foot :global(.big) {
        position: relative;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: clamp(36px, 7vw, 96px);
        line-height: 1.05;
        letter-spacing: -0.04em;
        text-transform: lowercase;
        font-weight: 500;
        color: var(--brut-ink-1);
        background: transparent;
        border: 0;
        padding: 0;
        cursor: pointer;
        display: inline-block;
    }
    .brut-foot :global(.big span) {
        color: var(--brut-accent);
    }
    .brut-foot :global(.big .copy-hint) {
        position: absolute;
        bottom: -28px;
        left: 0;
        right: 0;
        height: 18px;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .brut-foot :global(.big .copy-hint-label) {
        position: absolute;
        inset: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    /* ── Responsive collapse ─────────────────────────────────────── */
    @media (max-width: 900px) {
        .brut-hero {
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 40px 20px 56px;
        }
        .brut-stats {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stats .s {
            border-right: 1px solid var(--brut-rule);
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-stats .s:nth-child(2n) {
            border-right: 0;
        }
        .brut-stats .s:nth-last-child(-n + 2) {
            border-bottom: 0;
        }
        .brut-feat .grid,
        .brut-ex .grid,
        .brut-ai .ai-grid {
            grid-template-columns: 1fr;
        }
        .brut-feat .cell,
        .brut-ex .cell,
        .brut-ai .ai-cell {
            border-right: 0;
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .cell:last-child,
        .brut-ex .cell:last-child,
        .brut-ai .ai-cell:last-child {
            border-bottom: 0;
        }
        .lede {
            padding: 36px 20px 14px;
        }
        .brut-comp {
            padding: 36px 20px 48px;
        }
        .brut-coord {
            display: none;
        }
    }
</style>
