module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended' // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module' // Allows for the use of imports
  },
  rules: {
    // keep imports / functions, clean, etc,
    // but allow a fallback when it provides contextual help
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // disabled rules
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/interface-name-prefix': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'prefer-const': 0
  },
  env: {
    browser: true,
    node: false
  },
  overrides: [
    // node files
    {
      files: ['.eslintrc', 'bin/**'],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015
      },
      env: {
        browser: false,
        node: true,
        es6: true
      },
      plugins: ['node', 'import'],
      extends: 'plugin:node/recommended'
    },

    // typescript node files
    {
      files: ['rollup.config.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },

    // bin files
    {
      files: ['bin/**'],
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        'no-console': 'off',
        'no-process-exit': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'node/no-unpublished-require': 'off',
        'node/shebang': 'off'
      })
    }
  ]
};
