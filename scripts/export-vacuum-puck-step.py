# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["build123d==0.13.0"]
# ///
"""Rebuild the MFT vacuum block's puck as a STEP solid, for CNC machining.

Run from the repository root with uv, which installs build123d (OpenCascade):

    uv run scripts/export-vacuum-puck-step.py public/misc/mft-vacuum-block/mft-vacuum-block.scad puck.step

An optional third argument sets Customizer parameters as a JSON object, as the
page would, for example '{"Stock_thickness": 22.2, "Port_drop": 13.35}', and
--stl PATH also writes a fine STL of the solid for checking.

The SCAD source stays the one description of the puck: Bun compiles it with the
site's engine (scripts/export-cad-echo.mjs), and this script reads the puck's
features from its PUCK_STEP_V1 echo and cuts them from a block as true arcs,
cylinders and cones, where the source's STL has facets. Heights are from the
puck's underside, which is Z=0, with the vacuum face up and the fitting's face
toward +Y when the port is at the back.
"""

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

from build123d import (
    Circle,
    Plane,
    Pos,
    Rectangle,
    RectangleRounded,
    Rot,
    SlotCenterToCenter,
    Solid,
    export_step,
    export_stl,
    extrude,
    mirror,
)

ECHO = "PUCK_STEP_V1"
# How far a cutter runs past the face it opens through, so no face of the
# block and a cutter are coplanar.
OVERRUN = 1


def puck_features(source, overrides):
    values = {"View": "puck", **overrides}
    script = Path(__file__).with_name("export-cad-echo.mjs")
    run = subprocess.run(["bun", str(script), source, json.dumps(values)], capture_output=True, text=True)
    if run.returncode:
        sys.exit(run.stderr.strip() or "The SCAD source failed to compile.")
    prefix = f'ECHO: "{ECHO}",'
    lines = [line for line in run.stdout.splitlines() if line.startswith(prefix)]
    if len(lines) != 1:
        sys.exit(f"Expected one {ECHO} echo in {source}, found {len(lines)}.")
    return dict(json.loads(lines[0][len(prefix):]))


def rounded_rect(length, width, radius):
    return RectangleRounded(length, width, radius) if radius > 0 else Rectangle(length, width)


def bit_path(x0, y0, x1, y1, width):
    # The outline a straight bit of this width cuts from (x0, y0) to (x1, y1).
    length = math.hypot(x1 - x0, y1 - y0)
    centre = Pos((x0 + x1) / 2, (y0 + y1) / 2)
    if length < 1e-6:
        return centre * Circle(width / 2)
    return centre * Rot(0, 0, math.degrees(math.atan2(y1 - y0, x1 - x0))) * SlotCenterToCenter(length, width)


def drill_point(diameter, half_angle):
    return diameter / 2 / math.tan(math.radians(half_angle))


def along_y(x, y, z):
    return Plane(origin=(x, y, z), x_dir=(1, 0, 0), z_dir=(0, 1, 0))


def up(x, y, z):
    return Plane(origin=(x, y, z), x_dir=(1, 0, 0), z_dir=(0, 0, 1))


def air_path(f):
    # Entering the front face (-Y), as the source's air_path() models it.
    x, z, face = f["port_x"], f["port_z"], -f["body"][1] / 2
    half = f["drill_half_angle"]
    hole_r, chamfer, tip = f["port_hole"] / 2, f["port_chamfer"], f["port_tip"]
    duct_r, duct_depth = f["duct_diameter"] / 2, f["duct_depth"]
    cutters = [
        Solid.make_cylinder(hole_r, f["port_depth"] + OVERRUN, along_y(x, face - OVERRUN, z)),
        # The 45 degree chamfer, carried on outside the face.
        Solid.make_cone(hole_r + chamfer + OVERRUN, hole_r, chamfer + OVERRUN, along_y(x, face - OVERRUN, z)),
        Solid.make_cone(hole_r, tip / 2, drill_point(2 * hole_r - tip, half), along_y(x, face + f["port_depth"], z)),
        Solid.make_cylinder(duct_r, duct_depth + OVERRUN, along_y(x, face - OVERRUN, z)),
        Solid.make_cone(duct_r, 0, drill_point(2 * duct_r, half), along_y(x, face + duct_depth, z)),
    ]
    # The holes rise from the duct's axis into the channels, halfway up them.
    top = f["hole_top"] + f["channel_depth"] / 2
    cutters += [Solid.make_cylinder(f["hole_diameter"] / 2, top - z, up(x, y, z)) for y in f["hole_ys"]]
    return [mirror(c, about=Plane.XZ) for c in cutters] if f["mirror_y"] else cutters


def build(f):
    thickness = f["thickness"]
    puck = extrude(rounded_rect(*f["body"]), thickness)

    groove = rounded_rect(*f["groove_outer"]) - rounded_rect(*f["groove_inner"])
    puck -= Pos(0, 0, thickness - f["groove_depth"]) * extrude(groove, f["groove_depth"] + OVERRUN)

    width = f["channel_width"]
    paths = [bit_path(*path, width) for path in f["channels"]]
    channels = paths[0]
    for path in paths[1:]:
        channels += path
    channels &= rounded_rect(*f["channel_clip"])
    puck -= Pos(0, 0, thickness - f["channel_depth"]) * extrude(channels, f["channel_depth"] + OVERRUN)

    for cutter in air_path(f):
        puck -= cutter

    pilot_r, pilot_depth = f["pilot_diameter"] / 2, f["pilot_depth"]
    for x, y in f["pilots"]:
        puck -= Solid.make_cylinder(pilot_r, pilot_depth + OVERRUN, up(x, y, -OVERRUN))
        puck -= Solid.make_cone(pilot_r, 0, drill_point(2 * pilot_r, f["drill_half_angle"]), up(x, y, pilot_depth))

    solids = puck.solids()
    if len(solids) != 1 or not solids[0].is_valid:
        sys.exit(f"Expected one valid solid, got {len(solids)}.")
    solid = solids[0]
    solid.label = "MFT vacuum block puck"
    return solid


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("source", help="the vacuum block's SCAD source")
    parser.add_argument("step", help="the STEP file to write")
    parser.add_argument("overrides", nargs="?", default="{}", help="Customizer parameters as a JSON object")
    parser.add_argument("--stl", help="also write an STL of the solid, for checking")
    args = parser.parse_args()

    solid = build(puck_features(args.source, json.loads(args.overrides)))
    if not export_step(solid, args.step):
        sys.exit(f"Could not write {args.step}.")
    if args.stl and not export_stl(solid, args.stl, tolerance=0.01, angular_tolerance=0.05):
        sys.exit(f"Could not write {args.stl}.")
    box = solid.bounding_box()
    print(f"Saved {args.step}: {box.size.X:.2f} x {box.size.Y:.2f} x {box.size.Z:.2f} mm, "
          f"{solid.volume / 1000:.2f} cm3, {len(solid.faces())} faces.")


if __name__ == "__main__":
    main()
