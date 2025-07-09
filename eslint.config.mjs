import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sortDestructureKeysPlugin from 'eslint-plugin-sort-destructure-keys'
import sortKeysFixPlugin from 'eslint-plugin-sort-keys-fix'
import unusedImports from 'eslint-plugin-unused-imports'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
})

const config = [
  ...compat.config({
    extends: ['next/core-web-vitals'],
    settings: {
      next: {
        rootDir: '.'
      }
    }
  }),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'simple-import-sort': simpleImportSort,
      'sort-destructure-keys': sortDestructureKeysPlugin,
      'sort-keys-fix': sortKeysFixPlugin,
      'unused-imports': unusedImports
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'padding-line-between-statements': [
        1,
        {
          blankLine: 'always',
          next: [
            'block-like',
            'block',
            'return',
            'if',
            'class',
            'continue',
            'debugger',
            'break',
            'multiline-const',
            'multiline-let'
          ],
          prev: '*'
        },
        {
          blankLine: 'always',
          next: '*',
          prev: [
            'case',
            'default',
            'multiline-const',
            'multiline-let',
            'multiline-block-like'
          ]
        },
        {
          blankLine: 'never',
          next: ['block', 'block-like'],
          prev: ['case', 'default']
        },
        {
          blankLine: 'always',
          next: ['block', 'block-like'],
          prev: ['block', 'block-like']
        },
        {
          blankLine: 'always',
          next: ['empty'],
          prev: 'export'
        },
        {
          blankLine: 'never',
          next: 'iife',
          prev: ['block', 'block-like', 'empty']
        }
      ],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effect imports
            ['^\\u0000'],
            // Node.js builtins prefixed with `node:`
            ['^node:'],
            // Packages (things that start with a letter/digit/underscore, or `@` followed by a letter)
            ['^@?\\w'],
            // Internal packages (adjust path as needed)
            ['^@/'],
            // Parent imports (put `..` last)
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Other relative imports (put same-folder imports and `.` last)
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Style imports
            ['^.+\\.s?css$']
          ]
        }
      ],
      'sort-destructure-keys/sort-destructure-keys': 2,
      'sort-keys-fix/sort-keys-fix': 2,
      'unused-imports/no-unused-imports': 'error'
    }
  }
]

export default config
