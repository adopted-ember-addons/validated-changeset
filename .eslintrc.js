module.exports = {
  parser:  '@typescript-eslint/parser',  // Specifies the ESLint parser
  extends:  [
    'plugin:@typescript-eslint/recommended',  // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'prettier/@typescript-eslint',  // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended',  // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions:  {
    ecmaVersion:  2018,  // Allows for the parsing of modern ECMAScript features
    sourceType:  'module',  // Allows for the use of imports
  },
  rules: {
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/interface-name-prefix': 0,
    '@typescript-eslint/no-explicit-any': 0,
    'prefer-const': 0
  },
  env: {
    browser: true,
    node: false,
  },
  overrides: [
    // node files
    {
      files: [
        '.eslintrc',
        'bin/**'
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015,
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['node', 'import'],
      extends: 'plugin:node/recommended',
    },

    // bin files
    {
      files: ['bin/**'],
      // eslint-disable-next-line node/no-unpublished-require
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        'no-console': 'off',
        'no-process-exit': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'node/no-unpublished-require': 'off'
      }),
    },
  ]
};
