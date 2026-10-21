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
// Drawers stacked in the single column. Each drawer has its own settings below.
Drawer_count = 4; // [1:1:8]
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

/* [Drawer 1 (top)] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_1_height = 5; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_1_depth = 0; // [0:36]

/* [Drawer 2] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_2_height = 6; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_2_depth = 0; // [0:36]

/* [Drawer 3] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_3_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_3_depth = 0; // [0:36]

/* [Drawer 4] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_4_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_4_depth = 0; // [0:36]

/* [Drawer 5] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_5_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_5_depth = 0; // [0:36]

/* [Drawer 6] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_6_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_6_depth = 0; // [0:36]

/* [Drawer 7] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_7_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_7_depth = 0; // [0:36]

/* [Drawer 8] */
// Inset front height. Zero shares the remaining height equally with other zero-height drawers.
Drawer_8_height = 0; // [0:60]
// Box depth from the front face. Zero fills the case depth less the back clearance.
Drawer_8_depth = 0; // [0:36]

/* [Inspection] */
// Separation in percent: 0 assembles the cabinet; 100 opens the case and slides the drawers clear; 200 also takes the drawers apart. A single drawer separates from 0. Part sizes stay fixed.
Explosion_percent = 0; // [0:5:200]
// Show the complete cabinet, the case with its runners, or one drawer for inspection and a separate STL export.
Part = "all"; // [all:Complete cabinet, carcass:Case and runners, drawer:One drawer]
// Drawer shown when Part is One drawer; 1 is the top drawer.
Inspect_drawer = 1; // [1:1:8]

/* [Hidden] */
inch = 25.4;
eps = 0.01 / inch; // Boolean-tool overrun, 0.01 mm.
max_drawers = 8;
N = Drawer_count;
t = Case_thickness;
end_rabbet = t / 2; // Side-end rabbet depth when the top and bottom are housed.
inner_w = Width - 2 * t;
inner_h = Height - 2 * t;
inner_d = Depth - Back_thickness; // Front face to the back panel.
supported = Runner_style != "side_hung";
dadoed = Runner_style == "dado";
under_bottom = Box_construction != "sides_overlap_groove";

function sumv(v, i = 0) = i >= len(v) ? 0 : v[i] + sumv(v, i + 1);

height_inputs = [Drawer_1_height, Drawer_2_height, Drawer_3_height, Drawer_4_height,
                 Drawer_5_height, Drawer_6_height, Drawer_7_height, Drawer_8_height];
depth_inputs = [Drawer_1_depth, Drawer_2_depth, Drawer_3_depth, Drawer_4_depth,
                Drawer_5_depth, Drawer_6_depth, Drawer_7_depth, Drawer_8_depth];
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
assert(N >= 1 && N <= max_drawers && floor(N) == N, "Drawer count must be a whole number from 1 to 8.");
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
runner_color = "#2f7a4f";
front_colors = ["#b87924", "#b6483b"];
side_colors = ["#ae689d", "#7065af"];
back_colors = ["#956d70", "#5d7c92"];
bottom_colors = ["#8a8a3a", "#47856d"];

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

// Runner strips for drawer i (0 = top); left and right.
module runner(i, right) {
    y = [Front_thickness, inner_d];
    z = supported ? [t + front_z[i] - Runner_height, t + front_z[i]]
                  : [t + front_z[i] + hang_center[i] - Runner_height / 2, t + front_z[i] + hang_center[i] + Runner_height / 2];
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

function member_color(name, i) = let(k = i % 2)
    name == "front" ? front_colors[k] : name == "back" ? back_colors[k] :
    name == "bottom" ? bottom_colors[k] : side_colors[k];

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
        color(member_color(m[0], i)) translate(member_offset(m[0]) * e * inch) drawer_member(i, m);
}
module carcass(e) {
    color(case_colors[0]) translate(case_offsets[0] * e * inch) case_side(false);
    color(case_colors[1]) translate(case_offsets[1] * e * inch) case_side(true);
    color(case_colors[2]) translate(case_offsets[2] * e * inch) case_panel(true);
    color(case_colors[3]) translate(case_offsets[3] * e * inch) case_panel(false);
    color(case_colors[4]) translate(case_offsets[4] * e * inch) case_back();
    // Runners move half as far as their side, exposing the seat or dado.
    color(runner_color) for (i = runner_drawers) for (right = [false, true])
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

separation = Explosion_percent / 100;
if (Part == "all") cabinet(separation);
else if (Part == "carcass") carcass(separation);
else drawer(Inspect_drawer - 1, separation);
