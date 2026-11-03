# Cloudflare Pages

Pages' build command is `bash scripts/pages-build.sh`, with `SKIP_DEPENDENCY_INSTALL=true` set for Production and Preview so Pages doesn't install dependencies itself. The script installs the Bun version that `packageManager` in `package.json` names, then runs `bun install --frozen-lockfile` and `bun run build`. Pages would otherwise take its Bun version from the `BUN_VERSION` setting in the dashboard; it's no longer needed.

Use that Bun version when changing dependencies or writing the text `bun.lock`; a different Bun release can write a lockfile that the frozen install rejects. Before pushing dependency changes, verify in a clean checkout:

```sh
bash scripts/pages-build.sh # installs the right Bun first if yours differs
```

To change the toolchain, bump `packageManager` in a PR; its Pages preview builds with the new Bun before production does. Keep frozen installs so deployments use the committed dependency versions.

Dependabot opens weekly dependency PRs, configured in `.github/dependabot.yml`. It rewrites `bun.lock` with its own Bun, 1.4.2 at the time of writing (see `BUN_VERSION` in [dependabot-core's `bun/Dockerfile`](https://github.com/dependabot/dependabot-core/blob/main/bun/Dockerfile)). Check each PR's Pages preview build before merging: a frozen-install failure there usually means Dependabot's Bun and `packageManager` have drifted apart, so bump `packageManager` to match.

Dependabot gives `occt-import-js` PRs of its own, as it does `openrscad-engine`, rather than batching it with other updates: it runs third-party WebAssembly on visitors' STEP files, so review a new version on its own.

`public/_headers` sets Pages' response headers. It gives the workers that read visitors' files (`dist/assets/workers/`, where `vite.config.ts` puts them) a Content-Security-Policy allowing requests only to this site, so their third-party WebAssembly can't send a file anywhere else. `vite preview` ignores `_headers`; check headers on a Pages preview.

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

# Meta tags

Useful resources for meta tag info: https://stackoverflow.com/questions/19778620/provide-an-image-for-whatsapp-link-sharing

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Linting

`bun run lint` runs [Oxlint](https://oxc.rs/docs/guide/usage/linter) with `.oxlintrc.json`, which `@oxlint/migrate` generated from the ESLint config this site used to have: typescript-eslint's `strictTypeChecked` and `stylisticTypeChecked`, and the React, React Hooks and React Refresh recommended rules, on `.ts` and `.tsx` files. `options.typeAware` turns on the type-aware rules, which `oxlint-tsgolint` runs on TypeScript 7's compiler; it bundles that compiler, so it doesn't use the `typescript` package. `options.typeCheck` reports TypeScript's own errors too, for `tsconfig.app.json` and `tsconfig.node.json`, so lint also stands in for `tsc -b`; the build doesn't typecheck, since Vite only strips types. A few rules, `typescript/no-unnecessary-condition` among them, are still in Oxlint's nursery and may change between releases. To silence a rule on one line, use `// oxlint-disable-next-line <rule>` with the rule's name as Oxlint prints it, such as `react-hooks/exhaustive-deps`; `oxlint --report-unused-disable-directives` finds ones that no longer suppress anything.

## Block all traffic

Visit [https://dash.cloudflare.com/BIG_ID_STRING/dfenton.xyz/security/waf/custom-rules](https://dash.cloudflare.com/BIG_ID_STRING/dfenton.xyz/security/waf/custom-rules)
and enable the **Block all traffic** rule.
