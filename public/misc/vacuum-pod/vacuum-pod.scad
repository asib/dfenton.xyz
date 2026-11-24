// Double-sided vacuum pod
// A square, 3D-printed vacuum pod that holds itself down as well as the work,
// so it needs no dogs or clamps: it works on any smooth, airtight surface.
// Each face has a groove round its edge, holding a loop of round foam cord as
// the seal, and just inside that a single round-bottomed channel, so that air
// can get out from under the work all round. The rest of the face is flat, so
// there's little to coat and the work is supported all over. A hole through
// the pod, on the back of the channel, joins the two faces' channels, and a
// short duct runs to it from a 1/4" NPT fitting threaded into the back face: a
// push-to-connect fitting, or a quick-connect insert so the pod unplugs from
// its hose.
//
// Set the pod on the surface, lay the work on it and switch the vacuum on: the
// bottom seal pulls the pod down onto the surface and the top seal pulls the
// work down onto the pod, both at once. Nothing grips until the work covers
// the top seal, so place both before switching on. Switch off, or unplug the
// fitting, to release them.
//
// Each face holds in proportion to the area inside its seal, and only the
// friction under the bottom face stops the pod sliding, so keep cuts light and
// the surface clean. Laminate, melamine, glass and varnished tops work, where
// bare MDF or plywood leaks through its face. On an MFT-style top, the default
// pod's bottom seal fits between two rows of holes, so it can sit anywhere
// along the gap between them. The fitting stays within the pod's thickness, so
// work can overhang every side.
//
// All dimensions are millimetres. Z is up and the table top is Z=0. The pod is
// centred on the origin, with its fitting in the back face (+Y).
//
// View = Pod is the part to print. It prints as modelled, either face down,
// with no supports: the bed face's groove prints as a short bridge, its
// channels as arches, and the duct is a teardrop. Air leaks through a print's
// walls and infill, so print it to be airtight: in PETG, ASA or ABS, with
// extra walls, more top and bottom layers in a concentric pattern, the nozzle a
// little hotter, a slight over-extrusion, and an infill such as cubic that
// closes off its cells. vacuum-pod.3mf beside this file is a Bambu Studio
// project of the default pod set up that way. Then seal every surface with two
// or three coats of polycrylic, inside the port, duct and hole too, blowing the
// hole and channels clear after each coat. Wrap the fitting's thread in PTFE
// tape.

/* [View] */
// Assembly shows the pod on a patch of table with work on top, before the vacuum pulls them down onto the cords. Pod is the part to print.
View = "assembly"; // [assembly:Assembly with table and work, pod:Pod (print this)]
// Separation of the assembly's parts, in percent. Zero is assembled.
Explode = 0; // [0:1:100]

/* [Pod] */
// Pod length, along X.
Pod_length = 75; // [40:0.5:200]
// Pod width, along Y, front to back. The fitting is in the back face.
Pod_width = 75; // [40:0.5:200]
// Pod thickness. The port runs in between the two grooves, so it sets the least thickness.
Pod_thickness = 28; // [20:0.5:60]

/* [Seals] */
// Foam cord diameter. 6.35 mm is 1/4 inch.
Cord_diameter = 6.35; // [2:0.05:15]
// Groove width. A little under the cord's diameter, so the cord grips its walls.
Groove_width = 6; // [2:0.05:15]
// Groove depth. The cord stands proud of each face by its diameter less this, and compresses that much before the face lands. At least half the cord's diameter, to hold it.
Groove_depth = 3.5; // [1:0.1:15]
// Material between each groove and the pod's outside.
Rim_width = 4; // [1.5:0.1:15]
// Plan radius of the grooves' centre lines at the corners, where the cord bends. The pod's corners follow it.
Seal_bend_radius = 10; // [3:0.5:40]

/* [Channels] */
// Channel width. The channel round each face, just inside its groove, is round-bottomed, half as deep as it's wide.
Channel_width = 6; // [2:0.1:12]
// Land between each channel and its groove.
Channel_land = 3; // [1:0.5:15]

/* [Air path] */
// Diameter of the hole through the pod, on the back of the channels, which joins the two faces' channels.
Hole_diameter = 6; // [2:0.1:15]
// Diameter of the short duct from the port to the hole.
Duct_diameter = 6; // [3:0.1:12]
// Port diameter at the face, for a 1/4" NPT male thread to cut its own thread into, or for a 1/4" NPT tap. It narrows by 1/16 of its depth, as the thread does.
Port_hole = 11.6; // [8:0.05:16]
// Port depth into the pod. Longer than the fitting's thread, so it doesn't bottom out.
Port_depth = 14; // [6:0.5:30]
// Fitting hex across flats, for the assembly. An estimate: measure yours.
Fitting_hex = 14.3; // [8:0.1:30]
// How far the fitting stands out from the pod, without its tube, for the assembly. An estimate: measure yours.
Fitting_projection = 22; // [5:0.5:60]

/* [Table and work] */
// Centre-to-centre spacing of the table's holes, for the assembly and to check the bottom seal fits between them. MFT-style tops use 96 mm.
Hole_pitch = 96; // [20:0.5:200]
// Table hole diameter. MFT-style tops use 20 mm.
Table_hole_diameter = 20; // [5:0.5:40]
// Table top thickness, for the assembly.
Table_thickness = 19; // [10:0.5:40]
// Work length, for the assembly.
Work_length = 160; // [40:1:600]
// Work width, for the assembly.
Work_width = 110; // [40:1:600]
// Work thickness, for the assembly.
Work_thickness = 18; // [3:0.5:100]

/* [Hidden] */

$fn = 48;
eps = 0.01;

// 1/4" NPT male thread on the reference fitting, and a stub of its tube.
npt_major = 13.7;
npt_length = 10;
npt_taper = 1 / 16;
fitting_standoff = 1;
tube_d = 6.35;
tube_stub = 20;
// Least plastic between the port's thread and each groove floor, and between
// the duct and each face's channels.
min_cover = 2.5;
port_chamfer = 1;

function r1(x) = round(x * 10) / 10;
function r2(x) = round(x * 100) / 100;

assembly = View == "assembly";
explode = assembly ? Explode / 100 * 50 : 0;

mid_z = Pod_thickness / 2;
top_groove_floor = Pod_thickness - Groove_depth;
channel_r = Channel_width / 2;
channel_depth = channel_r;
top_channel_floor = Pod_thickness - channel_depth;

// Each groove's centre line is a rounded rectangle Rim_width + Groove_width / 2
// in from the pod's edge; the pod's corners and the grooves' edges are
// concentric with its corners, so the rim and groove keep their widths.
seal_inset = Rim_width + Groove_width / 2;
corner_r = Seal_bend_radius + seal_inset;
seal_l = Pod_length - 2 * seal_inset;
seal_w = Pod_width - 2 * seal_inset;
cord_length = 2 * (seal_l + seal_w) - (8 - 2 * PI) * Seal_bend_radius;
cord_proud = Cord_diameter - Groove_depth;
// The area each seal pulls on, inside the cord's centre line.
seal_area = seal_l * seal_w - (4 - PI) * Seal_bend_radius * Seal_bend_radius;
// Across the cord's outside: the work must cover it, and the surface under
// the pod must be solid out to it.
cord_outer_l = seal_l + Cord_diameter;
cord_outer_w = seal_w + Cord_diameter;
// Inside each groove.
inner_l = Pod_length - 2 * (Rim_width + Groove_width);
inner_w = Pod_width - 2 * (Rim_width + Groove_width);
inner_r = Seal_bend_radius - Groove_width / 2;
// The centre line of the channel round the edge: a rounded rectangle
// Channel_land plus half a channel inside the groove, with corners no tighter
// than the channel's width, so that its sweep doesn't fold on itself.
ring_l = inner_l - 2 * (Channel_land + channel_r);
ring_w = inner_w - 2 * (Channel_land + channel_r);
ring_r = min(max(Channel_width, inner_r - Channel_land - channel_r), ring_l / 2, ring_w / 2);
// The hole sits on the back of the channel, in line with the port. Its
// countersink dishes it into the channel, stopping half the land short of the
// groove.
hole_y = ring_w / 2;
sink_d = max(Hole_diameter, min(Hole_diameter + 2 * channel_depth, Channel_width + Channel_land));
sink_depth = (sink_d - Hole_diameter) / 2;

port_end_y = Pod_width / 2 - Port_depth;
port_mouth_r = Port_hole / 2 + port_chamfer;
hex_corner_r = Fitting_hex / sqrt(3);
fitting_reach = Pod_width / 2 + Fitting_projection + tube_stub;
// The pod's least thickness for the fitting's thread to pass between the
// faces' grooves and channels.
face_cut = max(Groove_depth, channel_depth);
min_thickness = 2 * (face_cut + min_cover) + npt_major;
// The clear space between neighbouring rows of the table's holes.
hole_gap = Hole_pitch - Table_hole_diameter;
seal_small = min(cord_outer_l, cord_outer_w);
seal_big = max(cord_outer_l, cord_outer_w);

assert(Groove_width <= Cord_diameter, "The grooves must be no wider than the cord, or the cord won't grip them.");
assert(Groove_depth >= Cord_diameter / 2, "The grooves must be at least half the cord's diameter deep to hold it.");
assert(cord_proud >= 0.5, "The cord must stand at least 0.5 mm proud of each face to seal. Make the grooves shallower.");
assert(Groove_width / 2 < Seal_bend_radius, "The grooves' inner edges need a corner radius: raise the seal bend radius above half the groove width.");
assert(min(ring_l, ring_w) >= 2 * Channel_width,
    "There's no room for the channels inside the grooves. Make the pod bigger, or the rim, grooves, channels or land narrower.");
assert(mid_z - npt_major / 2 - face_cut >= min_cover - eps,
    str("The pod is too thin for the port to run in between its two faces' grooves and channels. Make it at least ", r1(min_thickness),
        " mm thick, or the grooves shallower or the channels narrower."));
assert(mid_z + Duct_diameter / 2 * sqrt(2) <= top_channel_floor - min_cover && mid_z - Duct_diameter / 2 >= channel_depth + min_cover,
    "The duct comes too close to the channels. Make the pod thicker, or the channels or duct narrower.");
assert(Duct_diameter <= Port_hole - 1, "The duct must be narrower than the port.");
assert(Hole_diameter / 2 + 1 <= channel_r + Channel_land, "The hole must stay 1 mm clear of the grooves. Make it smaller, or the channels or land wider.");
assert(port_end_y >= hole_y - Hole_diameter / 2, "The port reaches past the hole. Make it shallower.");
assert(port_mouth_r + 2 <= Pod_length / 2 - corner_r,
    str("The port must stay 2 mm clear of the pod's rounded corners. Make the pod at least ", r1(2 * (corner_r + port_mouth_r + 2)),
        " mm long, or the seal bend radius smaller."));

// Legend colours as 0-255 RGB. Repeated pieces get their own colour within
// 3/255 of the legend colour, so the viewer can select each one.
pod_rgb = [208, 106, 31];
cord_rgb = [71, 76, 85];
fitting_rgb = [168, 134, 44];
table_rgb = [201, 195, 182];
work_rgb = [181, 136, 84];
function shade(base, k) = base + [0, 0, k];
function hex2(n) = str("0123456789abcdef"[floor(n / 16)], "0123456789abcdef"[n % 16]);
function hex_color(c) = str("#", hex2(c[0]), hex2(c[1]), hex2(c[2]));
module paint(rgb) color(rgb / 255) children();

// --- Pod ---

module rounded_rect(l, w, r) {
    rr = max(0, min(r, l / 2 - eps, w / 2 - eps));
    // A hull of corner circles rather than offset(): in openrscad-engine 0.14,
    // offset()'s output can come out wrong when something is later subtracted
    // from it.
    if (rr > 0) hull() for (x = [-1, 1] * (l / 2 - rr), y = [-1, 1] * (w / 2 - rr)) translate([x, y]) circle(r = rr);
    else square([l, w], center = true);
}

module groove() {
    difference() {
        rounded_rect(seal_l + Groove_width, seal_w + Groove_width, Seal_bend_radius + Groove_width / 2);
        rounded_rect(seal_l - Groove_width, seal_w - Groove_width, Seal_bend_radius - Groove_width / 2);
    }
}

// The cutter for one face's channel, with the face at height z: a circle
// swept round the channel's centre line. Its centre sits a hair outside the
// face, so that its widest part doesn't lie exactly in the face. The sweep's
// straight lengths reach 0.1 mm into its corners, so they overlap rather than
// meet face to face.
module channels(z) {
    r = channel_r;
    sx = ring_l / 2 - ring_r;
    sy = ring_w / 2 - ring_r;
    box = ring_r + r + 1;
    translate([0, 0, z]) {
        for (y = [-1, 1] * ring_w / 2) translate([-sx - 0.1, y, 0]) rotate([0, 90, 0]) cylinder(r = r, h = 2 * sx + 0.2);
        for (x = [-1, 1] * ring_l / 2) translate([x, -sy - 0.1, 0]) rotate([-90, 0, 0]) cylinder(r = r, h = 2 * sy + 0.2);
        for (cx = [-1, 1], cy = [-1, 1]) translate([cx * sx, cy * sy, 0]) intersection() {
            rotate_extrude() translate([ring_r, 0]) circle(r = r);
            translate([cx > 0 ? 0 : -box, cy > 0 ? 0 : -box, -box]) cube([box, box, 2 * box]);
        }
    }
}

// A circle with a 45-degree point on top, so a horizontal hole prints
// without support.
module teardrop(r) {
    circle(r = r);
    rotate(45) square(r);
}

module air_path() {
    // The port in the back face, tapered like the thread, with a chamfer at
    // its mouth.
    translate([0, Pod_width / 2 + eps, mid_z]) rotate([90, 0, 0]) {
        cylinder(d1 = Port_hole, d2 = Port_hole - Port_depth * npt_taper, h = Port_depth + eps);
        cylinder(d1 = Port_hole + 2 * port_chamfer, d2 = Port_hole, h = port_chamfer + eps);
    }
    // The duct, from just inside the port to just past the hole.
    translate([0, port_end_y + 1, mid_z]) rotate([90, 0, 0])
        linear_extrude(height = port_end_y + 1 - hole_y + Duct_diameter / 2) teardrop(Duct_diameter / 2);
    // The hole, from one face's channel to the other's, with a 90-degree
    // countersink at each face.
    translate([0, hole_y, 0]) {
        translate([0, 0, channel_depth / 2]) cylinder(d = Hole_diameter, h = Pod_thickness - channel_depth);
        if (sink_depth > 0) for (z = [-0.02, Pod_thickness + 0.02]) translate([0, 0, z]) mirror([0, 0, z > 0 ? 0 : 1])
            translate([0, 0, -sink_depth - 0.02]) cylinder(d1 = Hole_diameter, d2 = sink_d + 0.04, h = sink_depth + 0.02);
    }
}

module pod() {
    difference() {
        linear_extrude(height = Pod_thickness) rounded_rect(Pod_length, Pod_width, corner_r);
        for (z = [-eps, top_groove_floor]) translate([0, 0, z]) linear_extrude(height = Groove_depth + eps) groove();
        channels(-0.02);
        channels(Pod_thickness + 0.02);
        air_path();
    }
}

// --- Reference parts ---

// A foam cord swept round a groove's centre line, its centre at height z:
// straight lengths along each side and a quarter torus at each corner. The
// straight lengths reach 0.1 mm into the corners, so they overlap rather than
// meet face to face, which the engine meshes with non-manifold edges.
module cord(z) {
    r = Cord_diameter / 2;
    sx = seal_l / 2 - Seal_bend_radius;
    sy = seal_w / 2 - Seal_bend_radius;
    translate([0, 0, z]) {
        for (y = [-1, 1] * seal_w / 2) translate([-sx - 0.1, y, 0]) rotate([0, 90, 0]) cylinder(r = r, h = 2 * sx + 0.2, $fn = 24);
        for (x = [-1, 1] * seal_l / 2) translate([x, -sy - 0.1, 0]) rotate([-90, 0, 0]) cylinder(r = r, h = 2 * sy + 0.2, $fn = 24);
        for (cx = [-1, 1], cy = [-1, 1]) translate([cx * sx, cy * sy, 0]) intersection() {
            rotate_extrude($fn = 48) translate([Seal_bend_radius, 0]) circle(r = r, $fn = 24);
            translate([cx > 0 ? 0 : -corner_r, cy > 0 ? 0 : -corner_r, -r]) cube([corner_r, corner_r, 2 * r]);
        }
    }
}

// The fitting, built along +Y out of the back face: the thread inside the
// port, then the hex, body, collar and a stub of tube.
module fitting() {
    hex_l = 7;
    body_l = Fitting_projection - fitting_standoff - hex_l - 3;
    translate([0, Pod_width / 2, mid_z]) rotate([-90, 0, 0]) {
        translate([0, 0, fitting_standoff - npt_length])
            cylinder(d1 = npt_major - npt_length * npt_taper, d2 = npt_major, h = npt_length);
        translate([0, 0, fitting_standoff]) cylinder(r = hex_corner_r, h = hex_l, $fn = 6);
        translate([0, 0, fitting_standoff + hex_l]) cylinder(d = 0.9 * Fitting_hex, h = body_l);
        translate([0, 0, Fitting_projection - 3]) cylinder(d = 0.85 * Fitting_hex, h = 3);
        translate([0, 0, Fitting_projection - 1]) cylinder(d = tube_d, h = tube_stub + 1);
    }
}

// A patch of table round the pod and its fitting, with the pod in the middle
// of a square of holes on the table's grid.
module table() {
    span = max(Pod_length / 2, fitting_reach) + max(20, Hole_pitch / 4);
    n = ceil(span / Hole_pitch) + 1;
    difference() {
        translate([-span, -span, -Table_thickness]) cube([2 * span, 2 * span, Table_thickness]);
        for (i = [-n:n], j = [-n:n]) {
            g = [(i + 0.5) * Hole_pitch, (j + 0.5) * Hole_pitch];
            if (max(abs(g[0]), abs(g[1])) + Table_hole_diameter / 2 + 5 <= span)
                translate([g[0], g[1], -Table_thickness - eps]) cylinder(d = Table_hole_diameter, h = Table_thickness + 2 * eps, $fn = 32);
        }
    }
}

// Before the vacuum pulls: the pod rests on its bottom cord, and the work on
// the top one. Each cord sits a hair off its groove's floor, and the pod and
// work a hair above the cords, so that their meshes don't touch.
module assembly() {
    pod_z = cord_proud + 0.1;
    work_z = pod_z + Pod_thickness + cord_proud + 0.1;
    translate([0, 0, -explode]) paint(table_rgb) table();
    translate([0, 0, pod_z]) {
        paint(pod_rgb) pod();
        translate([0, 0, -0.5 * explode]) paint(shade(cord_rgb, 1)) cord(Groove_depth - Cord_diameter / 2 - 0.05);
        translate([0, 0, 0.5 * explode]) paint(shade(cord_rgb, 0)) cord(top_groove_floor + Cord_diameter / 2 + 0.05);
        translate([0, 0.8 * explode, 0]) paint(fitting_rgb) fitting();
    }
    translate([-Work_length / 2, -Work_width / 2, work_z + explode]) paint(work_rgb) cube([Work_length, Work_width, Work_thickness]);
}

echo(str("Pod: ", Pod_length, " x ", Pod_width, " x ", Pod_thickness,
    " mm. Print it as modelled, either face down, with no supports, to be airtight: extra walls, more concentric top and bottom layers,",
    " a little hotter, slightly over-extruded, with cubic infill. Then seal every surface with two or three coats of polycrylic,",
    " inside the port, duct and hole too, blowing the hole and channels clear after each coat."));
echo(str("Seals: cut two ", round(cord_length), " mm lengths of ", Cord_diameter,
    " mm foam cord, one for each face, and join each one's ends with CA glue, cut at 45 degrees. Each stands ", r2(cord_proud), " mm proud in a ",
    Groove_width, " mm wide, ", Groove_depth, " mm deep groove."));
echo(str("Holding: each face pulls on ", r1(seal_area / 100), " cm2 inside its seal, ", round(seal_area / 100),
    " N for every 0.1 bar of vacuum. The work must cover the top seal, at least ", r1(cord_outer_l), " x ", r1(cord_outer_w),
    " mm, and the surface under the bottom seal must be smooth and airtight."));
echo(seal_small > hole_gap
    ? str("On an MFT-style top: the bottom seal is wider than the ", hole_gap, " mm between rows of holes, so keep it on a solid part of the top.")
    : str("On an MFT-style top: the bottom seal's ", r1(seal_small), " mm fits in the ", hole_gap,
        " mm between two rows of holes, so the pod can sit anywhere along the gap between them",
        seal_big <= hole_gap ? ", either way round." : str(", with its ", cord_outer_l >= cord_outer_w ? "length" : "width", " along the rows.")));
echo(str("Channel: ", Channel_width, " mm wide and ", r1(channel_depth), " mm deep, round-bottomed, round each face just inside its groove. A ",
    Hole_diameter, " mm hole through the pod on the back of the channels joins them", sink_depth > 0 ? str(", countersunk ", r1(sink_d), " mm across in each face") : "", "."));
echo(str("Port: ", Port_hole, " mm at the back face, tapering to ", r2(Port_hole - Port_depth * npt_taper), " mm, ", Port_depth,
    " mm deep and centred ", r1(mid_z), " mm up, for a 1/4\" NPT fitting to cut its own thread into, or a 1/4\" NPT tap. A ",
    Duct_diameter, " mm duct runs from it to the hole."));
echo(hex_corner_r <= mid_z
    ? "Fitting: its hex stays within the pod's thickness, so work can overhang the back too."
    : str("Fitting: its hex stands ", r1(hex_corner_r - mid_z), " mm beyond the faces, so keep work off the back."));
echo("PIECES_V1", [
    [hex_color(shade(cord_rgb, 0)), "Top cord"],
    [hex_color(shade(cord_rgb, 1)), "Bottom cord"]
]);

if (assembly) assembly();
else paint(pod_rgb) pod();
