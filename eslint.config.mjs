import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'

const sharedGlobals = {
  atob: 'readonly',
  btoa: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  document: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  fetch: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  Headers: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLDivElement: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  IDBKeyRange: 'readonly',
  indexedDB: 'readonly',
  IntersectionObserver: 'readonly',
  IntersectionObserverCallback: 'readonly',
  IntersectionObserverEntry: 'readonly',
  IntersectionObserverInit: 'readonly',
  KeyboardEvent: 'readonly',
  localStorage: 'readonly',
  MouseEvent: 'readonly',
  navigator: 'readonly',
  Node: 'readonly',
  performance: 'readonly',
  process: 'readonly',
  Request: 'readonly',
  requestAnimationFrame: 'readonly',
  ResizeObserver: 'readonly',
  ResizeObserverCallback: 'readonly',
  ResizeObserverOptions: 'readonly',
  Response: 'readonly',
  sessionStorage: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Window: 'readonly',
  window: 'readonly',
}

export default [
  {
    // ux-lab is its own Vite project with its own gates (vue-tsc, vitest,
    // build); ideas/ and work/ are local scratch; docs/ holds prose.
    ignores: [
      'coverage/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
      // Session worktrees the desktop app parks inside the repo (with their own dist/).
      '.claude/**',
      'ux-lab/**',
      'ideas/**',
      'work/**',
      'docs/**',
      '.*.tmp.mjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: sharedGlobals,
    },
    plugins: {
      vue,
      '@typescript-eslint': typescript,
    },
    rules: {
      ...vue.configs.essential.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  prettier,
]
