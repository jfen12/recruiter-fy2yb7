// ESLint configuration for RefactorTrack Web Application
// Version: 1.0.0
// Dependencies:
// @typescript-eslint/eslint-plugin@^6.0.0
// @typescript-eslint/parser@^6.0.0
// eslint-plugin-react@^7.33.0
// eslint-plugin-react-hooks@^4.6.0
// eslint-plugin-import@^2.28.0
// eslint-config-prettier@^8.8.0

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: '.',
    createDefaultProgram: true,
  },

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier', // Must be last to override other configs
  ],

  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
  ],

  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/unbound-method': 'error',

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript instead
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Import/Export rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': ['error', {
      unusedExports: true,
    }],
    'import/no-deprecated': 'warn',
    'import/no-duplicates': 'error',
  },

  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },

  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    '*.config.js',
    '*.config.ts',
  ],
};