import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import * as lib from './lib/index.js'
import * as plugins from './lib/plugins/index.js'

// Agent-facing docs (the `skills/` folder shipped in the npm package, and the
// hand-written block prepended to /llms.txt) are read by coding assistants as
// ground truth. These tests keep them wired into the package and stop them
// teaching the removed v6 store API or naming exports that do not exist.

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const skillsDir = join(root, 'skills')

const EXPECTED_SKILLS = [
    'core',
    'migrate-from-svelte-headless-table',
    'migrate-v6-to-v7',
    'plugins'
]
const SKILL_TYPES = ['core', 'lifecycle']

// Snippets preceded by this marker show pre-v7 code on purpose (migration skills).
const LEGACY_MARKER = '<!-- legacy-snippet -->'

const V6_ONLY_PATTERNS: [RegExp, string][] = [
    [/<Subscribe\b/, '<Subscribe> was removed in v7; read row.current / cell.current'],
    [/\bSubscribe\b.*from '@humanspeak/, 'Subscribe is not exported in v7'],
    [/\blet:\w+/, 'let: directives belong to the removed <Subscribe>'],
    [/\.(attrs|props)\(\)/, 'attrs()/props() were removed; use current.attrs / current.props'],
    [
        /\$(headerRows|pageRows|rows|tableAttrs|tableBodyAttrs|tableHeadAttrs)\b/,
        'view-model stores were removed; use vm.current.*'
    ],
    [
        /createTable\(\s*(readable|writable)\(/,
        'createTable throws on stores in v7; pass an array or a getter'
    ],
    [/createRender\([^)]*\)\.on\(/, 'createRender(...).on() was removed; pass on<event> props']
]

const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
    })

const skillFiles = () =>
    existsSync(skillsDir) ? walk(skillsDir).filter((f) => f.endsWith('.md')) : []

const agentDocFiles = () => [...skillFiles(), join(root, 'docs/llms-prepend.md')]

interface Snippet {
    file: string
    line: number
    lang: string
    code: string
    legacy: boolean
}

const snippetsOf = (file: string): Snippet[] => {
    const lines = readFileSync(file, 'utf8').split('\n')
    const snippets: Snippet[] = []
    for (let i = 0; i < lines.length; i++) {
        const open = /^\s*```(\w*)/.exec(lines[i])
        if (!open) continue
        const start = i
        const body: string[] = []
        while (++i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i])
        const before = lines
            .slice(0, start)
            .reverse()
            .find((l) => l.trim() !== '')
        snippets.push({
            file,
            line: start + 1,
            lang: open[1],
            code: body.join('\n'),
            legacy: before?.trim() === LEGACY_MARKER
        })
    }
    return snippets
}

const CODE_LANGS = ['ts', 'js', 'svelte', 'typescript', 'javascript']
const currentSnippets = () =>
    agentDocFiles()
        .flatMap(snippetsOf)
        .filter((s) => !s.legacy && CODE_LANGS.includes(s.lang))

const where = (s: Snippet) => `${relative(root, s.file)}:${s.line}`

/** Minimal frontmatter reader: top-level scalars, one nested map, string lists. */
const frontmatterOf = (file: string): Record<string, unknown> => {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, 'utf8'))
    if (!match) return {}
    const result: Record<string, unknown> = {}
    let key: string | undefined
    for (const line of match[1].split('\n')) {
        const top = /^(\w+):\s*(.*)$/.exec(line)
        if (top) {
            key = top[1]
            result[key] = top[2] === '' ? undefined : top[2].replace(/^'(.*)'$/, '$1')
            continue
        }
        if (key === undefined) continue
        const item = /^\s+-\s+(.*)$/.exec(line)
        const nested = /^\s+(\w+):\s*(.*)$/.exec(line)
        if (item) {
            result[key] = [...((result[key] as string[] | undefined) ?? []), item[1]]
        } else if (nested) {
            const map = (result[key] as Record<string, string> | undefined) ?? {}
            map[nested[1]] = nested[2].replace(/^'(.*)'$/, '$1')
            result[key] = map
        } else if (line.trim() !== '') {
            // folded continuation of a scalar
            result[key] = `${(result[key] as string | undefined) ?? ''} ${line.trim()}`.trim()
        }
    }
    return result
}

describe('agent skills packaging', () => {
    it('ships the skills folder in the npm tarball', () => {
        expect(pkg.files).toContain('skills')
    })

    it('is discoverable by TanStack Intent', () => {
        expect(pkg.keywords).toContain('tanstack-intent')
    })

    it('has the expected skills', () => {
        const dirs = existsSync(skillsDir)
            ? readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, 'SKILL.md')))
            : []
        expect(dirs.sort()).toEqual(EXPECTED_SKILLS)
    })
})

describe.each(EXPECTED_SKILLS)('skill %s', (name) => {
    const file = join(skillsDir, name, 'SKILL.md')
    const fm = () => frontmatterOf(file)

    it('has frontmatter naming itself and describing when to use it', () => {
        const { name: declared, description } = fm()
        expect(declared).toBe(name)
        expect(typeof description === 'string' ? description.length : 0).toBeGreaterThan(40)
    })

    it('declares a known type and this library', () => {
        const metadata = (fm().metadata ?? {}) as Partial<Record<string, string>>
        expect(SKILL_TYPES).toContain(metadata.type)
        expect(metadata.library).toBe(pkg.name)
    })

    it('targets the current major version', () => {
        const metadata = (fm().metadata ?? {}) as Partial<Record<string, string>>
        expect(metadata.library_version?.split('.')[0]).toBe(pkg.version.split('.')[0])
    })

    it('only requires skills that exist', () => {
        for (const required of (fm().requires as string[] | undefined) ?? []) {
            expect(EXPECTED_SKILLS).toContain(required)
        }
    })
})

describe('agent doc snippets', () => {
    it('finds snippets to check', () => {
        expect(currentSnippets().length).toBeGreaterThan(5)
    })

    it('never teach the removed v6 store API outside legacy-marked blocks', () => {
        const problems = currentSnippets().flatMap((s) =>
            V6_ONLY_PATTERNS.filter(([pattern]) => pattern.test(s.code)).map(
                ([, why]) => `${where(s)}: ${why}`
            )
        )
        expect(problems).toEqual([])
    })

    it('only import runtime names the package actually exports', () => {
        const entryPoints: Partial<Record<string, Record<string, unknown>>> = {
            '@humanspeak/svelte-headless-table': lib,
            '@humanspeak/svelte-headless-table/plugins': plugins
        }
        const importRe = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g
        const problems: string[] = []
        for (const s of currentSnippets()) {
            for (const [, typeOnly, names, from] of s.code.matchAll(importRe)) {
                const exports = entryPoints[from]
                if (!exports || typeOnly) continue
                for (const raw of names.split(',')) {
                    const spec = raw.trim()
                    if (spec === '' || spec.startsWith('type ')) continue
                    const name = spec.split(/\s+as\s+/)[0]
                    if (!(name in exports))
                        problems.push(`${where(s)}: ${name} is not exported from ${from}`)
                }
            }
        }
        expect(problems).toEqual([])
    })

    it('link only to files that exist', () => {
        const problems: string[] = []
        for (const file of skillFiles()) {
            for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^)#\s]+)\)/g)) {
                if (/^[a-z]+:/.test(target)) continue
                if (!existsSync(resolve(dirname(file), target))) {
                    problems.push(`${relative(root, file)}: ${target}`)
                }
            }
        }
        expect(problems).toEqual([])
    })
})
