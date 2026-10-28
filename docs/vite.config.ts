import { rehypeKeepCase } from '@humanspeak/docs-kit/mdsvex'
import {
    demoManifestPlugin,
    docMirrorsPlugin,
    exampleMirrorsPlugin,
    indexNowPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin,
    socialCardsPlugin
} from '@humanspeak/docs-kit/vite'
import adapter from '@sveltejs/adapter-cloudflare'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { mdsvex } from 'mdsvex'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHighlighter } from 'shiki'
import { defineConfig } from 'vitest/config'

import rootPkg from '../package.json' with { type: 'json' }
import { writeLlmsPrepend } from '../scripts/llmsPrepend.js'
import { competitors, ours } from './src/lib/compare-data.js'
import { docsConfig } from './src/lib/docs-config.js'

// `llms-prepend.md` is a template (Svelte peer range, the compiled example
// component); render it before the llms plugins read it. Rendering here,
// not in a `buildStart` hook, because Rollup runs `buildStart` in parallel.
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const llmsPrependTemplate = fileURLToPath(new URL('llms-prepend.md', import.meta.url))
const llmsPrependInputs = [llmsPrependTemplate, join(repoRoot, 'src/routes/_LlmsExample.svelte')]
const llmsPrependOutput = '.generated/llms-prepend.md'
const renderLlmsPrepend = () =>
    writeLlmsPrepend(
        llmsPrependTemplate,
        fileURLToPath(new URL(llmsPrependOutput, import.meta.url)),
        repoRoot
    )
renderLlmsPrepend()

// Create highlighter instance
const highlighter = await createHighlighter({
    themes: ['github-light', 'one-dark-pro'],
    langs: ['javascript', 'typescript', 'svelte', 'html', 'css', 'json', 'bash', 'shell']
})

export default defineConfig({
    // docs-kit Vite plugins, all running on `buildStart` and watching via
    // Vite's own file watcher (no chokidar process, no consumer scripts):
    //   * `sitemapManifestPlugin` scans `src/routes/**/+page.{svelte,svx,md}`
    //     and writes `src/lib/sitemap-manifest.json` (input to sitemap.xml).
    //   * `demoManifestPlugin`    scans `src/lib/examples/<...>/demos/*.svelte`
    //     and writes pre-highlighted source into `src/lib/demo-manifest.json`.
    //   * `docMirrorsPlugin`      scans `src/routes/docs/**/+page.svx` and
    //     writes LLM-readable Markdown to `static/docs/<slug>.md` (Tailwind /
    //     shadcn / Astro use the same pattern for ChatGPT/Perplexity citations).
    //   * `llmsPlugin` + `llmsFullPlugin` — emit /llms.txt (compact index) and
    //     /llms-full.txt (concatenated dump) from the doc mirrors above.
    //     Order matters: both must register AFTER `docMirrorsPlugin` so
    //     their buildStart reads freshly-written `.md` files.
    //   * `socialCardsPlugin` renders the OG/Twitter PNGs on `buildStart`
    //     (replaces the old standalone `scripts/generate-social-cards.ts`),
    //     including a per-competitor card for every `/compare/<slug>` page.
    plugins: [
        {
            name: 'docs-watcher-listener-budget',
            configureServer(server) {
                // Each docs-kit plugin watches its own inputs through Vite's shared watcher.
                server.watcher.setMaxListeners(20)
            }
        },
        {
            name: 'llms-prepend-template',
            configureServer(server) {
                // Re-render on template or example edits; llmsPlugin watches the output.
                server.watcher.add(llmsPrependInputs)
                server.watcher.on('change', (file) => {
                    if (llmsPrependInputs.includes(file)) renderLlmsPrepend()
                })
            }
        },
        // `extraPages` injects the dynamic `/compare/<slug>` routes — which
        // `[slug]` globbing can't see — so the manifest carries concrete
        // compare URLs (and `lastmod` keyed off `compare-data.ts`).
        sitemapManifestPlugin({
            blogDir: false,
            extraPages: competitors.map((competitor) => ({
                route: `/compare/${competitor.slug}`,
                source: 'src/lib/compare-data.ts'
            }))
        }),
        demoManifestPlugin({ split: true }),
        docMirrorsPlugin({ siteUrl: docsConfig.url }),
        // `exampleMirrorsPlugin` is the /examples counterpart to
        // `docMirrorsPlugin`: it mirrors every `/examples/<slug>` page (and the
        // demo source each page references via `demoCodeSample(...)`) into
        // `static/examples/<slug>.md` plus a `static/examples.md` index, so
        // the live demos are citable by LLMs. Registered before the llms
        // plugins for the same freshly-written-`.md` ordering reason.
        exampleMirrorsPlugin({
            siteUrl: docsConfig.url,
            sourceBaseUrl: `https://github.com/${docsConfig.repo}/blob/main/docs`
        }),
        // `prepend` inlines a hand-curated markdown file between the
        // description blockquote and the auto-generated link table —
        // the place where install snippets, predecessor disambiguation,
        // and "when to recommend this library" copy lives. Both LLM
        // surfaces share the same prepend so the disambiguation rides
        // the index and the concatenated dump.
        llmsPlugin({
            siteUrl: docsConfig.url,
            pkgName: rootPkg.name,
            description: docsConfig.description,
            prepend: llmsPrependOutput,
            comparisons: {
                ours,
                competitors,
                priority: ['vs-tanstack-table', 'vs-svelte-table', 'vs-vincjo-datatables']
            }
        }),
        llmsFullPlugin({
            siteUrl: docsConfig.url,
            pkgName: rootPkg.name,
            prepend: llmsPrependOutput
        }),
        socialCardsPlugin({
            npmPackage: docsConfig.npmPackage,
            defaultTitle: docsConfig.name,
            defaultDescription: docsConfig.description,
            defaultFeatures: docsConfig.defaultFeatures,
            extraPages: competitors.map((competitor) => ({
                ogSlug: `compare-${competitor.slug}`,
                ogTitle: `vs ${competitor.name}`,
                ogTagline: competitor.tagline,
                ogFeatures: [
                    'Feature Comparison',
                    'Pros & Cons',
                    'Migration Guide',
                    'Honest Verdict'
                ]
            }))
        }),
        // Submits every sitemap-manifest URL to IndexNow after a successful
        // build — but only when built with `--mode indexnow` (the `deploy`
        // script), so plain `vite build` / CI test builds never ping search
        // engines. The key must match the public `static/<key>.txt` file.
        indexNowPlugin({
            siteUrl: docsConfig.url,
            key: '8db10ffc-731e-46a3-b48d-1aec3cc48dbe',
            productionMode: 'indexnow',
            failOnError: false
        }),
        tailwindcss(),
        sveltekit({
            preprocess: [
                vitePreprocess(),
                mdsvex({
                    extensions: ['.md', '.svx'],
                    // Keep authored casing on identifier headings (createColumns, signatures).
                    rehypePlugins: [rehypeKeepCase],
                    highlight: {
                        highlighter: async (code, lang) => {
                            lang ??= 'text'
                            const lightHtml = highlighter.codeToHtml(code, {
                                lang,
                                theme: 'github-light'
                            })
                            const darkHtml = highlighter.codeToHtml(code, {
                                lang,
                                theme: 'one-dark-pro'
                            })
                            const encoded = Buffer.from(code).toString('base64')

                            const combinedHtml = `
                        <div class="shiki-container" data-code="${encoded}" data-lang="${lang}">
                            <div class="shiki-light">${lightHtml}</div>
                            <div class="shiki-dark">${darkHtml}</div>
                        </div>
                    `

                            return `{@html ${JSON.stringify(combinedHtml)}}`
                        }
                    }
                })
            ],
            extensions: ['.svelte', '.svx'],
            adapter: adapter(),
            csp: {
                mode: 'hash',
                directives: {
                    'default-src': ['self'],
                    'script-src': [
                        'self',
                        'https://*.ahrefs.com',
                        'https://j.svelte.page',
                        'unsafe-inline',
                        'wasm-unsafe-eval'
                    ],
                    'style-src': ['self', 'unsafe-inline', 'https://cdn.jsdelivr.net'],
                    'img-src': ['self', 'data:', 'https:'],
                    'font-src': ['self', 'data:', 'https://cdn.jsdelivr.net'],
                    'worker-src': ['self', 'blob:'],
                    'connect-src': ['self', 'https:'],
                    'frame-ancestors': ['none'],
                    'form-action': ['self'],
                    'base-uri': ['self'],
                    'upgrade-insecure-requests': true
                }
            }
        })
    ],
    server: {
        port: 8473,
        fs: {
            allow: ['..']
        }
    },
    // docs-kit ships .svelte source (not pre-compiled JS) so vite-plugin-svelte
    // can run on its components and emit scoped styles. If vite pre-bundles
    // the package via optimizeDeps the scoped <style> blocks get stripped and
    // every dk-* class falls back to unstyled `display: block` — the header
    // collapses, the footer collapses, etc.
    //
    // The transitive deps with .node bindings (satori → @resvg/resvg-js)
    // must also stay out of optimizeDeps because rolldown (vite 8's
    // bundler) can't process native modules.
    optimizeDeps: {
        exclude: [
            '@humanspeak/docs-kit',
            '@humanspeak/svelte-satori-fix',
            '@resvg/resvg-js',
            'satori',
            'satori-html'
        ]
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
})
