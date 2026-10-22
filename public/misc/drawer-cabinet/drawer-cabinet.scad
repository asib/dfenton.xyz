// Drawer cabinet — a frameless plywood case with a single column of inset
// drawers running on wooden runners. Drawer 1 is the top drawer.
// Inputs are inches; geometry and STL exports are millimetres.
// Origin is the case's front-bottom-left corner: X across the width,
// Y from the front face (Y=0) towards the back, Z up.

/* [Carcass] */
// Outside width of the case.
Width = 24; // [8:96]
// Outside height of the case.
Height = 30; // [6:96]
// Outside depth of the case, including the back panel.
Depth = 18; // [6:36]
// Plywood thickness for the sides, top and bottom.
Case_thickness = 0.75; // [0.25:1.5]
// How the top and bottom meet the sides. Butt joints suit screws or pocket screws; rabbets house the panels in the side ends.
Case_joinery = "rabbet"; // [butt:Butt joints between the sides, rabbet:Top and bottom in side rabbets]
// Back panel thickness. It sits in rabbets along the back of both sides and covers the back edges of the top and bottom.
Back_thickness = 0.25; // [0.125:0.75]
// Depth of each back rabbet into the side, measured across the side's thickness.
Back_rabbet_width = 0.375; // [0.0625:1.25]

/* [Drawer layout] */
// One row per drawer in the single column, top drawer first. Front height is the inset front; 0 shares the remaining opening equally with the other 0-height drawers. Depth is the box depth from the front face; 0 fills the case less the back clearance.
Drawers = [[5, 0], [6, 0], [0, 0], [0, 0]]; // [list:1:] Drawer | Front height:0:96, Depth:0:36
// Gap around each inset front: above, between and beside the drawers. Side-hung drawers also get the gap below the bottom drawer.
Reveal = 0.0625; // [0:0.25]
// Space left behind drawers with automatic depth. Zero lets the back panel act as the drawer stop.
Back_clearance = 0; // [0:6]

/* [Drawer boxes] */
// Butt-jointed box: glue with screws, pocket screws or brads. Fasteners are not modelled.
Box_construction = "front_back_overlap"; // [sides_overlap:Sides full length / bottom nailed under, front_back_overlap:Front and back full width / bottom nailed under, sides_overlap_groove:Sides full length / bottom in a groove]
// Integral drawer front; it is the inset face seen in the opening.
Front_thickness = 0.75; // [0.25:1.5]
// Drawer side thickness.
Side_thickness = 0.5; // [0.25:1]
// Drawer back thickness.
Box_back_thickness = 0.5; // [0.25:1]
// Drawer bottom thickness.
Bottom_thickness = 0.25; // [0.125:0.75]
// Bottom groove depth into the sides and front. Grooved bottoms only.
Groove_depth = 0.25; // [0.0625:0.5]
// Height of the bottom groove above the box underside. Grooved bottoms only.
Groove_offset = 0.25; // [0.0625:2]

/* [Runners] */
// Strips and dadoed strips carry each drawer on its underside, and the strip above stops it tipping. The bottom drawer runs on the case bottom. Side-hung drawers ride on strips engaging grooves in their sides.
Runner_style = "strip"; // [strip:Strips screwed to the case sides, dado:Strips housed in case-side dados, side_hung:Side-hung in drawer-side grooves]
// Vertical size of each runner strip.
Runner_height = 0.75; // [0.25:2]
// How far a supporting strip projects from the case side. Strip and dado runners only.
Runner_width = 0.75; // [0.125:2]
// Dado depth into the case side; the strip is this much wider. Dado runners only.
Runner_dado_depth = 0.25; // [0.0625:0.75]
// Groove depth in each drawer side for side-hung runners.
Hang_groove_depth = 0.25; // [0.0625:0.75]
// Running clearance: below the strip above a supported drawer, and around a side-hung strip in its groove.
Runner_clearance = 0.03125; // [0:0.125]

/* [Inspection] */
// Separation in percent: 0 assembles the cabinet; 100 opens the case and slides the drawers clear; 200 also takes the drawers apart. A single drawer separates from 0. Part sizes stay fixed.
Explosion_percent = 0; // [0:5:200]
// Show the complete cabinet, the case with its runners, or one drawer for inspection and a separate STL export.
Part = "all"; // [all:Complete cabinet, carcass:Case and runners, drawer:One drawer]
// Drawer shown when Part is One drawer; 1 is the top drawer.
Inspect_drawer = 1;

/* [Hidden] */
inch = 25.4;
eps = 0.01 / inch; // Boolean-tool overrun, 0.01 mm.
N = len(Drawers);
t = Case_thickness;
end_rabbet = t / 2; // Side-end rabbet depth when the top and bottom are housed.
inner_w = Width - 2 * t;
inner_h = Height - 2 * t;
inner_d = Depth - Back_thickness; // Front face to the back panel.
supported = Runner_style != "side_hung";
dadoed = Runner_style == "dado";
under_bottom = Box_construction != "sides_overlap_groove";

function sumv(v, i = 0) = i >= len(v) ? 0 : v[i] + sumv(v, i + 1);

height_inputs = [for (row = Drawers) row[0]];
depth_inputs = [for (row = Drawers) row[1]];
// Supported drawers have a reveal above each front; side-hung drawers also have one below the bottom drawer.
reveal_count = supported ? N : N + 1;
front_space = inner_h - reveal_count * Reveal;
fixed_height = sumv([for (i = [0:N-1]) height_inputs[i]]);
auto_count = len([for (i = [0:N-1]) if (height_inputs[i] == 0) 1]);
auto_height = auto_count > 0 ? (front_space - fixed_height) / auto_count : 0;
front_h = [for (i = [0:N-1]) height_inputs[i] > 0 ? height_inputs[i] : auto_height];
// Front bottoms measured from the case bottom's top surface (interior floor).
base = supported ? 0 : Reveal;
front_z = [for (i = [0:N-1]) base + sumv([for (j = [i+1:1:N-1]) front_h[j]]) + (N - 1 - i) * Reveal];
full_depth = inner_d - Back_clearance;
box_d = [for (i = [0:N-1]) depth_inputs[i] > 0 ? depth_inputs[i] : full_depth];
box_w = inner_w - 2 * Reveal;
// Box side height: supported drawers stop below the runner strip that carries the drawer above.
box_h = [for (i = [0:N-1])
    !supported ? front_h[i] :
    min(front_h[i], (i == 0 ? inner_h : front_z[i-1] - Runner_height) - Runner_clearance - front_z[i])];
// Side extent above the box underside, and the side-hung groove centred on it.
side_lo = under_bottom ? Bottom_thickness : 0;
hang_groove_h = Runner_height + Runner_clearance;
hang_center = [for (i = [0:N-1]) (side_lo + box_h[i]) / 2];
runner_reach = supported ? Runner_width : Reveal + Hang_groove_depth - Runner_clearance;
dado_depth = dadoed ? Runner_dado_depth : 0;

// Inches to the nearest 1/64 with an inch mark; "≈" marks values that are not exact 64ths.
function frac(x) = let(sign = x < 0 ? "-" : "", a = abs(x), w = floor(a + 1/128),
    n = round((a - w) * 64), g = gcd(n, 64), approx = abs(a - w - n / 64) > 1e-6)
    str(approx ? "≈" : "", sign, n == 0 ? str(w) : w == 0 ? str(n/g, "/", 64/g) : str(w, " ", n/g, "/", 64/g), "″");
function gcd(a, b) = b == 0 ? a : gcd(b, a % b);

assert(Width >= 8 && Width <= 96 && Height >= 6 && Height <= 96 && Depth >= 6 && Depth <= 36,
    "Case must be 8–96 inches wide, 6–96 tall and 6–36 deep.");
assert(t >= 0.25 && t <= 1.5, "Case thickness must be between 1/4 and 1 1/2 inches.");
assert(Case_joinery == "butt" || Case_joinery == "rabbet", "Choose a case joint.");
assert(Back_thickness >= 0.125 && Back_thickness <= 0.75 && Back_thickness < Depth / 2,
    "Back thickness must be between 1/8 and 3/4 inch.");
assert(Back_rabbet_width > 0 && Back_rabbet_width < t, "Back rabbet width must be less than the case thickness.");
assert(is_list(Drawers) && N >= 1 && len([for (row = Drawers) if (!(is_list(row) && len(row) == 2 && is_num(row[0]) && is_num(row[1]))) 1]) == 0,
    "Each drawer needs a front height and a depth.");
assert(Reveal >= 0 && Reveal <= 0.25, "Reveal must be between 0 and 1/4 inch.");
assert(Back_clearance >= 0, "Back clearance cannot be negative.");
assert(Box_construction == "sides_overlap" || Box_construction == "front_back_overlap" ||
    Box_construction == "sides_overlap_groove", "Choose a drawer box construction.");
assert(Runner_style == "strip" || Runner_style == "dado" || Runner_style == "side_hung", "Choose a runner style.");
assert(Runner_height > 0 && Runner_width > 0 && Runner_clearance >= 0, "Runner sizes must be positive.");
assert(min([for (i = [0:N-1]) height_inputs[i]]) >= 0, "Drawer heights cannot be negative.");
assert(min([for (i = [0:N-1]) depth_inputs[i]]) >= 0, "Drawer depths cannot be negative.");
assert(auto_count > 0 || abs(fixed_height - front_space) < 1e-6,
    str("With every drawer height set, the fronts must total ", frac(front_space),
        " (they total ", frac(fixed_height), "). Set one drawer to 0 to take up the difference."));
assert(auto_count == 0 || auto_height >= 1,
    str("The set drawer heights leave ", frac(front_space - fixed_height), " for ", auto_count,
        auto_count == 1 ? " drawer" : " drawers", " set to 0; each needs at least 1″. Reduce a set height or the drawer count."));
assert(box_w > 2 * Side_thickness + 1, "The case is too narrow for the drawer sides.");
assert(full_depth >= Front_thickness + Box_back_thickness + 1, "Back clearance leaves too little drawer depth.");
for (i = [0:N-1]) {
    assert(box_d[i] <= full_depth + 1e-6,
        str("Drawer ", i + 1, " depth exceeds the ", frac(full_depth), " available behind the front."));
    assert(box_d[i] >= Front_thickness + Box_back_thickness + 1, str("Drawer ", i + 1, " is too shallow."));
    assert(box_h[i] >= side_lo + (under_bottom ? 0 : Groove_offset + Bottom_thickness) + 0.5,
        str("Drawer ", i + 1, " leaves its sides only ", frac(box_h[i]),
            " tall below the runner above. Increase its height or reduce the runner height."));
}
assert(!supported || Runner_width > Reveal, "Supporting runners must project past the reveal to carry the drawer.");
assert(!dadoed || Runner_dado_depth < t, "Runner dados must be shallower than the case thickness.");
assert(supported || (Hang_groove_depth > Runner_clearance && Hang_groove_depth < Side_thickness),
    "Side-hung grooves must be deeper than the clearance and shallower than the drawer sides.");
assert(supported || min([for (i = [0:N-1]) box_h[i] - side_lo - hang_groove_h]) >= 0.25,
    "Side-hung grooves need at least 1/4 inch of side material above and below them.");
assert(under_bottom || (Groove_depth < Side_thickness && Groove_depth < Front_thickness &&
    Groove_offset + Bottom_thickness < min(box_h)),
    "The bottom groove must fit inside the drawer sides and front.");
assert(under_bottom || supported || Groove_depth + Hang_groove_depth < Side_thickness ||
    min([for (i = [0:N-1]) hang_center[i] - hang_groove_h / 2 - Groove_offset - Bottom_thickness]) > 0,
    "The bottom and runner grooves overlap through the drawer side.");
assert(is_num(Explosion_percent) && Explosion_percent >= 0 && Explosion_percent <= 200,
    "Explosion must be between 0 and 200 percent.");
assert(Part == "all" || Part == "carcass" || Part == "drawer", "Choose a part to show.");
assert(Part != "drawer" || (Inspect_drawer >= 1 && Inspect_drawer <= N && floor(Inspect_drawer) == Inspect_drawer),
    str("Choose a drawer from 1 to ", N, "."));

// Colors identify physical members; alternate drawers use paired hues so
// adjacent drawers stay distinguishable.
case_colors = ["#2c78b5", "#3998a5", "#5d6b7c", "#7a6f4e", "#9a8f80"]; // left, right, top, bottom, back
// Legend colors as 0-255 RGB. Pieces sharing a legend color get their own
// source color within 3/255 of it, so the viewer can select each one while
// showing the legend color.
runner_rgb = [47, 122, 79];
front_rgb = [[184, 121, 36], [182, 72, 59]];
side_rgb = [[174, 104, 157], [112, 101, 175]];
back_rgb = [[149, 109, 112], [93, 124, 146]];
bottom_rgb = [[138, 138, 58], [71, 133, 109]];
// Piece k of a legend color: base-7 digits of k nudge red, green and blue by
// 0, +1, -1, +2, -2, +3 or -3, giving 343 distinct pieces within 3/255.
function shade(base, k) = [for (c = [0:2]) let(d = [0, 1, -1, 2, -2, 3, -3][floor(k / pow(7, c)) % 7])
    base[c] + (base[c] + d < 0 || base[c] + d > 255 ? -d : d)];
function hex2(n) = str("0123456789abcdef"[floor(n / 16)], "0123456789abcdef"[n % 16]);
function hex_color(c) = str("#", hex2(c[0]), hex2(c[1]), hex2(c[2]));
function runner_rgb_of(i, right) = shade(runner_rgb, 2 * i + (right ? 1 : 0));

echo(str("Case: ", frac(Width), " wide x ", frac(Height), " tall x ", frac(Depth), " deep"));
echo(str("Opening: ", frac(inner_w), " x ", frac(inner_h), "; ", frac(inner_d), " to the back panel"));
for (i = [0:N-1]) echo(str("Drawer ", i + 1, ": front ", frac(box_w), " x ", frac(front_h[i]),
    "; box ", frac(box_w), " wide x ", frac(box_d[i]), " deep, sides ", frac(box_h[i] - side_lo), " tall"));

module box(lo, hi) {
    // Convert before boolean operations: the engine's tolerances suit millimetres.
    translate(lo * inch) cube((hi - lo) * inch);
}

// Case parts, in place.
// X interval cutting into a case side from its inside face.
function into_side(right, depth) = right ? [Width - t - eps, Width - t + depth] : [t - depth, t + eps];
module case_side(right) {
    x0 = right ? Width - t : 0;
    difference() {
        box([x0, 0, 0], [x0 + t, Depth, Height]);
        // Back rabbet, through the full height.
        let(x = into_side(right, Back_rabbet_width))
            box([x[0], inner_d, -eps], [x[1], Depth + eps, Height + eps]);
        // End rabbets stop at the back rabbet; the back panel covers the panels' back edges.
        if (Case_joinery == "rabbet") for (z = [[-eps, t], [Height - t, Height + eps]])
            let(x = into_side(right, end_rabbet)) box([x[0], -eps, z[0]], [x[1], inner_d, z[1]]);
        // Stopped runner dados, hidden behind the drawer fronts.
        if (dadoed) for (i = [0:1:N-2])
            let(x = into_side(right, dado_depth))
                box([x[0], Front_thickness, t + front_z[i] - Runner_height], [x[1], inner_d, t + front_z[i]]);
    }
}
module case_panel(top) {
    overlap = Case_joinery == "rabbet" ? end_rabbet : 0;
    z = top ? Height - t : 0;
    box([t - overlap, 0, z], [Width - t + overlap, inner_d, z + t]);
}
module case_back() box([t - Back_rabbet_width, inner_d, 0], [Width - t + Back_rabbet_width, Depth, Height]);

// Bearing height of drawer i's runners: a supported drawer's underside rests on
// the strip top; a side-hung drawer's groove ceiling rests on it.
function runner_top(i) = t + front_z[i] + (supported ? 0 : hang_center[i] + hang_groove_h / 2);
// Runner strips for drawer i (0 = top); left and right.
module runner(i, right) {
    y = [Front_thickness, inner_d];
    z = [runner_top(i) - Runner_height, runner_top(i)];
    if (right) box([Width - t - runner_reach, y[0], z[0]], [Width - t + dado_depth, y[1], z[1]]);
    else box([t - dado_depth, y[0], z[0]], [t + runner_reach, y[1], z[1]]);
}
runner_drawers = supported ? [for (i = [0:1:N-2]) i] : [for (i = [0:N-1]) i];

// Drawer i in local coordinates: front face at Y=0, underside at Z=0, left side at X=0.
// Members are listed as [name, lo, hi]; grooves are subtracted afterwards.
function drawer_members(i) = let(
    w = box_w, d = box_d[i], h = box_h[i], fh = front_h[i],
    tf = Front_thickness, ts = Side_thickness, tk = Box_back_thickness, tb = Bottom_thickness,
    g = Groove_depth, o = Groove_offset)
    Box_construction == "sides_overlap" ? [
        ["bottom", [0, 0, 0], [w, d, tb]],
        ["front", [ts, 0, tb], [w - ts, tf, fh]],
        ["left", [0, 0, tb], [ts, d, h]],
        ["right", [w - ts, 0, tb], [w, d, h]],
        ["back", [ts, d - tk, tb], [w - ts, d, h]]] :
    Box_construction == "front_back_overlap" ? [
        ["bottom", [0, 0, 0], [w, d, tb]],
        ["front", [0, 0, tb], [w, tf, fh]],
        ["left", [0, tf, tb], [ts, d - tk, h]],
        ["right", [w - ts, tf, tb], [w, d - tk, h]],
        ["back", [0, d - tk, tb], [w, d, h]]] : [
        ["bottom", [ts - g, tf - g, o], [w - ts + g, d, o + tb]],
        ["front", [ts, 0, 0], [w - ts, tf, fh]],
        ["left", [0, 0, 0], [ts, d, h]],
        ["right", [w - ts, 0, 0], [w, d, h]],
        ["back", [ts, d - tk, o + tb], [w - ts, d, h]]];

// Alternate drawers alternate legend colors; drawers sharing one are distinct pieces.
function member_rgb(name, i) = let(k = i % 2, n = floor(i / 2))
    name == "front" ? shade(front_rgb[k], n) : name == "back" ? shade(back_rgb[k], n) :
    name == "bottom" ? shade(bottom_rgb[k], n) : shade(side_rgb[k], 2 * n + (name == "right" ? 1 : 0));

module drawer_member(i, m) {
    w = box_w; d = box_d[i]; tf = Front_thickness; ts = Side_thickness;
    g = Groove_depth; o = Groove_offset; tb = Bottom_thickness;
    difference() {
        box(m[1], m[2]);
        if (!under_bottom && m[0] != "bottom" && m[0] != "back")
            box([ts - g, tf - g, o], [w - ts + g, d + eps, o + tb]);
        if (!supported) for (x = [[-eps, Hang_groove_depth], [w - Hang_groove_depth, w + eps]])
            box([x[0], tf, hang_center[i] - hang_groove_h / 2], [x[1], d + eps, hang_center[i] + hang_groove_h / 2]);
    }
}

// Exploded offsets in inches at 100 percent.
case_offsets = [[-4, 0, 0], [4, 0, 0], [0, 0, 4], [0, 0, -4], [0, 4, 0]];
function member_offset(name) =
    name == "front" ? [0, -1.5, 0] : name == "back" ? [0, 1.5, 0] : name == "bottom" ? [0, 0, -1.5] :
    name == "left" ? [-1.5, 0, 0] : [1.5, 0, 0];

module drawer(i, e) {
    for (m = drawer_members(i))
        color(member_rgb(m[0], i) / 255) translate(member_offset(m[0]) * e * inch) drawer_member(i, m);
}
module carcass(e) {
    color(case_colors[0]) translate(case_offsets[0] * e * inch) case_side(false);
    color(case_colors[1]) translate(case_offsets[1] * e * inch) case_side(true);
    color(case_colors[2]) translate(case_offsets[2] * e * inch) case_panel(true);
    color(case_colors[3]) translate(case_offsets[3] * e * inch) case_panel(false);
    color(case_colors[4]) translate(case_offsets[4] * e * inch) case_back();
    // Runners move half as far as their side, exposing the seat or dado.
    for (i = runner_drawers) for (right = [false, true]) color(runner_rgb_of(i, right) / 255)
        translate(case_offsets[right ? 1 : 0] * e / 2 * inch) runner(i, right);
}
module cabinet(e) {
    carcass(e);
    // Up to 100 percent the case opens and the drawers slide out whole until they clear it;
    // beyond that the drawers spread apart vertically and their own parts separate.
    slide = min(e, 1);
    spread = max(e - 1, 0);
    for (i = [0:N-1])
        translate([t + Reveal, -(max(box_d) + 3) * slide, t + front_z[i] + 3 * (N - 1 - i) * spread] * inch)
            drawer(i, spread);
}

// ---------------------------------------------------------------------------
// Dimensioned drawings for the private $misc_drawing pass. Witnesses are model
// inches; dp() converts them to whole millimetres plus millionths so inch
// fractions survive echo's six significant digits.
function dp(p) = [for (n = p * inch) [floor(n), round((n - floor(n)) * 1000000)]];
function dim(label, a, b, direction, side, tier = 1) = [label, dp(a), dp(b), direction, side, tier];
function guide(a, b) = [dp(a), dp(b)];
function section(depth, crop, breaks = [], notes = [], contacts = []) =
    [dp([depth, 0, 0])[0], [for (n = crop) dp([n, 0, 0])[0]], breaks, notes, contacts];
function join(v, i = 0) = i >= len(v) ? "" : str(i > 0 ? ", " : "", v[i], join(v, i + 1));

FRONT = [[1, 0, 0], [0, 0, 1], [0, -1, 0]]; // Looking at the front face.
TOP = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];    // Looking down; the back is at the top.
RIGHT = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];  // From +X; the front is at the left.
LEFT = [[0, -1, 0], [0, 0, 1], [-1, 0, 0]]; // From -X; the front is at the right.
FLAT = [[0, 0, 1], [0, -1, 0], [1, 0, 0]];  // From +X, laid flat: bottom edge at the left, front edge up.

// Every physical piece gets its own drawing color (exact binary fractions) so a
// part sheet can select exactly one mesh: case 0-4, then two runners and five
// members per drawer. Sixteenths per channel allow 4096 pieces.
function pc(p) = [(p % 16) / 16, (floor(p / 16) % 16) / 16, floor(p / 256) / 16];
function runner_piece(i, right) = 5 + 2 * i + (right ? 1 : 0);
function member_piece(i, m) = 5 + 2 * N + 5 * i + m;
function drawer_origin(i) = [t + Reveal, 0, t + front_z[i]];

module drawing_cabinet() {
    color(pc(0)) case_side(false);
    color(pc(1)) case_side(true);
    color(pc(2)) case_panel(true);
    color(pc(3)) case_panel(false);
    color(pc(4)) case_back();
    for (i = runner_drawers) for (right = [false, true]) color(pc(runner_piece(i, right))) runner(i, right);
    for (i = [0:N-1]) let(members = drawer_members(i)) for (m = [0:4])
        color(pc(member_piece(i, m))) translate(drawer_origin(i) * inch) drawer_member(i, members[m]);
}

// Assembly views.
assembly_views = [
    ["front", "Front / D1 is the top drawer", FRONT, concat([
        dim("Overall width", [0, 0, Height], [Width, 0, Height], "horizontal", 1),
        dim("Opening width", [t, 0, 0], [Width - t, 0, 0], "horizontal", -1),
        dim("Overall height", [0, 0, 0], [0, 0, Height], "vertical", -1, 2),
        dim("Opening height", [0, 0, t], [0, 0, Height - t], "vertical", -1)],
        [for (i = [0:N-1]) dim(str("D", i + 1), [Width, 0, t + front_z[i]], [Width, 0, t + front_z[i] + front_h[i]], "vertical", 1)])],
    ["top", "Top", TOP, [dim("Overall depth", [0, 0, Height], [0, Depth, Height], "vertical", -1)]],
    ["right", "Right end", RIGHT, [dim("Overall depth", [Width, 0, 0], [Width, Depth, 0], "horizontal", -1)]]
];

// Runner detail: sections at the left runner carrying drawer 1, or under a lone drawer.
two = N >= 2;
bearing_z = runner_top(0);
section_y = Front_thickness + (min(box_d) - Front_thickness - Box_back_thickness) / 2;
section_x = t + Reveal + (supported ? min(0.4 * Side_thickness, (Runner_width - Reveal) / 2) : Hang_groove_depth / 2);
detail_v = [supported && !two ? -0.25 : bearing_z - Runner_height - 1, bearing_z + (supported ? 1.5 : 1)];
detail_breaks = supported && !two ? ["top", "right"] : ["top", "bottom", "right"];
transverse_u = [-0.25, t + max(runner_reach, Reveal + Side_thickness) + 1];
bearing_x = !supported ? t + runner_reach :
    two ? (under_bottom ? t + Runner_width : t + min(Runner_width, Reveal + Side_thickness)) :
    (under_bottom ? transverse_u[1] : t + Reveal + Side_thickness);
lower_clearance = two && supported ? bearing_z - Runner_height - (t + front_z[1] + box_h[1]) : 0;
joint_views = let(y = section_y, x = section_x, z = bearing_z, rh = Runner_height) [
    ["joint-longitudinal", "A-A / Along the drawer side", RIGHT, concat(
        two || !supported ? [dim("Runner start", [x, 0, z], [x, Front_thickness, z], "horizontal", -1)]
                          : [dim("Case bottom", [x, 0, 0], [x, 0, t], "vertical", -1)]),
     section(x, [-0.25, detail_v[0], Front_thickness + 3, detail_v[1]], detail_breaks,
        [two || !supported ? "Runners start behind the drawer fronts." : "The drawer runs on the case bottom.",
         Back_clearance == 0 ? "The back panel stops the drawers." : "Fit drawer stops; none are modelled."],
        [guide([x, two || !supported ? Front_thickness : 0, z], [x, Front_thickness + 3, z])])],
    ["joint-transverse", "B-B / Across the runner", FRONT, concat(
        [dim("Case side", [0, y, detail_v[1]], [t, y, detail_v[1]], "horizontal", 1)],
        Reveal > 0 ? [dim("Reveal", [t, y, z], [t + Reveal, y, z], "horizontal", 1, 2)] : [],
        !supported ? [
            dim("Runner reach", [t, y, z - rh], [t + runner_reach, y, z - rh], "horizontal", -1),
            dim("Groove depth", [t + Reveal, y, z], [t + Reveal + Hang_groove_depth, y, z], "horizontal", -1, 2),
            dim("Runner height", [t, y, z - rh], [t, y, z], "vertical", -1),
            dim("Groove height", [t + Reveal + Hang_groove_depth, y, z - hang_groove_h], [t + Reveal + Hang_groove_depth, y, z], "vertical", 1)] :
        two ? concat([
            dim(dadoed ? "Runner width" : "Runner projection", [t - dado_depth, y, z - rh], [t + Runner_width, y, z - rh], "horizontal", -1),
            dim("Runner height", [t, y, z - rh], [t, y, z], "vertical", -1)],
            dadoed ? [dim("Dado depth", [t - dado_depth, y, z], [t, y, z], "horizontal", -1, 2)] : [],
            lower_clearance > 1e-6 ? [dim("Clearance", [t + Reveal, y, z - rh - lower_clearance], [t + Reveal, y, z - rh], "vertical", 1)] : []) :
        [dim("Case bottom", [0, y, 0], [0, y, t], "vertical", -1)]),
     section(-y, [transverse_u[0], detail_v[0], transverse_u[1], detail_v[1]], detail_breaks,
        !supported ? [str("Runner ", frac(rh), " x ", frac(runner_reach), ", screwed to the case side."),
                      str("It stops ", frac(Runner_clearance), " short of the groove floor.")] :
        two ? [str("Runner ", frac(rh), " x ", frac(Runner_width + dado_depth),
                   dadoed ? str(", glued into a ", frac(dado_depth), " dado.") : ", screwed to the case side."),
               str("Drawer 2 clears the runner above by ", frac(lower_clearance), ".")] :
        ["A single drawer needs no runners."],
        [guide([t + Reveal, y, z], [bearing_x, y, z])])]
];
joint_caption = [
    supported && !two ? "Drawer support detail" : "Runner detail",
    str("Enlarged sections through the left ", supported && !two ? "case bottom under drawer 1" :
        two && supported ? "runner between drawers 1 and 2" : "runner of drawer 1",
        ". Hatching distinguishes parts; the right side is mirrored."),
    !supported ? "Groove top bears on the runner; the drawer hangs." :
    two ? "Drawer underside bears on the runner top." : "Drawer underside runs on the case bottom."];

// Part sheets.
runner_tops = [for (k = [len(runner_drawers) - 1:-1:0]) runner_top(runner_drawers[k])]; // Ascending.
runner_names = [for (k = [len(runner_drawers) - 1:-1:0]) str("R", runner_drawers[k] + 1)];
mid_y = (Front_thickness + inner_d) / 2;

function case_side_sheet() = let(x = t, rabbeted = Case_joinery == "rabbet", n = len(runner_tops),
    z_back = Height - t - 0.5, z_dado = n > 0 ? runner_tops[n-1] : 0,
    // Section D-D covers the top end rabbet and, for dados, down through the top dado.
    d_lo = dadoed && n > 0 ? z_dado - Runner_height - 1.25 : Height - t - 1)
    ["case-side", "Case side", 2, concat([
        str(frac(t), " plywood. The left side is shown; make the right side its mirror image."),
        rabbeted ? str("End rabbets: the top and bottom sit ", frac(end_rabbet), " into each side, ", frac(t), " high.")
                 : "The top and bottom butt between the sides.",
        str("Back rabbet ", frac(Back_rabbet_width), " into the side x ", frac(Back_thickness), ", full height.")],
        n == 0 ? [] : [
            str("Runner tops above the bottom edge: ", join([for (k = [n-1:-1:0]) str(runner_names[k], " ", frac(runner_tops[k]))]),
                ". Rk carries drawer k."),
            dadoed ? str("Stopped dados ", frac(Runner_height), " wide x ", frac(dado_depth), " deep, ",
                         frac(Front_thickness), " back from the front edge to the back rabbet.")
                   : "Dashed lines locate the runner strips; glue and screw them on."]),
     pc(0), concat([
        ["inside", "Inside face, laid flat / bottom edge at left, front edge up", FLAT, concat([
            dim("Height", [x, Depth, 0], [x, Depth, Height], "horizontal", -1, 2),
            dim("Depth", [x, 0, 0], [x, Depth, 0], "vertical", -1),
            dim("Back rabbet", [x, inner_d, Height], [x, Depth, Height], "vertical", 1)],
            rabbeted ? [dim("Rabbet", [x, Depth, 0], [x, Depth, t], "horizontal", -1),
                        dim("Rabbet", [x, Depth, Height - t], [x, Depth, Height], "horizontal", -1)] : [],
            n > 0 ? [dim("Runner start", [x, 0, Height], [x, Front_thickness, Height], "vertical", 1, 2)] : [],
            // Chained from the bottom edge to each runner top.
            [for (k = [0:1:n-1]) dim(k == 0 ? str("To ", runner_names[k]) : str(runner_names[k-1], "–", runner_names[k]),
                [x, 0, k == 0 ? 0 : runner_tops[k-1]], [x, 0, runner_tops[k]], "horizontal", 1)]),
         [], dadoed ? [] : [for (z = runner_tops) each [
            guide([x, Front_thickness, z], [x, inner_d, z]),
            guide([x, Front_thickness, z - Runner_height], [x, inner_d, z - Runner_height])]]],
        ["back-rabbet", "C-C / Section below the top, from above", TOP, [
            dim("Thickness", [0, inner_d - 1, z_back], [t, inner_d - 1, z_back], "horizontal", -1),
            dim("Back rabbet width", [t - Back_rabbet_width, Depth, z_back], [t, Depth, z_back], "horizontal", 1),
            dim("Back rabbet", [t, inner_d, z_back], [t, Depth, z_back], "vertical", 1)],
         section(z_back, [-0.25, inner_d - 1.25, t + 0.25, Depth + 0.25], ["bottom"])]],
        rabbeted || (dadoed && n > 0) ? [
        ["end", dadoed && n > 0 ? "D-D / Section through the top end and top dado" : "D-D / Section through the top end", FRONT, concat(
            [dim("Thickness", [0, mid_y, d_lo], [t, mid_y, d_lo], "horizontal", -1)],
            rabbeted ? [
                dim("End rabbet depth", [t - end_rabbet, mid_y, Height], [t, mid_y, Height], "horizontal", 1),
                dim("Rabbet height", [t, mid_y, Height - t], [t, mid_y, Height], "vertical", 1)] : [],
            dadoed && n > 0 ? [
                dim("Dado depth", [t - dado_depth, mid_y, z_dado], [t, mid_y, z_dado], "horizontal", 1, rabbeted ? 2 : 1),
                dim("Dado width", [t, mid_y, z_dado - Runner_height], [t, mid_y, z_dado], "vertical", 1)] : []),
         section(-mid_y, [-0.25, d_lo, t + 0.25, Height + 0.25], ["bottom"])]] : [])];

function panel_sheet() = let(o = Case_joinery == "rabbet" ? end_rabbet : 0, z = Height, xm = Width / 2)
    ["case-panels", "Case top and bottom", 2, [
        str(frac(t), " plywood. The top and bottom are identical."),
        o > 0 ? str("Their ends fit the side rabbets, ", frac(o), " each side.") : "They butt between the sides.",
        "The back panel covers their back edges."],
     pc(2), [
        ["plan", "Plan", TOP, [
            dim("Width", [t - o, 0, z], [Width - t + o, 0, z], "horizontal", -1),
            dim("Depth", [t - o, 0, z], [t - o, inner_d, z], "vertical", -1)]],
        ["edge", "E-E / Section at the front edge", RIGHT, [
            dim("Thickness", [xm, 0, z - t], [xm, 0, z], "vertical", -1)],
         section(xm, [-0.25, z - t - 0.25, 1.5, z + 0.25], ["right"])]]];

function back_sheet() = let(xm = Width / 2)
    ["back-panel", "Back panel", 1, [
        str(frac(Back_thickness), " plywood, set in the side rabbets."),
        "It covers the back edges of the top and bottom; glue and nail it on."],
     pc(4), [
        ["face", "Face", FRONT, [
            dim("Width", [t - Back_rabbet_width, Depth, Height], [Width - t + Back_rabbet_width, Depth, Height], "horizontal", 1),
            dim("Height", [t - Back_rabbet_width, Depth, 0], [t - Back_rabbet_width, Depth, Height], "vertical", -1)]],
        ["edge", "F-F / Section at the top edge", RIGHT, [
            dim("Thickness", [xm, inner_d, Height], [xm, Depth, Height], "horizontal", 1)],
         section(xm, [inner_d - 0.25, Height - 1.5, Depth + 0.25, Height + 0.25], ["bottom"])]]];

function runner_sheet() = let(i = runner_drawers[0], z = runner_top(i), x0 = t - dado_depth, x1 = t + runner_reach)
    ["runner", "Runner strip", 2 * len(runner_drawers), [
        "Hardwood. Positions are on the case side sheet.",
        Runner_style == "strip" ? "Glue and screw to the case side; the top carries the drawer." :
        dadoed ? str("Glue into the ", frac(dado_depth), "-deep dado; ", frac(Runner_width), " projects to carry the drawer.") :
        str("Engages the drawer-side groove, stopping ", frac(Runner_clearance), " short of its floor.")],
     pc(runner_piece(i, false)), [
        ["side", "Side", RIGHT, [
            dim("Length", [x1, Front_thickness, z], [x1, inner_d, z], "horizontal", 1),
            dim("Height", [x1, Front_thickness, z - Runner_height], [x1, Front_thickness, z], "vertical", -1)]],
        ["end", "G-G / Cross-section", FRONT, [
            dim("Width", [x0, mid_y, z], [x1, mid_y, z], "horizontal", 1)],
         section(-mid_y, [x0 - 0.25, z - Runner_height - 0.25, x1 + 0.25, z + 0.25])]]];

// Drawer members grouped across drawers with identical finished geometry.
// Member order follows drawer_members(): 0 bottom, 1 front, 2 left, 3 right, 4 back.
// Rounded to a millionth of an inch so derived heights group despite float noise.
function signature(i, k) = let(m = drawer_members(i)[k])
    [for (n = concat(m[2] - m[1], (k == 2 || k == 4) && !supported ? hang_center[i] : 0)) round(n * 1e6)];
function matching(i, k) = [for (j = [0:N-1]) if (signature(j, k) == signature(i, k)) j];
function representatives(k) = [for (i = [0:N-1]) if (matching(i, k)[0] == i) i];
// Drawer numbers with runs of three or more compressed, e.g. "1, 3–6".
function run_end(v, i) = i + 1 < len(v) && v[i+1] == v[i] + 1 ? run_end(v, i + 1) : i;
function runs(v, i = 0) = i >= len(v) ? "" : let(j = run_end(v, i))
    str(i > 0 ? ", " : "", j > i + 1 ? str(v[i], "–", v[j]) : j == i + 1 ? str(v[i], ", ", v[j]) : str(v[i]), runs(v, j + 1));
function drawers_title(name, set) = str(name, len(set) == 1 ? " · drawer " : " · drawers ", runs([for (j = set) j + 1]));
function lo_of(i, k) = drawer_origin(i) + drawer_members(i)[k][1];
function hi_of(i, k) = drawer_origin(i) + drawer_members(i)[k][2];
box_material = "Plywood; butt joints glued with screws, pocket screws or brads.";

function front_sheet(i) = let(set = matching(i, 1), lo = lo_of(i, 1), hi = hi_of(i, 1), xm = (lo[0] + hi[0]) / 2,
    g = Groove_depth, o = Groove_offset, tb = Bottom_thickness, top = min(hi[2], lo[2] + 2))
    [str("front-", i + 1), drawers_title("Drawer front", set), len(set), [
        "Integral inset front; the visible face is shown.", box_material,
        Box_construction == "front_back_overlap" ? "Runs the full box width; the sides butt into its back face." :
            "Fits between the sides, whose ends show on the face.",
        under_bottom ? str("Sits on the bottom panel, whose edge shows below it: ", frac(front_h[i]), " overall.") :
            str("Bottom groove ", frac(tb), " wide x ", frac(g), " deep, ", frac(o), " up, through the length.")],
     pc(member_piece(i, 1)), [
        ["face", "Face", FRONT, [
            dim("Width", [lo[0], lo[1], hi[2]], [hi[0], lo[1], hi[2]], "horizontal", 1),
            dim("Height", [lo[0], lo[1], lo[2]], [lo[0], lo[1], hi[2]], "vertical", -1)]],
        ["edge", "H-H / Section at the bottom edge", RIGHT, concat([
            dim("Thickness", [xm, lo[1], lo[2]], [xm, hi[1], lo[2]], "horizontal", -1)],
            under_bottom ? [] : [
                dim("Groove offset", [xm, hi[1], lo[2]], [xm, hi[1], lo[2] + o], "vertical", 1),
                dim("Groove", [xm, hi[1], lo[2] + o], [xm, hi[1], lo[2] + o + tb], "vertical", 1, 2),
                dim("Groove depth", [xm, hi[1] - g, lo[2] + o], [xm, hi[1], lo[2] + o], "horizontal", -1, 2)]),
         section(xm, [lo[1] - 0.25, lo[2] - 0.25, hi[1] + 0.25, top + 0.25], top < hi[2] ? ["top"] : [])]]];

function side_sheet(i) = let(set = matching(i, 2), lo = lo_of(i, 2), hi = hi_of(i, 2), oz = drawer_origin(i)[2],
    g = Groove_depth, o = Groove_offset, tb = Bottom_thickness, ym = (lo[1] + hi[1]) / 2,
    hung = !supported, hang_lo = oz + hang_center[i] - hang_groove_h / 2, hang_hi = oz + hang_center[i] + hang_groove_h / 2,
    hang_stop = hung && lo[1] < Front_thickness, grooved = !under_bottom,
    // Bottom-groove dimensions belong on the inside face, where the groove shows.
    groove_dims = [
        dim("Groove stop", [lo[0], lo[1], lo[2]], [lo[0], Front_thickness - g, lo[2]], "horizontal", -1),
        dim("Groove offset", [lo[0], hi[1], lo[2]], [lo[0], hi[1], lo[2] + o], "vertical", 1),
        dim("Groove", [lo[0], hi[1], lo[2] + o], [lo[0], hi[1], lo[2] + o + tb], "vertical", 1, 2)],
    top = min(hi[2], hung ? hang_hi + 0.75 : grooved ? lo[2] + o + tb + 0.75 : lo[2] + 1.5))
    [str("side-", i + 1), drawers_title("Drawer sides", set), 2 * len(set), concat([
        grooved || hang_stop ? "Make mirrored left/right pairs; the left side is shown." : "Left and right sides are identical.",
        box_material,
        Box_construction == "front_back_overlap" ? "Fits between the front and back." : "Runs the full box depth; the front and back fit between the sides."],
        under_bottom ? ["Sits on the bottom panel."] :
            [str("Stopped bottom groove ", frac(tb), " wide x ", frac(g), " deep, ", frac(o), " up, open at the back.")],
        hung ? [str("Runner groove ", frac(hang_groove_h), " wide x ", frac(Hang_groove_depth), " deep in the outside face, open at the back.")] : [],
        supported && box_h[i] < front_h[i] - 1e-9 ? [str("Lower than the front so it clears the runner above by ", frac(Runner_clearance), ".")] : []),
     pc(member_piece(i, 2)), concat([
        [hung ? "outside" : "inside", hung ? "Outside face" : "Inside face", hung ? LEFT : RIGHT, concat([
            dim("Length", [lo[0], lo[1], hi[2]], [lo[0], hi[1], hi[2]], "horizontal", 1),
            dim("Height", [lo[0], hi[1], lo[2]], [lo[0], hi[1], hi[2]], "vertical", -1, 2)],
            hung ? concat([
                dim("To runner groove", [lo[0], hi[1], lo[2]], [lo[0], hi[1], hang_lo], "vertical", -1),
                dim("Runner groove", [lo[0], lo[1], hang_lo], [lo[0], lo[1], hang_hi], "vertical", 1)],
                hang_stop ? [dim("Runner groove stop", [lo[0], lo[1], lo[2]], [lo[0], Front_thickness, lo[2]], "horizontal", -1)] : []) :
            grooved ? groove_dims : [])]],
        hung && grooved ? [["inside", "Inside face", RIGHT, groove_dims]] : [],
        [["section", "J-J / Cross-section", FRONT, concat([
            dim("Thickness", [lo[0], ym, lo[2]], [hi[0], ym, lo[2]], "horizontal", -1)],
            hung ? [dim("Runner groove depth", [lo[0], ym, hang_hi], [lo[0] + Hang_groove_depth, ym, hang_hi], "horizontal", 1)] : [],
            grooved ? [dim("Groove depth", [hi[0] - g, ym, lo[2] + o], [hi[0], ym, lo[2] + o], "horizontal", -1, 2)] : []),
         section(-ym, [lo[0] - 0.25, lo[2] - 0.25, hi[0] + 0.25, top + 0.25], top < hi[2] ? ["top"] : [])]])];

function back_member_sheet(i) = let(set = matching(i, 4), lo = lo_of(i, 4), hi = hi_of(i, 4), oz = drawer_origin(i)[2],
    xm = (lo[0] + hi[0]) / 2, notched = !supported && Box_construction == "front_back_overlap",
    hang_lo = oz + hang_center[i] - hang_groove_h / 2, hang_hi = oz + hang_center[i] + hang_groove_h / 2,
    top = min(hi[2], lo[2] + 1.5))
    [str("back-", i + 1), drawers_title("Drawer back", set), len(set), concat([
        box_material,
        Box_construction == "front_back_overlap" ? "Runs the full box width; the sides butt into its front face." : "Fits between the sides.",
        under_bottom ? "Sits on the bottom panel." : "Sits on the bottom, which slides in beneath it; nail the bottom up into it."],
        notched ? [str("Notch both ends for the runner grooves: ", frac(hang_groove_h), " high x ", frac(Hang_groove_depth), " deep.")] : []),
     pc(member_piece(i, 4)), [
        ["face", "Face", FRONT, concat([
            dim("Width", [lo[0], lo[1], hi[2]], [hi[0], lo[1], hi[2]], "horizontal", 1),
            dim("Height", [lo[0], lo[1], lo[2]], [lo[0], lo[1], hi[2]], "vertical", -1)],
            notched ? [
                dim("Notch depth", [hi[0] - Hang_groove_depth, lo[1], lo[2]], [hi[0], lo[1], lo[2]], "horizontal", -1),
                dim("To notch", [hi[0], lo[1], lo[2]], [hi[0], lo[1], hang_lo], "vertical", 1),
                dim("Notch", [hi[0], lo[1], hang_lo], [hi[0], lo[1], hang_hi], "vertical", 1)] : [])],
        ["edge", "K-K / Section at the bottom edge", RIGHT, [
            dim("Thickness", [xm, lo[1], lo[2]], [xm, hi[1], lo[2]], "horizontal", -1)],
         section(xm, [lo[1] - 0.25, lo[2] - 0.25, hi[1] + 0.25, top + 0.25], top < hi[2] ? ["top"] : [])]]];

function bottom_sheet(i) = let(set = matching(i, 0), lo = lo_of(i, 0), hi = hi_of(i, 0), xm = (lo[0] + hi[0]) / 2)
    [str("bottom-", i + 1), drawers_title("Drawer bottom", set), len(set), [
        str(frac(Bottom_thickness), " plywood."),
        under_bottom ? "Glue and brad it under the sides, front and back." :
            str("Slides into the ", frac(Groove_depth), "-deep grooves in the sides and front; nail it up into the back.")],
     pc(member_piece(i, 0)), [
        ["plan", "Plan", TOP, [
            dim("Width", [lo[0], lo[1], hi[2]], [hi[0], lo[1], hi[2]], "horizontal", -1),
            dim("Depth", [lo[0], lo[1], hi[2]], [lo[0], hi[1], hi[2]], "vertical", -1)]],
        ["edge", "L-L / Section at the front edge", RIGHT, [
            dim("Thickness", [xm, lo[1], lo[2]], [xm, lo[1], hi[2]], "vertical", -1)],
         section(xm, [lo[1] - 0.25, lo[2] - 0.25, lo[1] + 1.5, hi[2] + 0.25], ["right"])]]];

// ---------------------------------------------------------------------------
// Stock. Every case and drawer part is plywood, laid out on sheets at finished
// size: SHEET_PARTS_V1 rows are [id, name, material, quantity, thickness, width,
// length, grain, legend ids]. "length" grain keeps visible face grain along the
// part length; hidden parts may turn. Only the hardwood runners use the
// board-feet cut list. Defaults: 48 x 96 sheets, 1/8 kerf, no edge trim.
function plywood(th) = str(frac(th), " plywood");
function parity_ids(name, set) = [for (k = [0, 1]) if (len([for (j = set) if (j % 2 == k) 1]) > 0) str(name, k == 0 ? "-odd" : "-even")];
function member_size(i, k) = hi_of(i, k) - lo_of(i, k);
sheet_parts = concat([
    ["case-sides", "Case sides", plywood(t), 2, t, Depth, Height, "length", ["case-left", "case-right"]],
    let(o = Case_joinery == "rabbet" ? end_rabbet : 0)
    ["case-panels", "Case top and bottom", plywood(t), 2, t, inner_d, inner_w + 2 * o, "length", ["case-top", "case-bottom"]],
    ["back-panel", "Back panel", plywood(Back_thickness), 1, Back_thickness, inner_w + 2 * Back_rabbet_width, Height, "any", ["case-back"]]],
    [for (i = representatives(1)) let(set = matching(i, 1), z = member_size(i, 1))
        [str("front-", i + 1), drawers_title("Drawer front", set), plywood(Front_thickness), len(set), Front_thickness, z[2], z[0], "length", parity_ids("front", set)]],
    [for (i = representatives(2)) let(set = matching(i, 2), z = member_size(i, 2))
        [str("side-", i + 1), drawers_title("Drawer sides", set), plywood(Side_thickness), 2 * len(set), Side_thickness, z[2], z[1], "any", parity_ids("side", set)]],
    [for (i = representatives(4)) let(set = matching(i, 4), z = member_size(i, 4))
        [str("back-", i + 1), drawers_title("Drawer back", set), plywood(Box_back_thickness), len(set), Box_back_thickness, z[2], z[0], "any", parity_ids("back", set)]],
    [for (i = representatives(0)) let(set = matching(i, 0), z = member_size(i, 0))
        [str("bottom-", i + 1), drawers_title("Drawer bottom", set), plywood(Bottom_thickness), len(set), Bottom_thickness, z[1], z[0], "any", parity_ids("bottom", set)]]);
echo("SHEET_STOCK_V1", [96, 48, 0.125, 0]);
echo("SHEET_PARTS_V1", sheet_parts);
runner_section = [Runner_height, supported ? Runner_width + dado_depth : runner_reach];
echo("CUTLIST_STOCK_V1", [14, 10, 0.0625, 0.0625]);
if (len(runner_drawers) > 0) echo("CUTLIST_V1", [["runners", "Runner strip", "Hardwood", 2 * len(runner_drawers),
    min(runner_section), max(runner_section), inner_d - Front_thickness, "Runner strip"]]);

// Names for the viewer's individually selectable pieces, keyed by source color.
member_names = [["front", "front"], ["left", "left side"], ["right", "right side"], ["back", "back"], ["bottom", "bottom"]];
echo("PIECES_V1", concat(
    [for (i = runner_drawers) for (right = [false, true])
        [hex_color(runner_rgb_of(i, right)), str("Runner R", i + 1, right ? " · right" : " · left")]],
    [for (i = [0:N-1]) for (m = member_names) [hex_color(member_rgb(m[0], i)), str("Drawer ", i + 1, " ", m[1])]]));

if (!is_undef($misc_drawing) && $misc_drawing) {
    echo("DRAWING_V1", ["inches", concat(assembly_views, joint_views), joint_caption]);
    echo("PART_DRAWINGS_V1", concat(
        [case_side_sheet(), panel_sheet(), back_sheet()],
        len(runner_drawers) > 0 ? [runner_sheet()] : [],
        [for (i = representatives(1)) front_sheet(i)],
        [for (i = representatives(2)) side_sheet(i)],
        [for (i = representatives(4)) back_member_sheet(i)],
        [for (i = representatives(0)) bottom_sheet(i)]));
    drawing_cabinet();
} else {
    separation = Explosion_percent / 100;
    if (Part == "all") cabinet(separation);
    else if (Part == "carcass") carcass(separation);
    else drawer(Inspect_drawer - 1, separation);
}
