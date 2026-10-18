# Misc entries

For an interactive diagram, add `public/misc/<slug>/diagram.html`, a preview image, and `meta.json`. For CAD entries, use the model format below. The folder name is the URL slug (lowercase letters, digits, and hyphens), and the page is served at `/misc/<slug>/`.

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

## CAD models

CAD entries use the same list, local page URLs, and theme-aware previews. Set `type` to `cad` in metadata; omitted `type` still means an embedded diagram. CAD pages load a shared Three.js viewer only when opened, so the index and diagrams do not load the 3D runtime. They do not need `diagram.html`.

```json
{
  "type": "cad",
  "title": "Parametric magnetic saw guide",
  "description": "A magnetic guide for dovetail and square cuts.",
  "date": "2026-10-18",
  "preview": "preview.webp",
  "previewDark": "preview-dark.webp",
  "model": "magnetic-saw-guide.stl",
  "source": "magnetic-saw-guide.scad",
  "notes": "Describe the exported settings and how to customize the source.",
  "attribution": {
    "text": "Retain the original source attribution where applicable.",
    "url": "https://example.com/original-design"
  }
}
```

Keep the STL, original OpenSCAD file, and previews in the entry folder. `model` and `source` must be local lowercase filenames ending in `.stl` and `.scad`. `notes` and `attribution` are optional. Preserve source comments and attribution. There are no third-party runtime requests: Three.js is bundled with the site and model files are served locally.

The viewer assumes STL coordinates are millimeters with Z up, matching OpenSCAD. It provides orbit/pan/zoom, keyboard rotation/zoom, solid/edge/wireframe modes, and one movable X/Y/Z clipping plane with a flip control. Colored stencil caps show cut material while preserving cavities; these require closed, consistently wound meshes. The first entry is a single solid, so part visibility controls are not shown. Viewing and cutting a static export do not regenerate the parametric source.

Re-export the supplied default model using OpenSCAD 2021.01 or later:

```sh
openscad --export-format binstl \
  -o public/misc/magnetic-saw-guide/magnetic-saw-guide.stl \
  public/misc/magnetic-saw-guide/magnetic-saw-guide.scad
```

OpenSCAD is an authoring dependency, not a website build/runtime dependency. Keep the exported STL committed. After geometry changes, regenerate both thumbnails from the viewer's reset camera in solid + edges mode, with sections off. Crop the transparent canvas to the model, using the same framing in both themes. Check all section axes, flip and range endpoints, keyboard/touch controls, fallback images/downloads, mobile layout, theme-state preservation, and the site's hover shadow.
