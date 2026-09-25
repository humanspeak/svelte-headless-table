import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compile } from 'svelte/compiler'

// Consumers may force `compilerOptions.runes = true` for their whole app,
// which vite-plugin-svelte also applies to library components. Subscribe
// must compile cleanly in every mode, and `let:` slot props must still be
// served by a `<slot>` (see Subscribe.test.ts for the runtime side).
const source = readFileSync(resolve(process.cwd(), 'src/lib/subscribe/Subscribe.svelte'), 'utf8')

describe.each([
    ['inferred', undefined],
    ['runes: true', true],
    ['runes: false', false]
] as const)('Subscribe.svelte compiles with %s', (_label, runes) => {
    it('produces client output without errors or warnings', () => {
        const result = compile(source, { runes, generate: 'client', filename: 'Subscribe.svelte' })
        expect(result.js.code.length).toBeGreaterThan(0)
        expect(result.warnings.map((w) => w.code)).toEqual([])
    })

    it('produces server output without errors', () => {
        const result = compile(source, { runes, generate: 'server', filename: 'Subscribe.svelte' })
        expect(result.js.code.length).toBeGreaterThan(0)
    })
})
