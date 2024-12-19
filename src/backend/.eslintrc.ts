// ESLint configuration for RefactorTrack backend services
// @typescript-eslint/parser: ^6.0.0
// @typescript-eslint/eslint-plugin: ^6.0.0
// eslint-config-prettier: ^8.8.0
// eslint-plugin-import: ^2.27.5

export = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },

  env: {
    node: true,
    es2022: true,
    jest: true,
  },

  settings: {
    'import/resolver': {
      typescript: {},
    },
  },

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier', // Must be last to override other configs
  ],

  plugins: ['@typescript-eslint', 'import'],

  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: true,
        checksConditionals: true,
      },
    ],
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // Import rules
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true,
      },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',

    // General code quality rules
    'no-console': ['warn', {
      allow: ['warn', 'error'],
    }],
    'eqeqeq': ['error', 'always', {
      null: 'ignore',
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',
    'no-promise-executor-return': 'error',
    'no-template-curly-in-string': 'error',
    'require-atomic-updates': 'error',
    'curly': ['error', 'all'],
    'default-case': 'error',
    'default-case-last': 'error',
    'dot-notation': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-invalid-this': 'error',
    'no-loop-func': 'error',
    'no-param-reassign': 'error',
    'no-return-await': 'error',
  },

  overrides: [
    // Test file specific configurations
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'no-console': 'off',
      },
    },
  ],

  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    '*.js',
    '*.d.ts',
    'jest.config.ts',
  ],
};