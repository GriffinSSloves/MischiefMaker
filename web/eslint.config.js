import {
  sharedIgnores,
  baseJSConfig,
  baseTSConfig,
  globalRulesConfig,
  testFilesConfig,
  prettierConfig,
} from '../eslint.config.base.js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // Shared ignore patterns with web-specific additions
  {
    ...sharedIgnores,
    ignores: [
      ...sharedIgnores.ignores,
      'public/**', // Web-specific ignore
      'src/components/ui/**', // ShadCN UI components (third-party)
    ],
  },

  // Base JavaScript config with browser-specific globals
  {
    ...baseJSConfig,
    languageOptions: {
      ...baseJSConfig.languageOptions,
      globals: {
        ...baseJSConfig.languageOptions.globals,
        // Browser-specific globals
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        history: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
      },
    },
  },

  prettierConfig,

  // TypeScript config for web with JSX support
  {
    ...baseTSConfig,
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ...baseTSConfig.languageOptions,
      parserOptions: {
        ...baseTSConfig.languageOptions.parserOptions,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // React configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Global rules for web files
  {
    ...globalRulesConfig,
    files: ['**/*.{js,jsx,ts,tsx}'],
  },

  // Test file overrides
  {
    ...testFilesConfig,
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  },
];
