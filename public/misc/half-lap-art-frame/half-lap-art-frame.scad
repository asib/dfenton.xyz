// Half-lap art frame — converted from the supplied FeatureScript 3083.
// The unchanged original is alongside this file as half-lap-art-frame.fs.
// Inputs are inches; geometry and STL exports are millimetres.
// XY is the frame face. Back is Z=0; front is Z=Thickness.

/* [Artwork] */
// Actual artwork width before the frame overlaps its edges.
Art_width = 30.375; // [1:200]
// Actual artwork height before the frame overlaps its edges.
Art_height = 21.3125; // [1:200]
// Overlap at EACH edge, not a gap. Opening = art size minus twice this value.
Reveal = 0.25; // [0.01:4]

/* [Frame and joinery] */
// Face width of all four rails and stiles; also the length of each half-lap.
Member_width = 2.5; // [0.25:12]
// Finished stock thickness. Each complementary lap is half this depth.
Thickness = 0.75; // [0.125:4]
// Cut from the BACK face. Set to zero to omit the rabbet.
Rabbet_depth = 0.25; // [0:3]
// Additional fitting clearance at each artwork edge; enlarges only the back pocket.
Clearance = 0.03125; // [0:0.25]

/* [Inspection] */
// Separate all four members to inspect the laps, using the original FeatureScript offsets.
Exploded = false;
// Select a physical member for inspection or an individual-part STL export.
Part = "all"; // [all:All four members, top:Top rail, bottom:Bottom rail, left:Left stile, right:Right stile]

/* [Hidden] */
inch = 25.4;
eps = 0.01 / inch; // Same 0.01 mm boolean-tool overrun as the original.
opening_width = Art_width - 2 * Reveal;
opening_height = Art_height - 2 * Reveal;
rail_length = opening_width + 2 * Member_width;
stile_length = opening_height + 2 * Member_width;
lap_depth = Thickness / 2;
rabbet_width = Reveal + Clearance;
part_ids = ["top", "bottom", "left", "right"];
// Separate physical identities; paired hues distinguish rails from stiles.
part_colors = ["#b87924", "#b6483b", "#2c78b5", "#3998a5"];
offsets = [[0, 2 * Member_width, Thickness], [0, -2 * Member_width, Thickness],
           [-2 * Member_width, 0, 0], [2 * Member_width, 0, 0]];

assert(Art_width >= 1 && Art_width <= 200 && Art_height >= 1 && Art_height <= 200,
       "Artwork dimensions must be between 1 and 200 inches.");
assert(Reveal >= 0.01 && Reveal <= 4, "Overlap must be between 0.01 and 4 inches.");
assert(Member_width >= 0.25 && Member_width <= 12, "Member width must be between 0.25 and 12 inches.");
assert(Thickness >= 0.125 && Thickness <= 4, "Stock thickness must be between 0.125 and 4 inches.");
assert(Rabbet_depth >= 0 && Rabbet_depth <= 3, "Rabbet depth must be between 0 and 3 inches.");
assert(Clearance >= 0 && Clearance <= 0.25, "Clearance must be between 0 and 0.25 inches.");
assert(opening_width > 0 && opening_height > 0, "Overlap leaves no opening.");
assert(rabbet_width < Member_width, "Overlap plus clearance must be less than member width.");
assert(Rabbet_depth < Thickness, "Rabbet depth must be less than stock thickness.");
assert(is_bool(Exploded), "Exploded must be true or false.");
assert(Part == "all" || Part == "top" || Part == "bottom" || Part == "left" || Part == "right",
       "Choose all members or one of the four named parts.");

// Derived, read-only dimensions, corresponding to the FeatureScript variables
// and computed blank lengths. They always describe the complete frame.
echo(str("All dimensions below are inches; exported geometry is millimetres."));
echo(str("Visible opening: ", opening_width, " x ", opening_height));
echo(str("Outside frame: ", rail_length, " x ", stile_length));
echo(str("Rear pocket: ", Art_width + 2 * Clearance, " x ", Art_height + 2 * Clearance,
         Rabbet_depth == 0 ? " (rabbet omitted)" : ""));
echo(str("Rail blanks (2): ", rail_length, " long x ", Member_width, " wide x ", Thickness, " thick"));
echo(str("Stile blanks (2): ", stile_length, " long x ", Member_width, " wide x ", Thickness, " thick"));
echo(str("Half-lap: ", Member_width, " long x ", lap_depth, " deep"));
echo(str("Rear rabbet: ", rabbet_width, " wide x ", Rabbet_depth, " deep"));

module box(lo, hi) {
    // Convert before boolean operations: the browser engine's tolerances are
    // suited to millimetres, including the smallest allowed artwork/overlap.
    translate(lo * inch) cube((hi - lo) * inch);
}

module member(i) {
    is_rail = i < 2;
    lo = is_rail
        ? [-rail_length / 2, i == 0 ? opening_height / 2 : -stile_length / 2, 0]
        : [i == 2 ? -rail_length / 2 : opening_width / 2, -stile_length / 2, 0];
    hi = is_rail
        ? [rail_length / 2, lo[1] + Member_width, Thickness]
        : [lo[0] + Member_width, stile_length / 2, Thickness];
    difference() {
        box(lo, hi);
        if (is_rail) {
            // Rails keep the FRONT half at both ends.
            box([-rail_length / 2 - eps, lo[1] - eps, -eps],
                [-opening_width / 2, hi[1] + eps, lap_depth]);
            box([opening_width / 2, lo[1] - eps, -eps],
                [rail_length / 2 + eps, hi[1] + eps, lap_depth]);
        } else {
            // Stiles keep the BACK half at both ends.
            box([lo[0] - eps, -stile_length / 2 - eps, lap_depth],
                [hi[0] + eps, -opening_height / 2, Thickness + eps]);
            box([lo[0] - eps, opening_height / 2, lap_depth],
                [hi[0] + eps, stile_length / 2 + eps, Thickness + eps]);
        }
        if (Rabbet_depth > 0)
            box([-Art_width / 2 - Clearance, -Art_height / 2 - Clearance, -eps],
                [Art_width / 2 + Clearance, Art_height / 2 + Clearance, Rabbet_depth]);
    }
}

module frame(assembled = false) union()
    for (i = [0:3])
        if (assembled || Part == "all" || Part == part_ids[i])
            color(part_colors[i])
                translate((!assembled && Exploded && Part == "all" ? offsets[i] : [0, 0, 0]) * inch)
                    member(i);

// Finished blanks before machining. Square frames use four equal blanks even
// though the rails and stiles still need different machining drawings.
// Machine minimums apply to parent stock before subdividing it.
echo("CUTLIST_STOCK_V1", [14, 10, 0.0625, 0.0625]);
echo("CUTLIST_V1", [for (i = [0:3])
    [part_ids[i], ["Top rail", "Bottom rail", "Left stile", "Right stile"][i], "Solid wood", 1,
     Thickness, Member_width, i < 2 ? rail_length : stile_length,
     rail_length == stile_length ? "Frame member" : i < 2 ? "Rail" : "Stile"]
]);

// Witness coordinates encode whole mm + millionths to retain inch fractions
// through OpenSCAD echo's six-significant-digit formatting.
function dp(p) = [for (n = p * inch) [floor(n), round((n - floor(n)) * 1000000)]];
function dim(label, a, b, direction, side, tier = 1) = [label, dp(a), dp(b), direction, side, tier];
function guide(a, b) = [dp(a), dp(b)];
function section(depth, crop, breaks = [], notes = [], contacts = []) =
    [depth * inch, crop * inch, breaks, notes, contacts];
// Local member coordinates: u along its length, v from its inner edge outward.
function pp(rail, u, v, z) = rail ? [u, opening_height / 2 + v, z] : [-opening_width / 2 - v, u, z];
function pd(rail, label, a, b, direction, side, tier = 1) =
    dim(label, pp(rail, a[0], a[1], a[2]), pp(rail, b[0], b[1], b[2]), direction, side, tier);
function pg(rail, a, b) = guide(pp(rail, a[0], a[1], a[2]), pp(rail, b[0], b[1], b[2]));

function frame_part_sheet(rail) = let(
    length = rail ? rail_length : stile_length,
    pocket_run = (rail ? Art_width : Art_height) + 2 * Clearance,
    inner_offset = (rail ? opening_height : opening_width) / 2,
    extension = min(Member_width, (length - 2 * Member_width) / 2),
    section_v = (rabbet_width + Member_width) / 2,
    lap_floor = rail ? 0 : lap_depth,
    lap_roof = rail ? lap_depth : Thickness
) [rail ? "rail" : "stile", rail ? "Rails" : "Stiles", 2, [
    rail ? "Top and bottom rails match. Cut both laps from the BACK; retain the FRONT half."
         : "Left and right stiles match. Cut both laps from the FRONT; retain the BACK half.",
    "Both end laps run across the full member width. Grain runs along the blank length.",
    Rabbet_depth > 0 ? "Center the rear pocket cut along the length; dashed limits include removed lap material."
                     : "Rabbet omitted: no rear-pocket machining is required.",
    "All dimensions are finished sizes. Rough-stock allowances are in the cut list."
], rail ? [184/255,121/255,36/255] : [44/255,120/255,181/255], [
    ["face", rail ? "Back face / dashed: pocket cut limits" : "Front face / dashed: rear pocket cut limits",
     rail ? [[1,0,0],[0,-1,0],[0,0,-1]] : [[0,1,0],[-1,0,0],[0,0,1]], [
        pd(rail, "Blank length", [-length/2,Member_width,0], [length/2,Member_width,0], "horizontal", 1),
        pd(rail, "Blank width", [-length/2,0,0], [-length/2,Member_width,0], "vertical", -1),
        pd(rail, "Each lap", [-length/2,0,0], [-length/2+Member_width,0,0], "horizontal", -1),
        if (Rabbet_depth > 0)
            pd(rail, "Pocket end inset", [-length/2,0,0], [-pocket_run/2,0,0], "horizontal", -1, 2),
        if (Rabbet_depth > 0)
            pd(rail, "Pocket cut run", [-pocket_run/2,0,0], [pocket_run/2,0,0], "horizontal", 1, 2)
     ], [], Rabbet_depth > 0 ? [
        pg(rail, [-pocket_run/2,0,0], [-pocket_run/2,rabbet_width,0]),
        pg(rail, [-pocket_run/2,rabbet_width,0], [pocket_run/2,rabbet_width,0]),
        pg(rail, [pocket_run/2,rabbet_width,0], [pocket_run/2,0,0])
     ] : []],
    ["lap", "End lap / section outside the rabbet",
     rail ? [[1,0,0],[0,0,1],[0,-1,0]] : [[0,1,0],[0,0,1],[1,0,0]], [
        pd(rail, "Lap length", [-length/2,section_v,lap_floor], [-length/2+Member_width,section_v,lap_floor], "horizontal", -1),
        pd(rail, "Lap depth", [-length/2,section_v,lap_floor], [-length/2,section_v,lap_roof], "vertical", -1),
        pd(rail, "Thickness", [-length/2+Member_width+extension,section_v,0], [-length/2+Member_width+extension,section_v,Thickness], "vertical", 1)
     ], section(-(inner_offset+section_v), [-length/2,0,-length/2+Member_width+extension,Thickness], ["right"]), [
        pg(rail, [-length/2,section_v,rail ? 0 : Thickness], [-length/2+Member_width,section_v,rail ? 0 : Thickness])
     ]],
    ["profile", Rabbet_depth > 0 ? "Mid-length section / rear rabbet" : "Mid-length section / rabbet omitted",
     rail ? [[0,1,0],[0,0,1],[1,0,0]] : [[-1,0,0],[0,0,1],[0,1,0]], [
        pd(rail, "Width", [0,0,Thickness], [0,Member_width,Thickness], "horizontal", -1),
        pd(rail, "Stock", [0,Member_width,0], [0,Member_width,Thickness], "vertical", 1),
        if (Rabbet_depth > 0) pd(rail, "Rabbet width", [0,0,Rabbet_depth], [0,rabbet_width,Rabbet_depth], "horizontal", 1),
        if (Rabbet_depth > 0) pd(rail, "Rabbet depth", [0,0,0], [0,0,Rabbet_depth], "vertical", -1)
     ], section(0, [inner_offset,0,inner_offset+Member_width,Thickness])]
]];

if (!is_undef($misc_drawing) && $misc_drawing) {
    corner_x = -opening_width / 2;
    corner_y = opening_height / 2;
    // The section planes lie outside the pocket, through the mating laps.
    section_v = (rabbet_width + Member_width) / 2;
    joint_x = corner_x - section_v;
    joint_y = corner_y + section_v;
    extension_x = min(Member_width, opening_width / 2);
    extension_y = min(Member_width, opening_height / 2);
    echo("PART_DRAWINGS_V1", [frame_part_sheet(true), frame_part_sheet(false)]);
    echo("DRAWING_V1", ["inches", [
        ["front", "Front / dashed: artwork boundary", [[1,0,0],[0,1,0],[0,0,1]], [
            dim("Outside width", [-rail_length/2,stile_length/2,Thickness], [rail_length/2,stile_length/2,Thickness], "horizontal", 1),
            dim("Artwork width", [-Art_width/2,Art_height/2,Thickness], [Art_width/2,Art_height/2,Thickness], "horizontal", 1, 2),
            dim("Opening width", [-opening_width/2,-opening_height/2,Thickness], [opening_width/2,-opening_height/2,Thickness], "horizontal", -1),
            dim("Outside height", [-rail_length/2,-stile_length/2,Thickness], [-rail_length/2,stile_length/2,Thickness], "vertical", -1),
            dim("Artwork height", [-Art_width/2,-Art_height/2,Thickness], [-Art_width/2,Art_height/2,Thickness], "vertical", -1, 2),
            dim("Opening height", [opening_width/2,-opening_height/2,Thickness], [opening_width/2,opening_height/2,Thickness], "vertical", 1)
        ], [], [
            guide([-Art_width/2,-Art_height/2,Thickness], [Art_width/2,-Art_height/2,Thickness]),
            guide([Art_width/2,-Art_height/2,Thickness], [Art_width/2,Art_height/2,Thickness]),
            guide([Art_width/2,Art_height/2,Thickness], [-Art_width/2,Art_height/2,Thickness]),
            guide([-Art_width/2,Art_height/2,Thickness], [-Art_width/2,-Art_height/2,Thickness])
        ]],
        ["top", "Top edge", [[1,0,0],[0,0,-1],[0,1,0]], []],
        ["right", "Right edge", [[0,0,-1],[0,1,0],[1,0,0]], [
            dim("Stock", [rail_length/2,-stile_length/2,0], [rail_length/2,-stile_length/2,Thickness], "horizontal", -1)
        ]],
        ["joint-longitudinal", "A-A / Across the rail", [[1,0,0],[0,0,1],[0,-1,0]], [
            dim("Lap length", [-rail_length/2,joint_y,lap_depth], [corner_x,joint_y,lap_depth], "horizontal", -1),
            dim("Rail lap depth", [-rail_length/2,joint_y,0], [-rail_length/2,joint_y,lap_depth], "vertical", -1),
            dim("Stock", [corner_x+extension_x,joint_y,0], [corner_x+extension_x,joint_y,Thickness], "vertical", 1)
        ], section(-joint_y, [-rail_length/2,0,corner_x+extension_x,Thickness], ["right"], [
            "Top-left corner, cut outside the rear pocket.",
            "Rail continues right; stile fills the back half.",
            str("Artwork overlap: ", Reveal, " in at each edge.")
        ], [guide([-rail_length/2,joint_y,lap_depth], [corner_x,joint_y,lap_depth])])],
        ["joint-transverse", "B-B / Along the stile", [[0,1,0],[0,0,1],[1,0,0]], [
            dim("Lap length", [joint_x,corner_y,lap_depth], [joint_x,stile_length/2,lap_depth], "horizontal", -1),
            dim("Stile lap depth", [joint_x,stile_length/2,lap_depth], [joint_x,stile_length/2,Thickness], "vertical", 1),
            dim("Stock", [joint_x,corner_y-extension_y,0], [joint_x,corner_y-extension_y,Thickness], "vertical", -1)
        ], section(joint_x, [corner_y-extension_y,0,stile_length/2,Thickness], ["left"], [
            "Stile continues left; rail fills the front half.",
            "All four corners use complementary half-laps.",
            Rabbet_depth > 0 ? str("Pocket clearance: ", Clearance, " in per edge.") : "Rear rabbet omitted."
        ], [guide([joint_x,corner_y,lap_depth], [joint_x,stile_length/2,lap_depth])])]
    ], ["Half-lap corner detail",
        "Enlarged sections through the top-left corner, outside the rear pocket. Hatches distinguish rail and stile.",
        "Bearing surface: rail front half meets stile back half at half the stock thickness."]]);
    frame(true);
} else frame();
