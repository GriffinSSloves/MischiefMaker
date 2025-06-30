import {
  sharedIgnores,
  baseJSConfig,
  baseTSConfig,
  globalRulesConfig,
  testFilesConfig,
  prettierConfig,
} from '../eslint.config.base.js';

export default [
  // Shared ignore patterns
  sharedIgnores,

  // Base JavaScript config with platform-agnostic globals
  {
    ...baseJSConfig,
    languageOptions: {
      ...baseJSConfig.languageOptions,
      globals: {
        ...baseJSConfig.languageOptions.globals,
        // Core is platform-agnostic - only universal JavaScript globals
      },
    },
  },

  // Prettier config
  prettierConfig,

  // TypeScript config
  baseTSConfig,

  // Global rules
  globalRulesConfig,

  // Test file overrides
  testFilesConfig,
];
