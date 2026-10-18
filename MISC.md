# Misc entries

Add `public/misc/<slug>/diagram.html`, a preview image, and `meta.json`. The folder name is the URL slug (lowercase letters, digits, and hyphens), and the page is served at `/misc/<slug>/`.

```json
{
  "title": "Two surfaces, one cutting edge",
  "description": "An interactive exploration of how two surfaces meet to form a cutting edge.",
  "date": "2026-10-18",
  "preview": "preview.webp",
  "previewDark": "preview-dark.webp"
}
```

The Misc page at `/misc/` discovers metadata at build time and lists entries newest first. No registry needs editing. Commit and push to publish through the existing Cloudflare Pages deployment.

Each diagram.html is a standalone document. Keep local assets in its folder and use relative paths. The shared React page provides the title, navigation, and theme toggle. Preserve the sandbox when importing a Codex visualization export. Check mobile layout, light/dark appearance, and controls in an ordinary browser; exports may depend on external CDNs.

The homepage links to `/misc/`. Entry URLs render through the same React shell (Cloudflare Pages SPA fallback), which embeds `diagram.html`. The visualization accepts a `site-theme` message from its same-origin parent and forwards it into the sandbox without resetting interaction state. Its page backgrounds, typography, and general controls use the homepage theme. Semantic diagram colors use their own palettes.

Each list entry includes a small static preview. `preview` is a required image filename in the entry folder (SVG, PNG, WebP, or JPEG); optional `previewDark` selects a separate image when the site’s dark theme is active. Use a representative diagram snapshot, with fine labels removed if they would be unreadable at thumbnail size. The list supplies an accessible title, so preview images use empty alt text. Avoid live iframes in the list.

Keep the embedded document backgrounds transparent, including any nested sandbox, so the site’s theme-toggle hover shadow follows the visible diagram instead of the iframe rectangle. The host and embedded documents must use the same `color-scheme`; browsers can otherwise paint an opaque iframe canvas even with transparent CSS backgrounds. A standalone export can keep its own themed background when opened directly.

Give each diagram explicit light and dark semantic palettes. Define a light value and a dark value for each concept, retaining a recognizable hue family across themes. Choose colors that remain distinguishable from each other, surrounding text, and site accents. Use stronger colors for swatches, lines, and boundaries, and softer versions for large filled areas. Keep the mapping consistent across controls, labels, surfaces, and previews. Retain labels or other cues so meaning does not depend solely on color, and check the full diagram and thumbnail in both themes.

The cutting-edge diagram uses coral for the back (`#b63e4a` / `#ff8c99`), blue for the bevel (`#1769b0` / `#71b7ff`), and teal for the burr (`#087f6b` / `#60d9ba`), with light values first. These are diagram-specific tokens, independent of the site’s primary/accent colors.
