// Art frame — extended from the supplied half-lap FeatureScript 3083.
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
// Corner construction. All options preserve the opening and outside dimensions.
Joinery = "half_lap"; // [half_lap:Half-lap, miter:Plain miter, mitered_half_lap:Mitered half-lap, bridle:Corner bridle, mitered_bridle:Mitered bridle]
// Face width of all four rails and stiles; also the length of each half-lap.
Member_width = 2.5; // [0.25:12]
// Finished stock thickness. Automatic lap and tongue sizes follow this value.
Thickness = 0.75; // [0.125:4]
// Cut from the BACK face. Set to zero to omit the rabbet.
Rabbet_depth = 0.25; // [0:3]
// Additional fitting clearance at each artwork edge; enlarges only the back pocket.
Clearance = 0.03125; // [0:0.25]
// Depth of the rail's back lap, inches. Zero uses half the stock thickness.
Lap_depth = 0; // [0:4]
// Rail tongue thickness for bridles, inches. Zero uses one third of the stock thickness.
Tenon_thickness = 0; // [0:4]
// Shift the bridle tongue toward the front (+) or back (-), measured from centered.
Tenon_offset = 0; // [-2:2]

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
lap_depth = Lap_depth == 0 ? Thickness / 2 : Lap_depth;
tenon_thickness = Tenon_thickness == 0 ? Thickness / 3 : Tenon_thickness;
tenon_back = (Thickness - tenon_thickness) / 2 + Tenon_offset;
tenon_front = tenon_back + tenon_thickness;
is_bridle = Joinery == "bridle" || Joinery == "mitered_bridle";
is_lap = Joinery == "half_lap" || Joinery == "mitered_half_lap";
has_miter = Joinery == "miter" || Joinery == "mitered_half_lap" || Joinery == "mitered_bridle";
joint_title = Joinery == "half_lap" ? "Half-lap" : Joinery == "miter" ? "Plain miter" :
    Joinery == "mitered_half_lap" ? "Mitered half-lap" : Joinery == "bridle" ? "Corner bridle" : "Mitered bridle";
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
assert(Joinery == "half_lap" || Joinery == "miter" || Joinery == "mitered_half_lap" ||
       Joinery == "bridle" || Joinery == "mitered_bridle", "Choose a supported corner joint.");
assert(!is_lap || (Lap_depth >= 0 && lap_depth > eps && lap_depth < Thickness - eps),
       "Lap depth must leave material in both frame members; use 0 for half thickness.");
assert(!is_bridle || (Tenon_thickness >= 0 && tenon_thickness > eps && tenon_back > eps && tenon_front < Thickness - eps),
       "The bridle tongue must leave a positive cheek on both faces. Reduce its thickness or offset.");
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
echo(str("Joinery: ", joint_title));
if (is_lap) echo(str("Rail back lap: ", Member_width, " long x ", lap_depth, " deep"));
if (is_bridle) echo(str("Bridle tongue: ", tenon_thickness, " thick; back/front cheeks ",
                       tenon_back, " / ", Thickness - tenon_front));
echo(str("Rear rabbet: ", rabbet_width, " wide x ", Rabbet_depth, " deep"));

module box(lo, hi) {
    // Convert before boolean operations: the browser engine's tolerances are
    // suited to millimetres, including the smallest allowed artwork/overlap.
    translate(lo * inch) cube((hi - lo) * inch);
}

module half_lap_member(i) {
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

// Layer styles: full-width ends, square shoulders, or 45-degree miters.
// Corner regions are complementary, so the assembled frame has no gaps or
// overlapping wood. The mitered variants have a mitered FRONT face only.
function joint_layers(rail) =
    Joinery == "miter" ? [[0, Thickness, "miter"]] :
    Joinery == "mitered_half_lap" ? [[0, lap_depth, rail ? "short" : "full"], [lap_depth, Thickness, "miter"]] :
    [[0, tenon_back, rail ? "short" : "full"],
     [tenon_back, tenon_front, rail ? "full" : "short"],
     [tenon_front, Thickness, Joinery == "mitered_bridle" ? "miter" : rail ? "short" : "full"]];
function xy(i, u, v) = i < 2 ? [u, (i == 0 ? 1 : -1) * (opening_height / 2 + v)]
                             : [(i == 2 ? -1 : 1) * (opening_width / 2 + v), u];
module shaped_member(i) {
    rail = i < 2;
    length = rail ? rail_length : stile_length;
    difference() {
        // Subtract all machining from one blank so preview meshes also have
        // a single exterior skin, without coincident internal layer faces.
        linear_extrude(height=Thickness*inch)
            polygon([for (p = [[-length/2,0],[length/2,0],[length/2,Member_width],[-length/2,Member_width]])
                     xy(i,p[0],p[1])*inch]);
        for (layer = joint_layers(rail)) if (layer[2] != "full") for (sign = [-1,1]) {
            points = layer[2] == "short"
                ? [[-length/2-eps,-eps],[-length/2+Member_width,-eps],
                   [-length/2+Member_width,Member_width+eps],[-length/2-eps,Member_width+eps]]
                : [[-length/2-eps,-eps],[-length/2+Member_width+eps,-eps],[-length/2-eps,Member_width+eps]];
            z0 = layer[0] == 0 ? -eps : layer[0];
            z1 = layer[1] == Thickness ? Thickness+eps : layer[1];
            translate([0,0,z0*inch]) linear_extrude(height=(z1-z0)*inch)
                polygon([for (p = points) xy(i,sign*p[0],p[1])*inch]);
        }
        if (Rabbet_depth > 0)
            box([-Art_width/2-Clearance,-Art_height/2-Clearance,-eps],
                [Art_width/2+Clearance,Art_height/2+Clearance,Rabbet_depth]);
    }
}
module member(i) {
    if (Joinery == "half_lap") half_lap_member(i);
    else shaped_member(i);
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

function lap_part_sheet(rail) = let(
    length = rail ? rail_length : stile_length,
    pocket_run = (rail ? Art_width : Art_height) + 2 * Clearance,
    inner_offset = (rail ? opening_height : opening_width) / 2,
    extension = min(Member_width, (length - 2 * Member_width) / 2),
    section_v = (rabbet_width + Member_width) / 2,
    lap_floor = rail ? 0 : lap_depth,
    lap_roof = rail ? lap_depth : Thickness
) [rail ? "rail" : "stile", rail ? "Rails" : "Stiles", 2, [
    rail ? "Top and bottom rails match. Cut both laps from the BACK; retain the FRONT layer."
         : "Left and right stiles match. Cut both laps from the FRONT; retain the BACK layer.",
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

// The default sheet stays compatible with the original half-lap design.
// Other joints use the same blank/rabbet witnesses, with different end machining.
function frame_part_sheet(rail) = let(
    base = lap_part_sheet(rail), length = rail ? rail_length : stile_length,
    inner = (rail ? opening_height : opening_width)/2,
    sv = (rabbet_width+Member_width)/2,
    extension = min(Member_width,(length-2*Member_width)/2),
    u0 = -length/2, u1 = u0+Member_width, end = u1+extension
) Joinery == "half_lap" ? base : [base[0],base[1],base[2],[
    str(joint_title, ": both ends match. Grain runs along the blank length."),
    Joinery == "miter" ? "Cut both ends at 45 degrees through the full thickness; blank length is long point to long point." :
    Joinery == "mitered_half_lap" ? "FRONT layer: 45-degree miters. BACK layer: square rail shoulders and full stile ends." :
    Joinery == "bridle" ? "Rail tongues enter open-ended stile slots. Tongues and slots run the full member width." :
    "FRONT cheeks: 45-degree miters. Rail tongues enter stile slots; BACK cheeks have square shoulders.",
    Rabbet_depth > 0 ? "Center the rear pocket cut along the length; dashed limits include removed end material."
                    : "Rabbet omitted: no rear-pocket machining is required.",
    "Zero clearance at mating faces is nominal. Fit the joint on test stock. Dimensions are finished sizes."
],base[4],[
    ["face", has_miter ? "Front face / 45-degree miters / dashed: machining references"
                        : "Front face / dashed: slot shoulders and rear pocket",
     rail ? [[1,0,0],[0,1,0],[0,0,1]] : [[0,1,0],[-1,0,0],[0,0,1]], [
        pd(rail,"Blank length",[u0,Member_width,Thickness],[-u0,Member_width,Thickness],"horizontal",1),
        pd(rail,"Blank width",[-u0,0,Thickness],[-u0,Member_width,Thickness],"vertical",1),
        pd(rail,has_miter ? "45 deg miter run" : "End zone",[u0,0,Thickness],[u1,0,Thickness],"horizontal",-1),
        if (Rabbet_depth > 0) each [base[5][0][3][3],base[5][0][3][4]]
     ],[],concat(base[5][0][5],[
        pg(rail,[u1,0,Thickness],[u1,Member_width,Thickness]),
        pg(rail,[-u1,0,Thickness],[-u1,Member_width,Thickness])
     ])],
    ["joinery","End joinery / section outside the rabbet",
     rail ? [[1,0,0],[0,0,1],[0,-1,0]] : [[0,1,0],[0,0,1],[1,0,0]], [
        pd(rail,"End zone",[u0,sv,0],[u1,sv,0],"horizontal",-1),
        pd(rail,"Stock",[end,sv,0],[end,sv,Thickness],"vertical",1),
        if (is_lap) pd(rail,rail ? "Back lap" : "Front lap",[u0,sv,rail ? 0 : lap_depth],
                       [u0,sv,rail ? lap_depth : Thickness],"vertical",-1),
        if (is_bridle) each [
            pd(rail,rail ? "Tongue" : "Slot",[u0,sv,tenon_back],[u0,sv,tenon_front],"vertical",-1),
            pd(rail,"Back cheek",[u0,sv,0],[u0,sv,tenon_back],"vertical",-1,2),
            pd(rail,"Front cheek",[end,sv,tenon_front],[end,sv,Thickness],"vertical",1,2)
        ]
     ],section(-(inner+sv),[u0,0,end,Thickness],["right"]),[
        pg(rail,[u0,sv,0],[u1,sv,0]),pg(rail,[u0,sv,Thickness],[u1,sv,Thickness])
     ]],
    base[5][2]
]];

function cp(along_rail,u,z) = let(sv=(rabbet_width+Member_width)/2)
    along_rail ? [u,opening_height/2+sv,z] : [-opening_width/2-sv,u,z];
function cd(along_rail,label,u,a,b,side,tier=1) =
    dim(label,cp(along_rail,u,a),cp(along_rail,u,b),"vertical",side,tier);
function corner_section(along_rail) = let(
    sv=(rabbet_width+Member_width)/2,
    start=along_rail ? -rail_length/2 : opening_height/2,
    end=start+Member_width,
    extension=min(Member_width,(along_rail ? opening_width : opening_height)/2),
    lo=along_rail ? start : start-extension, hi=along_rail ? end+extension : end,
    diagonal=along_rail ? end-sv : start+sv,
    plane=along_rail ? -opening_height/2-sv : -opening_width/2-sv,
    contacts=Joinery == "miter" ? [guide(cp(along_rail,diagonal,0),cp(along_rail,diagonal,Thickness))] :
        is_lap ? concat([
            guide(cp(along_rail,has_miter ? diagonal : start,lap_depth),cp(along_rail,end,lap_depth))
        ],has_miter ? [guide(cp(along_rail,diagonal,lap_depth),cp(along_rail,diagonal,Thickness))] : []) :
        concat([
            guide(cp(along_rail,start,tenon_back),cp(along_rail,end,tenon_back)),
            guide(cp(along_rail,start,tenon_front),cp(along_rail,has_miter ? diagonal : end,tenon_front))
        ],has_miter ? [guide(cp(along_rail,diagonal,tenon_front),cp(along_rail,diagonal,Thickness))] : [])
) [along_rail ? "joint-longitudinal" : "joint-transverse",
   along_rail ? "A-A / Across the rail" : "B-B / Along the stile",
   along_rail ? [[1,0,0],[0,0,1],[0,-1,0]] : [[0,1,0],[0,0,1],[1,0,0]], [
    dim(Joinery == "miter" ? "45 deg miter run" : "Joint length",cp(along_rail,start,0),cp(along_rail,end,0),"horizontal",-1),
    cd(along_rail,"Stock",hi,0,Thickness,1),
    if (is_lap) cd(along_rail,along_rail ? "Rail back lap" : "Stile front lap",lo,
                   along_rail ? 0 : lap_depth,along_rail ? lap_depth : Thickness,-1),
    if (is_bridle) each [
        cd(along_rail,"Tongue / slot",lo,tenon_back,tenon_front,-1),
        cd(along_rail,"Back cheek",lo,0,tenon_back,-1,2),
        cd(along_rail,"Front cheek",hi,tenon_front,Thickness,1,2)
    ]
   ], section(plane,[lo,0,hi,Thickness],[along_rail ? "right" : "left"],[
       "Top-left corner, section outside the rear pocket.",
       str("Section offset from opening edge: ",sv," in."),
       has_miter ? "Front miters: 45 degrees in plan." : "All corner shoulders are square."
   ],contacts)];

if (!is_undef($misc_drawing) && $misc_drawing) {
    echo("PART_DRAWINGS_V1", [frame_part_sheet(true), frame_part_sheet(false)]);
    echo("DRAWING_V1", ["inches", [
        ["front", str("Front / ", joint_title, " / dashed: artwork"), [[1,0,0],[0,1,0],[0,0,1]], [
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
        corner_section(true), corner_section(false)
    ], [str(joint_title, Joinery == "bridle" ? " detail" : " corner detail"),
        "Enlarged sections through the top-left corner, outside the rear pocket. Hatches distinguish rail and stile.",
        Joinery == "miter" ? "Contact: matching 45-degree end faces meet through the full stock thickness." :
        is_bridle ? "Contact: rail tongue seats between the stile cheeks. All four corners use the same joint." :
        "Contact: the rail front layer bears on the stile back layer. All four corners use the same joint."]]);
    frame(true);
} else frame();
