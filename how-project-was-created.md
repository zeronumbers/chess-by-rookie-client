# How project was created

adapted from https://github.com/pappijx/Vite-react-eslint-prettier-husky-setup

## 1. vite

1. `npm create vite@latest`
2. write name of project
3. choose `React`
4. choose `Typescript + SWC`
5. cd to folder and `npm install`

## 2. eslint

### 2.1. install eslint

1. `npm install --save-dev eslint`
2. `npm init @eslint/config`
3. choose `To check syntax and find problems`
4. choose `JavaScript modules (import/export)`
5. choose `React`
6. choose `yes` (for typescript)
7. choose `browser`
8. choose `Javascript` (for config format)
9. choose `yes` to install dependencies now
10. choose `npm` as package manager

### 2.2. install airbnb config

`npx install-peerdeps --dev eslint-config-airbnb`

### 2.3. edit .eslintrc.cjs

extends:
- `airbnb`
- `airbn/hooks`

### 2.4. install typescript support for airbnb

`npm install eslint-config-airbnb-typescript`

### 2.5. edit .eslintrc.cjs

extends:
`airbnb-typescript` (after airbnb)

parserOptions:
`project: './tsconfig.json'`

### 2.6. edit tsconfig.json

include:
".eslintrc.cjs"

### 2.7. add rules to .eslintrc.cjs

```js
rules: {
    'react/react-in-jsx-scope': 0,
    // disable because prettier decides this
    'implicit-arrow-linebreak': 'off',
    // disable because prettier decides this
    'operator-linebreak': 'off',
    // disable indent https://github.com/typescript-eslint/typescript-eslint/issues/1824
    '@typescript-eslint/indent': 'off',
  },
```

## 3. edit tsconfig.json to fix `jsx intrinsic element` error in tsx files

https://github.com/vitejs/vite/issues/14011#issuecomment-1683630859

edit tsconfig.json

change:
`"moduleResolution": "bundler",`
to:
`"moduleResolution": "node",`

## 4. prettier

1. `npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier`

2. create `.prettierrc.cjs` file with:
```js
module.exports = {
  trailingComma: "all", // all instead of es5 because of typescript
  tabWidth: 2,
  semi: true,
  singleQuote: true,
};
```
