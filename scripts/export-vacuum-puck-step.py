# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["build123d==0.13.0", "reportlab==4.2.5"]
# ///
"""Rebuild the MFT vacuum block's puck as a STEP solid, for CNC machining.

Run from the repository root with uv, which installs build123d (OpenCascade):

    uv run scripts/export-vacuum-puck-step.py public/misc/mft-vacuum-block/mft-vacuum-block.scad puck.step

An optional third argument sets Customizer parameters as a JSON object, as the
page would, for example '{"Stock_thickness": 22.2, "Port_drop": 13.35}'.
--pdf PATH also writes the puck's machining drawing, which a shop needs to tap
its threads: views of it projected from the same solid, with the threads
called out and the tapped holes located. --stl PATH writes a fine STL of the
solid for checking.

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
    Box,
    Circle,
    GeomType,
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
from reportlab.pdfgen.canvas import FILL_EVEN_ODD, Canvas

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


# --- Machining drawing ---
# An A3 sheet in millimetres, at 1:1 or for a larger puck 1:2, of views
# projected from the solid with OpenCascade's hidden-line removal. The
# dimensions and callouts come from the same features the solid was cut from.

MM = 72 / 25.4
SHEET = (420, 297)
VISIBLE, THIN = 0.35, 0.18
FONT, BOLD, TEXT = "Helvetica", "Helvetica-Bold", 3


def fmt(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


class View:
    """The shape seen from `toward` (a unit vector from look_at to the viewer),
    with `up` up the sheet, drawn at `scale` with look_at at `centre`."""

    def __init__(self, shape, centre, look_at, toward, up, scale=1):
        self.centre, self.look_at, self.up, self.scale = centre, look_at, up, scale
        self.right = cross(tuple(-t for t in toward), up)
        eye = tuple(p + 500 * t for p, t in zip(look_at, toward))
        visible, _ = shape.project_to_viewport(eye, viewport_up=up, look_at=look_at)
        self.lines = [self._polyline(edge) for edge in visible]
        self.circles = [(self._sheet(edge.arc_center), edge.radius * scale) for edge in visible if edge.geom_type == GeomType.CIRCLE]

    def _sheet(self, v):
        return (self.centre[0] + self.scale * v.X, self.centre[1] + self.scale * v.Y)

    def _polyline(self, edge):
        n = 2 if edge.geom_type == GeomType.LINE else max(9, math.ceil(edge.length / 0.25))
        return [self._sheet(edge.position_at(i / (n - 1))) for i in range(n)]

    def at(self, p):
        # A model point's place on the sheet.
        d = tuple(a - b for a, b in zip(p, self.look_at))
        return (self.centre[0] + self.scale * dot(d, self.right), self.centre[1] + self.scale * dot(d, self.up))

    def check_circle(self, p, radius, what):
        # Holes are dimensioned from the features; check the solid has them there.
        x, y = self.at(p)
        if not any(math.hypot(c[0] - x, c[1] - y) < 0.01 and abs(r - radius * self.scale) < 0.01 for c, r in self.circles):
            sys.exit(f"The drawing's {what} doesn't match the solid.")


class Sheet:
    def __init__(self, path, title, scale):
        self.scale = scale
        self.c = Canvas(str(path), pagesize=(SHEET[0] * MM, SHEET[1] * MM), invariant=1)
        self.c.setTitle(title)
        self.c.setCreator("scripts/export-vacuum-puck-step.py")
        self.c.scale(MM, MM)
        self.c.setLineCap(1)
        self.c.setLineJoin(1)

    def polyline(self, points, width=THIN, dash=None):
        c = self.c
        c.setLineWidth(width)
        c.setDash(dash or [])
        path = c.beginPath()
        path.moveTo(*points[0])
        for p in points[1:]:
            path.lineTo(*p)
        c.drawPath(path, stroke=1, fill=0)
        c.setDash([])

    def line(self, a, b, width=THIN, dash=None):
        self.polyline([a, b], width, dash)

    def view(self, view):
        for points in view.lines:
            self.polyline(points, VISIBLE)

    def text(self, p, s, size=TEXT, font=FONT, anchor="left", angle=0):
        c = self.c
        c.saveState()
        c.translate(*p)
        c.rotate(angle)
        c.setFont(font, size)
        width = c.stringWidth(s, font, size)
        c.drawString({"left": 0, "centre": -width / 2, "right": -width}[anchor], 0, s)
        c.restoreState()

    def width(self, s, size=TEXT, font=FONT):
        return self.c.stringWidth(s, font, size)

    def arrow(self, tip, tail):
        # A filled arrowhead at tip, pointing away from tail.
        length = math.hypot(tip[0] - tail[0], tip[1] - tail[1])
        ux, uy = (tip[0] - tail[0]) / length, (tip[1] - tail[1]) / length
        bx, by = tip[0] - 2.5 * ux, tip[1] - 2.5 * uy
        path = self.c.beginPath()
        path.moveTo(*tip)
        path.lineTo(bx - 0.6 * uy, by + 0.6 * ux)
        path.lineTo(bx + 0.6 * uy, by - 0.6 * ux)
        path.close()
        self.c.drawPath(path, stroke=0, fill=1)

    def dimension(self, a, b, horizontal, at):
        # The distance between sheet points a and b, across (horizontal) or up
        # the sheet, with its dimension line at y = at or x = at.
        i, j = (0, 1) if horizontal else (1, 0)
        ends = []
        for p in (a, b):
            sign = 1 if at > p[j] else -1
            if abs(at - p[j]) > 1:
                start, end = list(p), list(p)
                start[j] += sign
                end[j] = at + 1.5 * sign
                self.line(start, end)
            q = list(p)
            q[j] = at
            ends.append(q)
        lo, hi = sorted(ends, key=lambda q: q[i])
        value = hi[i] - lo[i]
        label = fmt(value / self.scale)
        if value >= 4 + self.width(label):
            self.line(lo, hi)
            self.arrow(lo, hi)
            self.arrow(hi, lo)
        else:
            # Arrows outside, pointing in.
            out_lo, out_hi = list(lo), list(hi)
            out_lo[i] -= 4
            out_hi[i] += 4
            self.line(out_lo, out_hi)
            self.arrow(lo, out_lo)
            self.arrow(hi, out_hi)
        mid = (lo[i] + hi[i]) / 2
        if horizontal:
            self.text((mid, at + 1), label, anchor="centre")
        else:
            self.text((at - 1, mid), label, anchor="centre", angle=90)

    def chain(self, points, horizontal, at):
        for a, b in zip(points, points[1:]):
            self.dimension(a, b, horizontal, at)

    def leader(self, target, elbow, lines, direction=1):
        # A leader from target, with lines of text along a landing from elbow.
        width = max(self.width(s) for s in lines)
        self.line(target, elbow)
        self.line(elbow, (elbow[0] + direction * (width + 2), elbow[1]))
        self.arrow(target, elbow)
        x, anchor = elbow[0] + direction, "left" if direction > 0 else "right"
        self.text((x, elbow[1] + 0.8), lines[0], anchor=anchor)
        for k, s in enumerate(lines[1:]):
            self.text((x, elbow[1] - 0.8 - TEXT - k * (TEXT + 1.2)), s, anchor=anchor)

    def centre_mark(self, p, radius):
        self.line((p[0] - radius - 1.5, p[1]), (p[0] + radius + 1.5, p[1]), dash=[4, 1, 0.5, 1])
        self.line((p[0], p[1] - radius - 1.5), (p[0], p[1] + radius + 1.5), dash=[4, 1, 0.5, 1])

    def hatch(self, loops, spacing=1.5):
        c = self.c
        c.saveState()
        path = c.beginPath()
        for loop in loops:
            path.moveTo(*loop[0])
            for p in loop[1:]:
                path.lineTo(*p)
            path.close()
        c.clipPath(path, stroke=0, fill=0, fillMode=FILL_EVEN_ODD)
        xs = [p[0] for loop in loops for p in loop]
        ys = [p[1] for loop in loops for p in loop]
        height = max(ys) - min(ys)
        x = min(xs) - height
        while x < max(xs):
            self.line((x, min(ys)), (x + height, max(ys)), width=0.13)
            x += spacing
        c.restoreState()

    def label(self, view_bottom, x, title):
        self.text((x, view_bottom), title, size=3.5, font=BOLD, anchor="centre")

    def save(self):
        self.c.showPage()
        self.c.save()


def drawing(solid, f, path, step_name):
    length, width, radius = f["body"]
    thickness = f["thickness"]
    side = 1 if f["mirror_y"] else -1
    face = "BACK" if side > 0 else "FRONT"
    px, pz = f["port_x"], f["port_z"]
    port_r, port_y = f["port_hole"] / 2, side * width / 2
    pilot_r = f["pilot_diameter"] / 2
    pilots = f["pilots"]
    mid = (0, 0, thickness / 2)
    k = 1 if length <= 115 and width <= 70 and thickness <= 30 else 0.5
    s = Sheet(path, "MFT vacuum block puck: machining drawing", k)

    # Top: the vacuum face, with the back up the sheet.
    top = View(solid, (95, 222), mid, (0, 0, 1), (0, 1, 0), k)
    s.view(top)
    near = width / 2 - radius
    view_left, view_right = top.at((-length / 2, 0, 0))[0], top.at((length / 2, 0, 0))[0]
    view_top, view_bottom = top.at((0, width / 2, 0))[1], top.at((0, -width / 2, 0))[1]
    s.dimension(top.at((-length / 2, -near, 0)), top.at((length / 2, -near, 0)), True, view_bottom - 14)
    s.dimension(top.at((-length / 2 + radius, -width / 2, 0)), top.at((-length / 2 + radius, width / 2, 0)), False, view_left - 10)
    corner = (length / 2 - radius + radius / math.sqrt(2), width / 2 - radius + radius / math.sqrt(2), 0)
    c = top.at(corner)
    s.leader(c, (view_right + 6, view_top + 12), [f"4× R{fmt(radius)}"])
    groove_w = (f["groove_outer"][1] - f["groove_inner"][1]) / 2
    groove_edge = top.at((-length / 4, f["groove_outer"][1] / 2, 0))
    s.leader(groove_edge, (view_left - 15, view_top + 12),
             [f"SEAL GROOVE {fmt(groove_w)} WIDE, {fmt(f['groove_depth'])} DEEP"])
    x0, y0 = f["channels"][0][0], f["channels"][0][1]
    channel_edge = top.at((x0 / 2, y0 + f["channel_width"] / 2, 0))
    s.leader(channel_edge, (view_right + 8, top.centre[1] + 8),
             [f"CHANNELS {fmt(f['channel_width'])} WIDE, {fmt(f['channel_depth'])} DEEP"])
    # The holes' places are given for a port in the front face.
    holes = [(px, -y if f["mirror_y"] else y) for y in f["hole_ys"]]
    hole_r = f["hole_diameter"] / 2
    for x, y in holes:
        top.check_circle((x, y, thickness), hole_r, "vacuum hole")
    hx, hy = top.at((holes[0][0], holes[0][1], 0))
    s.leader((hx + hole_r / math.sqrt(2), hy - hole_r / math.sqrt(2)), (view_right + 8, view_bottom + 4),
             [f"{len(holes)}× Ø{fmt(f['hole_diameter'])} DOWN TO THE DUCT"] if len(holes) > 1 else [f"Ø{fmt(f['hole_diameter'])} DOWN TO THE DUCT"])
    # Section A-A, through the port's axis, seen from +X.
    a0, a1 = top.at((px, -width / 2 - 7, 0)), top.at((px, width / 2 + 7, 0))
    s.line(a0, a1, dash=[6, 1.5, 1, 1.5])
    for end, inner in ((a0, (a0[0], a0[1] + 4)), (a1, (a1[0], a1[1] - 4))):
        s.line(end, inner, width=0.6)
        s.line(end, (end[0] - 6, end[1]))
        s.arrow((end[0] - 6, end[1]), end)
        s.text((end[0] - 9, end[1] - 1.2), "A", size=4, font=BOLD, anchor="centre")
    s.label(view_bottom - 26, top.centre[0], "TOP: VACUUM FACE")

    # Bottom, seen from below, with the back down the sheet.
    bottom = View(solid, (270, 222), mid, (0, 0, -1), (0, -1, 0), k)
    s.view(bottom)
    for x, y in pilots:
        bottom.check_circle((x, y, 0), pilot_r, "screw hole")
        s.centre_mark(bottom.at((x, y, 0)), pilot_r)
    xs = sorted({x for x, _ in pilots})
    ys = sorted({y for _, y in pilots})
    top_y = min(ys, key=lambda y: -bottom.at((0, y, 0))[1])
    left_x = min(xs, key=lambda x: bottom.at((x, 0, 0))[0])
    s.chain([bottom.at((-length / 2, -near, 0))] + [bottom.at((x, top_y, 0)) for x in xs] + [bottom.at((length / 2, -near, 0))],
            True, bottom.at((0, -width / 2, 0))[1] + 10)
    far = length / 2 - radius
    s.chain([bottom.at((-far, -width / 2, 0))] + [bottom.at((left_x, y, 0)) for y in ys] + [bottom.at((-far, width / 2, 0))],
            False, bottom.at((-length / 2, 0, 0))[0] - 10)
    corner_hole = max(pilots, key=lambda p: (bottom.at((p[0], p[1], 0))[0], -bottom.at((p[0], p[1], 0))[1]))
    hx, hy = bottom.at((corner_hole[0], corner_hole[1], 0))
    thread = f["screw_thread"].replace("x", "×")
    s.leader((hx + pilot_r / math.sqrt(2), hy - pilot_r / math.sqrt(2)), (bottom.at((length / 2, 0, 0))[0] + 10, hy - 16),
             [f"{len(pilots)}× {thread}-6H TAPPED, THREAD {fmt(f['screw_thread_depth'])} DEEP",
              f"TAP DRILL Ø{fmt(f['pilot_diameter'])}, {fmt(f['pilot_depth'])} DEEP"])
    s.label(bottom.at((0, width / 2, 0))[1] - 26, bottom.centre[0], "BOTTOM")

    # The port's face, seen from outside it.
    port = View(solid, (95, 118), mid, (0, side, 0), (0, 0, 1), k)
    s.view(port)
    port.check_circle((px, port_y, pz), port_r, "port")
    centre = port.at((px, port_y, pz))
    s.centre_mark(centre, port_r)
    ends = sorted((port.at((x, port_y, 0)) for x in (-length / 2, length / 2)))
    left, right = ends[0][0], ends[1][0]
    bottom_y, top_y = port.at((0, port_y, 0))[1], port.at((0, port_y, thickness))[1]
    s.dimension((left, bottom_y), (left, top_y), False, left - 10)
    s.dimension((right, bottom_y), centre, False, right + 10)
    s.dimension((left, bottom_y), centre, True, bottom_y - 10)
    s.leader((centre[0] + port_r / math.sqrt(2), centre[1] + port_r / math.sqrt(2)), (right + 18, top_y + 12),
             [f"{f['port_thread']} TAPPED, THREAD {fmt(f['port_thread_depth'])} DEEP",
              f"TAP DRILL Ø{fmt(f['port_hole'])}, {fmt(f['port_depth'])} DEEP", "SEE NOTE 3"])
    s.label(bottom_y - 24, port.centre[0], f"{face}: PORT FACE")

    # Section A-A.
    cut = solid - Pos(px + 250, 0, 0) * Box(500, 500, 500)
    section = View(cut, (270, 118), (px, 0, thickness / 2), (1, 0, 0), (0, 0, 1), k)
    loops = []
    for cut_face in cut.faces():
        if cut_face.geom_type == GeomType.PLANE and abs(cut_face.normal_at().X) > 0.999 and abs(cut_face.center().X - px) < 1e-6:
            for wire in [cut_face.outer_wire(), *cut_face.inner_wires()]:
                n = max(16, math.ceil(wire.length / 0.25))
                loops.append([section.at(tuple(wire.position_at(i / n))) for i in range(n)])
    if not loops:
        sys.exit("Section A-A found no cut face.")
    s.hatch(loops)
    s.view(section)
    face_x = section.at((px, port_y, 0))[0]
    sec_top = section.at((px, 0, thickness))[1]
    sec_bottom = section.at((px, 0, 0))[1]
    duct_r = f["duct_diameter"] / 2
    port_end = section.at((px, side * (width / 2 - f["port_depth"]), pz + port_r))
    duct_end = section.at((px, side * (width / 2 - f["duct_depth"]), pz + duct_r))
    s.dimension((face_x, sec_top), port_end, True, sec_top + 8)
    s.dimension((face_x, sec_top), duct_end, True, sec_top + 15)
    # The duct's exposed length, between the port's end and its own.
    duct_mid = section.at((px, side * (width / 2 - (f["port_depth"] + f["duct_depth"]) / 2), pz - duct_r))
    s.leader(duct_mid, (duct_mid[0] + 6 * side, sec_bottom - 8), [f"Ø{fmt(f['duct_diameter'])} DUCT"], direction=side)
    s.label(sec_bottom - 24, section.centre[0], "SECTION A-A")

    # An isometric view, for orientation.
    iso = View(solid, (370, 130), mid, tuple(v / math.sqrt(1 + 1.96 + 1.21) for v in (1, 1.4 * side, 1.1)), (0, 0, 1), 0.7 * k)
    s.view(iso)
    s.label(sec_bottom - 24, 370, "ISOMETRIC, NOT TO SCALE")

    # Frame, notes and title block.
    s.c.setLineWidth(0.5)
    s.c.rect(10, 10, SHEET[0] - 20, SHEET[1] - 20)
    s.c.rect(250, 10, 160, 52)
    s.c.setLineWidth(THIN)
    for y in (24, 31, 38, 45, 52):
        s.line((250, y), (410, y))
    s.line((330, 10), (330, 45))
    s.text((253, 55), "MFT vacuum block puck", size=5, font=BOLD)
    cells = [((253, 47), f"Model: {step_name}"),
             ((253, 40), "Material: aluminium 6061-T6"), ((333, 40), "Quantity: as ordered"),
             ((253, 33), "Finish: as machined, deburred"), ((333, 33), "Units: mm"),
             ((253, 26), "General tolerances: ISO 2768-m"), ((333, 26), f"Scale: 1:{fmt(1 / k)} on A3"),
             ((253, 17), "Views are labelled; not to a"), ((253, 13), "projection convention"), ((333, 17), "Sheet 1 of 1")]
    for p, t in cells:
        s.text(p, t)
    notes = [
        "NOTES",
        f"1. The STEP model, {step_name}, defines the part. This drawing calls out its threads and locates them.",
        f"2. Threads: {len(pilots)}× {thread}-6H in the bottom face, and {f['port_thread']} in the port in the {face.lower()} face.",
        "    The STEP models each tapped hole at its tap drill.",
        f"3. If a {f['port_thread']} tap is not available, leave the port as the drilled Ø{fmt(f['port_hole'])} hole: it will be tapped after delivery.",
        f"4. Blind holes end in 118° drill points. Internal corners may keep the cutter's radius.",
        "5. Remove all burrs, particularly from the seal groove and channels on the vacuum face.",
    ]
    for k, t in enumerate(notes):
        s.text((14, 55 - k * 6), t, size=3.5 if k == 0 else TEXT, font=BOLD if k == 0 else FONT)
    s.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("source", help="the vacuum block's SCAD source")
    parser.add_argument("step", help="the STEP file to write")
    parser.add_argument("overrides", nargs="?", default="{}", help="Customizer parameters as a JSON object")
    parser.add_argument("--pdf", help="also write the machining drawing as a PDF")
    parser.add_argument("--stl", help="also write an STL of the solid, for checking")
    args = parser.parse_args()

    features = puck_features(args.source, json.loads(args.overrides))
    solid = build(features)
    if not export_step(solid, args.step):
        sys.exit(f"Could not write {args.step}.")
    if args.pdf:
        drawing(solid, features, args.pdf, Path(args.step).name)
    if args.stl and not export_stl(solid, args.stl, tolerance=0.01, angular_tolerance=0.05):
        sys.exit(f"Could not write {args.stl}.")
    box = solid.bounding_box()
    print(f"Saved {args.step}: {box.size.X:.2f} x {box.size.Y:.2f} x {box.size.Z:.2f} mm, "
          f"{solid.volume / 1000:.2f} cm3, {len(solid.faces())} faces.")


if __name__ == "__main__":
    main()
