// Double-sided vacuum pod
// A square, 3D-printed vacuum pod that holds itself down as well as the work,
// so it needs no dogs or clamps: it works on any smooth, airtight surface.
// Each face has a groove round its edge, holding a loop of round foam cord as
// the seal, and just inside that a single channel, so that air can get out
// from under the work all round. The rest of the face is flat, so
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
// On a top that leaks, such as bare MDF, or to stop the pod sliding, stand it
// on its MFT platform: a flat bed for the bottom seal, with low stops at its
// corners that box the pod in, and two pads that the tightening dogs from the
// vacuum puck MFT mount clamp to an MFT-style top. Each dog is an M6 rod with
// a knurled knob under the table and a flangeless one on the pad. The vacuum
// still holds the pod down, and nothing fastens it to the platform: the stops
// only keep it from sliding, and leave the middle of each side open, so the
// fitting is clear.
//
// All dimensions are millimetres. Z is up and the table top is Z=0. The pod is
// centred on the origin, with its fitting in the back face (+Y).
//
// View = Pod is the part to print. It prints as modelled, bottom face down,
// with no supports. The bottom face's grooves and channel have round sides
// meeting in a point, and the duct is a teardrop, so they close over
// a step at a time rather than as bridges. The top face's grooves and channel
// are round-bottomed, as they print on the layers below them. Air leaks
// through a print's walls and infill, so print it to be airtight: in PETG,
// ASA or ABS, with
// extra walls, more top and bottom layers in a concentric pattern, the nozzle a
// little hotter, a slight over-extrusion, and an infill such as cubic that
// closes off its cells. vacuum-pod.3mf beside this file is a Bambu Studio
// project of the default pod set up that way. Then seal every surface with two
// or three coats of polycrylic, inside the port, duct and hole too, blowing the
// hole and channels clear after each coat. Wrap the fitting's thread in PTFE
// tape.
//
// View = MFT platform is the platform to print. It prints as modelled,
// underside down, with no supports. The bed's top face is what the bottom
// seal pulls against, so print its top skin airtight, with several concentric
// top layers, and coat it like the pod.

/* [View] */
// Assembly shows the pod on a patch of table with work on top, before the vacuum pulls them down onto the cords; Assembly on the MFT platform stands it on its platform, held to the table by two tightening dogs. Pod and MFT platform are the parts to print.
View = "assembly"; // [assembly:Assembly with table and work, platform_assembly:Assembly on the MFT platform, pod:Pod (print this), platform:MFT platform (print this)]
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
// Groove depth. The cord stands proud of each face by its diameter less this, and compresses that much before the face lands. At least half the cord's diameter, to hold it. This is the depth of the cord's half-round seat. In the bottom face, which prints face down, a point beyond it, so that the groove prints without support, takes the groove about 1.4 mm deeper at its centre line.
Groove_depth = 3.5; // [1:0.1:15]
// Material between each groove and the pod's outside.
Rim_width = 4; // [1.5:0.1:15]
// Plan radius of the grooves' centre lines at the corners, where the cord bends. The pod's corners follow it.
Seal_bend_radius = 10; // [3:0.5:40]

/* [Channels] */
// Channel width. The channel round each face, just inside its groove, is round-bottomed in the top face, half as deep as it's wide. In the bottom face its round sides meet in a point, so that it prints without support, about three-quarters as deep as it's wide.
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

/* [MFT platform] */
// Thickness of the platform's bed and dog pads. 6 mm matches the vacuum puck MFT mount's wings, so the same dog rods fit.
Platform_thickness = 6; // [3:0.5:20]
// Height of the stops above the bed. The pod rests on its bottom cord until the vacuum pulls it down, so they must stand taller than the cord stands proud.
Stop_height = 6; // [1:0.5:20]
// Thickness of the stops' walls.
Stop_wall = 3; // [1.5:0.5:10]
// Gap all round between the pod and the stops.
Stop_clearance = 0.5; // [0:0.1:3]
// Hole pitches between the two dogs along X. With an odd number both ways, the pod sits in the middle of a square of holes, the dogs at two of its corners.
Pitches_x = 1; // [0:1:6]
// Hole pitches between the two dogs along Y, front to back.
Pitches_y = 1; // [0:1:6]
// Pad hole width for the dog's M6 rod.
Rod_hole = 7; // [6.2:0.1:12]
// Slot length in the back dog's hole, along the line between the dogs, for table holes off their nominal spacing. The front dog's hole is round, so the platform can't slide. Zero leaves both round.
Slot_length = 2; // [0:0.5:30]
// Top knob diameter. Each pad is 3 mm larger in radius.
Knob_diameter = 30; // [16:0.5:50]
// Top knob height above the pad.
Knob_height = 20; // [5:0.5:50]
// Smallest gap allowed between a knob and the stops, pod or fitting.
Knob_clearance = 2; // [0:0.5:10]

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
// The slope, in degrees from the face, of the points over the bottom face's
// grooves and channel and over the duct, and of the countersinks' sides. At
// 50 degrees they print without support, well clear of a slicer's 40-degree
// overhang limit.
roof_angle = 50;
// The countersinks' sides, in degrees from the hole's axis.
sink_angle = 90 - roof_angle;

function r1(x) = round(x * 10) / 10;
function r2(x) = round(x * 100) / 100;

assembly = View == "assembly";
on_platform = View == "platform_assembly";
platform_view = on_platform || View == "platform";
explode = assembly || on_platform ? Explode / 100 * 50 : 0;

top_groove_floor = Pod_thickness - Groove_depth;
// The bottom face prints on the plate, so its grooves and channel close over
// as the pod prints. Their round sides meet beyond their centre in a point
// whose sides slope at roof_angle, cut off flat where it's point_tip wide:
// each layer of the point steps in by less than the layer height, so they
// close without a bridge. The top face's grooves and channel print on the layers below them,
// so they're simply round-bottomed.
point_tip = 0.4;
// The depth of such a point, with sides of radius r centred c into the pod.
function point_depth(r, c) = c + r / cos(roof_angle) - point_tip / 2 * tan(roof_angle);
// Each groove has straight walls from the face, then a half-round seat for
// the cord at Groove_depth, its centre a hair inside the face, then, in the
// bottom face, the point.
groove_r = Groove_width / 2;
groove_centre = max(Groove_depth - groove_r, 0.05);
bottom_groove_depth = point_depth(groove_r, groove_centre);
// Each channel's sides are centred a hair outside the face, so that their
// widest part doesn't lie exactly in the face.
channel_r = Channel_width / 2;
channel_centre = -0.02;
bottom_channel_depth = point_depth(channel_r, channel_centre);
top_channel_depth = channel_centre + channel_r;
top_channel_floor = Pod_thickness - top_channel_depth;

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
// groove, and no deeper than the top face's shallower channel.
hole_y = ring_w / 2;
sink_d = max(Hole_diameter, min(Hole_diameter + 2 * top_channel_depth * tan(sink_angle), Channel_width + Channel_land));
sink_depth = (sink_d - Hole_diameter) / 2 / tan(sink_angle);

port_end_y = Pod_width / 2 - Port_depth;
port_mouth_r = Port_hole / 2 + port_chamfer;
hex_corner_r = Fitting_hex / sqrt(3);
fitting_reach = Pod_width / 2 + Fitting_projection + tube_stub;
// The port runs between the faces' grooves and channels, centred between the
// bottom face's cuts and the top face's shallower ones, so that the fitting's
// thread has as much plastic above it as below. The pod's least thickness
// leaves min_cover on both sides.
top_groove_depth = groove_centre + groove_r;
bottom_cut = max(bottom_groove_depth, bottom_channel_depth);
top_cut = max(top_groove_depth, top_channel_depth);
port_z = (bottom_cut + Pod_thickness - top_cut) / 2;
min_thickness = bottom_cut + top_cut + 2 * min_cover + npt_major;
hex_room = min(port_z, Pod_thickness - port_z);
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
assert(port_z - npt_major / 2 - bottom_cut >= min_cover - eps,
    str("The pod is too thin for the port to run in between its two faces' grooves and channels. Make it at least ", r1(min_thickness),
        " mm thick, or the grooves shallower or the channels narrower."));
assert(port_z + Duct_diameter / 2 / cos(roof_angle) <= top_channel_floor - min_cover && port_z - Duct_diameter / 2 >= bottom_channel_depth + min_cover,
    "The duct comes too close to the channels. Make the pod thicker, or the channels or duct narrower.");
assert(Duct_diameter <= Port_hole - 1, "The duct must be narrower than the port.");
assert(Hole_diameter / 2 + 1 <= channel_r + Channel_land, "The hole must stay 1 mm clear of the grooves. Make it smaller, or the channels or land wider.");
assert(port_end_y >= hole_y - Hole_diameter / 2, "The port reaches past the hole. Make it shallower.");
assert(port_mouth_r + 2 <= Pod_length / 2 - corner_r,
    str("The port must stay 2 mm clear of the pod's rounded corners. Make the pod at least ", r1(2 * (corner_r + port_mouth_r + 2)),
        " mm long, or the seal bend radius smaller."));

// --- MFT platform ---

// The tightening dogs, from the shared Onshape document the vacuum puck MFT
// mount follows: both knobs take an M6 rod in a 6.15 mm bore with a captive
// 9.93 mm (across flats) nut, and the bottom knob's 20 mm boss locates in the
// table hole, centring the rod.
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
pad_margin = 3;
// A chamfer round the top of the stops' inner faces, to lead the pod in.
stop_lead_in = 1;
// Bed beyond the stops' outsides. (Stops flush with the bed's edge meet the
// hull to the pads at a tangent, which the engine meshes with slivers.)
bed_margin = 2;

knob_r = Knob_diameter / 2;
pad_r = knob_r + pad_margin;
knob_top = Platform_thickness + Knob_height;
// The stops, the pocket inside them and the bed round them are all
// concentric with the pod's corners, so the walls keep their thickness round
// the bends.
stops_l = Pod_length + 2 * (Stop_clearance + Stop_wall);
stops_w = Pod_width + 2 * (Stop_clearance + Stop_wall);
stops_r = corner_r + Stop_clearance + Stop_wall;
bed_l = stops_l + 2 * bed_margin;
bed_w = stops_w + 2 * bed_margin;
bed_r = stops_r + bed_margin;
pocket_l = Pod_length + 2 * Stop_clearance;
pocket_w = Pod_width + 2 * Stop_clearance;
pocket_r = corner_r + Stop_clearance;
// The dogs sit in table holes whole pitches apart, symmetric about the pod's
// centre: the front one, round-holed, at front left, and the slotted one at
// back right. Each slot runs along the line through both dogs, which passes
// through the pod's centre, so a knob is nearest the pod at its slot's inner
// end.
dog_dx = Pitches_x * Hole_pitch / 2;
dog_dy = Pitches_y * Hole_pitch / 2;
dogs = [[-dog_dx, -dog_dy], [dog_dx, dog_dy]];
dog_spacing = norm([2 * dog_dx, 2 * dog_dy]);
function dog_slot(i) = i == 1 ? Slot_length : 0;
function slot_end(i, t) = dogs[i] + t * dog_slot(i) / 2 * dogs[i] / max(norm(dogs[i]), eps);
pad_ends = [for (i = [0:1], t = [-1, 1]) slot_end(i, t)];
plat_min = [min(-bed_l / 2, min([for (e = pad_ends) e[0]]) - pad_r), min(-bed_w / 2, min([for (e = pad_ends) e[1]]) - pad_r)];
plat_max = [max(bed_l / 2, max([for (e = pad_ends) e[0]]) + pad_r), max(bed_w / 2, max([for (e = pad_ends) e[1]]) + pad_r)];
// Plan distance from a point to a rounded rectangle centred on the origin,
// negative inside it.
function rounded_gap(p, l, w, r) = norm([max(abs(p[0]) - (l / 2 - r), 0), max(abs(p[1]) - (w / 2 - r), 0)]) - r;
// Plan distance from a point to an axis-aligned box, zero inside it.
function box_gap(p, x0, x1, y0, y1) = norm([max(x0 - p[0], 0, p[0] - x1), max(y0 - p[1], 0, p[1] - y1)]);
// Closest a dog's knob comes to the stops, and to the fitting and its tube,
// sampled along its slot.
function knob_stop_gap(i) = min([for (t = [-1:0.5:1]) rounded_gap(slot_end(i, t), stops_l, stops_w, stops_r)]) - knob_r;
function knob_fitting_gap(i) = min([for (t = [-1:0.5:1])
    box_gap(slot_end(i, t), -hex_corner_r, hex_corner_r, Pod_width / 2, fitting_reach)]) - knob_r;
platform_pod_z = Platform_thickness + cord_proud + 0.1;

if (platform_view) {
    assert(Pitches_x + Pitches_y >= 1, "The dogs need at least one hole pitch between them.");
    assert(Stop_height >= cord_proud + 1,
        str("The stops must stand at least 1 mm taller than the bottom cord stands proud, ", r2(cord_proud), " mm, to hold the pod before the vacuum pulls it down."));
    assert(Pod_length / 2 - corner_r >= hex_corner_r + 1, "The back stops would touch the fitting. Make the pod longer, or the seal bend radius smaller.");
    assert(knob_top + 1 <= Platform_thickness + Pod_thickness, "The dog knobs must sit below the pod's top face, so that work can overhang them.");
    for (i = [0:1]) {
        assert(knob_stop_gap(i) >= Knob_clearance,
            str(i == 0 ? "The front" : "The back", " dog's knob would hit the stops or pod",
                dog_slot(i) > 0 ? " at the inner end of its slot" : "", ". Increase the hole pitches between the dogs",
                dog_slot(i) > 0 ? ", shorten the slot" : "", " or make the stops thinner."));
        assert(knob_top + Knob_clearance <= platform_pod_z + port_z - hex_corner_r || knob_fitting_gap(i) >= Knob_clearance,
            str(i == 0 ? "The front" : "The back", " dog's knob would hit the fitting. Change the hole pitches between the dogs."));
    }
}

// Legend colours as 0-255 RGB. Repeated pieces get their own colour within
// 3/255 of the legend colour, so the viewer can select each one.
pod_rgb = [208, 106, 31];
cord_rgb = [71, 76, 85];
fitting_rgb = [168, 134, 44];
table_rgb = [201, 195, 182];
work_rgb = [181, 136, 84];
platform_rgb = [63, 143, 63];
top_knob_rgb = [47, 109, 179];
bottom_knob_rgb = [123, 82, 171];
rod_rgb = [178, 68, 58];
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

// Sweeps a cross-section round a rounded rectangle l by w, with corners of
// radius bend, centred on the origin: straight lengths along each side and a
// quarter turn at each corner. The cross-section is the child, drawn in 2D
// across the path (x) and up from the plane z = 0 (y), reaching no more than
// reach from its origin. The straight lengths reach 0.1 mm into the corners,
// so they overlap rather than meet face to face.
module loop_sweep(l, w, bend, reach) {
    sx = l / 2 - bend;
    sy = w / 2 - bend;
    box = bend + reach + 1;
    for (y = [-1, 1] * w / 2) translate([-sx - 0.1, y, 0]) rotate([90, 0, 90]) linear_extrude(height = 2 * sx + 0.2) children();
    for (x = [-1, 1] * l / 2) translate([x, sy + 0.1, 0]) rotate([90, 0, 0]) linear_extrude(height = 2 * sy + 0.2) children();
    for (cx = [-1, 1], cy = [-1, 1]) translate([cx * sx, cy * sy, 0]) intersection() {
        rotate_extrude() translate([bend, 0]) children();
        translate([cx > 0 ? 0 : -box, cy > 0 ? 0 : -box, -box]) cube([box, box, 2 * box]);
    }
}

// A groove's or channel's cross-section, from just outside the face: straight
// walls up to c, then round sides of radius r centred there, either meeting
// in the point or rounding off in a half circle. The point's sides are
// tangent to the round ones. It's a single polygon because the engine meshes
// the sweep of a 2D union with non-manifold edges where the straight lengths
// meet the corners.
module section(r, c, pointed) {
    top = point_depth(r, c);
    n = ceil((90 - roof_angle) / 7.5);
    step = (90 - roof_angle) / n;
    polygon(pointed
        ? concat(
            [[-r, -0.05]],
            [for (i = [0:n]) [r * cos(180 - i * step), c + r * sin(180 - i * step)]],
            [[-point_tip / 2, top], [point_tip / 2, top]],
            [for (i = [0:n]) [r * cos(90 - roof_angle - i * step), c + r * sin(90 - roof_angle - i * step)]],
            [[r, -0.05]])
        : concat(
            [[-r, -0.05]],
            [for (a = [180:-7.5:0]) [r * cos(a), c + r * sin(a)]],
            [[r, -0.05]]));
}

// The cutters for one face, with the face at z = 0 and the pod above it:
// pointed for the bottom face, round-bottomed for the top.
module face_cuts(pointed) {
    loop_sweep(seal_l, seal_w, Seal_bend_radius, max(Groove_width, bottom_groove_depth)) section(groove_r, groove_centre, pointed);
    loop_sweep(ring_l, ring_w, ring_r, max(Channel_width, bottom_channel_depth)) section(channel_r, channel_centre, pointed);
}

// A circle with a point on top, its sides tangent to the circle and sloping
// at roof_angle, so a horizontal hole prints without support.
module teardrop(r) {
    n = 40;
    step = (360 - 2 * roof_angle) / n;
    polygon(concat([[0, r / cos(roof_angle)]],
        [for (i = [0:n]) [r * cos(90 + roof_angle + i * step), r * sin(90 + roof_angle + i * step)]]));
}

module air_path() {
    // The port in the back face, tapered like the thread, with a chamfer at
    // its mouth.
    translate([0, Pod_width / 2 + eps, port_z]) rotate([90, 0, 0]) {
        cylinder(d1 = Port_hole, d2 = Port_hole - Port_depth * npt_taper, h = Port_depth + eps);
        cylinder(d1 = Port_hole + 2 * port_chamfer, d2 = Port_hole, h = port_chamfer + eps);
    }
    // The duct, from just inside the port to just past the hole.
    translate([0, port_end_y + 1, port_z]) rotate([90, 0, 0])
        linear_extrude(height = port_end_y + 1 - hole_y + Duct_diameter / 2) teardrop(Duct_diameter / 2);
    // The hole, from one face's channel to the other's, with an 80-degree
    // countersink at each face. It starts where the countersinks narrow to
    // it, so that it leaves no ledge.
    hole_end = sink_depth > 0 ? sink_depth : channel_r / 2;
    translate([0, hole_y, 0]) {
        translate([0, 0, hole_end]) cylinder(d = Hole_diameter, h = Pod_thickness - 2 * hole_end);
        if (sink_depth > 0) for (z = [-0.02, Pod_thickness + 0.02]) translate([0, 0, z]) mirror([0, 0, z > 0 ? 0 : 1])
            translate([0, 0, -sink_depth - 0.02])
                cylinder(d1 = Hole_diameter, d2 = Hole_diameter + 2 * (sink_depth + 0.02) * tan(sink_angle), h = sink_depth + 0.02);
    }
}

module pod() {
    difference() {
        linear_extrude(height = Pod_thickness) rounded_rect(Pod_length, Pod_width, corner_r);
        face_cuts(true);
        translate([0, 0, Pod_thickness]) mirror([0, 0, 1]) face_cuts(false);
        air_path();
    }
}

// --- MFT platform ---

// The bed, hulled to a pad round each dog's hole, so that each knob bears
// fully anywhere along its slot.
module platform_outline() {
    hull() {
        rounded_rect(bed_l, bed_w, bed_r);
        for (e = pad_ends) translate(e) circle(r = pad_r);
    }
}

// A quarter of a circle round each of the pod's corner centres, out to the
// stops' outsides: the stops, before the pocket is cut from their insides.
module stop_outlines() {
    for (sx = [-1, 1], sy = [-1, 1]) translate([sx * (Pod_length / 2 - corner_r), sy * (Pod_width / 2 - corner_r)]) intersection() {
        circle(r = stops_r);
        translate([sx > 0 ? 0 : -stops_r - 1, sy > 0 ? 0 : -stops_r - 1]) square(stops_r + 1);
    }
}

// The space for the pod inside the stops, with a chamfer round its top.
module pocket() {
    top = Platform_thickness + Stop_height;
    translate([0, 0, Platform_thickness]) linear_extrude(height = Stop_height + 1) rounded_rect(pocket_l, pocket_w, pocket_r);
    hull() {
        translate([0, 0, top - stop_lead_in]) linear_extrude(height = eps) rounded_rect(pocket_l, pocket_w, pocket_r);
        translate([0, 0, top]) linear_extrude(height = 1)
            rounded_rect(pocket_l + 2 * stop_lead_in, pocket_w + 2 * stop_lead_in, pocket_r + stop_lead_in);
    }
}

// One solid, cut down from the stops' height: the whole outline at full
// height, less everything above the bed but the stops, less the pocket and
// the dogs' holes. (Overlapping extrusions would leave internal faces in the
// engine's display mesh.)
module platform() {
    big = 4 * max(abs(plat_min[0]), abs(plat_min[1]), plat_max[0], plat_max[1]);
    difference() {
        linear_extrude(height = Platform_thickness + Stop_height) platform_outline();
        translate([0, 0, Platform_thickness]) linear_extrude(height = Stop_height + 1) difference() {
            square(big, center = true);
            stop_outlines();
        }
        pocket();
        for (i = [0:1]) hull() for (t = [-1, 1])
            translate(concat(slot_end(i, t), -eps)) cylinder(d = Rod_hole, h = Platform_thickness + 2 * eps);
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
    translate([0, Pod_width / 2, port_z]) rotate([-90, 0, 0]) {
        translate([0, 0, fitting_standoff - npt_length])
            cylinder(d1 = npt_major - npt_length * npt_taper, d2 = npt_major, h = npt_length);
        translate([0, 0, fitting_standoff]) cylinder(r = hex_corner_r, h = hex_l, $fn = 6);
        translate([0, 0, fitting_standoff + hex_l]) cylinder(d = 0.9 * Fitting_hex, h = body_l);
        translate([0, 0, Fitting_projection - 3]) cylinder(d = 0.85 * Fitting_hex, h = 3);
        translate([0, 0, Fitting_projection - 1]) cylinder(d = tube_d, h = tube_stub + 1);
    }
}

// Flangeless top knob, standing on the pad.
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

// A patch of table reaching past everything within reach of its middle, with
// holes on the table's grid through (ox, oy).
module table(ox, oy, reach) {
    span = reach + max(20, Hole_pitch / 4);
    n = ceil(span / Hole_pitch) + 1;
    difference() {
        translate([-span, -span, -Table_thickness]) cube([2 * span, 2 * span, Table_thickness]);
        for (i = [-n - 1:n + 1], j = [-n - 1:n + 1]) {
            g = [ox + i * Hole_pitch, oy + j * Hole_pitch];
            if (max(abs(g[0]), abs(g[1])) + Table_hole_diameter / 2 + 5 <= span)
                translate([g[0], g[1], -Table_thickness - eps]) cylinder(d = Table_hole_diameter, h = Table_thickness + 2 * eps, $fn = 32);
        }
    }
}

// The pod with its cords and fitting, resting on its bottom cord, and the
// work on its top one, the pod's bottom face at pod_z. Each cord sits a hair
// off its groove's floor, and the pod and work a hair above the cords, so that
// their meshes don't touch.
module pod_and_work(pod_z) {
    work_z = pod_z + Pod_thickness + cord_proud + 0.1;
    translate([0, 0, pod_z]) {
        paint(pod_rgb) pod();
        translate([0, 0, -0.5 * explode]) paint(shade(cord_rgb, 1)) cord(Groove_depth - Cord_diameter / 2 - 0.05);
        translate([0, 0, 0.5 * explode]) paint(shade(cord_rgb, 0)) cord(top_groove_floor + Cord_diameter / 2 + 0.05);
        translate([0, 0.8 * explode, 0]) paint(fitting_rgb) fitting();
    }
    translate([-Work_length / 2, -Work_width / 2, work_z + explode]) paint(work_rgb) cube([Work_length, Work_width, Work_thickness]);
}

// Before the vacuum pulls, on the table, in the middle of a square of holes.
module assembly() {
    translate([0, 0, -explode]) paint(table_rgb) table(Hole_pitch / 2, Hole_pitch / 2, max(Pod_length / 2, fitting_reach));
    pod_and_work(cord_proud + 0.1);
}

// Before the vacuum pulls, on the platform, with the dogs clamping it to the
// table: each rod runs from its bottom knob's nut to its top knob's.
module platform_assembly() {
    bottom_knob_z = -Table_thickness - bottom_knob_h - bottom_ring_h;
    rod_bottom = bottom_knob_z + 1;
    rod_top = knob_top - 1;
    reach = max(Pod_length / 2, fitting_reach, -plat_min[0], -plat_min[1], plat_max[0], plat_max[1]);
    translate([0, 0, -explode]) paint(table_rgb) table(dog_dx, dog_dy, reach);
    paint(platform_rgb) platform();
    translate([0, 0, 0.5 * explode]) pod_and_work(platform_pod_z);
    for (i = [0:1]) {
        p = dogs[i];
        translate([p[0], p[1], Platform_thickness + 0.5 * explode]) paint(shade(top_knob_rgb, i)) top_knob();
        translate([p[0], p[1], rod_bottom + 0.9 * explode]) paint(shade(rod_rgb, i)) cylinder(d = rod_d, h = rod_top - rod_bottom, $fn = 16);
        translate([p[0], p[1], bottom_knob_z - 1.5 * explode]) paint(shade(bottom_knob_rgb, i)) bottom_knob();
    }
}

echo(str("Pod: ", Pod_length, " x ", Pod_width, " x ", Pod_thickness,
    " mm. Print it as modelled, bottom face down, with no supports, to be airtight: extra walls, more concentric top and bottom layers,",
    " a little hotter, slightly over-extruded, with cubic infill. Then seal every surface with two or three coats of polycrylic,",
    " inside the port, duct and hole too, blowing the hole and channels clear after each coat."));
echo(str("Seals: cut two ", round(cord_length), " mm lengths of ", Cord_diameter,
    " mm foam cord, one for each face, and join each one's ends with CA glue, cut at 45 degrees. Each stands ", r2(cord_proud), " mm proud in a ",
    Groove_width, " mm wide groove with a half-round seat ", Groove_depth, " mm deep. In the bottom face, a point beyond the seat takes the groove to ",
    r2(bottom_groove_depth), " mm, so that it prints without support."));
echo(str("Holding: each face pulls on ", r1(seal_area / 100), " cm2 inside its seal, ", round(seal_area / 100),
    " N for every 0.1 bar of vacuum. The work must cover the top seal, at least ", r1(cord_outer_l), " x ", r1(cord_outer_w),
    " mm, and the surface under the bottom seal must be smooth and airtight."));
echo(seal_small > hole_gap
    ? str("On an MFT-style top: the bottom seal is wider than the ", hole_gap, " mm between rows of holes, so keep it on a solid part of the top.")
    : str("On an MFT-style top: the bottom seal's ", r1(seal_small), " mm fits in the ", hole_gap,
        " mm between two rows of holes, so the pod can sit anywhere along the gap between them",
        seal_big <= hole_gap ? ", either way round." : str(", with its ", cord_outer_l >= cord_outer_w ? "length" : "width", " along the rows.")));
echo(str("Channel: ", Channel_width, " mm wide, round each face just inside its groove: ", r1(top_channel_depth), " mm deep and round-bottomed in the top face, and ",
    r1(bottom_channel_depth), " mm deep in the bottom face, with a point so that it prints without support. A ",
    Hole_diameter, " mm hole through the pod on the back of the channels joins them", sink_depth > 0 ? str(", countersunk ", r1(sink_d), " mm across at ", 2 * sink_angle, " degrees in each face") : "", "."));
echo(str("Port: ", Port_hole, " mm at the back face, tapering to ", r2(Port_hole - Port_depth * npt_taper), " mm, ", Port_depth,
    " mm deep and centred ", r1(port_z), " mm up, midway between the faces' grooves, for a 1/4\" NPT fitting to cut its own thread into, or a 1/4\" NPT tap. A ",
    Duct_diameter, " mm duct runs from it to the hole."));
echo(hex_corner_r <= hex_room
    ? "Fitting: its hex stays within the pod's thickness, so work can overhang the back too."
    : str("Fitting: its hex stands ", r1(hex_corner_r - hex_room), " mm beyond the ", port_z > Pod_thickness / 2 ? "top" : "bottom",
        " face, so keep work off the back."));
if (platform_view) {
    echo(str("MFT platform: ", r1(plat_max[0] - plat_min[0]), " x ", r1(plat_max[1] - plat_min[1]), " mm, a ", Platform_thickness,
        " mm bed with ", Stop_height, " mm stops at its corners, ", Stop_clearance, " mm clear of the pod. Print it as modelled, underside down,",
        " with no supports. The bottom seal pulls against the bed's top face, so print its top skin airtight, with several concentric top layers,",
        " and coat it like the pod."));
    echo(str("Dogs: ", Pitches_x, " pitch(es) along X and ", Pitches_y, " along Y, ", r1(dog_spacing), " mm apart",
        Slot_length > 0 ? str("; the back dog's slot takes ", r1(dog_spacing - Slot_length / 2), " to ", r1(dog_spacing + Slot_length / 2), " mm") : "",
        ". Each clamps ", Table_thickness + Platform_thickness, " mm (table + pad) between its knobs. The knobs come within ",
        r1(min(knob_stop_gap(0), knob_stop_gap(1))), " mm of the stops."));
    echo(str("Knob tops: ", knob_top, " mm above the table, ", Platform_thickness + Pod_thickness - knob_top,
        " mm below the pod's top face once the vacuum pulls it down, so work can overhang them."));
}
echo("PIECES_V1", [
    [hex_color(shade(cord_rgb, 0)), "Top cord"],
    [hex_color(shade(cord_rgb, 1)), "Bottom cord"],
    for (i = [0:1]) each [
        [hex_color(shade(top_knob_rgb, i)), str("Top knob ", i + 1)],
        [hex_color(shade(bottom_knob_rgb, i)), str("Bottom knob ", i + 1)],
        [hex_color(shade(rod_rgb, i)), str("M6 rod ", i + 1)]
    ]
]);

if (assembly) assembly();
else if (on_platform) platform_assembly();
else if (View == "platform") paint(platform_rgb) platform();
else paint(pod_rgb) pod();
