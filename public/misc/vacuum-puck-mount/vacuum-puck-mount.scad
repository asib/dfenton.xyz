// Vacuum puck MFT mount
// A 3D-printed base that holds an HDPE vacuum puck on an MFT-style table.
// Two M4 socket head cap screws pass down through counterbores in the puck's
// vacuum face into captive nuts in the underside of this mount. Two wings take
// tightening dogs through the table's hole grid: an M6 rod with a 30 mm
// knurled knob under the table and a flangeless 30 mm knob on the wing, as in
// the shared Onshape document's "bottom knob" and "top knob no flange".
//
// All dimensions are millimetres. Z is up and the table top is Z=0. The puck
// is centred on the origin with its length along X and its push-fit fitting
// on the +X end; the front is -Y.
//
// Choose View = Mount only before downloading an STL to print. It prints as
// modelled, underside (nut traps) on the bed; the optional bridging layers
// let the nut-trap roofs print without support.

/* [View] */
// Assembly shows the puck, screws, dogs and a patch of table for reference. Mount only is the printable part.
View = "assembly"; // [assembly:Assembly with puck and dogs, mount:Mount only (print this)]
// Separation of the assembly's parts, in percent. Zero is assembled.
Explode = 0; // [0:1:100]

/* [Puck] */
// HDPE block length, along the fitting's axis.
Puck_length = 150; // [60:0.5:300]
// HDPE block width.
Puck_width = 100; // [40:0.5:300]
// HDPE thickness, not counting the foam gasket.
Puck_thickness = 25; // [10:0.5:80]
// Foam gasket thickness on the vacuum face. Shown for reference only.
Gasket_thickness = 5; // [0:0.5:20]

/* [Fitting and port] */
// Fitting centre from the puck's centre line, across its width (+ toward the back).
Fitting_offset = 0; // [-150:0.5:150]
// Fitting centre above the puck's underside.
Fitting_height = 12.5; // [3:0.5:80]
// Largest fitting diameter, including its sealing washer.
Fitting_diameter = 16; // [6:0.5:40]
// How far the fitting and its tube stand out from the end face.
Fitting_projection = 25; // [5:0.5:80]
// Vacuum port centre from the fitting end. The drilled air channel runs from the fitting to the port.
Port_inset = 25; // [5:0.5:150]

/* [Puck screws] */
// Direction of the line through the two screws.
Screw_axis = "across"; // [across:Across the width, along:Along the length]
// Centre-to-centre spacing of the two M4 screws.
Screw_spacing = 50; // [10:0.5:250]
// Moves the screw pair along the puck's length; negative moves it away from the fitting.
Screw_shift = 0; // [-150:0.5:150]
// M4 socket head cap screw length under the head. The counterbore depth to drill follows from it.
Screw_length = 25; // [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60]

/* [Mount] */
// Plate under the puck. Its thickness holds the nut traps.
Plate_thickness = 8; // [6:0.5:20]
// Plate outline inset from the puck's footprint at each edge; negative overhangs it.
Plate_inset = 0; // [-10:0.5:20]
// Plan radius of the plate's corners.
Corner_radius = 4; // [0:0.5:20]
// Wing thickness under the dog knobs. The wings sit flat on the table.
Wing_thickness = 6; // [3:0.5:20]

/* [Table and dogs] */
// Centre-to-centre spacing of the table's holes. MFT-style tops use 96 mm.
Hole_pitch = 96; // [20:0.5:200]
// Hole pitches between the two dogs along the puck's length.
Pitches_along = 2; // [0:1:6]
// Hole pitches between the two dogs across the puck's width. Zero puts both wings on the ends.
Pitches_across = 1; // [0:1:6]
// Wing hole for the dog's M6 rod.
Rod_hole = 7; // [6.2:0.1:12]
// Top knob diameter. Each wing pad is 3 mm larger in radius.
Knob_diameter = 30; // [16:0.5:50]
// Top knob height above the wing.
Knob_height = 20; // [5:0.5:50]
// Smallest gap allowed between a knob and the puck, plate or fitting.
Knob_clearance = 2; // [0:0.5:10]
// Table top thickness, for the reference table and the dogs' clamping stack.
Table_thickness = 19; // [10:0.5:40]

/* [Hardware fit] */
// M4 clearance hole through the puck and mount.
Screw_hole = 4.5; // [4.1:0.1:5.5]
// Nut trap width across flats. An M4 nut is 7 mm; add print clearance.
Nut_trap_flats = 7.3; // [6.8:0.05:8.5]
// Nut thickness. An M4 nut is 3.2 mm.
Nut_thickness = 3.2; // [2:0.1:6]
// Gap between the nut and the mount's underside. The screw tip stops at the nut's underside, so it never reaches the table.
Nut_recess = 1; // [0.4:0.1:4]
// Printing aid: layer height of two sacrificial bridging layers over each nut trap. Zero leaves a plain stepped hole.
Bridge_layer = 0.2; // [0:0.04:0.4]

/* [Hidden] */

$fn = 48;
eps = 0.01;

// M4 socket head cap screw, nut and the counterbore drilled for the head.
head_d = 7;
head_h = 4;
counterbore_d = 8;
nut_flats = 7;
min_hdpe_under_head = 5;
// Puck details for the reference model: 6 mm air channel and port, the
// fitting's tapped hole, and the foam strip's width.
channel_d = 6;
fitting_tap_d = 8.7;
fitting_tap_depth = 10;
gasket_width = 12;
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

assembly = View == "assembly";
explode = assembly ? Explode / 100 * 50 : 0;

knob_r = Knob_diameter / 2;
pad_r = knob_r + pad_margin;
plate_l = Puck_length - 2 * Plate_inset;
plate_w = Puck_width - 2 * Plate_inset;
puck_z = Plate_thickness;
puck_top = Plate_thickness + Puck_thickness;
knob_top = Wing_thickness + Knob_height;

// The dogs sit in table holes a whole number of pitches apart, symmetric
// about the puck's centre.
dog_dx = Pitches_along * Hole_pitch / 2;
dog_dy = Pitches_across * Hole_pitch / 2;
dogs = [[dog_dx, dog_dy], [-dog_dx, -dog_dy]];

screws = Screw_axis == "across"
    ? [[Screw_shift, Screw_spacing / 2], [Screw_shift, -Screw_spacing / 2]]
    : [[Screw_shift + Screw_spacing / 2, 0], [Screw_shift - Screw_spacing / 2, 0]];

// The nut bears on the trap's roof. Each screw's tip is set flush with its
// nut's underside, Nut_recess above the table, which fixes where the head
// seats and so how deep to counterbore the puck.
nut_roof = Nut_recess + Nut_thickness;
tip_z = Nut_recess;
head_z = tip_z + Screw_length;
counterbore_depth = puck_top - head_z;
hdpe_under_head = head_z - puck_z;
nut_corner_r = Nut_trap_flats / sqrt(3);

fit_z = puck_z + Fitting_height;
fitting_low = fit_z - Fitting_diameter / 2;
port_x = Puck_length / 2 - Port_inset;

// Plan distance from a point to an axis-aligned box, zero inside it.
function box_gap(p, x0, x1, y0, y1) = norm([max(x0 - p[0], 0, p[0] - x1), max(y0 - p[1], 0, p[1] - y1)]);
// Plan distance from a point to the segment from a to b.
function segment_gap(p, a, b) = let(d = b - a, t = max(0, min(1, (p - a) * d / (d * d)))) norm(p - (a + t * d));

footprint_x = max(Puck_length, plate_l) / 2;
footprint_y = max(Puck_width, plate_w) / 2;
function knob_gap(p) = box_gap(p, -footprint_x, footprint_x, -footprint_y, footprint_y) - knob_r;
function fitting_gap(p) = box_gap(p, Puck_length / 2, Puck_length / 2 + Fitting_projection,
    Fitting_offset - Fitting_diameter / 2, Fitting_offset + Fitting_diameter / 2) - knob_r;
function channel_gap(s) = segment_gap(s, [port_x, Fitting_offset], [Puck_length / 2, Fitting_offset]);

assert(Pitches_along + Pitches_across >= 1, "The dogs need at least one hole pitch between them.");
assert(Wing_thickness <= Plate_thickness, "The wings must be no thicker than the plate, or they would lift the puck.");
assert(knob_top + 1 <= puck_top, "The dog knobs must sit below the puck's vacuum face.");
assert(Fitting_height >= Fitting_diameter / 2 && Fitting_height + Fitting_diameter / 2 <= Puck_thickness,
    "The fitting must sit within the puck's thickness.");
assert(abs(Fitting_offset) + Fitting_diameter / 2 <= Puck_width / 2, "The fitting must sit within the puck's width.");
assert(Port_inset <= Puck_length - channel_d, "The vacuum port must sit within the puck's length.");
assert(counterbore_depth >= head_h + 0.5,
    "The screw is too long: its head would stand proud of the vacuum face. Choose a shorter screw or a thicker plate.");
assert(hdpe_under_head >= min_hdpe_under_head,
    "The screw is too short to leave 5 mm of HDPE under its head. Choose a longer screw.");
assert(Screw_spacing >= 2 * nut_corner_r + 2, "The two nut traps would run together. Space the screws further apart.");
assert(nut_roof + 2 * Bridge_layer + 2 <= Plate_thickness, "The plate is too thin for the nut traps. Thicken the plate or use a thinner nut.");
for (i = [0:1]) {
    assert(knob_gap(dogs[i]) >= Knob_clearance,
        str("Dog ", i + 1, "'s knob would hit the puck or plate. Increase the hole pitches between the dogs."));
    assert(knob_top + Knob_clearance <= fitting_low || fitting_gap(dogs[i]) >= Knob_clearance,
        str("Dog ", i + 1, "'s knob would hit the fitting. Move the dogs across the width or the fitting off centre."));
    assert(plate_l / 2 - abs(screws[i][0]) >= nut_corner_r + 2 && plate_w / 2 - abs(screws[i][1]) >= nut_corner_r + 2,
        str("Screw ", i + 1, "'s nut trap must stay 2 mm inside the plate's edge."));
    assert(Puck_length / 2 - abs(screws[i][0]) >= counterbore_d / 2 + 3 && Puck_width / 2 - abs(screws[i][1]) >= counterbore_d / 2 + 3,
        str("Screw ", i + 1, "'s counterbore must stay 3 mm inside the puck's edge."));
    assert(channel_gap(screws[i]) >= counterbore_d / 2 + channel_d / 2 + 2,
        str("Screw ", i + 1, " would cut into the air channel or port. Move the screws away from the fitting end."));
}

// Legend colours as 0-255 RGB. Repeated pieces get their own colour within
// 3/255 of the legend colour, so the viewer can select each one.
mount_rgb = [208, 106, 31];
puck_rgb = [154, 170, 184];
gasket_rgb = [71, 76, 85];
fitting_rgb = [168, 134, 44];
screw_rgb = [46, 50, 56];
nut_rgb = [47, 138, 132];
top_knob_rgb = [47, 109, 179];
bottom_knob_rgb = [123, 82, 171];
rod_rgb = [178, 68, 58];
table_rgb = [201, 195, 182];
function shade(base, k) = base + [0, 0, k];
function hex2(n) = str("0123456789abcdef"[floor(n / 16)], "0123456789abcdef"[n % 16]);
function hex_color(c) = str("#", hex2(c[0]), hex2(c[1]), hex2(c[2]));
module paint(rgb) color(rgb / 255) children();

// --- Mount ---

module rounded_rect(l, w, r) {
    rr = max(0, min(r, l / 2 - eps, w / 2 - eps));
    if (rr > 0) offset(r = rr) square([l - 2 * rr, w - 2 * rr], center = true);
    else square([l, w], center = true);
}

// Each wing is a pad around its rod hole, hulled to the nearest pad-sized
// circle inside the plate. (No fillet: openrscad-engine 0.14's negative
// offset() distorts shapes, so the usual offset closing can't be used.)
module wing_outline() {
    hx = max(0, plate_l / 2 - pad_r);
    hy = max(0, plate_w / 2 - pad_r);
    rounded_rect(plate_l, plate_w, Corner_radius);
    for (p = dogs) hull() {
        translate(p) circle(r = pad_r);
        translate([max(-hx, min(hx, p[0])), max(-hy, min(hy, p[1]))]) circle(r = pad_r);
    }
}

module nut_trap() {
    translate([0, 0, -eps]) cylinder(r = nut_corner_r, h = nut_roof + eps, $fn = 6);
    if (Bridge_layer > 0) {
        // First layer: a strip the screw's width from flat to flat, so the
        // material either side bridges across the trap. Second layer: a
        // square, bridged on the first layer. The round hole starts above.
        translate([0, 0, nut_roof - eps]) intersection() {
            cylinder(r = nut_corner_r, h = Bridge_layer + eps, $fn = 6);
            translate([-Screw_hole / 2, -Nut_trap_flats, 0]) cube([Screw_hole, 2 * Nut_trap_flats, Bridge_layer + eps]);
        }
        translate([-Screw_hole / 2, -Screw_hole / 2, nut_roof + Bridge_layer - eps])
            cube([Screw_hole, Screw_hole, Bridge_layer + eps]);
    }
    translate([0, 0, nut_roof + 2 * Bridge_layer - eps]) cylinder(d = Screw_hole, h = Plate_thickness);
}

module mount() {
    difference() {
        union() {
            linear_extrude(height = Wing_thickness) wing_outline();
            linear_extrude(height = Plate_thickness) rounded_rect(plate_l, plate_w, Corner_radius);
        }
        for (p = dogs) translate([p[0], p[1], -eps]) cylinder(d = Rod_hole, h = Plate_thickness + 2 * eps);
        for (s = screws) translate([s[0], s[1], 0]) nut_trap();
    }
}

// --- Reference parts ---

module puck() {
    difference() {
        translate([-Puck_length / 2, -Puck_width / 2, puck_z]) cube([Puck_length, Puck_width, Puck_thickness]);
        for (s = screws) {
            translate([s[0], s[1], head_z]) cylinder(d = counterbore_d, h = counterbore_depth + eps);
            translate([s[0], s[1], puck_z - eps]) cylinder(d = Screw_hole, h = Puck_thickness);
        }
        translate([port_x, Fitting_offset, fit_z]) {
            cylinder(d = channel_d, h = puck_top - fit_z + eps);
            rotate([0, 90, 0]) cylinder(d = channel_d, h = Port_inset + eps);
        }
        translate([Puck_length / 2 - fitting_tap_depth, Fitting_offset, fit_z])
            rotate([0, 90, 0]) cylinder(d = fitting_tap_d, h = fitting_tap_depth + eps);
    }
}

module gasket() {
    if (Gasket_thickness > 0) translate([0, 0, puck_top]) linear_extrude(height = Gasket_thickness) difference() {
        square([Puck_length, Puck_width], center = true);
        square([Puck_length - 2 * gasket_width, Puck_width - 2 * gasket_width], center = true);
    }
}

module fitting() {
    d = Fitting_diameter;
    p = Fitting_projection;
    translate([Puck_length / 2, Fitting_offset, fit_z]) rotate([0, 90, 0]) difference() {
        union() {
            cylinder(d = d, h = 0.12 * p);
            translate([0, 0, 0.12 * p]) cylinder(r = 0.74 * d / sqrt(3), h = 0.3 * p, $fn = 6);
            translate([0, 0, 0.42 * p]) cylinder(d = 0.66 * d, h = 0.43 * p);
            translate([0, 0, 0.85 * p]) cylinder(d = 0.74 * d, h = 0.15 * p);
        }
        translate([0, 0, 0.6 * p]) cylinder(d = 0.4 * d, h = p);
    }
}

// Socket head cap screw with its head's bearing face at Z=0.
module cap_screw() {
    difference() {
        cylinder(d = head_d, h = head_h);
        translate([0, 0, head_h - 2.5]) cylinder(r = 3 / sqrt(3), h = 2.5 + eps, $fn = 6);
    }
    translate([0, 0, -Screw_length]) cylinder(d = 4, h = Screw_length + eps, $fn = 16);
}

module nut() {
    difference() {
        cylinder(r = nut_flats / sqrt(3), h = Nut_thickness, $fn = 6);
        translate([0, 0, -eps]) cylinder(d = 4.2, h = Nut_thickness + 2 * eps, $fn = 16);
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

module table() {
    span_x = max(footprint_x, dog_dx + pad_r) + Hole_pitch;
    span_y = max(footprint_y, dog_dy + pad_r) + Hole_pitch;
    n = ceil(max(span_x, span_y) / Hole_pitch) + 1;
    difference() {
        translate([-span_x, -span_y, -Table_thickness]) cube([2 * span_x, 2 * span_y, Table_thickness]);
        for (i = [-2 * n:2 * n], j = [-2 * n:2 * n]) {
            g = [dog_dx + i * Hole_pitch, dog_dy + j * Hole_pitch];
            if (abs(g[0]) + table_hole_d / 2 + 5 <= span_x && abs(g[1]) + table_hole_d / 2 + 5 <= span_y)
                translate([g[0], g[1], -Table_thickness - eps]) cylinder(d = table_hole_d, h = Table_thickness + 2 * eps, $fn = 32);
        }
    }
}

module assembly() {
    paint(mount_rgb) mount();
    translate([0, 0, -0.8 * explode]) paint(table_rgb) table();
    translate([0, 0, 0.6 * explode]) {
        paint(puck_rgb) puck();
        paint(fitting_rgb) fitting();
    }
    translate([0, 0, 0.8 * explode]) paint(gasket_rgb) gasket();
    for (i = [0:1]) {
        s = screws[i];
        p = dogs[i];
        translate([s[0], s[1], head_z + 1.5 * explode]) paint(shade(screw_rgb, i)) cap_screw();
        translate([s[0], s[1], Nut_recess - 0.4 * explode]) paint(shade(nut_rgb, i)) nut();
        translate([p[0], p[1], Wing_thickness + 0.5 * explode]) paint(shade(top_knob_rgb, i)) top_knob();
        translate([p[0], p[1], rod_bottom + 0.9 * explode]) paint(shade(rod_rgb, i))
            cylinder(d = rod_d, h = rod_top - rod_bottom, $fn = 16);
        translate([p[0], p[1], bottom_knob_z - 1.3 * explode]) paint(shade(bottom_knob_rgb, i)) bottom_knob();
    }
}

echo(str("Counterbores: two ", counterbore_d, " mm diameter x ", counterbore_depth,
    " mm deep in the vacuum face, with ", Screw_hole, " mm holes through the puck."));
echo(str("Screws: two M4 x ", Screw_length, " socket head cap screws into M4 nuts. Each tip stops flush with its nut, ",
    Nut_recess, " mm above the table."));
echo(str("Dogs: ", Pitches_along, " pitch(es) along and ", Pitches_across, " across, ",
    round(norm([2 * dog_dx, 2 * dog_dy]) * 10) / 10, " mm apart. Each clamps ",
    Table_thickness + Wing_thickness, " mm (table + wing) between its knobs."));
echo(str("Knob tops: ", knob_top, " mm above the table, ", puck_top - knob_top, " mm below the vacuum face."));
echo("PIECES_V1", [
    for (i = [0:1]) each [
        [hex_color(shade(screw_rgb, i)), str("M4 screw ", i + 1)],
        [hex_color(shade(nut_rgb, i)), str("M4 nut ", i + 1)],
        [hex_color(shade(top_knob_rgb, i)), str("Top knob ", i + 1)],
        [hex_color(shade(bottom_knob_rgb, i)), str("Bottom knob ", i + 1)],
        [hex_color(shade(rod_rgb, i)), str("M6 rod ", i + 1)]
    ]
]);

if (assembly) assembly();
else paint(mount_rgb) mount();
