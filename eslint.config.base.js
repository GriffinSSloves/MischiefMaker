import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

// Shared ignore patterns for all packages
export const sharedIgnores = {
  ignores: [
    'dist/**',
    'build/**',
    'node_modules/**',
    'coverage/**',
    '.git/**',
    '.prettierrc*',
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    '*.log',
    '.DS_Store',
  ],
};

// Base JavaScript configuration
export const baseJSConfig = {
  ...js.configs.recommended,
  languageOptions: {
    globals: {
      console: 'readonly',
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
};

// Base TypeScript configuration
export const baseTSConfig = {
  files: ['**/*.ts'],
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  plugins: {
    '@typescript-eslint': typescript,
  },
  rules: {
    ...typescript.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};

// Global rules for all JS/TS files
export const globalRulesConfig = {
  files: ['**/*.{js,ts}'],
  rules: {
    'no-unused-vars': 'off', // Handled by TypeScript rule
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    // Enforce braces for all control statements (if/else/loops/try)
    curly: ['error', 'all'],
  },
};

// Test file overrides
export const testFilesConfig = {
  files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off',
  },
};

// Prettier config to disable conflicting rules
export const prettierConfig = prettier;
