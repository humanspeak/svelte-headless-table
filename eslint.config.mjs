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

// Files that get the type-aware rule set. Everything under `src/` and the
// Playwright specs are covered by a tsconfig, so the type checker can back the
// `no-unsafe-*` family and friends.
const TYPED_FILES = ['src/**/*.ts', 'src/**/*.svelte.ts', 'src/**/*.svelte', 'tests/**/*.ts']

// Library sources are type-checked with `tsconfig.lib.json` (adds
// `noUncheckedIndexedAccess`). Linting them against the same config keeps
// ESLint and `pnpm check:lib` in agreement about what an index read returns.
const LIB_FILES = ['src/lib/**/*.ts', 'src/lib/**/*.svelte.ts', 'src/lib/**/*.svelte']
const LIB_TEST_FILES = ['src/lib/**/*.test.ts', 'src/lib/**/*.test.svelte', 'src/lib/**/*.d.ts']

export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/.DS_Store',
            '.trunk/**',
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
            '**/*.d.ts',
            'docs-old/**',
            'docs-new/**',
            'docs/**'
        ]
    },
    js.configs.recommended,
    ...ts.configs.strictTypeChecked,
    ...ts.configs.stylisticTypeChecked,
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
                extraFileExtensions: ['.svelte'],
                projectService: true,
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

            // Unused imports are auto-fixable; unused variables are not, so the
            // two are reported separately. Leading underscores opt a binding out.
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
            ],

            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
            ],
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }
            ]
        }
    },
    {
        files: LIB_FILES,
        ignores: LIB_TEST_FILES,
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: './tsconfig.lib.json',
                // Resolved from the working directory rather than this file's
                // location: Trunk lints a sandbox whose config files are symlinks,
                // and a realpath-based root would not contain the linted copies.
                tsconfigRootDir: process.cwd()
            }
        }
    },
    {
        files: TYPED_FILES,
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/switch-exhaustiveness-check': 'error',

            // The codebase deliberately mixes `interface` (public shapes) and
            // `type` (unions, mapped types); forcing one form is churn, not safety.
            '@typescript-eslint/consistent-type-definitions': 'off',
            // Arrow callbacks that forward a void call are idiomatic in Svelte code.
            '@typescript-eslint/no-confusing-void-expression': [
                'error',
                { ignoreArrowShorthand: true }
            ],
            // Numbers and booleans interpolate unambiguously.
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                { allowNumber: true, allowBoolean: true }
            ]
        }
    },
    {
        files: ['**/*.test.ts', '**/*.test.svelte', 'vitest.setup.ts'],
        rules: {
            // Tests poke at internals and build fixtures loosely on purpose.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-deprecated': 'off'
        }
    },
    {
        files: [
            'eslint.config.mjs',
            'playwright.config.ts',
            'svelte.config.js',
            'scripts/*.mjs',
            'vitest.setup.ts'
        ],
        ...ts.configs.disableTypeChecked
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            parserOptions: {
                // The full `@typescript-eslint/parser` module, not `ts.parser`:
                // svelte-eslint-parser recognises it by shape. Given only
                // `ts.parser` it probes with `parseForESLint('', {})`, which
                // throws once a second config (docs/) has registered its own
                // tsconfigRootDir in the same process, as in Trunk's batched
                // runs. The probe failing drops the rune typings, so every
                // `$props()` becomes `any`.
                parser: tsParser
            }
        }
    },
    {
        // Modified complexity counts each switch once, regardless of case count.
        files: ['src/lib/**/*.{ts,js,svelte}', 'src/lib/**/*.svelte.ts'],
        ignores: ['src/lib/**/*.test.*', 'src/lib/**/*.spec.*', 'src/lib/**/*.d.ts'],
        rules: {
            complexity: ['error', { max: 15, variant: 'modified' }]
        }
    }
]
