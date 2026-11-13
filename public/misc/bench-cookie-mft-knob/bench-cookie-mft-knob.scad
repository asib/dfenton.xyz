// Bench cookie MFT knob
// A 3D-printed knob that clamps a Rockler Bench Cookie Plus to an MFT-style
// table. The cookie's 5/16-18 threaded insert faces down onto the table; a
// 5/16-18 hex bolt comes up through a table hole into it from below, its head
// captive in this knob. Turning the knob screws the bolt into the cookie and
// pulls the cookie down onto the table. The knob's boss locates in the 20 mm
// hole, centring the bolt, and the ring round it bears on the table's
// underside.
//
// The knob's body, ring and boss are the shared Onshape tightening-dog
// document's "bottom knob", with its captive M6 nut pocket replaced by a
// pocket for a 5/16 inch hex bolt head.
//
// All dimensions are millimetres, except the bolt length in inches. Z is up
// and the table top is Z=0, with the hole on the origin.
//
// Choose View = Knob only before downloading an STL to print. It prints as
// modelled, the head pocket on the bed and the boss up; the optional bridging
// layers let the pocket's roof print without support.

/* [View] */
// Assembly shows the cookie, bolt and a patch of table for reference. Knob only is the part to print.
View = "assembly"; // [assembly:Assembly with cookie and bolt, knob:Knob only (print this)]
// Separation of the assembly's parts, in percent. Zero is assembled.
Explode = 0; // [0:1:100]

/* [Bolt] */
// 5/16-18 hex bolt length under the head, in inches. The build notes list the lengths that fit.
Bolt_length = 1.5; // [1:1 in, 1.25:1 1/4 in, 1.5:1 1/2 in, 1.75:1 3/4 in, 2:2 in, 2.25:2 1/4 in, 2.5:2 1/2 in]
// Bolt head width across flats. A 5/16 inch hex head is 1/2 inch (12.7 mm); measure yours.
Head_flats = 12.7; // [11:0.01:15]
// Added to the head width for the pocket's flats, so they clear the head and the crush ribs grip it.
Pocket_clearance = 0.15; // [0:0.01:0.5]
// How far three crush ribs, on alternate flats, stand into the pocket. They grip the head so the bolt stays in the knob when the cookie is unscrewed. Zero leaves plain flats.
Rib_height = 0.45; // [0:0.05:0.8]
// Bolt head height. Hex bolts are about 7/32 inch (5.6 mm), hex cap screws 13/64 inch (5.2 mm).
Head_height = 5.6; // [3:0.1:10]
// How far the head sits up inside its pocket, so it never touches the bench when the knob is put down.
Head_recess = 2; // [0:0.5:10]
// Bolt hole through the knob. 5/16 inch is 7.94 mm; 8.5 mm leaves the shank clear even where printed holes come out small.
Bolt_hole = 8.5; // [8:0.05:9]

/* [Bench cookie] */
// How far a bolt threads into the cookie's insert before it stops, measured from the cookie's underside. Thread a bolt in until it bottoms out to check; it was 15 mm on the cookies measured here.
Insert_depth = 15; // [5:0.5:25]
// Least thread engagement accepted in the insert. About one bolt diameter (8 mm) holds well.
Min_engagement = 8; // [4:0.5:20]
// Cookie diameter, for the reference model. The Bench Cookie Plus is 3 inches.
Cookie_diameter = 76.2; // [40:0.1:120]
// Cookie height, for the reference model. The Bench Cookie Plus is 1 inch.
Cookie_height = 25.4; // [10:0.1:60]

/* [Table] */
// Table top thickness. The knob and cookie clamp it between them.
Table_thickness = 18; // [10:0.5:40]
// Table hole diameter. MFT-style tops use 20 mm.
Table_hole = 20; // [16:0.1:30]

/* [Knob] */
// Knurled body diameter.
Knob_diameter = 30; // [20:0.5:60]
// Knurled body height, below the ring.
Knob_height = 13.5; // [8:0.5:40]
// Ring between the body and the boss. It bears on the table's underside round the hole; the dogs' printed gasket fits round it.
Ring_diameter = 21; // [16:0.1:40]
// Ring height, which is the gasket's height.
Ring_height = 3; // [0:0.5:10]
// Boss that locates in the table hole and centres the bolt. Make it a slip fit in the hole.
Boss_diameter = 20; // [10:0.1:30]
// How far the boss reaches up into the hole.
Boss_height = 4; // [0:0.5:20]
// Diamond knurl on the body's side, as on the dog knobs. Off leaves it plain.
Knurl = true;
// Teeth round the knurl. The dog knobs' 1/8 inch pitch gives 30 on a 30 mm knob.
Knurl_teeth = 30; // [12:1:80]

/* [Printing] */
// Layer height of two sacrificial bridging layers over the head pocket. Zero leaves a plain stepped hole.
Bridge_layer = 0.2; // [0:0.04:0.4]

/* [Hidden] */

$fn = 64;
eps = 0.01;
inch = 25.4;

bolt_d = 5 / 16 * inch;
// Body edge chamfer, and the plain bands above and below the knurl, as in Onshape.
edge_chamfer = 0.5;
knurl_band = 1;
// The bolt tip keeps this far off the bottom of the insert, so the cookie is
// pulled down before the bolt bottoms out.
bottom_clearance = 0.5;
// Material between the head pocket and the knurl's roots, and over the head.
min_wall = 2;
min_roof = 3;
// Crush ribs: half-round, ramping in from flush over the pocket's first 1.5 mm
// so the head starts square.
rib_r = 0.8;
rib_ramp = 1.5;
// Reference cookie's threaded insert.
insert_od = 12.7;
// Standard lengths offered in the build notes, in inches.
stock_lengths = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

assembly = View == "assembly";
explode = assembly ? Explode / 100 * 40 : 0;

knob_r = Knob_diameter / 2;
// 45-degree diamond knurl: each tooth's sides meet at 90 degrees, so it is
// half the pitch deep, and each helix turns one radian per radius of rise.
knurl_pitch = PI * Knob_diameter / Knurl_teeth;
knurl_depth = Knurl ? knurl_pitch / 2 : 0;
knurl_root_r = knob_r - knurl_depth;
knurl_h = Knob_height - 2 * knurl_band;
knurl_twist = knurl_h / knob_r * 180 / PI;

pocket_flats = Head_flats + Pocket_clearance;
pocket_corner_r = pocket_flats / sqrt(3);
// Across the pocket from each rib to the opposite flat.
rib_grip = pocket_flats - Rib_height;
// The bolt's head seats on the pocket's roof, this high above the knob's base.
head_seat = Head_height + Head_recess;
bolt_hole_z = head_seat + 2 * Bridge_layer;
knob_total = Knob_height + Ring_height + Boss_height;
roof = Knob_height + Ring_height - bolt_hole_z;

// Clamping stack, from the head seat to the table top.
seat_to_table = Knob_height + Ring_height + Table_thickness - head_seat;
bolt_mm = Bolt_length * inch;
engagement = bolt_mm - seat_to_table;
max_engagement = Insert_depth - bottom_clearance;
shortest_mm = seat_to_table + Min_engagement;
longest_mm = seat_to_table + max_engagement;
fitting_lengths = [for (l = stock_lengths) if (l * inch >= shortest_mm - 1e-6 && l * inch <= longest_mm + 1e-6) l];

assert(Min_engagement <= max_engagement,
    "The insert is too shallow for the least engagement. Check the insert depth.");
assert(engagement >= Min_engagement, "The bolt is too short to reach far enough into the cookie's insert.");
assert(engagement <= max_engagement,
    "The bolt is too long: it would bottom out in the cookie's insert before the cookie is pulled down.");
assert(Boss_diameter <= Table_hole, "The boss must fit in the table hole.");
assert(Ring_diameter > Table_hole, "The ring must be wider than the table hole to bear on the table's underside.");
assert(Ring_diameter <= Knob_diameter, "The ring must be no wider than the knob.");
assert(Boss_height <= Table_thickness - 1, "The boss must stay inside the table hole.");
assert(Bolt_hole > bolt_d, "The bolt hole must be wider than the 5/16 inch bolt.");
assert(Bolt_hole < Head_flats, "The bolt hole must be narrower than the head, or the head would pull through.");
assert(Boss_diameter - Bolt_hole >= 2 * min_wall, "The boss is too thin round the bolt hole.");
assert(knurl_root_r - pocket_corner_r >= min_wall,
    "The knob is too narrow round the head pocket. Widen the knob or use fewer, finer knurl teeth.");
assert(Rib_height == 0 || Rib_height > Pocket_clearance,
    "The crush ribs must stand further into the pocket than its clearance, or they won't touch the head.");
assert(roof >= min_roof, "The knob is too short over the head pocket. Make the knob taller or the head recess smaller.");

// --- Colors ---

knob_rgb = [208, 106, 31];
bolt_rgb = [46, 50, 56];
cookie_rgb = [47, 109, 179];
insert_rgb = [168, 134, 44];
table_rgb = [201, 195, 182];
module paint(rgb) color(rgb / 255) children();

// --- Knob ---

// One circle of teeth: tips on the knob's radius, roots half a pitch deep.
module knurl_profile() {
    polygon([for (i = [0:2 * Knurl_teeth - 1])
        let(a = i * 180 / Knurl_teeth, r = i % 2 == 0 ? knob_r : knurl_root_r) [r * cos(a), r * sin(a)]]);
}

// Diamond knurl: left- and right-hand helical teeth, intersected.
module knurl() {
    slices = max(8, ceil(knurl_h));
    intersection() {
        linear_extrude(height = knurl_h, twist = knurl_twist, slices = slices) knurl_profile();
        linear_extrude(height = knurl_h, twist = -knurl_twist, slices = slices) knurl_profile();
    }
}

// The body's outline with its edge chamfers, as a solid of revolution.
module body_blank() {
    c = edge_chamfer;
    rotate_extrude() polygon([[0, 0], [knob_r - c, 0], [knob_r, c], [knob_r, Knob_height - c],
        [knob_r - c, Knob_height], [0, Knob_height]]);
}

module knob_body() {
    if (Knurl) intersection() {
        body_blank();
        union() {
            cylinder(r = knob_r + 1, h = knurl_band + eps);
            translate([0, 0, Knob_height - knurl_band - eps]) cylinder(r = knob_r + 1, h = knurl_band + 2 * eps);
            translate([0, 0, knurl_band]) knurl();
        }
    }
    else body_blank();
}

// Ring and boss above the body, the boss's top edge chamfered to find the hole.
module ring_and_boss() {
    z_ring = Knob_height - eps;
    z_boss = Knob_height + Ring_height;
    z_top = knob_total;
    c = min(edge_chamfer, Boss_height / 2);
    rotate_extrude() polygon([[0, z_ring], [Ring_diameter / 2, z_ring], [Ring_diameter / 2, z_boss],
        [Boss_diameter / 2, z_boss], [Boss_diameter / 2, z_top - c], [Boss_diameter / 2 - c, z_top], [0, z_top]]);
}

// Half-round ribs on alternate flats (30, 150 and 270 degrees), each flush at
// the pocket's mouth and full height from rib_ramp up.
module crush_ribs() {
    for (i = [0:2]) rotate([0, 0, 30 + 120 * i]) hull() {
        translate([pocket_flats / 2 + rib_r, 0, -2 * eps]) cylinder(r = rib_r, h = eps, $fn = 16);
        translate([pocket_flats / 2 + rib_r - Rib_height, 0, rib_ramp]) cylinder(r = rib_r, h = head_seat - rib_ramp + 1, $fn = 16);
    }
}

module head_pocket() {
    difference() {
        translate([0, 0, -eps]) cylinder(r = pocket_corner_r, h = head_seat + eps, $fn = 6);
        if (Rib_height > 0) crush_ribs();
    }
    if (Bridge_layer > 0) {
        // First layer: a strip the bolt's width from flat to flat, so the
        // material either side bridges across the pocket. Second layer: a
        // square, bridged on the first layer. The round hole starts above.
        translate([0, 0, head_seat - eps]) intersection() {
            cylinder(r = pocket_corner_r, h = Bridge_layer + eps, $fn = 6);
            translate([-Bolt_hole / 2, -pocket_flats, 0]) cube([Bolt_hole, 2 * pocket_flats, Bridge_layer + eps]);
        }
        translate([-Bolt_hole / 2, -Bolt_hole / 2, head_seat + Bridge_layer - eps])
            cube([Bolt_hole, Bolt_hole, Bridge_layer + eps]);
    }
    translate([0, 0, bolt_hole_z - eps]) cylinder(d = Bolt_hole, h = knob_total);
    // Lead-in for the bolt at the boss's top.
    translate([0, 0, knob_total - 0.5]) cylinder(d1 = Bolt_hole, d2 = Bolt_hole + 1, h = 0.5 + eps);
}

// Print orientation: the head pocket on the bed, the boss up.
module knob() {
    difference() {
        union() {
            knob_body();
            ring_and_boss();
        }
        head_pocket();
    }
}

// --- Reference parts ---

module hex_bolt() {
    // Head below Z=0, shank up from its bearing face at Z=0.
    translate([0, 0, -Head_height]) cylinder(r = Head_flats / sqrt(3), h = Head_height + eps, $fn = 6);
    cylinder(d = bolt_d, h = bolt_mm, $fn = 24);
}

module cookie() {
    c = 1.5;
    r = Cookie_diameter / 2;
    difference() {
        rotate_extrude() polygon([[0, 0], [r - c, 0], [r, c], [r, Cookie_height - c], [r - c, Cookie_height], [0, Cookie_height]]);
        translate([0, 0, -eps]) cylinder(d = insert_od, h = Insert_depth + eps, $fn = 32);
    }
}

// The insert's bore is shown at the bolt's diameter, so the two touch.
module threaded_insert() {
    difference() {
        cylinder(d = insert_od, h = Insert_depth, $fn = 32);
        translate([0, 0, -eps]) cylinder(d = bolt_d, h = Insert_depth + 2 * eps, $fn = 24);
    }
}

// A patch of table round the hole, narrower than the cookie so the default
// view from just below the table shows the cookie, the knob and the bolt.
module table() {
    span = max(Knob_diameter, Table_hole) + 26;
    difference() {
        translate([-span / 2, -span / 2, -Table_thickness]) cube([span, span, Table_thickness]);
        translate([0, 0, -Table_thickness - eps]) cylinder(d = Table_hole, h = Table_thickness + 2 * eps);
    }
}

knob_z = -Table_thickness - Knob_height - Ring_height;

// Exploding moves the knob and its captive bolt down together, the head still
// seated on the pocket's roof.
module assembly() {
    translate([0, 0, knob_z - explode]) {
        paint(knob_rgb) knob();
        translate([0, 0, head_seat]) paint(bolt_rgb) hex_bolt();
    }
    paint(table_rgb) table();
    translate([0, 0, 0.8 * explode]) {
        paint(cookie_rgb) cookie();
        paint(insert_rgb) threaded_insert();
    }
}

// Quarter inches as a mixed fraction: 1.25 -> "1 1/4".
function fraction(l) = let(q = round((l - floor(l)) * 4))
    q == 0 ? str(floor(l)) : str(floor(l) > 0 ? str(floor(l), " ") : "", q == 2 ? "1/2" : str(q, "/4"));
function join(v, i = 0) = i >= len(v) ? "" : str(v[i], join(v, i + 1));
function length_list(ls) = len(ls) == 0 ? "none of the usual lengths"
    : join([for (i = [0:len(ls) - 1]) str(i == 0 ? "" : i == len(ls) - 1 ? " or " : ", ", fraction(ls[i]), " in")]);

echo(str("Bolt: 5/16-18 hex bolt, ", fraction(Bolt_length), " in (", bolt_mm, " mm) under the head. It reaches ",
    round(engagement * 10) / 10, " mm into the cookie's insert, which takes ", Insert_depth, " mm."));
echo(str("Lengths that fit: ", round(shortest_mm * 10) / 10, " to ", round(longest_mm * 10) / 10,
    " mm under the head, which is ", length_list(fitting_lengths), "."));
echo(str("Clamps a ", Table_thickness, " mm table top between the cookie and the knob's ring."));
echo(str("Head pocket: ", pocket_flats, " mm across flats and ", head_seat, " mm deep",
    Rib_height > 0 ? str(", with three crush ribs that narrow it to ", rib_grip,
        " mm. Press the bolt head in from the knob's underside, with a vise or clamp if it's tight; the ribs hold it there.")
    : ". Press the bolt head in from the knob's underside."));

if (assembly) assembly();
else paint(knob_rgb) knob();
