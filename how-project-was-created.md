# How project was created

adapted from https://github.com/pappijx/Vite-react-eslint-prettier-husky-setup

## vite

1. init
```
npm create vite@latest
```
2. write name of project
3. choose `React`
4. choose `Typescript + SWC`
5. cd to folder and
```
npm install
```

## eslint

### install eslint

1. install
```
npm install --save-dev eslint
```
2. init config
```
npm init @eslint/config
```
3. choose `To check syntax and find problems`
4. choose `JavaScript modules (import/export)`
5. choose `React`
6. choose `yes` (for typescript)
7. choose `browser`
8. choose `Javascript` (for config format)
9. choose `yes` to install dependencies now
10. choose `npm` as package manager

### install airbnb config

```
npx install-peerdeps --dev eslint-config-airbnb
```

### edit .eslintrc.cjs

```
extends: [
+  'airbnb',
+ 'airbnb/hooks'
]
```

### install typescript support for airbnb

```
npm install --save-dev eslint-config-airbnb-typescript
```

### edit .eslintrc.cjs

```
extends: [
  'airbnb/hooks',
+ 'airbnb-typescript'
]
```

```
+ parserOptions: {
+   project: './tsconfig.json'
+ }
```

### edit tsconfig.json

include:
".eslintrc.cjs"

### add rules to .eslintrc.cjs

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

## edit tsconfig.json to fix `jsx intrinsic element` error in tsx files

https://github.com/vitejs/vite/issues/14011#issuecomment-1683630859

edit tsconfig.json

change:
```
"moduleResolution": "bundler",
```

to:
```
"moduleResolution": "node",
```

## prettier

1. install
```
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

2. create `.prettierrc.cjs` file with:
```js
module.exports = {
  trailingComma: "all", // all instead of es5 because of typescript
  tabWidth: 2,
  semi: true,
  singleQuote: true,
};
```
