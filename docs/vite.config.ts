import {
    demoManifestPlugin,
    docMirrorsPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin
} from '@humanspeak/docs-kit/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import rootPkg from '../package.json'
import { docsConfig } from './src/lib/docs-config'

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
    plugins: [
        sitemapManifestPlugin({ blogDir: false }),
        demoManifestPlugin(),
        docMirrorsPlugin({ siteUrl: docsConfig.url }),
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
            prepend: 'llms-prepend.md'
        }),
        llmsFullPlugin({
            siteUrl: docsConfig.url,
            pkgName: rootPkg.name,
            prepend: 'llms-prepend.md'
        }),
        tailwindcss(),
        sveltekit()
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
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Isolate heavy dependencies into their own chunks so they
                    // only load on the pages that actually need them.
                    if (id.includes('node_modules/prettier')) {
                        return 'prettier'
                    }
                    if (id.includes('node_modules/mermaid')) {
                        return 'mermaid'
                    }
                    if (id.includes('node_modules/shiki')) {
                        return 'shiki'
                    }
                    if (id.includes('node_modules/katex')) {
                        return 'katex'
                    }
                    if (id.includes('node_modules/marked-code-format')) {
                        return 'marked-code-format'
                    }
                    if (id.includes('node_modules/@humanspeak/svelte-motion')) {
                        return 'svelte-motion'
                    }
                }
            }
        }
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
})
