module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 0,
    // disable because prettier decides this
    'implicit-arrow-linebreak': 'off',
    // disable because prettier decides this
    'operator-linebreak': 'off',
    // disable indent https://github.com/typescript-eslint/typescript-eslint/issues/1824
    '@typescript-eslint/indent': 'off',
  },
};
