// MFT vacuum block
// A single-sided vacuum block for an MFT-style table, in two parts: a puck
// machined from solid aluminium or plastic, which carries the seal and the
// vacuum, and a 3D-printed base plate under it, which the dogs clamp to the
// table. A solid puck is airtight all the way through, where air can leak
// through a print's walls and infill. Have the puck CNC machined from a STEP
// file of it, in aluminium for instance (see View below), or cut it from HDPE
// yourself with the router templates below.
//
// The puck's top is the vacuum face. A groove round its edge holds a loop of
// round foam cord as the seal. Inside it, straight channels run lengthwise and
// crosswise in a grid, which stops short of the groove so air can't get round
// the seal. The groove and each channel are one pass of a straight bit, so
// their widths are bit diameters. Holes drilled down from the channels meet a
// duct drilled in from the back face, whose mouth is tapped 1/4" NPT for a
// push-to-connect fitting.
//
// The puck sits in a shallow pocket in the base plate, held by four M5
// countersunk screws up through the plate into tapped holes in its underside.
// The plate's two wings run straight back along the table, either side of the
// fitting. Each dog clamps one wing through a long slot, so both dogs stand in
// one row of table holes behind the block. The slots let the block slide
// toward or away from that row: with a slot a hole pitch long, it can sit
// anywhere front to back, moving the dogs to the next row when a slot runs
// out. Each dog is an M6 rod with a 30 mm knurled knob under the table and a
// flangeless 30 mm knob on the wing, as in the shared Onshape document's
// "bottom knob" and "top knob no flange".
//
// Everything that stands up off the table is behind the block, so the front
// and both ends are clear. With the default 24 mm puck the vacuum face is also
// a little above the knobs' tops, so work can overhang the back too.
//
// Four printed router templates cut the puck. The outline template, taped to
// the blank's underside, guides a pattern or flush-trim bit round the puck's
// outline, then a drill for the screw holes. The groove template and the two
// channel templates drop over the trimmed puck, located by a skirt round its
// sides, and guide a router's guide bushing: round a track for the groove, and
// along slots for the lengthwise and crosswise channels. The groove template's
// island is held to its frame by four thin bridges, which the bit cuts as it
// passes, so it locates in one piece. Turn Router templates off for a
// CNC-machined puck, which needs none.
//
// All dimensions are millimetres. Z is up and the table top is Z=0. The block
// is centred on the origin with its length along X, its front face toward -Y,
// and its wings and fitting to the back (+Y).
//
// View = Puck is the part to machine; the echoed lines list its cuts. For CNC
// machining, mft-vacuum-block-puck.step beside this file is the puck at the
// default settings, and the site's scripts/export-vacuum-puck-step.py rebuilds
// it for others from this file's PUCK_STEP_V1 echo. The STEP models the port
// and screw holes at their tap drills, as machine shops ask, and
// mft-vacuum-block-puck.pdf is its machining drawing, which calls out their
// threads for the shop to tap. Leave the drawing out of an order to tap them
// by hand instead.
// View = Base plate is the part to print: it prints as modelled, underside on
// the bed, with no supports. The template views are the templates to print,
// also as modelled and with no supports: the groove and channel templates
// face down, which keeps the faces the router slides on flat.

/* [View] */
// Assembly shows the cord, fitting, dogs and a patch of table for reference. The puck is the part to machine; the base plate and the templates are parts to print.
View = "assembly"; // [assembly:Assembly for reference, puck:Puck (machine this), base:Base plate (print this), outline_template:Outline template (print), groove_template:Groove template (print), long_template:Lengthwise channel template (print), cross_template:Crosswise channel template (print)]
// Separation of the assembly's parts, in percent. Zero is assembled.
Explode = 0; // [0:1:100]

/* [Puck] */
// Puck length, along the row of dogs. The vacuum holds in proportion to the area inside the groove.
Puck_length = 100; // [60:300]
// Puck width, front to back.
Puck_width = 60; // [40:300]
// Puck thickness: the stock's, if you cut it yourself. 24 mm can be machined from 25 mm plate, and leaves the vacuum face a little above the knobs' tops.
Stock_thickness = 24; // [12:0.1:60]

/* [Seal] */
// Foam cord diameter. 6.35 mm is 1/4 inch.
Cord_diameter = 6.35; // [2:0.05:15]
// Groove width: the diameter of the straight bit or end mill that cuts it in one pass. A little under the cord's diameter, so the cord grips its walls.
Groove_width = 6; // [2:0.05:15]
// Groove depth. The cord stands proud of the face by its diameter less this.
Groove_depth = 4.5; // [1:0.1:15]
// Material between the groove and the puck's outside.
Rim_width = 4; // [1.5:0.1:15]
// Plan radius of the groove's centre line at the corners, where the cord bends. The puck's corners follow it.
Seal_bend_radius = 10; // [3:0.5:40]

/* [Channels] */
// Channel width: the diameter of the straight bit or end mill that cuts them in one pass.
Channel_width = 6; // [2:0.05:15]
// Depth of the channels below the vacuum face.
Channel_depth = 3; // [0.5:0.1:10]
// Centre-to-centre spacing of the channels, both ways. The grid is centred on the puck, with as many channels as fit inside the groove.
Channel_pitch = 25; // [8:0.5:100]
// Least material between the channels and the groove.
Channel_land = 4; // [1:0.5:20]

/* [Fitting, duct and holes] */
// Face the fitting goes in. At the back it sits between the wings, out of the way of work on the front and ends.
Fitting_side = "back"; // [back:Back between the wings, front:Front]
// Port centre along its face, from the middle (+ toward +X). The duct and holes line up with it.
Port_offset = 0; // [-150:0.5:150]
// Depth of the port's centre below the vacuum face, deep enough for the port to pass under the groove.
Port_drop = 13.5; // [5:0.05:100]
// Tap drill for the port. 11.1 mm is 7/16 inch, for a 1/4" NPT tap.
Port_hole = 11.1; // [8:0.05:16]
// Depth of the tap-drilled port: at least the NPT thread's 10.2 mm, and half the hole's diameter more for the tap.
Port_depth = 16; // [6:0.5:30]
// Diameter of the duct drilled on in from the port.
Duct_diameter = 6; // [3:0.05:12]
// Diameter of the holes drilled down from the channels to the duct.
Hole_diameter = 5; // [2:0.01:12]
// Number of holes down to the duct, in the lengthwise channels nearest the port.
Vacuum_holes = 2; // [1:1:10]
// Fitting hex across flats. An estimate: measure yours.
Fitting_hex = 14.3; // [8:0.1:30]
// How far the fitting stands out from the puck, without its tube. An estimate: measure yours.
Fitting_projection = 22; // [5:0.5:60]

/* [Base plate] */
// Plate thickness, under the dog knobs and the puck alike. The plate sits flat on the table.
Wing_thickness = 6; // [3:0.5:20]
// Depth of the pocket the puck sits in. Zero puts the puck on the flat plate.
Pocket_depth = 1.5; // [0:0.5:5]
// Gap round the puck in its pocket.
Pocket_clearance = 0.3; // [0:0.05:1]
// Plate round the pocket, or round the puck without one.
Pocket_wall = 4; // [1:0.5:15]
// Radius of the rounded inside corners where the wings leave the plate round the puck. Zero leaves sharp corners.
Wing_fillet = 5; // [0:0.5:15]
// Metric countersunk machine screws, four of them up through the plate into tapped holes in the puck. The puck's holes are their tap drill, to tap by hand, and the plate's are clearance holes countersunk for flat heads (DIN 7991 or ISO 10642).
Screw_size = "M5"; // [M3, M4, M5, M6]
// Screw length, including its head. With 16 mm M5 screws, 11.5 mm of thread holds in the puck.
Screw_length = 16; // [6:0.5:50]
// The screws' distance in from the puck's sides and ends, one near each corner.
Screw_inset = 12; // [5:0.5:40]

/* [Router templates] */
// Printed router templates, for cutting the puck yourself. Turn this off for a CNC-machined puck, so the templates' checks don't limit its settings.
Router_templates = true;
// Guide bushing outside diameter, for the groove and channel templates. 15.88 mm is 5/8 inch.
Bushing_diameter = 15.88; // [8:0.01:40]
// How far the guide bushing stands below the router's base. The templates must be thicker.
Bushing_length = 6; // [1:0.5:20]
// Play between the bushing and the templates' edges, in all.
Bushing_clearance = 0.3; // [0:0.05:1]
// Thickness of the groove and channel templates.
Template_thickness = 10; // [4:0.5:25]
// Plate round the puck, for the router's base to rest on.
Template_margin = 20; // [5:1:60]
// How far the templates' skirts reach down the puck's sides, locating them.
Skirt_depth = 8; // [3:0.5:20]
// Skirt wall thickness.
Skirt_wall = 3; // [1.5:0.5:10]
// Gap between the skirts and the puck's sides.
Skirt_clearance = 0.25; // [0:0.05:1]
// Height of the bridges that hold the groove template's island to its frame until the bit cuts them.
Bridge_height = 1.2; // [0.4:0.2:4]
// Width of those bridges along the track.
Bridge_width = 4; // [1:0.5:10]
// Thickness of the outline template, for a pattern or flush-trim bit's bearing to ride on.
Outline_template_thickness = 8; // [3:0.5:20]

/* [Table and dogs] */
// Centre-to-centre spacing of the table's holes. MFT-style tops use 96 mm.
Hole_pitch = 96; // [20:0.5:200]
// Hole pitches between the two dogs, along the block's length. Each wing runs back in line with its dog.
Pitches_along = 1; // [1:1:4]
// Slot length along each wing. The block slides this far toward or away from the dogs' row; a hole pitch or more lets it sit anywhere front to back. Zero leaves round holes.
Slot_length = 96; // [0:1:250]
// Distance from the block's centre back to the dogs' row, for the assembly view. It must fall within the slots.
Dog_distance = 96; // [20:0.5:400]
// Slot width for the dog's M6 rod.
Rod_hole = 7; // [6.2:0.1:12]
// Top knob diameter. Each wing pad is 3 mm larger in radius.
Knob_diameter = 30; // [16:0.5:50]
// Top knob height above the wing.
Knob_height = 20; // [5:0.5:50]
// Smallest gap between a knob and the puck, at the near end of its slot, and between the two knobs.
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
// The port's thread: its name on the drawing, and 1/4" NPT's effective thread
// length L2, 0.4018 inch, which a fitting screws into when tightened.
npt_name = "1/4-18 NPT";
npt_thread_depth = 10.2;
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
// Least material between the port's thread and the groove floor above it.
min_port_cover = 2;
// Half the point angle of a twist drill, 118 degrees.
drill_half_angle = 59;
// The port's chamfer at its mouth, and the diameter its drill point narrows
// to in the duct.
port_chamfer = 1;
port_tip = Duct_diameter - 1;
// Printed holes come out a little small.
print_hole_allowance = 0.2;
// Metric screws: size, pitch, tap drill, medium clearance hole, and the countersink
// at 90 degrees, 0.5 mm over the flat head's diameter.
screw_sizes = [["M3", 3, 0.5, 2.5, 3.4, 6.5], ["M4", 4, 0.7, 3.3, 4.5, 8.5], ["M5", 5, 0.8, 4.2, 5.5, 10.5], ["M6", 6, 1, 5, 6.6, 12.5]];
screw_spec = screw_sizes[search([Screw_size], screw_sizes)[0]];
screw_d = screw_spec[1];
screw_pitch = screw_spec[2];
screw_tap_drill = screw_spec[3];
screw_clearance = screw_spec[4];
screw_head = screw_spec[5];

assembly = View == "assembly";
template_view = View == "outline_template" || View == "groove_template" || View == "long_template" || View == "cross_template";
explode = assembly ? Explode / 100 * 50 : 0;
function r1(v) = round(v * 10) / 10;
// "a", "a and b", "a, b and c".
function join(v, i = 0) = i >= len(v) ? "" : str(v[i], i < len(v) - 2 ? ", " : i == len(v) - 2 ? " and " : "", join(v, i + 1));

knob_r = Knob_diameter / 2;
pad_r = knob_r + pad_margin;
knob_top = Wing_thickness + Knob_height;
// The puck's underside sits on the pocket's floor.
puck_z = Wing_thickness - Pocket_depth;
face_z = puck_z + Stock_thickness;
channel_floor = face_z - Channel_depth;
groove_floor = face_z - Groove_depth;

// The groove's centre line is a rounded rectangle Rim_width + Groove_width / 2
// in from the puck's edge; the puck's corners and the groove's edges are
// concentric with its corners, so the rim and groove keep their widths.
seal_inset = Rim_width + Groove_width / 2;
corner_r = Seal_bend_radius + seal_inset;
seal_l = Puck_length - 2 * seal_inset;
seal_w = Puck_width - 2 * seal_inset;
cord_length = 2 * (seal_l + seal_w) - (8 - 2 * PI) * Seal_bend_radius;
cord_proud = Cord_diameter - Groove_depth;
// Inside the groove.
inner_l = Puck_length - 2 * (Rim_width + Groove_width);
inner_w = Puck_width - 2 * (Rim_width + Groove_width);
inner_r = Seal_bend_radius - Groove_width / 2;

// The channels' centre lines must keep within the inside of the groove inset
// by the land and half a channel: a rounded rectangle, chan_a by chan_b from
// the centre, with corner radius chan_r.
chan_c = Channel_land + Channel_width / 2;
chan_a = inner_l / 2 - chan_c;
chan_b = inner_w / 2 - chan_c;
chan_r = max(0, inner_r - chan_c);
function centred_grid(half, pitch) = half < 0 ? [] : [for (k = [-floor(half / pitch):floor(half / pitch)]) k * pitch];
cross_xs = centred_grid(chan_a, Channel_pitch);
long_ys = centred_grid(chan_b, Channel_pitch);
// With more than one channel across, the lengthwise ones end just short of
// the outer ones' centre lines, and the same the other way, so the grid
// closes in a rectangle; a lone channel runs as far as the land allows. Ending
// a channel exactly on a centre line would leave its round end touching the
// far side of the channel it runs into, a tangency the engine meshes badly.
end_short = 0.5;
long_end = len(cross_xs) > 1 ? max(cross_xs) - end_short : chan_a;
cross_end = len(long_ys) > 1 ? max(long_ys) - end_short : chan_b;
function inside_channel_limit(x, y) =
    let(dx = x - (chan_a - chan_r), dy = y - (chan_b - chan_r))
    x <= chan_a + eps && y <= chan_b + eps && (dx <= 0 || dy <= 0 || dx * dx + dy * dy <= chan_r * chan_r + eps);
max_long_y = len(long_ys) > 0 ? max([for (y = long_ys) abs(y)]) : 0;
max_cross_x = len(cross_xs) > 0 ? max([for (x = cross_xs) abs(x)]) : 0;

// The port enters a long face; the duct carries on across the puck under the
// holes, which drop from the lengthwise channels it passes under. The air
// path is worked out entering the front face (-Y), then mirrored to the back.
port_back = Fitting_side == "back";
port_z = face_z - Port_drop;
port_end_y = -Puck_width / 2 + Port_depth;
hole_candidates = [for (y = long_ys) if (y - Hole_diameter / 2 >= port_end_y) y];
hole_ys = len(hole_candidates) == 0 ? []
    : [for (i = [0:min(Vacuum_holes, len(hole_candidates)) - 1]) hole_candidates[i]];
duct_end_y = len(hole_ys) > 0 ? max(hole_ys) + Duct_diameter / 2 : port_end_y;
function drill_point(d) = d / 2 / tan(drill_half_angle);
duct_depth = duct_end_y + Puck_width / 2;
hex_corner_r = Fitting_hex / sqrt(3);
fitting_low = port_z - hex_corner_r;

// The plate round the puck: its pocket, and a wall round that. Without a
// pocket the plate keeps the same margin round the puck.
rim = Pocket_clearance + Pocket_wall;
body_l = Puck_length + 2 * rim;
body_w = Puck_width + 2 * rim;
body_r = corner_r + rim;

// A notch in the plate's wall under the fitting's hex, if it's that low.
fitting_notch = fitting_low < Wing_thickness + 0.5;
notch_floor = max(0, fitting_low - 0.5);

// Screws, one in from each corner, from under the plate into the puck.
screw_xys = [for (sx = [-1, 1], sy = [-1, 1]) [sx * (Puck_length / 2 - Screw_inset), sy * (Puck_width / 2 - Screw_inset)]];
countersink_depth = (screw_head - screw_clearance) / 2;
screw_engagement = Screw_length - puck_z;
// The thread runs 0.5 mm past the screws' ends, and the hole carries on below
// it by half the screw's diameter, at least 2.5 mm: room for the tap's tapered
// lead, and what machine shops such as JLC CNC ask of a blind tapped hole.
screw_thread_depth = screw_engagement + 0.5;
screw_hole_extra = 0.5 + max(2.5, screw_d / 2);
pilot_depth = screw_engagement + screw_hole_extra;
// The holes' drill points stop at least 0.5 mm under the groove or channels.
max_screw_length = min(groove_floor, channel_floor) - screw_hole_extra - 0.5 - drill_point(screw_tap_drill);

// Router templates. A guide bushing runs in each template's openings, which
// are track_r either side of the cut's centre line, so the bit at its centre
// follows the groove's or a channel's centre line. The templates are modelled
// in use: underside on the puck's face at Z=0, skirt down round its sides.
bushing_r = Bushing_diameter / 2;
track_r = bushing_r + Bushing_clearance / 2;
template_l = Puck_length + 2 * Template_margin;
template_w = Puck_width + 2 * Template_margin;
template_r = corner_r + Template_margin;
cavity_l = Puck_length + 2 * Skirt_clearance;
cavity_w = Puck_width + 2 * Skirt_clearance;
cavity_r = corner_r + Skirt_clearance;
skirt_l = cavity_l + 2 * Skirt_wall;
skirt_w = cavity_w + 2 * Skirt_wall;
skirt_r = cavity_r + Skirt_wall;
island_r = Seal_bend_radius - track_r;
slot_web = Channel_pitch - 2 * track_r;
// How far each bit stands below the router's base, and how deep to drill the
// pilot holes through the outline template.
groove_bit_set = Template_thickness + Groove_depth;
channel_bit_set = Template_thickness + Channel_depth;
outline_pilot_depth = Outline_template_thickness + pilot_depth;

// The dogs stand in one row of table holes behind the block, a whole number
// of pitches apart and symmetric about its centre. Each wing's slot runs back
// in line with its dog, from where the knob just clears the puck's rear face.
dog_dx = Pitches_along * Hole_pitch / 2;
wing_xs = [dog_dx, -dog_dx];
slot_near = Puck_width / 2 + knob_r + Knob_clearance;
slot_far = slot_near + Slot_length;
dogs = [for (x = wing_xs) [x, Dog_distance]];
// A wing in line with the plate stops flush with its end, where the knob
// overhangs the wing's outer edge by no more than this.
max_knob_overhang = knob_r / 3;
function wing_out(x) = min(x + pad_r, max(body_l / 2, x + knob_r - max_knob_overhang));
knob_overhang = dog_dx <= body_l / 2 ? max(0, dog_dx + knob_r - wing_out(dog_dx)) : 0;

assert(Groove_width <= Cord_diameter, "The groove must be no wider than the cord, or the cord won't grip it.");
assert(Groove_depth >= Cord_diameter / 2, "The groove must be at least half the cord's diameter deep to hold it.");
assert(cord_proud >= 0.5, "The cord must stand at least 0.5 mm proud of the face to seal. Make the groove shallower.");
assert(Groove_depth + 3 <= Stock_thickness, "The groove is too deep for the puck.");
assert(Groove_width / 2 < Seal_bend_radius, "The groove's inner edge needs a corner radius: raise the seal bend radius above half the groove width.");
assert(len(long_ys) >= 1 && len(cross_xs) >= 1,
    "There's no room for channels inside the groove. Make the puck bigger, or the rim, groove, channels or land narrower.");
assert(Channel_pitch >= Channel_width + 2, "The channels must be at least 2 mm apart. Increase the channel pitch.");
assert(inside_channel_limit(long_end, max_long_y) && inside_channel_limit(max_cross_x, cross_end),
    "The channel grid's corners come too close to the groove's rounded corners. Change the channel pitch or make the seal bend radius smaller.");
assert(Channel_depth + 3 <= Stock_thickness, "The channels are too deep for the puck.");
assert(len(hole_ys) >= 1, "No vacuum hole fits between the port's end and the groove. Shorten the port or change the channel pitch.");
assert(abs(Port_offset) <= long_end, "The port's holes must fall in the lengthwise channels. Move the port toward the middle.");
assert(abs(Port_offset) + npt_major / 2 + 2 <= Puck_length / 2 - corner_r, "The port must stay 2 mm clear of the puck's rounded corners.");
assert(Port_drop >= Groove_depth + npt_major / 2 + min_port_cover,
    "The port's thread is too close to the groove above it. Increase the port drop.");
assert(port_z - npt_major / 2 >= puck_z + 2, str("The port must stay 2 mm above the puck's underside. Decrease the port drop, if the groove allows, or make the puck at least ",
    r1(Groove_depth + min_port_cover + npt_major + 2), " mm thick."));
assert(port_z + Duct_diameter / 2 + 2 <= channel_floor, "The duct must pass 2 mm under the channels. Increase the port drop or use a smaller duct.");
assert(Port_depth >= npt_thread_depth + Port_hole / 2, str("Drill the port at least ", r1(npt_thread_depth + Port_hole / 2),
    " mm deep: its ", npt_thread_depth, " mm NPT thread, and half its diameter more for the tap."));
assert(Duct_diameter <= Port_hole - 1, "The duct must be narrower than the port.");
assert(Hole_diameter <= Duct_diameter, "The vacuum holes must be no wider than the duct.");
assert(Hole_diameter <= Channel_width - 1, "The vacuum holes must be at least 1 mm narrower than the channels.");
assert(duct_end_y + drill_point(Duct_diameter) + 3 <= Puck_width / 2, "The duct must end 3 mm inside the far face.");
assert(2 * (dog_dx - knob_r) >= Knob_clearance, "The two knobs would hit each other. Put more hole pitches between the dogs.");
assert(Pocket_depth < Wing_thickness - 2, "The pocket must leave at least 2 mm of plate under the puck.");
assert(countersink_depth <= puck_z - 1, "The countersinks must leave 1 mm of plate under the puck. Use a smaller head or a thicker plate.");
assert(Screw_inset >= screw_head / 2 + 1, "The screws must sit 1 mm inside the puck's edge.");
assert(screw_engagement >= 1.5 * screw_d, str("The screws must reach at least 1.5 times their diameter, ", 1.5 * screw_d,
    " mm, into the puck. Use screws ", r1(puck_z + 1.5 * screw_d), " mm long or more."));
assert(screw_thread_depth <= 3 * screw_d, str("The screws' threads would be more than three times their diameter deep, which is hard to tap. Use screws ",
    r1(puck_z + 3 * screw_d - 0.5), " mm long or less, or a larger size."));
assert(Screw_length <= max_screw_length, str("The screws would break into the groove or channels. Use screws ", r1(max_screw_length), " mm long or less."));
assert(min([for (p = screw_xys) abs(p[0] - Port_offset)]) >= npt_major / 2 + screw_tap_drill / 2 + 2,
    "The screws would hit the port or duct. Move the port toward the middle or the screws further in.");
// The fitting's hex stands just off the puck's face, over the plate's wall,
// which is notched for it if it's lower than the plate's top.
assert(fitting_low >= 1, "The fitting's hex would hit the table. Decrease the port drop.");
// At the back, the fitting and its tube run between the wings and the knobs,
// unless they're high enough to pass over them.
assert(!port_back || fitting_low >= knob_top + Knob_clearance
        || abs(Port_offset) + hex_corner_r + Knob_clearance <= dog_dx - knob_r
            && (fitting_low >= Wing_thickness || abs(Port_offset) + hex_corner_r <= dog_dx - pad_r - Wing_fillet),
    "The fitting would hit a wing or a knob. Move the port toward the middle or put more hole pitches between the dogs.");
assert(Dog_distance >= slot_near - eps && Dog_distance <= slot_far + eps,
    str("The assembly's dogs must stand within the slots, ", slot_near, " to ", slot_far, " mm behind the block's centre. Change the dog distance."));
assert(Router_templates || !template_view, "Turn on router templates to show them.");
// The templates' checks apply only to cutting the puck with them.
if (Router_templates) {
    assert(island_r >= 0, "The groove's corners are tighter than the guide bushing can follow round the groove template's island. Use a smaller bushing or raise the seal bend radius.");
    assert(seal_w - 2 * track_r >= 10, "The groove template's island would be less than 10 mm wide. Use a smaller bushing.");
    assert(slot_web >= 3, str("The channel templates' slots would be ", r1(slot_web), " mm apart. Increase the channel pitch to ",
        ceil((2 * track_r + 3) * 2) / 2, " mm or more, or use a smaller bushing."));
    assert(max(Groove_width, Channel_width) <= Bushing_diameter - 3, "The bits must pass through the guide bushing. Use a larger bushing.");
    assert(Template_thickness >= Bushing_length + Bridge_height + 0.5,
        "The guide bushing would hit the groove template's bridges. Use a thicker template or a shorter bushing.");
    assert(Template_margin >= Skirt_clearance + Skirt_wall + 2, "The templates' plates must reach at least 2 mm past their skirts.");
    assert(Skirt_depth <= Stock_thickness - 2, "The templates' skirts must be shallower than the puck.");
}

// Legend colours as 0-255 RGB. Repeated pieces get their own colour within
// 3/255 of the legend colour, so the viewer can select each one.
puck_rgb = [220, 228, 233];
base_rgb = [208, 106, 31];
template_rgb = [46, 125, 154];
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

// The corner radius rounded_rect() uses, which must leave its sides straight.
function rect_r(l, w, r) = max(0, min(r, l / 2 - eps, w / 2 - eps));

module rounded_rect(l, w, r) {
    rr = rect_r(l, w, r);
    // A hull of corner circles rather than offset(): in openrscad-engine 0.14,
    // offset()'s output can come out wrong when something is later subtracted
    // from it.
    if (rr > 0) hull() for (x = [-1, 1] * (l / 2 - rr), y = [-1, 1] * (w / 2 - rr)) translate([x, y]) circle(r = rr);
    else square([l, w], center = true);
}

// A fillet of radius f in the corner at the origin between material along -X
// and material along -Y. It overlaps both, and its arc is a hair larger than
// f, so it crosses into them rather than touching them: a polygon's arc that
// only touches can leave a sliver that the engine meshes with a non-manifold
// edge.
module fillet_2d(f) {
    difference() {
        translate([-0.05, -0.05]) square(f + 0.05);
        translate([f, f]) circle(r = f + 0.02);
    }
}

// --- Puck ---

module groove() {
    difference() {
        rounded_rect(seal_l + Groove_width, seal_w + Groove_width, Seal_bend_radius + Groove_width / 2);
        rounded_rect(seal_l - Groove_width, seal_w - Groove_width, Seal_bend_radius - Groove_width / 2);
    }
}

// Each channel is one straight pass of the bit, with round ends. They're
// clipped to the inside of the groove, which changes nothing but makes the
// engine join them into one outline before they're extruded: extruded one by
// one, their overlapping floors can mesh with T-junctions.
module channels_2d() {
    intersection() {
        rounded_rect(inner_l, inner_w, inner_r);
        union() {
            for (y = long_ys) hull() for (x = [-1, 1] * long_end) translate([x, y]) circle(d = Channel_width);
            for (x = cross_xs) hull() for (y = [-1, 1] * cross_end) translate([x, y]) circle(d = Channel_width);
        }
    }
}

// The fitting's side: the air path and fitting are modelled at the front and
// mirrored to the back.
module on_port_side() {
    if (port_back) mirror([0, 1, 0]) children();
    else children();
}

module air_path() {
    translate([Port_offset, -Puck_width / 2 - eps, port_z]) rotate([-90, 0, 0]) {
        // The tap-drilled port, with a 45 degree chamfer at its mouth and
        // its drill point narrowing into the duct.
        cylinder(d = Port_hole, h = Port_depth + eps);
        cylinder(d1 = Port_hole + 2 * port_chamfer, d2 = Port_hole, h = port_chamfer + eps);
        translate([0, 0, Port_depth]) cylinder(d1 = Port_hole, d2 = port_tip, h = drill_point(Port_hole - port_tip));
        // The duct, on past the last hole, with its own drill point.
        cylinder(d = Duct_diameter, h = duct_depth + eps);
        translate([0, 0, duct_depth]) cylinder(d1 = Duct_diameter, d2 = 0, h = drill_point(Duct_diameter));
    }
    for (y = hole_ys) translate([Port_offset, y, port_z]) cylinder(d = Hole_diameter, h = channel_floor - port_z + eps, $fn = 24);
}

module puck() {
    difference() {
        translate([0, 0, puck_z]) linear_extrude(height = Stock_thickness) rounded_rect(Puck_length, Puck_width, corner_r);
        translate([0, 0, groove_floor]) linear_extrude(height = Groove_depth + eps) groove();
        translate([0, 0, channel_floor]) linear_extrude(height = Channel_depth + eps) channels_2d();
        on_port_side() air_path();
        for (p = screw_xys) translate([p[0], p[1], puck_z - eps]) {
            cylinder(d = screw_tap_drill, h = pilot_depth + eps, $fn = 16);
            translate([0, 0, pilot_depth + eps]) cylinder(d1 = screw_tap_drill, d2 = 0, h = drill_point(screw_tap_drill), $fn = 16);
        }
    }
}

// --- Printed base plate ---

// The wing at +X distance x: a pad-width strip along its slot, so the knob
// bears on it anywhere along it. A wing in line with the plate runs straight
// into its rear edge, square across the corner, with its inside corners
// rounded by the fillet radius. Its outer side stops flush with the plate's
// end, so long as the knob overhangs it by no more than max_knob_overhang;
// otherwise it reaches as far as that needs. A wing beyond the plate's end
// angles in to it.
module wing_2d(x) {
    f = Wing_fillet;
    hx = max(0, body_l / 2 - pad_r);
    hy = max(0, body_w / 2 - pad_r);
    sx = body_l / 2 - body_r;
    root_y = body_w / 2 - body_r;
    x_in = x - pad_r;
    x_out = x <= body_l / 2 ? wing_out(x) : x + pad_r;
    // Rounded ends on the wing's own centre line, which a trimmed outer side
    // moves inboard of the slot's.
    half = (x_out - x_in) / 2;
    hull() for (y = [slot_near, slot_far]) translate([x_in + half, y]) circle(r = half);
    if (x <= body_l / 2) {
        translate([x_in, root_y]) square([x_out - x_in, slot_near - root_y]);
        if (f > 0) {
            // The wing's inner side into the straight part of the rear edge.
            if (x_in <= sx && x_in - f >= -sx)
                translate([x_in, body_w / 2]) mirror([1, 0, 0]) fillet_2d(f);
            // Its outer side the same way; or, if it reaches past the plate's
            // end, the foot of the square across the corner into the end.
            // Flush with the end, it needs none.
            if (x_out + f <= sx)
                translate([x_out, body_w / 2]) fillet_2d(f);
            else if (x_out > body_l / 2 + eps)
                translate([body_l / 2, root_y]) mirror([0, 1, 0]) fillet_2d(min(f, x_out - body_l / 2));
        }
    } else
        hull() {
            translate([x, slot_near]) circle(r = pad_r);
            translate([hx, hy]) circle(r = pad_r);
        }
}

module wings_2d() {
    union() for (x = wing_xs) if (x >= 0) wing_2d(x); else mirror([1, 0, 0]) wing_2d(-x);
}

module base() {
    difference() {
        linear_extrude(height = Wing_thickness) {
            rounded_rect(body_l, body_w, body_r);
            wings_2d();
        }
        if (Pocket_depth > 0) translate([0, 0, puck_z]) linear_extrude(height = Pocket_depth + eps)
            rounded_rect(Puck_length + 2 * Pocket_clearance, Puck_width + 2 * Pocket_clearance, corner_r + Pocket_clearance);
        for (x = wing_xs) hull() for (y = [slot_near, slot_far])
            translate([x, y, -eps]) cylinder(d = Rod_hole, h = Wing_thickness + 2 * eps);
        // The notch under the fitting, from outside the wall to the pocket.
        if (fitting_notch) on_port_side()
            translate([Port_offset - hex_corner_r - 1, -body_w / 2 - 1, notch_floor])
                cube([2 * hex_corner_r + 2, rim - Pocket_clearance + 1 + 0.5, Wing_thickness]);
        // Clearance holes, countersunk from underneath. The cone narrows to
        // inside the hole, so its surface crosses the hole's rather than
        // meeting it edge to edge.
        for (p = screw_xys) translate([p[0], p[1], -eps]) {
            cylinder(d = screw_clearance, h = Wing_thickness + 2 * eps, $fn = 24);
            cylinder(d1 = screw_head, d2 = screw_clearance - 0.5, h = (screw_head - screw_clearance + 0.5) / 2 + eps, $fn = 24);
        }
    }
}

// --- Router templates ---

// A template's plate, Template_margin round the puck, with a skirt below it
// round the puck's sides to locate it. The callers cut its openings.
module template_blank() {
    difference() {
        translate([0, 0, -Skirt_depth]) linear_extrude(height = Skirt_depth + Template_thickness)
            rounded_rect(template_l, template_w, template_r);
        // Below the plate, only the skirt.
        translate([0, 0, -Skirt_depth - eps]) linear_extrude(height = Skirt_depth + eps) difference() {
            rounded_rect(template_l + 2, template_w + 2, template_r + 1);
            rounded_rect(skirt_l, skirt_w, skirt_r);
        }
        // The puck, inside the skirt.
        translate([0, 0, -Skirt_depth - 2 * eps]) linear_extrude(height = Skirt_depth + 2 * eps)
            rounded_rect(cavity_l, cavity_w, cavity_r);
    }
}

// The groove template's track: the groove's centre line, widened by
// track_r either way. Its outer edge is the frame and its inner edge the
// island.
module groove_track() {
    difference() {
        rounded_rect(seal_l + 2 * track_r, seal_w + 2 * track_r, Seal_bend_radius + track_r);
        rounded_rect(seal_l - 2 * track_r, seal_w - 2 * track_r, island_r);
    }
}

// The bridges across the track, one at the middle of each side, widened by
// extra.
module bridges_2d(extra = 0) {
    b = Bridge_width + extra;
    across = 2 * track_r + 2;
    union() for (s = [-1, 1]) {
        translate([0, s * seal_w / 2]) square([b, across], center = true);
        translate([s * seal_l / 2, 0]) square([across, b], center = true);
    }
}

// The track runs right through, except at the bridges, which keep the bottom
// Bridge_height of it. The cut above each bridge is a little wider than the
// bridge, so it overlaps the track's cut rather than meeting it face to face.
module groove_template() {
    difference() {
        template_blank();
        translate([0, 0, -eps]) linear_extrude(height = Template_thickness + 2 * eps) difference() {
            groove_track();
            bridges_2d();
        }
        translate([0, 0, Bridge_height]) linear_extrude(height = Template_thickness) intersection() {
            groove_track();
            bridges_2d(0.2);
        }
    }
}

// A slot for each lengthwise or crosswise channel: the bushing's path from
// one end of the channel to the other.
module channel_template(lengthwise) {
    difference() {
        template_blank();
        translate([0, 0, -eps]) linear_extrude(height = Template_thickness + 2 * eps) union() {
            if (lengthwise) for (y = long_ys) hull() for (x = [-1, 1] * long_end) translate([x, y]) circle(r = track_r);
            else for (x = cross_xs) hull() for (y = [-1, 1] * cross_end) translate([x, y]) circle(r = track_r);
        }
    }
}

// The puck's outline, with guide holes for drilling the screw holes.
module outline_template() {
    difference() {
        linear_extrude(height = Outline_template_thickness) rounded_rect(Puck_length, Puck_width, corner_r);
        for (p = screw_xys) translate([p[0], p[1], -eps])
            cylinder(d = screw_tap_drill + print_hole_allowance, h = Outline_template_thickness + 2 * eps, $fn = 16);
    }
}

// Turns a template from use to printing: face down, skirt up.
module face_down() {
    translate([0, 0, Template_thickness]) rotate([180, 0, 0]) children();
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

// Push-to-connect fitting, built along +Z out of the front face (and mirrored
// to the back by on_port_side): the thread
// inside the port, then the hex, body, release collet and a stub of tube.
module fitting() {
    hex_l = 7;
    stem_l = Fitting_projection - fitting_standoff - hex_l - 3;
    translate([Port_offset, -Puck_width / 2, port_z]) rotate([90, 0, 0]) {
        translate([0, 0, fitting_standoff - npt_length])
            cylinder(d1 = npt_major - npt_length * npt_taper, d2 = npt_major, h = npt_length);
        translate([0, 0, fitting_standoff]) cylinder(r = hex_corner_r, h = hex_l, $fn = 6);
        translate([0, 0, fitting_standoff + hex_l]) cylinder(d = 0.9 * Fitting_hex, h = stem_l);
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

// A patch of table round the block, the fitting's tube and the wings, with a
// ring of holes on the dogs' grid round them.
module table() {
    fitting_reach = Puck_width / 2 + Fitting_projection + tube_stub;
    span_x = max(body_l / 2, dog_dx + pad_r) + Hole_pitch;
    y0 = -(port_back ? body_w / 2 : fitting_reach) - Hole_pitch / 2;
    y1 = max(slot_far + pad_r, Dog_distance + pad_r, port_back ? fitting_reach : 0) + Hole_pitch / 2;
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
    paint(base_rgb) base();
    translate([0, 0, 0.6 * explode]) {
        paint(puck_rgb) puck();
        on_port_side() translate([0, -0.8 * explode, 0]) paint(fitting_rgb) fitting();
    }
    translate([0, 0, -0.8 * explode]) paint(table_rgb) table();
    translate([0, 0, 1.2 * explode]) paint(cord_rgb) cord();
    for (i = [0:1]) {
        p = dogs[i];
        translate([p[0], p[1], Wing_thickness + 0.5 * explode]) paint(shade(top_knob_rgb, i)) top_knob();
        translate([p[0], p[1], rod_bottom + 0.9 * explode]) paint(shade(rod_rgb, i))
            cylinder(d = rod_d, h = rod_top - rod_bottom, $fn = 16);
        translate([p[0], p[1], bottom_knob_z - 1.3 * explode]) paint(shade(bottom_knob_rgb, i)) bottom_knob();
    }
}

port_face = port_back ? "back" : "front";
echo(str("Vacuum face: ", r1(face_z), " mm above the table (", Stock_thickness, " mm puck on ", r1(puck_z), " mm of plate), ",
    face_z >= knob_top ? str(r1(face_z - knob_top), " mm above the dog knobs' tops, so work can overhang the back")
        : str(r1(knob_top - face_z), " mm below the dog knobs' tops, so keep work off the back"), "."));
echo(str("Puck: ", Puck_length, " x ", Puck_width, " mm with ", r1(corner_r), " mm corner radii, ", Stock_thickness, " mm thick."));
echo(str("Seal: rout the groove ", Groove_depth, " mm deep with a ", Groove_width, " mm straight bit, its centre line ", r1(seal_inset),
    " mm in from the edge. Cut ", round(cord_length), " mm of ", Cord_diameter, " mm foam cord and join its ends with CA glue, cut at 45 degrees. It stands ",
    round(cord_proud * 100) / 100, " mm proud."));
echo(str("Channels: rout ", len(long_ys), " lengthwise and ", len(cross_xs), " crosswise at ", Channel_pitch, " mm centres, ",
    Channel_depth, " mm deep with a ", Channel_width, " mm straight bit. The lengthwise ones run ", r1(2 * long_end),
    " mm between the bit's end positions, the crosswise ones ", r1(2 * cross_end), " mm."));
echo(str("Port: drill ", Port_hole, " mm, ", Port_depth, " mm deep into the ", port_face, " face, ", r1(port_z - puck_z),
    " mm up from the puck's underside", Port_offset != 0 ? str(" and ", Port_offset, " mm off centre") : " on the centre line",
    ", and tap it 1/4\" NPT, ", npt_thread_depth, " mm deep."));
echo(str("Duct: drill ", Duct_diameter, " mm on through the port, ", r1(duct_depth), " mm deep from the ", port_face, " face. Holes: drill ",
    len(hole_ys), " x ", Hole_diameter, " mm down from the channel floor to meet it, ",
    join([for (y = hole_ys) r1(y + Puck_width / 2)]), " mm from the ", port_face, " face."));
echo(str("Screws: four ", Screw_size, " countersunk screws ", Screw_length, " mm long (", r1(max_screw_length), " mm at most), up through the plate into the puck. Drill ",
    screw_tap_drill, " mm holes ", r1(pilot_depth), " mm deep, ", Screw_inset, " mm in from the puck's sides and ends, and tap them ", Screw_size, " ",
    r1(screw_thread_depth), " mm deep."));
echo(str("Dogs: ", 2 * dog_dx, " mm apart (", Pitches_along, " pitch", Pitches_along > 1 ? "es" : "",
    "), in a row ", r1(slot_near), Slot_length > 0 ? str(" to ", r1(slot_far)) : "",
    " mm behind the block's centre", Slot_length >= Hole_pitch ? ": with the next row of holes, the block can sit anywhere front to back" : "",
    ". Each clamps ", Table_thickness + Wing_thickness, " mm (table + wing) between its knobs",
    knob_overhang > 0 ? str(", and its top knob overhangs the wing's outer edge",
        wing_out(dog_dx) <= body_l / 2 + eps ? ", flush with the plate's end," : "", " by ", r1(knob_overhang), " mm") : "",
    "."));
if (Router_templates) {
    echo(str("Outline template: rough-cut the blank 2 to 3 mm oversize, tape the template to its underside and trim it with a pattern or flush-trim bit that cuts at least ",
        Stock_thickness, " mm deep. Then drill the screws' ", screw_tap_drill, " mm holes through the template's guide holes, ", r1(outline_pilot_depth),
        " mm deep from its face, before taking it off."));
    echo(str("Groove template: drop it over the puck's face, located by its skirt, and tape it down, with tape under its island too. With a ",
        Bushing_diameter, " mm guide bushing, set the ", Groove_width, " mm bit ", r1(groove_bit_set),
        " mm below the router's base and rout round the track. The bit cuts the four bridges that hold the island as it passes."));
    echo(str("Channel templates: drop each over the puck in turn and tape it down. Set the ", Channel_width, " mm bit ", r1(channel_bit_set),
        " mm below the base and rout each slot from end to end."));
    echo(str("Templates: the groove and channel templates are ", r1(template_l), " x ", r1(template_w), " mm, ", Template_thickness,
        " mm thick with a skirt ", Skirt_depth, " mm deep, and the outline template is ", Outline_template_thickness,
        " mm thick. Print them as modelled, with no supports."));
}
// The puck's features, for scripts/export-vacuum-puck-step.py, which rebuilds
// it as a STEP solid for CNC machining. Heights are from the puck's underside,
// and rectangles are [length, width, corner radius], centred on the origin.
// Each channel is a bit's path [x0, y0, x1, y1]. The air path is given
// entering the front face (-Y), as air_path() models it, and is mirrored to
// the back when mirror_y is true.
echo("PUCK_STEP_V1", [
    ["body", [Puck_length, Puck_width, rect_r(Puck_length, Puck_width, corner_r)]],
    ["thickness", Stock_thickness],
    ["groove_outer", let(l = seal_l + Groove_width, w = seal_w + Groove_width) [l, w, rect_r(l, w, Seal_bend_radius + Groove_width / 2)]],
    ["groove_inner", let(l = seal_l - Groove_width, w = seal_w - Groove_width) [l, w, rect_r(l, w, Seal_bend_radius - Groove_width / 2)]],
    ["groove_depth", Groove_depth],
    ["channel_clip", [inner_l, inner_w, rect_r(inner_l, inner_w, inner_r)]],
    ["channel_width", Channel_width],
    ["channel_depth", Channel_depth],
    ["channels", concat([for (y = long_ys) [-long_end, y, long_end, y]], [for (x = cross_xs) [x, -cross_end, x, cross_end]])],
    ["mirror_y", port_back],
    ["port_x", Port_offset],
    ["port_z", port_z - puck_z],
    ["port_hole", Port_hole],
    ["port_depth", Port_depth],
    ["port_thread", npt_name],
    ["port_thread_depth", npt_thread_depth],
    ["port_chamfer", port_chamfer],
    ["port_tip", port_tip],
    ["duct_diameter", Duct_diameter],
    ["duct_depth", duct_depth],
    ["hole_diameter", Hole_diameter],
    ["hole_ys", hole_ys],
    ["hole_top", channel_floor - puck_z],
    ["pilot_diameter", screw_tap_drill],
    ["pilot_depth", pilot_depth],
    ["screw_thread", str(Screw_size, "x", screw_pitch)],
    ["screw_thread_depth", screw_thread_depth],
    ["pilots", screw_xys],
    ["drill_half_angle", drill_half_angle]
]);
echo("PIECES_V1", [
    for (i = [0:1]) each [
        [hex_color(shade(top_knob_rgb, i)), str("Top knob ", i + 1)],
        [hex_color(shade(bottom_knob_rgb, i)), str("Bottom knob ", i + 1)],
        [hex_color(shade(rod_rgb, i)), str("M6 rod ", i + 1)]
    ]
]);

if (assembly) assembly();
else if (View == "puck") paint(puck_rgb) translate([0, 0, -puck_z]) puck();
else if (View == "base") paint(base_rgb) base();
else if (View == "outline_template") paint(template_rgb) outline_template();
else if (View == "groove_template") paint(template_rgb) face_down() groove_template();
else paint(template_rgb) face_down() channel_template(View == "long_template");
