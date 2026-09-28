import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

// Files that get the type-aware rule set. Everything under `src/` and the
// Playwright specs are covered by `tsconfig.json`, so the type checker can
// back the `no-unsafe-*` family and friends.
const TYPED_FILES = ['src/**/*.ts', 'src/**/*.svelte.ts', 'src/**/*.svelte', 'tests/**/*.ts']

// Presets ship parser/plugin wiring alongside their rules. Only the rules are
// wanted here: the parser for `.svelte` files is configured further down and
// must not be overridden by the TypeScript preset.
const rulesOnly = (configs, files) =>
    configs.map((config) => ({ files, rules: config.rules ?? {} }))

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
    // Type-aware strictness for everything the type checker can see.
    ...rulesOnly(ts.configs.strictTypeChecked, TYPED_FILES),
    ...rulesOnly(ts.configs.stylisticTypeChecked, TYPED_FILES),
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
        languageOptions: {
            parserOptions: {
                projectService: false
            }
        }
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            parserOptions: {
                parser: ts.parser
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
