import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import webArchitecture from './scripts/web-architecture-rule.mjs';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*', '**/*.spec.*'],
    plugins: { architecture: { rules: { mvvm: webArchitecture } } },
    rules: { 'architecture/mvvm': 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: [
          'eslint.config.mjs',
          'vitest.workspace.ts',
          'apps/api/vitest.config.ts',
          'apps/api/vitest.integration.config.ts',
        ],
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
