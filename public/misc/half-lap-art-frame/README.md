# Art frame with selectable corner joints

`half-lap-art-frame.fs` is the unchanged, user-supplied FeatureScript 3083.
`half-lap-art-frame.scad` preserves its default half-lap construction, back
rabbet, dimensional bounds and relational validations, and adds other joints.
No Onshape document or external library is needed to use the SCAD file.

Dimensional source parameters use **inches**; explosion uses percent and the
dovetail-key angle uses degrees. Each box and exploded offset is converted
to **millimetres** before boolean operations, matching the browser engine's
tolerances, site viewer, and STL downloads. XY is the face;
Z=0 is the back. By default, rails retain the front half of the laps and stiles
retain the back half. Reveal means overlap at each edge, not exposed artwork.
Clearance affects the back pocket only. A zero rabbet depth omits that cut.

The `Joinery` selector currently offers:

| Value | Corner construction |
| --- | --- |
| `half_lap` | Square shoulders; front rail layer overlaps the back stile layer. |
| `miter` | Matching 45-degree end faces through the full stock thickness. |
| `mitered_half_lap` | Front layers have 45-degree miters; back layers retain square rail shoulders and full stile ends. |
| `bridle` | Rail tongues enter open-ended stile slots between front and back cheeks. |
| `mitered_bridle` | As above, with 45-degree miters on the front cheeks; back cheeks retain square shoulders. |

`Lap_depth` is the depth removed from the back of the rails; zero derives half
the stock thickness. The complementary stile cut is `Thickness - lap_depth`.
For bridles, `Tenon_thickness = 0` derives one third of the stock thickness.
`Tenon_offset` shifts its center toward the front when positive. Back cheek
thickness is `(Thickness - tenon_thickness) / 2 + Tenon_offset`; front cheek
thickness is the remainder. Source assertions require positive material in
both layers/cheeks. Inactive joint settings are ignored, and the page hides
their controls. Mating faces use nominal zero clearance; fit them on test stock.

Each option preserves the outside dimensions, artwork opening, back pocket and
four physical members. Blank sizes are identical across these five types;
machining geometry and dimensions change with the selected joint. Miters are
45 degrees in plan, and blank lengths include their outer long points. The
rabbet is subtracted from the assembled member geometry, including any portions
that intersect a tongue or cheek near the opening. Section details are taken
outside that pocket and the part sheets separately specify the pocket cut.

Defaults:

| Dimension | Inches |
| --- | --- |
| Artwork | 30.375 × 21.3125 |
| Visible opening | 29.875 × 20.8125 |
| Outside frame | 34.875 × 25.8125 |
| Stock width × thickness | 2.5 × 0.75 |
| Half-lap length × depth | 2.5 × 0.375 |
| Rear pocket | 30.4375 × 21.375 |
| Rabbet width × depth | 0.28125 × 0.25 |
| Rail blanks (quantity 2) | 34.875 × 2.5 × 0.75 |
| Stile blanks (quantity 2) | 25.8125 × 2.5 × 0.75 |

The SCAD console, dimensioned drawings and cut list calculate sizes from the
current parameters. The lengths that were read-only FeatureScript fields remain
derived values. Drawings show finished dimensions; machining allowances affect
only the worksheet's rough stock.

The page and its **Download drawings PDF** button provide four sheets:

1. Front, top-edge and right-edge assembly views with outside, artwork and
   opening sizes. The dashed rectangle is the artwork boundary.
2. Two enlarged sections through the selected top-left joint, with contact surfaces.
3. Rails, quantity two: blank, both end joints and the rear rabbet.
4. Stiles, quantity two: blank, complementary joints and the rear rabbet.

Part sheets dimension pocket run, equal end insets, width and depth, including
machining limits within already-removed end material. A zero rabbet depth omits
those cuts and dimensions. Drawings always use the full assembled frame,
independently of `Part` and `Explosion_percent`. PDF export includes every sheet with
vector linework on white US Letter pages; use written dimensions, not scale.

The cut list and CSV use two rows by default, each quantity two. Square frames
combine all four identical blanks into one row while retaining separate rail
and stile machining sheets. Parent stock uses adjustable 14-inch jointer/planer
and 10-inch table-saw minimums. Short matching pieces can share one longer
parent, with trimming and crosscut kerf accounted for before subdivision.
The worksheet defaults to ¼-inch total surfacing allowance, ½-inch extra width,
1-inch extra length per blank, ⅛-inch crosscut kerf, standard quarter-size
lumber, and 20% extra board feet. Default rough stock is two 1 × 3 × 35⅞-inch
boards and two 1 × 3 × 26¹³⁄₁₆-inch boards: 2.61 board feet, or 3.13 with 20% extra.
There is no resaw operation in this model, so resaw controls are hidden.

The **Explosion percent** slider runs from 0% (assembled, the default) to 200%,
with intermediate settings. At 100%, offsets match the original: rails move
outward by twice the member width and forward by one stock thickness; stiles
move sideways by twice the member width. Separate inserts move outward from
their corners and forward; every offset scales with the slider. Only placement
changes: part sizes, assembly/part drawings, PDF dimensions, cut-list quantities,
and stock requirements stay fixed. An added `Part` selector permits individual-member
inspection/download in its original assembly coordinates. Explosion applies
only to the full frame. The four distinct colors and their dark-theme partners
are inspection aids; they do not prescribe different wood species.

The assembled STL unions touching members, as STL cannot store part identities
or colors. Individual STL downloads preserve the selected member's machining.
The saved display JSON preserves all four colored members on first load.
OpenSCAD 2021.01's CGAL renderer reports a manifold warning for the nominal
touching assembly, although the exported STL has paired edges and no collapsed
triangles. Each individual member renders without warnings. Use individual
parts for machining exports; browser compilation preserves their separate
colored meshes and passes the volume and closed-mesh checks.

From the repository root, using the pinned Bun version in `README.md`:

```sh
openscad --export-format binstl -o public/misc/half-lap-art-frame/half-lap-art-frame.stl public/misc/half-lap-art-frame/half-lap-art-frame.scad
bun scripts/export-cad-display.mjs public/misc/half-lap-art-frame/half-lap-art-frame.scad public/misc/half-lap-art-frame/half-lap-art-frame-display.json
bun test tests/art-frame.test.mjs
bun test tests/art-frame-drawings.test.mjs
bun test tests/art-frame-joinery.test.mjs
```

Regenerate both previews from the actual viewer after changing geometry or
colors. The conversion tests compare mesh volume to the original FeatureScript
formula and probe mating faces at all four corners, rabbet, opening, and back
pocket. Joinery tests also check custom lap/tongue dimensions, closed contours,
zero pocket depth, small frames, inactive settings and inspection independence.
The saved STL/display assets and thumbnails remain the original half-lap
defaults; tests verify that the current source still matches those assets.
