// MFT vacuum block
// A single-sided, 3D-printed vacuum block for an MFT-style table. The top is
// the vacuum face: a groove round its edge holds a loop of round foam cord as
// the seal, and inside it a grid of islands supports the workpiece, with
// channels between them to spread the vacuum. Holes in the channels drop to a
// duct inside the block, which runs to a 1/4" NPT push-to-connect fitting
// threaded into the front face. The underside is flat and solid: the block is
// held to the table by two tightening dogs, not by vacuum. Two wings run
// straight back from the block's rear face along the table, and each dog
// clamps one through a long slot, so both dogs stand in one row of table holes
// behind the block. The slots let the block slide toward or away from that
// row: with a slot a hole pitch long, it can sit anywhere front to back,
// moving the dogs to the next row when a slot runs out. Each dog is an M6 rod
// with a 30 mm knurled knob under the table and a flangeless 30 mm knob on the
// wing, as in the shared Onshape document's "bottom knob" and "top knob no
// flange".
//
// The front and both ends are clear of the knobs. The block is tall, so work
// overhanging the back also clears them: Work_clearance is the clear height
// between the knob tops and the vacuum face.
//
// All dimensions are millimetres. Z is up and the table top is Z=0. The block
// is centred on the origin with its length along X, its fitting on the front
// face (-Y) and its wings to the back (+Y).
//
// Choose View = Block only before downloading an STL to print. It prints as
// modelled, underside on the bed, with no supports: the duct is a teardrop
// and the port bridges. Use four or more walls so air can't leak through the
// infill into the duct.

/* [View] */
// Assembly shows the cord, fitting, dogs and a patch of table for reference. Block only is the part to print.
View = "assembly"; // [assembly:Assembly with cord, fitting and dogs, block:Block only (print this)]
// Separation of the assembly's parts, in percent. Zero is assembled.
Explode = 0; // [0:1:100]

/* [Block] */
// Block length, along the row of dogs. 120.65 mm is 4 3/4 inches.
Block_length = 120.65; // [60:300]
// Block width, front to back. 76.2 mm is 3 inches.
Block_width = 76.2; // [40:300]
// Clear height from the dog knobs' tops up to the vacuum face, where the workpiece rests, so work overhanging the back clears the knobs.
Work_clearance = 24; // [1:0.5:150]

/* [Seal] */
// Foam cord diameter. 6.35 mm is 1/4 inch.
Cord_diameter = 6.35; // [2:0.05:15]
// Groove width. A little under the cord's diameter, so the cord grips its walls.
Groove_width = 6; // [2:0.1:15]
// Groove depth. The cord stands proud of the face by its diameter less this.
Groove_depth = 4.5; // [1:0.1:15]
// Wall between the groove and the block's outside.
Rim_width = 4; // [1.5:0.1:15]
// Plan radius of the groove's centre line at the corners, where the cord bends. The block's corners follow it.
Seal_bend_radius = 10; // [3:0.5:40]

/* [Support grid] */
// Centre-to-centre spacing of the islands that support the workpiece.
Island_pitch = 12; // [5:0.5:40]
// Width of the channels between the islands and round them.
Channel_width = 3; // [1:0.1:10]
// Depth of the channels below the vacuum face.
Channel_depth = 2; // [0.5:0.1:10]
// Diameter of the holes from the channels down to the duct.
Hole_diameter = 4; // [2:0.1:10]
// Diameter of the duct inside the block, from the port to the holes.
Duct_diameter = 6; // [3:0.1:15]

/* [Fitting and port] */
// Port centre along the front face, from the middle (+ toward +X). The duct, holes and grid line up with it.
Port_offset = 0; // [-150:0.5:150]
// Depth of the port's centre below the vacuum face.
Port_drop = 14; // [5:0.5:100]
// Port diameter at the face, for a 1/4" NPT male thread to cut its own thread into, or for a 1/4" NPT tap. It narrows by 1/16 of its depth, as the thread does.
Port_hole = 11.6; // [8:0.05:16]
// Port depth into the block. Longer than the fitting's thread, so it doesn't bottom out.
Port_depth = 12; // [6:0.5:30]
// Fitting hex across flats. An estimate: measure yours.
Fitting_hex = 14.3; // [8:0.1:30]
// How far the fitting stands out from the front face, without its tube. An estimate: measure yours.
Fitting_projection = 22; // [5:0.5:60]

/* [Table and dogs] */
// Centre-to-centre spacing of the table's holes. MFT-style tops use 96 mm.
Hole_pitch = 96; // [20:0.5:200]
// Hole pitches between the two dogs, along the block's length. Each wing runs back in line with its dog.
Pitches_along = 1; // [1:1:4]
// Slot length along each wing. The block slides this far toward or away from the dogs' row; a hole pitch or more lets it sit anywhere front to back. Zero leaves round holes.
Slot_length = 96; // [0:1:250]
// Distance from the block's centre back to the dogs' row, for the assembly view. It must fall within the slots.
Dog_distance = 96; // [20:0.5:400]
// Wing thickness under the dog knobs. The wings sit flat on the table.
Wing_thickness = 6; // [3:0.5:20]
// Slot width for the dog's M6 rod.
Rod_hole = 7; // [6.2:0.1:12]
// Top knob diameter. Each wing pad is 3 mm larger in radius.
Knob_diameter = 30; // [16:0.5:50]
// Top knob height above the wing.
Knob_height = 20; // [5:0.5:50]
// Smallest gap between a knob and the block, at the near end of its slot, and between the two knobs.
Knob_clearance = 2; // [0:0.5:10]
// Table top thickness, for the reference table and the dogs' clamping stack.
Table_thickness = 19; // [10:0.5:40]

/* [Hidden] */

$fn = 48;
eps = 0.01;

// Push-to-connect fitting for 1/4" tube with a 1/4" NPT male thread, for the
// reference model. The hex, projection and body sizes are estimates.
npt_major = 13.7;
npt_length = 10;
npt_taper = 1 / 16;
fitting_standoff = 1;
tube_d = 6.35;
tube_stub = 20;
// Dog parts, from the Onshape document: both knobs take an M6 rod in a
// 6.15 mm bore with a captive 9.93 mm (across flats) nut. The bottom knob's
// 20 mm boss locates in the table hole, centring the rod.
rod_d = 6;
knob_bore = 6.15;
knob_nut_flats = 9.93;
top_knob_nut_depth = 10;
bottom_knob_d = 30;
bottom_knob_h = 13.5;
bottom_ring_d = 21;
bottom_ring_h = 3;
bottom_boss_d = 20;
bottom_boss_h = 4;
bottom_knob_nut_depth = 8;
table_hole_d = 20.3;
pad_margin = 3;
// Least plastic between the port and the groove floor above it.
min_port_cover = 2;

assembly = View == "assembly";
explode = assembly ? Explode / 100 * 50 : 0;

knob_r = Knob_diameter / 2;
pad_r = knob_r + pad_margin;
knob_top = Wing_thickness + Knob_height;
face_z = knob_top + Work_clearance;
channel_floor = face_z - Channel_depth;
groove_floor = face_z - Groove_depth;

// The groove's centre line is a rounded rectangle Rim_width + Groove_width / 2
// in from the block's edge; the block's corners and the groove's edges are
// concentric with its corners, so the rim and groove keep their widths.
seal_inset = Rim_width + Groove_width / 2;
corner_r = Seal_bend_radius + seal_inset;
seal_l = Block_length - 2 * seal_inset;
seal_w = Block_width - 2 * seal_inset;
cord_length = 2 * (seal_l + seal_w) - (8 - 2 * PI) * Seal_bend_radius;
cord_proud = Cord_diameter - Groove_depth;
// Inside the groove: a channel round the edge, then the island grid.
inner_l = Block_length - 2 * (Rim_width + Groove_width);
inner_w = Block_width - 2 * (Rim_width + Groove_width);
inner_r = Seal_bend_radius - Groove_width / 2;
grid_l = inner_l - 2 * Channel_width;
grid_w = inner_w - 2 * Channel_width;
island = Island_pitch - Channel_width;

// The port enters the front face; the duct carries on across the block under
// a line of holes, which sit where the grid's channels cross.
port_z = face_z - Port_drop;
port_mouth_r = Port_hole / 2;
port_end_y = -Block_width / 2 + Port_depth;
hole_ys = [for (k = [-ceil(Block_width / Island_pitch):ceil(Block_width / Island_pitch)])
    let(y = k * Island_pitch) if (abs(y) + Hole_diameter / 2 <= inner_w / 2 && y - Hole_diameter / 2 >= port_end_y) y];
duct_end_y = len(hole_ys) > 0 ? max(hole_ys) + Duct_diameter / 2 : port_end_y;
hex_corner_r = Fitting_hex / sqrt(3);
fitting_low = port_z - hex_corner_r;

// The dogs stand in one row of table holes behind the block, a whole number
// of pitches apart and symmetric about its centre. Each wing's slot runs back
// in line with its dog, from where the knob just clears the block's rear face.
dog_dx = Pitches_along * Hole_pitch / 2;
wing_xs = [dog_dx, -dog_dx];
slot_near = Block_width / 2 + knob_r + Knob_clearance;
slot_far = slot_near + Slot_length;
dogs = [for (x = wing_xs) [x, Dog_distance]];
assert(Groove_width <= Cord_diameter, "The groove must be no wider than the cord, or the cord won't grip it.");
assert(Groove_depth >= Cord_diameter / 2, "The groove must be at least half the cord's diameter deep to hold it.");
assert(cord_proud >= 0.5, "The cord must stand at least 0.5 mm proud of the face to seal. Make the groove shallower.");
assert(Groove_depth + 1 <= face_z - Wing_thickness, "The groove is deeper than the block.");
assert(Groove_width / 2 < Seal_bend_radius, "The groove's inner edge needs a corner radius: raise the seal bend radius above half the groove width.");
assert(grid_l >= island && grid_w >= island, "There's no room inside the groove for the island grid. Make the block bigger or the rim, groove or channels narrower.");
assert(Channel_depth < Groove_depth + 2, "The channels must be shallower than the groove floor plus 2 mm.");
assert(len(hole_ys) >= 1, "No vacuum hole fits between the port's end and the groove. Shorten the port or narrow the island pitch.");
assert(abs(Port_offset) + Hole_diameter / 2 <= inner_l / 2, "The port's line of holes must sit inside the groove. Move the port toward the middle.");
assert(abs(Port_offset) + port_mouth_r + 2 <= Block_length / 2 - corner_r, "The port must stay 2 mm clear of the block's rounded corners.");
assert(Port_drop >= Groove_depth + port_mouth_r + min_port_cover,
    "The port is too close to the groove above it. Increase the port drop.");
assert(port_z - port_mouth_r >= 2, "The port must stay 2 mm above the table. Decrease the port drop.");
assert(fitting_low >= 1, "The fitting's hex would hit the table. Decrease the port drop.");
assert(Duct_diameter / 2 * sqrt(2) + Duct_diameter / 2 <= Port_drop - Channel_depth,
    "The duct's teardrop top must stay below the channels. Increase the port drop or use a smaller duct.");
assert(Duct_diameter <= Port_hole - 1, "The duct must be narrower than the port.");
assert(Hole_diameter <= Duct_diameter, "The vacuum holes must be no wider than the duct.");
assert(duct_end_y + 3 <= inner_w / 2 + Channel_width + Groove_width, "The duct must end 3 mm inside the back wall.");
assert(2 * (dog_dx - knob_r) >= Knob_clearance, "The two knobs would hit each other. Put more hole pitches between the dogs.");
assert(Dog_distance >= slot_near - eps && Dog_distance <= slot_far + eps,
    str("The assembly's dogs must stand within the slots, ", slot_near, " to ", slot_far, " mm behind the block's centre. Change the dog distance."));

// Legend colours as 0-255 RGB. Repeated pieces get their own colour within
// 3/255 of the legend colour, so the viewer can select each one.
block_rgb = [208, 106, 31];
cord_rgb = [71, 76, 85];
fitting_rgb = [168, 134, 44];
top_knob_rgb = [47, 109, 179];
bottom_knob_rgb = [123, 82, 171];
rod_rgb = [178, 68, 58];
table_rgb = [201, 195, 182];
function shade(base, k) = base + [0, 0, k];
function hex2(n) = str("0123456789abcdef"[floor(n / 16)], "0123456789abcdef"[n % 16]);
function hex_color(c) = str("#", hex2(c[0]), hex2(c[1]), hex2(c[2]));
module paint(rgb) color(rgb / 255) children();

// --- Block ---

module rounded_rect(l, w, r) {
    rr = max(0, min(r, l / 2 - eps, w / 2 - eps));
    // A hull of corner circles rather than offset(): in openrscad-engine 0.14,
    // offset()'s output can come out wrong when something is later subtracted
    // from it.
    if (rr > 0) hull() for (x = [-1, 1] * (l / 2 - rr), y = [-1, 1] * (w / 2 - rr)) translate([x, y]) circle(r = rr);
    else square([l, w], center = true);
}

// The block's outline plus a wing for each dog: a pad-width strip along its
// slot, so the knob bears fully anywhere along it. A wing in line with the
// block runs straight into its rear face, square across the corner; one
// beyond the block's end angles in to it.
module wing_outline() {
    hx = max(0, Block_length / 2 - pad_r);
    hy = max(0, Block_width / 2 - pad_r);
    root_y = Block_width / 2 - corner_r;
    rounded_rect(Block_length, Block_width, corner_r);
    for (x = wing_xs) {
        hull() for (y = [slot_near, slot_far]) translate([x, y]) circle(r = pad_r);
        if (abs(x) <= Block_length / 2)
            translate([x - pad_r, root_y]) square([2 * pad_r, slot_near - root_y]);
        else
            hull() {
                translate([x, slot_near]) circle(r = pad_r);
                translate([sign(x) * hx, hy]) circle(r = pad_r);
            }
    }
}

// Channels: the band inside the groove, less the islands. The islands are
// squares on a grid with channels along the port's line and the centre line.
module channels() {
    n = ceil(max(Block_length, Block_width) / Island_pitch) + 2;
    difference() {
        rounded_rect(inner_l, inner_w, inner_r);
        intersection() {
            rounded_rect(grid_l, grid_w, max(0, inner_r - Channel_width));
            // An explicit union: openrscad-engine 0.14 intersects each of a
            // for loop's children with the rest, where OpenSCAD unions them.
            union() for (i = [-n:n], j = [-n:n])
                translate([Port_offset + (i + 0.5) * Island_pitch, (j + 0.5) * Island_pitch]) square(island, center = true);
        }
    }
}

module groove() {
    difference() {
        rounded_rect(seal_l + Groove_width, seal_w + Groove_width, Seal_bend_radius + Groove_width / 2);
        rounded_rect(seal_l - Groove_width, seal_w - Groove_width, Seal_bend_radius - Groove_width / 2);
    }
}

// A circle with a 45-degree point on top, so a horizontal hole prints
// without support.
module teardrop(r) {
    circle(r = r);
    rotate(45) square(r);
}

module air_path() {
    // The port, tapered like the thread, with a 1 mm chamfer at its mouth.
    translate([Port_offset, -Block_width / 2 - eps, port_z]) rotate([-90, 0, 0]) {
        cylinder(d1 = Port_hole, d2 = Port_hole - Port_depth * npt_taper, h = Port_depth + eps);
        cylinder(d1 = Port_hole + 2, d2 = Port_hole, h = 1 + eps);
    }
    // The duct, from just inside the port to past the last hole.
    translate([Port_offset, duct_end_y, port_z]) rotate([90, 0, 0])
        linear_extrude(height = duct_end_y - port_end_y + 1) teardrop(Duct_diameter / 2);
    for (y = hole_ys) translate([Port_offset, y, port_z]) cylinder(d = Hole_diameter, h = channel_floor - port_z + eps);
}

// One stepped solid: the whole outline at full height, cut down to wing
// thickness outside the block. (Two overlapping extrusions would leave
// internal faces in the engine's display mesh.)
module block() {
    difference() {
        linear_extrude(height = face_z) wing_outline();
        translate([0, 0, Wing_thickness]) linear_extrude(height = face_z) difference() {
            square(2 * [dog_dx + pad_r + Block_length, slot_far + pad_r + Block_width], center = true);
            rounded_rect(Block_length, Block_width, corner_r);
        }
        for (x = wing_xs) hull() for (y = [slot_near, slot_far])
            translate([x, y, -eps]) cylinder(d = Rod_hole, h = Wing_thickness + 2 * eps);
        translate([0, 0, groove_floor]) linear_extrude(height = Groove_depth + eps) groove();
        translate([0, 0, channel_floor]) linear_extrude(height = Channel_depth + eps) channels();
        air_path();
    }
}

// --- Reference parts ---

// The foam cord resting on the groove floor, swept round the groove's centre
// line: straight lengths along each side and a quarter torus at each corner.
module cord() {
    r = Cord_diameter / 2;
    sx = seal_l / 2 - Seal_bend_radius;
    sy = seal_w / 2 - Seal_bend_radius;
    translate([0, 0, groove_floor + r]) {
        for (y = [-1, 1] * seal_w / 2) translate([-sx, y, 0]) rotate([0, 90, 0]) cylinder(r = r, h = 2 * sx, $fn = 24);
        for (x = [-1, 1] * seal_l / 2) translate([x, -sy, 0]) rotate([-90, 0, 0]) cylinder(r = r, h = 2 * sy, $fn = 24);
        for (cx = [-1, 1], cy = [-1, 1]) translate([cx * sx, cy * sy, 0]) intersection() {
            rotate_extrude($fn = 48) translate([Seal_bend_radius, 0]) circle(r = r, $fn = 24);
            translate([cx > 0 ? 0 : -corner_r, cy > 0 ? 0 : -corner_r, -r]) cube([corner_r, corner_r, 2 * r]);
        }
    }
}

// Push-to-connect fitting, built along +Z from the front face: the thread
// inside the port, then the hex, body, release collet and a stub of tube.
module fitting() {
    hex_l = 7;
    body_l = Fitting_projection - fitting_standoff - hex_l - 3;
    translate([Port_offset, -Block_width / 2, port_z]) rotate([90, 0, 0]) {
        translate([0, 0, fitting_standoff - npt_length])
            cylinder(d1 = npt_major - npt_length * npt_taper, d2 = npt_major, h = npt_length);
        translate([0, 0, fitting_standoff]) cylinder(r = hex_corner_r, h = hex_l, $fn = 6);
        translate([0, 0, fitting_standoff + hex_l]) cylinder(d = 0.9 * Fitting_hex, h = body_l);
        translate([0, 0, Fitting_projection - 3]) cylinder(d = 0.85 * Fitting_hex, h = 3);
        translate([0, 0, Fitting_projection - 1]) cylinder(d = tube_d, h = tube_stub + 1);
    }
}

// Flangeless top knob, standing on the wing.
module top_knob() {
    h = Knob_height;
    difference() {
        rotate_extrude() polygon([[knob_bore / 2, 0], [knob_r - 0.5, 0], [knob_r, 0.5],
            [knob_r, h - 1], [knob_r - 1, h], [knob_bore / 2, h]]);
        translate([0, 0, h - min(top_knob_nut_depth, h - 2)])
            cylinder(r = knob_nut_flats / sqrt(3), h = top_knob_nut_depth + eps, $fn = 6);
    }
}

// Bottom knob under the table, with its boss up in the hole.
module bottom_knob() {
    r = bottom_knob_d / 2;
    z_ring = bottom_knob_h;
    z_boss = z_ring + bottom_ring_h;
    z_top = z_boss + bottom_boss_h;
    difference() {
        rotate_extrude() polygon([[knob_bore / 2, 0], [r - 0.5, 0], [r, 0.5], [r, z_ring - 0.5], [r - 0.5, z_ring],
            [bottom_ring_d / 2, z_ring], [bottom_ring_d / 2, z_boss], [bottom_boss_d / 2, z_boss],
            [bottom_boss_d / 2, z_top - 0.5], [bottom_boss_d / 2 - 0.5, z_top], [knob_bore / 2, z_top]]);
        translate([0, 0, -eps]) cylinder(r = knob_nut_flats / sqrt(3), h = bottom_knob_nut_depth + eps, $fn = 6);
    }
}

bottom_knob_z = -Table_thickness - bottom_knob_h - bottom_ring_h;
rod_bottom = bottom_knob_z + 1;
rod_top = knob_top - 1;

// A patch of table from in front of the fitting's tube to behind the wings,
// its holes on the dogs' grid.
module table() {
    span_x = max(Block_length / 2, dog_dx + pad_r) + Hole_pitch / 2;
    y0 = -(Block_width / 2 + Fitting_projection + tube_stub + 10);
    y1 = max(slot_far, Dog_distance) + pad_r + 10;
    n = ceil(max(span_x, -y0, y1) / Hole_pitch) + 1;
    difference() {
        translate([-span_x, y0, -Table_thickness]) cube([2 * span_x, y1 - y0, Table_thickness]);
        for (i = [-2 * n:2 * n], j = [-2 * n:2 * n]) {
            g = [dog_dx + i * Hole_pitch, Dog_distance + j * Hole_pitch];
            if (abs(g[0]) + table_hole_d / 2 + 5 <= span_x && g[1] - table_hole_d / 2 - 5 >= y0 && g[1] + table_hole_d / 2 + 5 <= y1)
                translate([g[0], g[1], -Table_thickness - eps]) cylinder(d = table_hole_d, h = Table_thickness + 2 * eps, $fn = 32);
        }
    }
}

module assembly() {
    paint(block_rgb) block();
    translate([0, 0, -0.8 * explode]) paint(table_rgb) table();
    translate([0, 0, 0.8 * explode]) paint(cord_rgb) cord();
    translate([0, -0.8 * explode, 0]) paint(fitting_rgb) fitting();
    for (i = [0:1]) {
        p = dogs[i];
        translate([p[0], p[1], Wing_thickness + 0.5 * explode]) paint(shade(top_knob_rgb, i)) top_knob();
        translate([p[0], p[1], rod_bottom + 0.9 * explode]) paint(shade(rod_rgb, i))
            cylinder(d = rod_d, h = rod_top - rod_bottom, $fn = 16);
        translate([p[0], p[1], bottom_knob_z - 1.3 * explode]) paint(shade(bottom_knob_rgb, i)) bottom_knob();
    }
}

echo(str("Vacuum face: ", face_z, " mm above the table, ", Work_clearance,
    " mm above the dog knobs' tops, where the workpiece rests on the islands."));
echo(str("Seal: cut ", round(cord_length), " mm of ", Cord_diameter, " mm foam cord and join its ends with CA glue, cut at 45 degrees. It stands ",
    round(cord_proud * 100) / 100, " mm proud in a ", Groove_width, " mm wide, ", Groove_depth, " mm deep groove."));
echo(str("Port: ", Port_hole, " mm at the face, tapering to ", Port_hole - Port_depth * npt_taper, " mm, ", Port_depth,
    " mm deep, its centre ", port_z, " mm above the table. Tap it 1/4\" NPT, or thread the fitting straight in."));
echo(str("Vacuum: ", len(hole_ys), " holes of ", Hole_diameter, " mm from a ", Duct_diameter, " mm duct to the channels."));
echo(str("Dogs: ", 2 * dog_dx, " mm apart (", Pitches_along, " pitch", Pitches_along > 1 ? "es" : "",
    "), in a row ", round(slot_near * 10) / 10, Slot_length > 0 ? str(" to ", round(slot_far * 10) / 10) : "",
    " mm behind the block's centre", Slot_length >= Hole_pitch ? ": with the next row of holes, the block can sit anywhere front to back" : "",
    ". Each clamps ", Table_thickness + Wing_thickness, " mm (table + wing) between its knobs."));
echo("PIECES_V1", [
    for (i = [0:1]) each [
        [hex_color(shade(top_knob_rgb, i)), str("Top knob ", i + 1)],
        [hex_color(shade(bottom_knob_rgb, i)), str("Bottom knob ", i + 1)],
        [hex_color(shade(rod_rgb, i)), str("M6 rod ", i + 1)]
    ]
]);

if (assembly) assembly();
else paint(block_rgb) block();
