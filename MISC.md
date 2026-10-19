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

Misc navigation opts into cross-document View Transitions when reduced motion is off. Each list title and its detail heading share a transition name derived from the entry slug; the browser moves the heading while the surrounding content fades. Links, Back/Forward, scroll restoration, and new-tab behavior remain native browser navigation. Unsupported browsers use ordinary page loads. The entry script blocks first paint and mounts the React shell synchronously so the incoming snapshot contains the page heading. The Vite build hook preserves that script attribute; it does not wait for the lazy CAD viewer, model, compiler, or embedded diagram to load.

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
  "notes": "Describe the model and its intended use.",
  "customizer": {
    "conditions": {
      "dovetail_ratio": { "parameter": "slope_input", "value": "Ratio" },
      "angle_from_square": { "parameter": "slope_input", "value": "Angle" }
    }
  },
  "attribution": {
    "text": "Retain the original source attribution where applicable.",
    "url": "https://example.com/original-design"
  }
}
```

Keep the STL and previews in the entry folder, along with the original OpenSCAD file when supplied. `model` must be a local lowercase `.stl` filename. Optional `source` is a local lowercase `.scad` filename and is required when `customizer` is present. Optional `sourceUrl` links to an editable CAD document over HTTPS, such as an Onshape document. `notes` and `attribution` are optional. Preserve source comments and attribution. There are no third-party runtime requests: Three.js is bundled with the site and model files are served locally.

The viewer assumes STL coordinates are millimeters with Z up, matching OpenSCAD. It provides orbit/pan/zoom, keyboard rotation/zoom, solid/edge/wireframe modes, and one movable X/Y/Z clipping plane with a flip control. Colored stencil caps show cut material while preserving cavities; these require closed, consistently wound meshes. The first entry is a single solid, so part visibility controls are not shown. View controls do not affect the downloadable solid. Models with `customizer` also expose editable source parameters and regenerate the geometry in the browser.

### Onshape and other STL imports

An exported mesh can be a complete CAD entry without an OpenSCAD file. Omit `source` and `customizer`, and provide `sourceUrl` if an editable design is available elsewhere. The local page still includes the full Three.js viewer and a hosted STL download; the source link is supplementary. Do not fabricate a SCAD file or editable parameters from a mesh.

The planer crank drill adapter at `/misc/planer-crank-drill-adapter/` was exported from the shared Onshape document's **Crank adapter** Part Studio, selecting the single **Planer crank adapter - 12 mm female hex** part. Export settings: STL, Binary, Millimeter, Fine resolution, Download, with **Export models oriented Y axis up** unchecked. This preserves the site's Z-up convention. Its exported bounds are 68 × 68 × 40 mm. Retain the shared source URL, including its query parameters, and require export permission before downloading future revisions. Re-export and commit the mesh to update the page; it does not track Onshape changes automatically. Capture both preview images from the exported mesh in the local viewer.

For OpenSCAD entries, re-export the supplied default model using OpenSCAD 2021.01 or later:

```sh
openscad --export-format binstl \
  -o public/misc/magnetic-saw-guide/magnetic-saw-guide.stl \
  public/misc/magnetic-saw-guide/magnetic-saw-guide.scad
```

The OpenSCAD CLI is an optional authoring dependency; the browser uses the runtime below. Keep the exported default STL committed so the initial view and fallback download do not wait for compilation. After geometry changes, regenerate both thumbnails from the viewer's reset camera in solid + edges mode, with sections off. Crop the transparent canvas to the model, using the same framing in both themes. Check all section axes, flip and range endpoints, keyboard/touch controls, fallback images/downloads, mobile layout, theme-state preservation, and the site's hover shadow.


### Parametric controls

Set `customizer` to `{}` to enable controls from the source's OpenSCAD Customizer annotations. The engine reads the public literal assignments, groups, help comments, enum options, and numeric ranges/steps, excluding `[Hidden]` fields. The UI supports scalar numbers, strings, and booleans; unsupported fields fail visibly rather than disappearing. Bounded numbers have both sliders and precise numeric entry. Unannotated numbers use unrestricted numeric entry, leaving the source assertions authoritative. All values and dimensions retain their source precision.

Optional `customizer.conditions` maps a dependent field to `{ "parameter": "controlling_field", "value": "enabled_value" }`. Use this only for dependencies established by the source. The saw guide enables the ratio and angle inputs in their respective modes. These conditions live in metadata; parameter defaults, descriptions, and ranges remain in the SCAD file.

Optional `customizer.units` is `mm` (the default) or `inches` and labels dimensional inputs without converting source values. Displayed mesh bounds, section positions and STL coordinates remain millimetres. The tool tote uses inch inputs and scales its geometry in the SCAD source. It exposes assembly, exploded, bridle-detail and individual-part views through its `Part` parameter, with the explosion distance and optional screw dimensions enabled only when applicable. Its original source includes the stopped bottom grooves and confirmed joinery defaults. The default assembly STL is generated with the same OpenRSCAD engine as live edits; use individual-part views for fabrication exports because the nominal assembly has touching components. Keep the source synchronized with the authored tote model when revising it.

Optional `customizer.outputLabel` displays the source's `echo()` output in a collapsible panel. These entries compile once when loading their parameters to populate the default output while the committed mesh remains visible; subsequent successful updates replace the output alongside the model. Pending or failed changes label retained output as belonging to previous settings. For the tote’s grouped woodworking table, use the `customizer.cutList` contract below; `Show_cut_list` in the source controls its visibility.

Parameter edits automatically compile when the edited input or select loses focus, including sliders; typing, dragging, and changing a focused selection only update the draft. Leaving an unchanged field does not start another job. Native required/min/max/step validation runs before compiling, and invalid values show an error without replacing the model or moving focus back. `Update now` (or form submission with Enter) can explicitly commit the draft or retry a failed update. Clicking Reset or Update handles that action without also compiling on blur; tabbing to either button still commits the edited field.

Compilation uses the exact configured source in a module worker with the pinned `openrscad-engine@0.14.0` WebAssembly engine. It uses the package's raw `web` API because this version's convenience wrapper has a mismatched `render_with_files` signature. The 6.6 MB WASM asset is bundled and served locally; there are no external runtime requests or server-side model jobs. Only CAD pages with a customizer load it, initially to read their schema. The index and diagram pages load neither the engine nor Three.js. Each job has its own worker, a 60-second timeout, and cleanup on completion, navigation, or superseding edits. The engine's MIT notice is distributed at `/licenses/openrscad-engine.txt`; source and upstream documentation: https://github.com/matthova/openrscad.

The compiler rejects errors, warnings, degraded geometry, and empty/2D output. Assertion messages appear beside the controls while the previous valid model stays visible. Pending edits, running jobs, and failures disable configured downloads. A successful result replaces the mesh, edges, and section stencil geometry, disposing the old buffers while preserving camera, pan, zoom, display mode, section percentage/flip, and theme. Section coordinates follow the new bounds. `Reset parameters` restores source defaults and regenerates the model when necessary; `Reset view` remains separate.

The STL download is encoded directly from the successful triangle soup, before viewer centering or clipping. The configured SCAD download is the exact source used for that render, with public literal assignments replaced and model logic/comments/attribution intact. The original source remains unchanged and downloadable. Self-contained sources with scalar literal defaults are supported; include/use libraries and imported assets require explicitly adding their dependencies to the compilation workflow before enabling a customizer.

Run `bun test tests/cad.test.mjs` for schema/precision, source serialization, geometry changes across all four groups and slope modes, source assertion failures, closed-mesh checks, and default bounds/volume equivalence against the original OpenSCAD export. Browser acceptance also covers pending downloads, cancellation/stale jobs, failure recovery, reset, preserved viewing state, both themes, responsive controls, and compilation from a production build. When upgrading the engine, rerun these comparisons against the original export rather than assuming language compatibility.

Optional `customizer.parts` lists `{ id, label, color, darkColor }` entries with six-digit hex colors. Match each `color` to that physical piece's SCAD `color()` value; the viewer uses its paired `darkColor` in dark mode and labels both in a legend. These entries also compile on initial load to refresh the displayed geometry. Provide `displayModel` for a colored initial view while the engine loads. Display uses OpenRSCAD's validated preview groups, whose ranges count vertices; the unioned solid remains the source for STL downloads. Assembly, exploded, individual-part, and clipped joint-detail views retain their source colors. The tote has ten distinct piece colors, including its two handle laminations and two bookmatched bottom halves. Section caps retain the separate cut-surface color.

Optional `customizer.cutList: true` (with `units: "inches"`) replaces plain console output with a woodworking worksheet below the viewer. Its source emits one `echo("CUTLIST_V1", rows)` with rows shaped as `[id, name, material, quantity, finishedThickness, finishedWidth, finishedLength, blankKind, optionalResawGroup]`. SCAD supplies the evaluated blank dimensions; the UI groups equal blank kinds, materials, dimensions and stock choices, sums quantities, and retains the physical IDs for paired color swatches. The tote defaults to five rows of two finished blanks; its bottom row requires one rough parent board, while the other rows each require two rough blanks. Unequal handle laminations split automatically; stock entries follow their physical pieces through splitting and regrouping. Do not add aggregate glued panels as extra cut-list items.

The worksheet and CSV contain part names, separate finished/rough quantities, grouped finished/rough dimensions, and rough board feet per row and in total. An optional ninth cut-list value identifies two matched halves resawn from one parent board; members must share the same dimensions and group into quantity two. The bottom halves use `bottom-parent`; handle laminations remain separate solid-wood pieces. A resaw row has finished quantity two and rough quantity one, with parent width equal to one half’s width plus allowance, never the assembled panel width.

Optional `echo("CUTLIST_STOCK_V1", [millingMinLength, sawMinLength, resawKerf, resawCleanupPerHalf])` supplies positive inch defaults for adjustable worksheet controls. The tote defaults are 14 inches for jointer/planer stock, 10 inches for table-saw stock, 1/16 inch bandsaw kerf and 1/16 inch cleanup thickness per half. Rough length is `max(finishedLength + endAllowance, millingMinLength, sawMinLength)`. Keep stock at the corresponding minimum through each operation, then cut shorter finished pieces to final length. Finished dimensions remain unchanged.

A resaw parent’s minimum milled thickness is `2 × (finishedHalfThickness + cleanupPerHalf) + kerf`; the default ¼-inch bottom therefore requires 11/16 inch after milling and before resawing. The worksheet adds an adjustable **¼-inch total jointing/planing thickness allowance** (both faces together), once per rough blank or resaw parent. Auto rounds that required rough thickness up to the next buying size from **4/4, 5/4, 6/4, 8/4, 10/4, 12/4, 16/4** (1, 1¼, 1½, 2, 2½, 3, 4 inches). See the [supplier’s explanation of quarter sizes](https://www.woodworkerssource.com/blog/woodworking-101/tips-tricks/what-does-44-mean-when-talking-about-lumber/). A row can explicitly select thicker stock; an override that becomes undersized after a parameter edit stays visible and blocks CSV export until corrected or returned to Auto. Explicit and automatic choices remain distinct through grouping, even when they currently resolve to the same size. Requirements above 16/4 have no automatic selection and also block export. Width/length allowances default to ½ and 1 inch. Negative, empty or nonfinite machining allowances are invalid; zero is allowed. A visible resaw note and CSV preparation notes explain the milled target, added surfacing thickness and one-board-to-two-halves relationship.

Board feet use `roughQuantity × nominalStockThickness × roughWidth × roughLength / 144`; machine minimum lengths and machining allowances are included, and the bottom parent is counted once. An adjustable **20% extra-board-feet allowance** covers board layout and defects. Show the base board feet and a **With N% extra** column containing `baseBoardFeet × (1 + percentage / 100)` for each row and both totals. Display values to two decimals, using unrounded values for the calculations. The percentage can be zero or fractional; negative, empty, nonfinite, or overflowing values block CSV export and suppress the adjusted totals. CSV includes numeric rough thickness, its quarter-size label, both unrounded board-foot columns and totals, the selected percentage, and all worksheet allowances. Defaults total 5.09 base board feet and 6.11 with 20% extra. There are no cost columns or supplies section.

Worksheet overrides affect stock planning only; they persist through model/theme changes and `Show_cut_list` toggles for the current page session, but do not change the finished SCAD geometry or its configured source, and reset on reload. Source defaults live in the hidden stock-preparation variables and also appear in native OpenSCAD console output. Pending/failed model updates mark retained tables as previous settings and disable CSV export. Header grid lines have contrasting light/dark tokens; narrow layouts scroll the table without widening the page.


Optional CAD `displayModel` names a local `.json` asset containing `{ version: 1, positions, normals, groups }` in millimetres. It saves the engine’s colored triangle groups for immediate display without waiting for WebAssembly or SCAD compilation. Entries without it still load their STL. The downloadable STL is unchanged. If the colored asset fails to load or validate, the viewer keeps the colored static thumbnail and error state instead of silently switching to a monochrome mesh.

Regenerate it from the default SCAD whenever geometry or source colors change:

```sh
bun scripts/export-cad-display.mjs public/misc/tool-tote/tool-tote.scad public/misc/tool-tote/tool-tote-display.json
```

The exporter uses the pinned engine and the browser’s preview validation. The tote regression test compares the saved positions, normals and groups against a fresh source compilation so the initial display cannot drift from the live model. Cold-load browser checks delay or fail the engine request and verify that the first interactive model already has its part colors in both themes.
