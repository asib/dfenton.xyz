# Cloudflare Pages

Requires setting `BUN_VERSION=1.1.26` (or whatever version was used to `bun install` locally) as an environment variable in Pages' UI. This is because Pages uses `bun install --frozen-lockfile` to install dependencies by default, and different bun versions produce different lock files.

Otherwise, Pages is setup with push-to-deploy, so there's really nothing that needs doing beyond that!

Use a `[Skip CI]` prefix to tell Pages not to deploy a given commit.

# Creating logo

To convert a square logo to a circular one:

```sh
$ magick generated-logo.webp -alpha set -background none -fill white \
    \( +clone -channel A -evaluate set 0 +channel -draw "circle 512,512 512,0" \) \
    -compose dstin -composite masked-logo.webp
```

To make the background white (the background of the generated image I got was cream):

```sh
$ magick masked-logo.webp -fuzz 10% -format webp -fill "#ffffff" -opaque "#e0e0d5" output.webp
```

The `-fuzz 10%` means that any colour within 10% of `#e0e0d5` will also be replaced with white.

To resize:

```sh
$ magick output.webp -resize 25% resized-output.webp
```

Then, if image is still too large, pass it through [Squoosh](https://squoosh.app/) to compress (or also use ImageMagick).

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
