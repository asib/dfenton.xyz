# Drawer cabinet

`drawer-cabinet.scad` is a self-contained OpenSCAD model of a frameless
plywood case holding a single column of inset drawers on wooden runners.
Dimensional parameters are **inches**; every box is converted to
**millimetres** before boolean operations, matching the browser engine, site
viewer and STL downloads. The origin is the case's front-bottom-left corner:
X runs across the width, Y from the front face (Y=0) to the back, and Z up.
Drawer 1 is the top drawer.

## Case

The sides run the full height and depth. `Case_joinery` either butts the top
and bottom between the sides (for screws or pocket screws) or houses them in
rabbets half the case thickness deep in the side ends. The back panel sits in
rabbets along the back of both sides, `Back_rabbet_width` deep, and covers the
back edges of the top and bottom, so those panels are `Depth - Back_thickness`
deep. Interior width and height are the outside sizes less two case
thicknesses.

## Drawer layout

Each drawer's `Drawer_N_height` is its inset front height. Drawers left at 0
share whatever remains of the opening equally; if every drawer has a height,
the heights must total the opening exactly. `Reveal` is the gap around each
front: above the top drawer, between drawers and at both sides. The box is the
front's width (`opening - 2 × Reveal`), so the same gap is the side running
clearance. `Drawer_N_depth` is the box depth from the front face; 0 fills the
interior less `Back_clearance`. With zero back clearance the back panel stops
the drawers.

The default 24 × 30 × 18 inch case with 3/4 inch plywood has a 22½ × 28½ inch
opening. Four drawers with 5 and 6 inch fronts set leave 17¼ inches shared by
the two lower drawers, 8⅝ inches each.

## Runners

- **Strips** (`strip`) are screwed to the inside of each case side. A drawer's
  underside bears on the strip top, which is level with the bottom of its
  front. The strip carrying the drawer above stops it tipping, so supported
  boxes are cut down to `Runner_clearance` below that strip; their fronts stay
  full height. The bottom drawer runs on the case bottom, so its front has no
  lower reveal.
- **Dadoed strips** (`dado`) are the same strips housed `Runner_dado_depth`
  into stopped dados. The dados start behind the drawer fronts and stop at the
  back rabbet. Strips are wider by the dado depth.
- **Side-hung** (`side_hung`) drawers ride on a strip engaging a groove along
  each drawer side, centred on the side's height. Grooves are open at the back
  and stop behind the front. The strip projects into the groove short of its
  floor by `Runner_clearance`, and the groove is that much taller than the
  strip. Side-hung boxes keep full-height sides and get a reveal below the
  bottom drawer as well.

Strips run from behind the drawer fronts to the back panel.

## Drawer boxes

Boxes are butt-jointed for glue with screws, pocket screws or brads; fasteners
are not modelled. The front is integral: it is the inset face.

| `Box_construction` | Arrangement |
| --- | --- |
| `sides_overlap` | Sides run the full box depth; front and back fit between them. The bottom is nailed under all four. |
| `front_back_overlap` | Front and back run the full box width; sides fit between them. The bottom is nailed under all four. |
| `sides_overlap_groove` | Sides run the full depth; the bottom slides into a groove in the sides and front, under a back that sits on it. |

A nailed-under bottom shows its edge below the front; the grooved bottom hides
it. Side grooves for the bottom start at the front's groove and run out through
the back; the front's groove runs through its ends, which the sides cover.

## Inspection

`Explosion_percent` is sequenced so that no part passes through another: up to
100 the case comes apart and the drawers slide out whole until they clear it;
from 100 to 200 the drawers spread vertically and their own parts separate.
A single drawer (`Part = drawer`) separates from 0. Part sizes never change.
Use `Case and runners` or `One drawer` for separate STL exports; the assembled
model contains touching parts.

## Reproduction

The default STL and colored first-load mesh come from the same engine as
live edits:

```sh
bun scripts/export-cad-stl.mjs public/misc/drawer-cabinet/drawer-cabinet.scad public/misc/drawer-cabinet/drawer-cabinet.stl
bun scripts/export-cad-display.mjs public/misc/drawer-cabinet/drawer-cabinet.scad public/misc/drawer-cabinet/drawer-cabinet-display.json
bun test tests/drawer-cabinet.test.mjs
```

The tests cover every runner, box and case-joint combination for closed,
non-overlapping pieces at intermediate explosions; runner bearing heights and
kicker clearance; side-hung groove clearance; dado depth; per-drawer heights
and depths; assertion messages; and saved/live asset agreement.
