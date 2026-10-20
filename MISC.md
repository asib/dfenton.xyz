# Misc entries

For an interactive diagram, add `public/misc/<slug>/diagram.html`, a preview image, and `meta.json`. For CAD entries, use the model format below. The folder name is the URL slug (lowercase letters, digits, and hyphens), and the page is served at `/misc/<slug>/`.

Before adding or changing dependencies, follow the [Cloudflare Pages toolchain instructions in README.md](README.md#cloudflare-pages). Check the actual `bun --version` against the pinned version before any command that writes `bun.lockb`; `packageManager` does not switch an already-installed Bun runtime. Validate dependency changes with a clean frozen install and production build using the same Bun version as Pages.

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

Development previews use the same routes: `/` serves the homepage, `/misc/` lists all entries, and `/misc/tool-tote/` opens the tool tote registered by `public/misc/tool-tote/meta.json`. Preview-server configuration must preserve the homepage rather than redirecting `/` to the item currently being edited. Verify the homepage → Misc → item → Misc → homepage navigation when changing preview configuration.

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

The CAD toolbar provides a **Fullscreen** button with an expand/contract icon. Legend and parameter panels collapse through their headings in both normal and fullscreen layouts. The headings remain accessible when both panels are collapsed, so either panel can be reopened. Native [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) requests come from the button gesture; missing or denied APIs fall back to a fixed workspace filling the browser pane. Both modes keep the original canvas, compiler controls and worksheet mounted, preserving camera, pan/zoom, section settings, parameter drafts and stock-planning edits. Escape, the exit button and browser-initiated fullscreen exits synchronize the layout. Background content is inert, keyboard focus stays inside the workspace, and focus/scroll state is restored on exit. The fullscreen cut-list link exits before scrolling/focusing the worksheet heading.

Fullscreen uses an explicit themed background and an independently scrolling sidebar. On narrow screens, the panels become a bounded scrolling area below the viewer. Existing canvas resize handling adjusts the projection/render size without resetting the camera. Browser acceptance includes native and denied-API paths, exact camera preservation over an enter/exit round trip, compilation while fullscreen, collapsing/reopening panels, keyboard/focus cleanup, cut-list navigation, light/dark palettes, mobile portrait/landscape, and static CAD entries without a customizer.


### Half-lap art frame

The **Half-lap art frame** entry at `/misc/half-lap-art-frame/` is converted from
the unchanged FeatureScript stored beside its SCAD. It preserves the original
defaults, parameter bounds, rear rabbet, complementary front-rail/back-stile
laps, and exploded offsets. Inch inputs become millimetre boxes **before**
boolean operations, so the engine also resolves small permitted frames and
overlaps correctly. Four colors identify physical members; an added `Part`
selector supports individual exports. Four drawing/PDF sheets cover assembly,
the half-lap corner, rails, and stiles. Part sheets define blank size, lap length
and depth, and the rear pocket's cutting run, equal end insets, width and depth.
Zero rabbet depth removes pocket machining from the sheets. The cut list groups
two rails and two stiles; square frames combine four equal blanks into one row,
while machining sheets remain separate. The shared worksheet provides standard
lumber, configurable machining allowances, machine minimums, shared parents,
board feet, and extra percentage. Resaw controls appear only for resawn parts.
The README records default sizes and reproduction commands. The frame tests
cover original volume, contact/pocket geometry, drawing dimensions, stock
quantities, and saved/live asset agreement.

### SCAD drawings

For new SCAD imports, include dimensioned assembly and part/joinery sheets, an all-sheets PDF, and a cut-list worksheet/CSV for woodworking by default unless the user narrows the scope. STEP entries should receive equivalent drawings once an importer is available; STEP import is not implemented yet. STL-only entries retain viewing without invented design dimensions.

Set `customizer.drawings: true` to enable a **Drawings** section between the viewer and cut list. It supplies front, top, and right-end assembly views in third-angle arrangement, enlarged joint sections when defined, and selectable dimensioned part sheets. All sheets have source-authored dimensions, light/dark palettes, and zoom/pan. The assembly sheet gives overall dimensions; joint and part sheets define mating relationships, finished sizes, and machining geometry. A **Download drawings PDF** button exports every sheet using the current valid dimensions.

PDF export reuses the same SVG sheet components as the page, rendering assembly, joint detail (when present), and every grouped part sheet in order. It does not depend on the selected part sheet, 3D view, screen zoom, scroll position, viewport, or site theme. The default tote exports seven pages; unequal handle laminations produce eight. Each sheet fits one US Letter page, choosing portrait or landscape to maximize the drawing, with white paper, dark vector linework, section hatches, selectable text, page numbers, and an explicit “not to scale” note. Use written dimensions; the PDF is not a full-size template. A font-matched white box behind each dimension replaces the SVG text halo so witness lines do not cross labels.

`DrawingPdfDownload` lazily imports `drawingPdf` only when requested. PDF generation uses pinned `jspdf@4.2.1` and `svg2pdf.js@2.8.1`, with local Liberation Sans regular/bold fonts embedded for inch marks and other drawing symbols. Both PDF code and fonts load only on export; the homepage and normal CAD viewing do not request them. Font notices and library licenses ship in `/licenses/`. Generation stays in the browser; it accepts only the site's React-generated SVG from validated drawing data, with external stylesheets and images disabled. Font-load/conversion failures show a retry message. Pending, running, or invalid model edits disable the button; edits during export cancel it so a stale snapshot cannot be downloaded. Temporary fonts and download URLs are cleaned up.

Browser acceptance covers the actual downloaded files: seven/eight pages, all part titles, updated fractional dimensions and optional bores, embedded Unicode fonts, vector-only pages, stable exports across theme/zoom/mobile changes, disabled stale/invalid exports, cancellation during loading, and failure/retry. Inspect rasterized PDF pages for label clipping, hatch holes, and readability as well as checking extracted text. PDF paper-size choices and fixed drawing scales remain follow-up options.

The configured source must recognize the private `$misc_drawing = true` pass. In that pass it renders the assembled geometry independently of `Part`/`Explode` and emits exactly one `echo("DRAWING_V1", [units, views])`. Units are `inches` or `mm`; geometry and dimension witness coordinates are always millimetres. Each assembly view row is `[id, title, [rightAxis, upAxis, towardCameraAxis], dimensions]`, with unique `front`, `top`, and `right` IDs. Axes must be orthonormal. Each dimension is `[label, pointA, pointB, "horizontal" | "vertical", outsideSide, tier]`, where `outsideSide` is −1 or +1 in the projected axis and `tier` is an integer 1–4. Coordinate pairs define the measured distance along the selected view axis. Keep witnesses and derived dimensions in SCAD beside the geometry; do not duplicate model formulas in the UI.

For model-specific joint captions, append a third item to `DRAWING_V1`: `[jointTitle, description, bearingLabel]`, three nonempty strings. These captions require the two joint section views and propagate to screen headings, SVG descriptions, bearing-line titles, and PDF. Sources that omit them retain the tote's existing captions. Sheet numbering follows the actual presence of a joint sheet.

SCAD echo rounds floating-point coordinates to six significant digits. A witness-point component may therefore be a number or `[wholeMillimetres, millionths]`, decoded as `wholeMillimetres + millionths / 1000000`; both entries are integers, and millionths is between 0 and 1000000. The tote uses this encoding for dimension witnesses, bearing lines, and guides, preserving exact woodworking fractions even at large or negative model coordinates. View axes, crop rectangles, and section depths remain plain numbers.

The optional `joint-longitudinal` and `joint-transverse` views must appear together. They add a fifth row item: `[depth, crop, breaks, notes, contacts]`. `depth` locates the section plane along its toward-camera axis. `crop` is `[uMin, vMin, uMax, vMax]` in the projected plane. `breaks` names cropped boundaries (`left`, `right`, `top`, `bottom`) where continuing material receives a break mark. Notes are source-evaluated strings; each contact is a pair of 3D points marking a bearing surface. The source defines section orientation and depth for its joint: the tote cuts through a handle lamination and a riser; the frame cuts across a rail and along a stile outside the rear pocket. Each physical-part mesh is intersected with that plane, joined into closed contours, and cropped. Separate hatches distinguish parts; even-odd filling preserves holes and disconnected contours when screw bores are enabled. The highlighted contact lines follow the source-defined bearing surfaces.

The optional `echo("PART_DRAWINGS_V1", rows)` uses rows `[id, title, quantity, notes, sourceRGB, views]`. Each row selects exactly one colored physical mesh from the same assembled pass; missing or ambiguous color matches fail the drawing update. Its one to three views use the same axes, dimensions, and section format, with unique local IDs. A sixth view field can contain dashed reference lines as pairs of 3D witness points; use `[]` for the fifth field when no section is needed. These guides distinguish machining limits, original blank faces, glue edges, and bore axes from real mesh edges. The UI presents a main view and enlarged details at independent scales; users select a part sheet without changing the model's `Part` control.

Group identical pieces by finished geometry and quantity. The tote has five sheets by default and six when the handle laminations differ in thickness. The bottom sheet represents two resawn halves, not an extra glued panel. Side sheets explicitly mark the stopped groove's full cutting run even where its ends overlap the end dados. End sheets show inside/outside faces and the web between the opposing groove and riser housing. Optional `End_grain_screw_bores` run along X through the riser's outside face, below the slot floor, into the handle's notch-shoulder end grain. They are centered across the glued handle width and disabled by default. Diameter (5/32 inch), height (half the notch depth above the handle underside), and `Screw_embedment` (1 inch from the shoulder) remain adjustable placeholders. The riser and handle sheets dimension the bore path and blind depth; only laminations actually intersected by the pilot receive a bore detail. Drill after laminating; no screws, countersinks, or stepped clearance/pilot holes are modeled. Finished part dimensions stay separate from the cut list's rough-stock, shared-parent, resaw, and machining allowances.

`compileDrawings` runs the private pass in the same cancellable worker job as the model. Visible linework is extracted from the actual compiled physical-part meshes: coplanar triangle diagonals are discarded, seams between parts are retained, and edge intervals behind projected triangles are removed geometrically. Drawings currently show visible edges only, not dashed hidden lines. The sheet renderer consumes the resulting line segments and dimension witnesses without depending on SCAD syntax, leaving room for a future STEP geometry adapter. STEP import is not implemented yet.

The source assertions and drawing contract must both pass before the model, cut list, and sheet update. Draft edits, compilation, or failures identify retained sheets as previous valid settings. Source defaults compile on load; sheets do not depend on the 3D camera, display clipping, theme, console cut-list visibility, or exploded/individual-part selection. View alignment uses a common scale, with top above front and right-end to the right. Screen scale changes with zoom; labels explicitly say to use the written dimensions.

Run `bun test tests/drawings.test.mjs` for projected visibility, partial occlusion, part seams, source-derived fractional dimensions, view independence, rejected definitions, and mesh-derived sections. Tests verify mating contact, fit clearance, exact part sizes, stopped-groove limits, dado depths, opposing end cuts, unequal lamination grouping, optional bore layout/voids, and flush end/riser configurations. Browser checks cover sheet selection, live edits, invalid/recovery states, both themes, zoom, contained mobile scrolling, and unchanged STL-only pages. A drawing-only source edit must continue to match the committed default 3D mesh and colored display asset.

### Parametric controls

Set `customizer` to `{}` to enable controls from the source's OpenSCAD Customizer annotations. The engine reads the public literal assignments, groups, help comments, enum options, and numeric ranges/steps, excluding `[Hidden]` fields. The UI supports scalar numbers, strings, and booleans; unsupported fields fail visibly rather than disappearing. Bounded numbers have both sliders and precise numeric entry. Unannotated numbers use unrestricted numeric entry, leaving the source assertions authoritative. All values and dimensions retain their source precision.

Optional `customizer.conditions` maps a dependent field to `{ "parameter": "controlling_field", "value": "enabled_value" }`. Use this only for dependencies established by the source. The saw guide enables the ratio and angle inputs in their respective modes. These conditions live in metadata; parameter defaults, descriptions, and ranges remain in the SCAD file.

Optional `customizer.units` is `mm` (the default) or `inches` and labels dimensional inputs without converting source values. Displayed mesh bounds, section positions and STL coordinates remain millimetres. The tool tote uses inch inputs and scales its geometry in the SCAD source. It exposes assembly, exploded, bridle-detail and individual-part views through its `Part` parameter, with the explosion distance and optional screw dimensions enabled only when applicable. Its source includes the stopped bottom grooves and confirmed joinery defaults. Each handle underside notch continues from the riser's inner edge through the handle end, giving both laminations one continuous bearing surface on the riser-slot floor. `Handle_notch_depth` (0.75 inches by default) controls that shared shoulder; there is no independently raised tip. The default shoulder and slot floor are both at Z=9 inches, the handle middle underside is Z=8.25 inches, the top is Z=11.25 inches, and the riser top is Z=10.75 inches. Cut-list blanks retain their full 3-inch height. The default assembly STL is generated with the same OpenRSCAD engine as live edits; use individual-part views for fabrication exports because the nominal assembly has touching components. Keep the source synchronized with the authored tote model when revising it.

Optional `customizer.outputLabel` displays the source's `echo()` output in a collapsible panel. These entries compile once when loading their parameters to populate the default output while the committed mesh remains visible; subsequent successful updates replace the output alongside the model. Pending or failed changes label retained output as belonging to previous settings. For the tote’s grouped woodworking table, use the `customizer.cutList` contract below; `Show_cut_list` in the source controls its visibility.

Parameter edits automatically compile after 1.5 seconds without another edit, even while the input stays focused. Each keystroke, slider change or selection restarts that delay. Leaving the edited field commits immediately; leaving an unchanged field does not start another job. Native required/min/max/step validation runs before compiling, and invalid values show an error without replacing the model or moving focus back. `Update now` (or form submission with Enter) can explicitly commit the draft or retry a failed update. Clicking Reset or Update handles that action without also compiling on blur; tabbing to either button still commits the edited field. These actions, newer edits and leaving the page cancel any scheduled update, preventing duplicate or obsolete renders.

Compilation uses the exact configured source in a module worker with the pinned `openrscad-engine@0.14.0` WebAssembly engine. It uses the package's raw `web` API because this version's convenience wrapper has a mismatched `render_with_files` signature. The 6.6 MB WASM asset is bundled and served locally; there are no external runtime requests or server-side model jobs. Only CAD pages with a customizer load it, initially to read their schema. The index and diagram pages load neither the engine nor Three.js. Each job has its own worker, a 60-second timeout, and cleanup on completion, navigation, or superseding edits. The engine's MIT notice is distributed at `/licenses/openrscad-engine.txt`; source and upstream documentation: https://github.com/matthova/openrscad.

The compiler rejects errors, warnings, degraded geometry, and empty/2D output. Assertion messages appear beside the controls while the previous valid model stays visible. Pending edits, running jobs, and failures disable configured downloads. A successful result replaces the mesh, edges, and section stencil geometry, disposing the old buffers while preserving camera, pan, zoom, display mode, section percentage/flip, and theme. Section coordinates follow the new bounds. `Reset parameters` restores source defaults and regenerates the model when necessary; `Reset view` remains separate.

The STL download is encoded directly from the successful triangle soup, before viewer centering or clipping. The configured SCAD download is the exact source used for that render, with public literal assignments replaced and model logic/comments/attribution intact. The original source remains unchanged and downloadable. Self-contained sources with scalar literal defaults are supported; include/use libraries and imported assets require explicitly adding their dependencies to the compilation workflow before enabling a customizer.

Run `bun test tests/cad.test.mjs` for schema/precision, source serialization, geometry changes across all four groups and slope modes, source assertion failures, closed-mesh checks, and default bounds/volume equivalence against the original OpenSCAD export. Browser acceptance also covers pending downloads, cancellation/stale jobs, failure recovery, reset, preserved viewing state, both themes, responsive controls, and compilation from a production build. When upgrading the engine, rerun these comparisons against the original export rather than assuming language compatibility.

Optional `customizer.parts` lists `{ id, label, color, darkColor }` entries with six-digit hex colors. Match each `color` to that physical piece's SCAD `color()` value; the viewer uses its paired `darkColor` in dark mode and labels both in a legend. These entries also compile on initial load to refresh the displayed geometry. Provide `displayModel` for a colored initial view while the engine loads. Display uses OpenRSCAD's validated preview groups, whose ranges count vertices; the unioned solid remains the source for STL downloads. Assembly, exploded, individual-part, and clipped joint-detail views retain their source colors. The tote has ten distinct piece colors, including its two handle laminations and two bookmatched bottom halves. Section caps retain the separate cut-surface color.

Optional `customizer.cutList: true` (with `units: "inches"`) replaces plain console output with a woodworking worksheet below the viewer. Its source emits one `echo("CUTLIST_V1", rows)` with rows shaped as `[id, name, material, quantity, finishedThickness, finishedWidth, finishedLength, blankKind, optionalResawGroup]`. SCAD supplies the evaluated blank dimensions; the UI groups equal blank kinds, materials, dimensions, stock thickness choices and preparation modes, sums quantities, and retains the physical IDs for paired color swatches. The tote defaults to five rows of two finished blanks. The ends and risers each share one parent for crosscutting, the bottom uses one resaw parent, and the sides and handle laminations use two parents each. Unequal handle laminations split automatically; stock entries follow their physical pieces through splitting and regrouping. Do not add aggregate glued panels as extra cut-list items.

The CSV title and filename identify the current Misc item. Resaw controls and CSV notes appear only when the source contains resawn parts. The worksheet and CSV contain part names, separate finished/rough quantities, grouped finished/rough dimensions, and rough board feet per row and in total. An optional ninth cut-list value identifies two matched halves resawn from one parent board; members must share the same dimensions and group into quantity two. The bottom halves use `bottom-parent`; handle laminations remain separate solid-wood pieces. A resaw row has finished quantity two and rough quantity one, with parent width equal to one half’s width plus allowance, never the assembled panel width.

Optional `echo("CUTLIST_STOCK_V1", [millingMinLength, sawMinLength, resawKerf, resawCleanupPerHalf])` supplies positive inch defaults for adjustable worksheet controls. The tote defaults are 14 inches for jointer/planer stock, 10 inches for table-saw stock, 1/16 inch bandsaw kerf and 1/16 inch cleanup thickness per half. Machine minimums apply to **parent stock during jointing, planing and ripping**, before crosscutting shorter blanks. Finished dimensions remain unchanged.

For each ordinary matching row, Auto compares separate parents against a single shared parent and selects sharing only when it uses less total stock length. With `blankLength = finishedLength + lengthAllowance`, separate stock has `quantity` parents of `max(blankLength, millingMinLength, sawMinLength)` each; shared stock has one parent of `max(quantity × blankLength + (quantity − 1) × crosscutKerf, millingMinLength, sawMinLength)`. The crosscut kerf defaults to an adjustable **⅛ inch** and is distinct from the bandsaw resaw kerf. The 1-inch length allowance remains **per blank**. Each row offers Auto, Separate blanks or One shared board and displays how many blanks each parent yields. S3S the shared parent, then crosscut it; the default ends use one 18⅛-inch parent yielding two 9-inch blanks for the 8-inch finished ends. Risers share one 23⅝-inch parent yielding two 11¾-inch blanks. Separate mode retains the old 14-inch-per-blank option. This is a comparison within matching rows, not cross-row nesting or a general cutting-stock optimizer. Resaw parents keep their existing one-board/two-halves calculation and never acquire a crosscut kerf.

A resaw parent’s minimum milled thickness is `2 × (finishedHalfThickness + cleanupPerHalf) + kerf`; the default ¼-inch bottom therefore requires 11/16 inch after milling and before resawing. The worksheet adds an adjustable **¼-inch total jointing/planing thickness allowance** (both faces together), once per rough blank or resaw parent. Auto rounds that required rough thickness up to the next buying size from **4/4, 5/4, 6/4, 8/4, 10/4, 12/4, 16/4** (1, 1¼, 1½, 2, 2½, 3, 4 inches). See the [supplier’s explanation of quarter sizes](https://www.woodworkerssource.com/blog/woodworking-101/tips-tricks/what-does-44-mean-when-talking-about-lumber/). A row can explicitly select thicker stock; an override that becomes undersized after a parameter edit stays visible and blocks CSV export until corrected or returned to Auto. Explicit and automatic choices remain distinct through grouping, even when they currently resolve to the same size. Requirements above 16/4 have no automatic selection and also block export. Width/length allowances default to ½ and 1 inch. Negative, empty or nonfinite machining allowances are invalid; zero is allowed. A visible resaw note and CSV preparation notes explain the milled target, added surfacing thickness and one-board-to-two-halves relationship.

Board feet use `parentQuantity × nominalStockThickness × parentWidth × parentLength / 144`; machine minimum lengths and machining allowances are included, and each shared or resawn parent is counted once. An adjustable **20% extra-board-feet allowance** covers board layout and defects. Show the base board feet and a **With N% extra** column containing `baseBoardFeet × (1 + percentage / 100)` for each row and both totals. Display values to two decimals, using unrounded values for the calculations. The percentage can be zero or fractional; negative, empty, nonfinite, or overflowing values block CSV export and suppress the adjusted totals. CSV includes parent dimensions, quarter-size labels, preparation/yield notes, both unrounded board-foot columns and totals, the selected percentage, and all worksheet allowances including the crosscut kerf. Defaults total 4.55 base board feet and 5.46 with 20% extra. There are no cost columns or supplies section.

Worksheet overrides affect stock planning only; they persist through model/theme changes and `Show_cut_list` toggles for the current page session, but do not change the finished SCAD geometry or its configured source, and reset on reload. Source defaults live in the hidden stock-preparation variables and also appear in native OpenSCAD console output. Pending/failed model updates mark retained tables as previous settings and disable CSV export. Header grid lines have contrasting light/dark tokens; narrow layouts scroll the table without widening the page.


Optional CAD `displayModel` names a local `.json` asset containing `{ version: 1, positions, normals, groups }` in millimetres. It saves the engine’s colored triangle groups for immediate display without waiting for WebAssembly or SCAD compilation. Entries without it still load their STL. The downloadable STL is unchanged. If the colored asset fails to load or validate, the viewer keeps the colored static thumbnail and error state instead of silently switching to a monochrome mesh.

Regenerate it from the default SCAD whenever geometry or source colors change:

```sh
bun scripts/export-cad-display.mjs public/misc/tool-tote/tool-tote.scad public/misc/tool-tote/tool-tote-display.json
```

The exporter uses the pinned engine and the browser’s preview validation. The tote regression test compares the saved positions, normals and groups against a fresh source compilation so the initial display cannot drift from the live model. Cold-load browser checks delay or fail the engine request and verify that the first interactive model already has its part colors in both themes.
