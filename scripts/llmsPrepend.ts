import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Renders `docs/llms-prepend.md` (a template) into the Markdown docs-kit
// inlines at the top of /llms.txt and /llms-full.txt. Facts that drift when
// the library changes are pulled from the repo instead of being typed in:
//
//   * `{{sveltePeer}}` -> the root package.json `peerDependencies.svelte`
//   * a line `<!-- include: <path> -->` -> that file (relative to the repo
//     root) as a fenced code block, with `$lib` imports rewritten to the
//     public package entry points. The included component is type-checked
//     by the root `pnpm run check` and rendered by `src/agentDocs.test.ts`.
//
// Unknown placeholders and missing includes throw, so the build fails rather
// than publishing a half-rendered file.

const PUBLIC_IMPORTS: [string, string][] = [
    ["'$lib/plugins/index.js'", "'@humanspeak/svelte-headless-table/plugins'"],
    ["'$lib/index.js'", "'@humanspeak/svelte-headless-table'"]
]

const FENCE_LANG: Record<string, string> = { svelte: 'svelte', ts: 'ts', js: 'js' }

const toPublicImports = (source: string, path: string): string => {
    let result = source
    for (const [from, to] of PUBLIC_IMPORTS) result = result.replaceAll(from, to)
    if (result.includes('$lib')) {
        throw new Error(`llms prepend: ${path} imports a $lib path with no public equivalent`)
    }
    return result
}

export const renderLlmsPrepend = (template: string, repoRoot: string): string => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
        peerDependencies?: Partial<Record<string, string>>
    }
    const values: Partial<Record<string, string>> = {
        sveltePeer: pkg.peerDependencies?.svelte
    }

    const withIncludes = template.replace(/^<!-- include: (\S+) -->$/gm, (_, path: string) => {
        const abs = join(repoRoot, path)
        if (!existsSync(abs)) throw new Error(`llms prepend: include not found: ${path}`)
        const lang = FENCE_LANG[path.split('.').pop() ?? ''] ?? ''
        const source = toPublicImports(readFileSync(abs, 'utf8'), path).trim()
        return `\`\`\`${lang}\n${source}\n\`\`\``
    })

    return withIncludes.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
        const value = values[key]
        if (value === undefined) throw new Error(`llms prepend: unknown placeholder {{${key}}}`)
        return value
    })
}

/** Render `templatePath` and write the result to `outPath` (both absolute). */
export const writeLlmsPrepend = (templatePath: string, outPath: string, repoRoot: string): void => {
    const rendered = renderLlmsPrepend(readFileSync(templatePath, 'utf8'), repoRoot)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, rendered)
}
