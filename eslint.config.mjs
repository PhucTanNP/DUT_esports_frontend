import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * ESLint flat config (chuẩn ESLint 9+).
 * - js.configs.recommended: rule JS cơ bản
 * - tseslint.configs.recommended: rule TS (không cần type-check)
 * - nextPlugin.configs['core-web-vitals']: rule chuẩn Next.js
 * - react / react-hooks flat: rule React + hooks
 * - prettier: tắt rule xung đột Prettier
 */
const config = defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', 'out/**', 'build/**']),

  // Settings toàn cục — plugin react cần biết phiên bản React
  {
    settings: {
      react: { version: 'detect' },
    },
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  nextPlugin.configs['core-web-vitals'],

  react.configs.flat.recommended,
  reactHooks.configs.flat.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // React 19 + Next.js — không cần import React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Dự án cố tình dùng <img> thuần — xem next.config.ts (images.unoptimized)
      '@next/next/no-img-element': 'off',
    },
  },

  prettier,
]);

export default config;
