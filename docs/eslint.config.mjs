import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/.DS_Store',
            '**/node_modules',
            'postcss.config.cjs',
            'coverage',
            '**/build',
            '.svelte-kit',
            'package',
            '**/.env',
            '**/.env.*',
            '!**/.env.example',
            '**/pnpm-lock.yaml',
            '**/package-lock.json',
            '**/yarn.lock',
            'src/routes/poc',
            '**/dist',
            '**/*.test.ts',
            '**/*.d.ts'
        ]
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs['flat/recommended'],
    prettier,
    ...svelte.configs['flat/prettier'],
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            },
            parserOptions: {
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            'unused-imports': unusedImports
        },
        rules: {
            // Formatting is Prettier's job (see eslint-config-prettier above);
            // only correctness and consistency rules live here.
            camelcase: 'error',
            'guard-for-in': 'error',
            'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
            'no-unneeded-ternary': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            yoda: 'error',

            // The newer eslint-plugin-svelte ships a strict rule requiring
            // every internal `href` to flow through SvelteKit's typed
            // `resolve()` helper. Sibling humanspeak docs sites
            // (`svelte-markdown`, `svelte-motion`) use static `href`s
            // throughout; disabling here keeps the three sites consistent.
            'svelte/no-navigation-without-resolve': 'off',

            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }
            ],

            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ]
        }
    },
    {
        // Also covers `*.svelte.ts` / `*.svelte.js` (Svelte 5 typed-runes
        // files) — without the TypeScript parser as the inner parser, the
        // svelte-eslint-parser chokes on TypeScript generic-call syntax
        // like `$state<T>()`.
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                parser: tsParser
            }
        }
    }
]
