/**
 * Generates `src/lib/generated/plugin-props.json` from the library's plugin
 * prop-set types, so the docs' "Prop Set" sections describe exactly what
 * `cell.current.props.<plugin>` / `row.current.props.<plugin>` contain, with
 * the JSDoc from the source, instead of hand-written lists that drift.
 *
 * Run: `pnpm docs:props` (also runs as part of `pnpm build`).
 */
import { readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..', '..')
const pluginsDir = path.join(root, 'src', 'lib', 'plugins')
const outputPath = path.resolve(__dirname, '..', 'src', 'lib', 'generated', 'plugin-props.json')

const COMPONENT_KEYS = ['thead.tr', 'thead.tr.th', 'tbody.tr', 'tbody.tr.td'] as const
type ComponentKey = (typeof COMPONENT_KEYS)[number]

interface PropDoc {
    name: string
    type: string
    doc: string
}
type PropSetDoc = Partial<Record<ComponentKey, PropDoc[]>>

const pluginFiles = readdirSync(pluginsDir)
    .filter((f) => /^add[A-Z].*\.ts$/.test(f) && !f.includes('.test.') && !f.endsWith('.types.ts'))
    .map((f) => path.join(pluginsDir, f))

const program = ts.createProgram(pluginFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    baseUrl: root,
    paths: { '$lib/*': ['src/lib/*'] }
})
const checker = program.getTypeChecker()
const typeFlags =
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope

/** Parameter names in the library are underscore-prefixed to satisfy lint; readers do not need that. */
const displayType = (type: string): string =>
    type.replace(/\(_(\w+):/g, '($1:').replace(/, _(\w+):/g, ', $1:')

const result: Record<string, PropSetDoc> = {}

for (const file of pluginFiles) {
    const source = program.getSourceFile(file)

    if (!source) continue
    ts.forEachChild(source, (node) => {
        if (!ts.isTypeAliasDeclaration(node) || !node.name.text.endsWith('PropSet')) return
        if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return
        const setType = checker.getTypeAtLocation(node.name)
        const doc: PropSetDoc = {}
        for (const key of COMPONENT_KEYS) {
            const rawType = checker.getTypeOfPropertyOfType(setType, key)
            if (!rawType || rawType.flags & ts.TypeFlags.Never) continue
            // Prop sets may be declared optional (`{ … } | undefined`); document the object shape.
            const keyType = checker.getNonNullableType(rawType)
            const props = keyType.getProperties()
            if (props.length === 0) continue
            doc[key] = props.map((sym) => ({
                name: sym.getName(),
                type: displayType(
                    checker.typeToString(checker.getTypeOfSymbol(sym), undefined, typeFlags)
                ),
                doc: ts.displayPartsToString(sym.getDocumentationComment(checker)).trim()
            }))
        }
        if (Object.keys(doc).length > 0) result[node.name.text] = doc
    })
}

const ordered = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(outputPath, JSON.stringify(ordered, null, 4) + '\n')
console.log(
    `plugin-props: ${Object.keys(ordered).length} prop sets → ${path.relative(root, outputPath)}`
)
