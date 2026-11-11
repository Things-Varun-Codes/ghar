import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

// Repo-local custom rules (both ERROR).
// no-silent-error: every catch / Inertia onError reports to Sentry or carries a
//   disable directive with a rationale. Off for scripts/** (Node harnesses).
// no-inertia-set-data-functional-updater: silent form-state corruption.
import noInertiaSetDataFunctionalUpdater from './tools/eslint-rules/no-inertia-set-data-functional-updater.js';
import noSilentError from './tools/eslint-rules/no-silent-error.js';

const controlStatements = [
    'if',
    'return',
    'for',
    'while',
    'do',
    'switch',
    'try',
    'throw',
];
const paddingAroundControl = [
    ...controlStatements.flatMap((stmt) => [
        { blankLine: 'always', prev: '*', next: stmt },
        { blankLine: 'always', prev: stmt, next: '*' },
    ]),
];

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat['recommended-latest'],
    ...typescript.configs.recommended,
    // Browser globals for every linted file.
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        plugins: {
            'import-x': importPlugin,
        },
        settings: {
            'import-x/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json',
                },
                node: true,
            },
        },
        rules: {
            // Enforced repo-wide: no `any` in resources/js, scripts or tools.
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
            'import-x/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            'import-x/consistent-type-specifier-style': [
                'error',
                'prefer-top-level',
            ],
        },
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/brace-style': [
                'error',
                '1tbs',
                { allowSingleLine: false },
            ],
            '@stylistic/padding-line-between-statements': [
                'error',
                ...paddingAroundControl,
            ],
        },
    },
    {
        // Register the repo-local plugin namespace with both custom rules.
        plugins: {
            local: {
                rules: {
                    'no-silent-error': noSilentError,
                    'no-inertia-set-data-functional-updater':
                        noInertiaSetDataFunctionalUpdater,
                },
            },
        },
        rules: {
            'local/no-silent-error': 'error',
            'local/no-inertia-set-data-functional-updater': 'error',
        },
    },
    {
        // The repo's Node-side scripts (scripts/**, tools/**, root *.config.js)
        // genuinely run under Node, so they need Node globals or eslint
        // reports 'process' etc. as undefined.
        files: [
            'scripts/**/*.mjs',
            'scripts/**/*.js',
            'tools/**/*.js',
            '*.config.js',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // Smoke harnesses run under Node with no Sentry pipeline, and most of
        // their catches record a test failure rather than swallowing one.
        files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
        rules: {
            'local/no-silent-error': 'off',
        },
    },
    {
        // `renderHook(() => useSomething())` calls a hook from a plain arrow callback,
        // which rules-of-hooks can't see through.
        files: ['resources/js/**/*.test.ts', 'resources/js/**/*.test.tsx'],
        rules: {
            'react-hooks/rules-of-hooks': 'off',
        },
    },
    {
        ignores: [
            'vendor',
            'node_modules',
            'public',
            'vite.config.ts',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
            // The custom rule fixture tests use string literals that
            // intentionally violate the rules under test; lint must skip them.
            'tools/eslint-rules/__tests__/**',
            // Local agent tooling, gitignored.
            '.claude/**',
            '.agents/**',
        ],
    },
    prettier,
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            curly: ['error', 'all'],
        },
    },
];
