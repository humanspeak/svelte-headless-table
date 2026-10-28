import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Renders `docs/llms-prepend.md` (a template) into the Markdown docs-kit
// inlines at the top of /llms.txt and /llms-full.txt. Facts that drift when
// the library changes are pulled from the repo instead of being typed in:
//
//   * `{{sveltePeer}}` -> the root package.json `peerDependencies.svelte`
//
// An unknown placeholder throws, so the build fails rather than publishing a
// half-rendered file.

export const renderLlmsPrepend = (template: string, repoRoot: string): string => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
        peerDependencies?: Partial<Record<string, string>>
    }
    const values: Partial<Record<string, string>> = {
        sveltePeer: pkg.peerDependencies?.svelte
    }

    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
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
