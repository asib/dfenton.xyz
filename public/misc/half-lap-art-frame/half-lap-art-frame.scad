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
Joinery = "half_lap"; // [half_lap:Half-lap, miter:Plain miter, mitered_half_lap:Mitered half-lap, bridle:Corner bridle, mitered_bridle:Mitered bridle, splined_miter:Miter with exposed splines, loose_tenon_miter:Miter with loose tenons, dowelled_butt:Dowelled square corner, dovetail_key_miter:Miter with dovetail keys, blind_mortise_tenon:Blind mortise and tenon, through_mortise_tenon:Through mortise and tenon]
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
// Tongue or loose-tenon thickness, inches. Zero uses one third of the stock thickness.
Tenon_thickness = 0; // [0:4]
// Shift the tongue or loose tenon toward the front (+) or back (-), measured from centered.
Tenon_offset = 0; // [-2:2]

/* [Corner inserts] */
// Thickness of each exposed spline. Zero uses one sixth of stock thickness.
Spline_thickness = 0; // [0:2]
// Slot depth along the 45-degree miter, measured from the outside corner. Zero uses one third of member width.
Spline_depth = 0; // [0:8]
// Equally spaced spline slots through the stock thickness.
Spline_count = 1; // [1:1:3]
// Embedment into EACH miter face, normal to that face. Zero uses one quarter of member width.
Loose_tenon_depth = 0; // [0:8]
// Loose-tenon width along the miter face. Zero uses one third of member width.
Loose_tenon_width = 0; // [0:8]
// Dovetail-key slot depth along the miter from the outside corner. Zero chooses a depth that leaves a substantial tip.
Key_depth = 0; // [0:8]
// Widest key thickness, at the buried end. Zero uses half the stock thickness.
Key_thickness = 0; // [0:2]
// Dovetail cutter flank angle in DEGREES, on each side of the key.
Key_angle = 8; // [1:20]
// Dowel diameter. Zero chooses a diameter that fits the stock thickness and full-thickness face band.
Dowel_diameter = 0; // [0:2]
// Embedment into EACH member. Zero uses half the stile width, limited by the rail length.
Dowel_depth = 0; // [0:8]
// Number of dowels at each square corner.
Dowel_count = 2; // [1:1:3]
// Center-to-center spacing across the member width. Zero spaces the dowels in the band outside the rabbet.
Dowel_spacing = 0; // [0:8]

/* [Mortise and tenon] */
// Integral tenon width across the rail face. Zero uses half the member width.
Tenon_width = 0; // [0:8]
// Inset of the tenon's inner edge from the opening. Zero centers it in the band outside the rabbet.
Tenon_inset = 0; // [0:8]
// Blind tenon and mortise length. Zero uses half the stile width; through tenons always finish flush outside.
Mortise_depth = 0; // [0:8]

/* [Inspection] */
// Separate members and inserts to inspect the joints.
Exploded = false;
// Select a member or one representative insert for inspection and a separate STL export.
Part = "all"; // [all:Complete frame, top:Top rail, bottom:Bottom rail, left:Left stile, right:Right stile, insert:One corner insert]

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
is_reinforced_miter = Joinery == "splined_miter" || Joinery == "loose_tenon_miter" || Joinery == "dovetail_key_miter";
is_mt = Joinery == "blind_mortise_tenon" || Joinery == "through_mortise_tenon";
is_square = is_mt || Joinery == "dowelled_butt";
has_inserts = is_reinforced_miter || Joinery == "dowelled_butt";
has_machining_sheet = is_reinforced_miter || is_square;
is_bridle = Joinery == "bridle" || Joinery == "mitered_bridle";
is_lap = Joinery == "half_lap" || Joinery == "mitered_half_lap";
has_miter = is_reinforced_miter || Joinery == "miter" || Joinery == "mitered_half_lap" || Joinery == "mitered_bridle";
joint_title = Joinery == "half_lap" ? "Half-lap" : Joinery == "miter" ? "Plain miter" :
    Joinery == "mitered_half_lap" ? "Mitered half-lap" : Joinery == "bridle" ? "Corner bridle" :
    Joinery == "mitered_bridle" ? "Mitered bridle" : Joinery == "splined_miter" ? "Exposed-spline miter" :
    Joinery == "loose_tenon_miter" ? "Loose-tenon miter" : Joinery == "dowelled_butt" ? "Dowelled square corner" :
    Joinery == "dovetail_key_miter" ? "Dovetail-key miter" : Joinery == "blind_mortise_tenon" ? "Blind mortise and tenon" : "Through mortise and tenon";
rabbet_width = Reveal + Clearance;
solid_band_start = Rabbet_depth > 0 ? rabbet_width : 0;
tenon_width = Tenon_width == 0 ? Member_width/2 : Tenon_width;
tenon_inset = Tenon_inset == 0 ? (solid_band_start+Member_width-tenon_width)/2 : Tenon_inset;
mt_depth = Joinery == "through_mortise_tenon" ? Member_width : Mortise_depth == 0 ? Member_width/2 : Mortise_depth;
rail_blank = is_square ? opening_width + (is_mt ? 2*mt_depth : 0) : rail_length;
spline_thickness = Spline_thickness == 0 ? Thickness/6 : Spline_thickness;
spline_depth = Spline_depth == 0 ? Member_width/3 : Spline_depth;
loose_depth = Loose_tenon_depth == 0 ? Member_width/4 : Loose_tenon_depth;
loose_width = Loose_tenon_width == 0 ? Member_width/3 : Loose_tenon_width;
loose_center = Member_width/sqrt(2);
key_thickness = Key_thickness == 0 ? Thickness/2 : Key_thickness;
key_depth = Key_depth == 0 ? min(Member_width/3,key_thickness/(3*tan(Key_angle))) : Key_depth;
key_tip = key_thickness - 2*key_depth*tan(Key_angle);
dowel_diameter = Dowel_diameter == 0 ? min(Thickness/3,(Member_width-solid_band_start)/(2*Dowel_count)) : Dowel_diameter;
dowel_depth = Dowel_depth == 0 ? min(Member_width/2,opening_width/4) : Dowel_depth;
dowel_spacing = Dowel_spacing == 0 ? (Member_width-solid_band_start)/(Dowel_count+1) : Dowel_spacing;
function dowel_v(j) = (solid_band_start+Member_width)/2 + (j-(Dowel_count-1)/2)*dowel_spacing;
insert_count = Joinery == "splined_miter" ? Spline_count : Joinery == "dowelled_butt" ? Dowel_count : 1;
insert_name = Joinery == "splined_miter" ? "Spline" : Joinery == "loose_tenon_miter" ? "Loose tenon" : Joinery == "dovetail_key_miter" ? "Dovetail key" : "Dowel blank (turn round)";
insert_thickness = Joinery == "splined_miter" ? spline_thickness : Joinery == "loose_tenon_miter" ? tenon_thickness : Joinery == "dovetail_key_miter" ? key_thickness : dowel_diameter;
insert_length = Joinery == "splined_miter" ? 2*spline_depth : Joinery == "loose_tenon_miter" ? 2*loose_depth : Joinery == "dovetail_key_miter" ? 2*key_depth : 2*dowel_depth;
insert_width = Joinery == "splined_miter" ? spline_depth : Joinery == "loose_tenon_miter" ? loose_width : Joinery == "dovetail_key_miter" ? key_depth : dowel_diameter;
// Stable individual identities allow the drawing pass to select one insert.
insert_colors = ["#8754ad", "#ae689d", "#7065af", "#508549", "#75853c", "#47856d",
                 "#a67538", "#a75a55", "#956d70", "#476c9c", "#5d7c92", "#687aaf"];
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
       Joinery == "bridle" || Joinery == "mitered_bridle" || has_machining_sheet, "Choose a supported corner joint.");
assert(!is_lap || (Lap_depth >= 0 && lap_depth > eps && lap_depth < Thickness - eps),
       "Lap depth must leave material in both frame members; use 0 for half thickness.");
assert(!(is_bridle || is_mt || Joinery == "loose_tenon_miter") || (Tenon_thickness >= 0 && tenon_thickness > eps && tenon_back > eps && tenon_front < Thickness - eps),
       "The tongue must leave a positive cheek on both faces. Reduce its thickness or offset.");
assert(Joinery != "splined_miter" || (Spline_count >= 1 && Spline_count <= 3 && floor(Spline_count) == Spline_count &&
       Spline_depth >= 0 && Spline_thickness >= 0 && spline_thickness > eps && spline_thickness < Thickness/(Spline_count+1) &&
       spline_depth > eps && sqrt(2)*spline_depth < Member_width-solid_band_start),
       "Splines must leave wood between slots and stay in the band outside the rabbet. Reduce thickness, count or depth.");
assert(Joinery != "loose_tenon_miter" || (Loose_tenon_depth >= 0 && Loose_tenon_width >= 0 && loose_depth > eps && loose_width > eps &&
       loose_center-loose_width/2 > loose_depth+eps && loose_center+loose_width/2+loose_depth < sqrt(2)*Member_width-eps &&
       (tenon_back >= Rabbet_depth || loose_center+loose_width/2 < sqrt(2)*(Member_width-rabbet_width)-eps)),
       "Loose mortises must remain concealed and clear the rear pocket. Reduce width or depth, or move the tongue forward.");
assert(Joinery != "dovetail_key_miter" || (Key_depth >= 0 && Key_thickness >= 0 && Key_angle >= 1 && Key_angle <= 20 &&
       key_depth > eps && key_thickness < Thickness-eps && key_tip > eps && sqrt(2)*key_depth < Member_width-solid_band_start),
       "Dovetail keys must retain a positive tip, cheeks and wood outside the rabbet. Reduce depth or angle, or increase key thickness.");
assert(Joinery != "dowelled_butt" || (Dowel_count >= 1 && Dowel_count <= 3 && floor(Dowel_count) == Dowel_count &&
       Dowel_diameter >= 0 && Dowel_depth >= 0 && Dowel_spacing >= 0 && dowel_diameter > eps && dowel_diameter < Thickness-eps &&
       dowel_depth > eps && dowel_depth < Member_width-eps && 2*dowel_depth < opening_width-eps &&
       (Dowel_count == 1 || dowel_spacing > dowel_diameter+eps) &&
       dowel_v(0)-dowel_diameter/2 > solid_band_start+eps && dowel_v(Dowel_count-1)+dowel_diameter/2 < Member_width-eps),
       "Dowel holes must be separate, blind and inside the full-thickness band. Reduce diameter, depth or spacing.");
assert(!is_mt || (Tenon_width >= 0 && Tenon_inset >= 0 && (Joinery == "through_mortise_tenon" || Mortise_depth >= 0) && tenon_width > eps &&
       tenon_inset > solid_band_start+eps && tenon_inset+tenon_width < Member_width-eps && mt_depth > eps &&
       (Joinery == "through_mortise_tenon" || mt_depth < Member_width-eps)),
       "Mortise and tenon must leave face shoulders outside the rabbet and a positive blind end wall. Reduce width, inset or depth.");
assert(Part != "insert" || has_inserts, "This joint has no separate inserts. Select the complete frame or a member.");
assert(is_bool(Exploded), "Exploded must be true or false.");
assert(Part == "all" || Part == "top" || Part == "bottom" || Part == "left" || Part == "right" || Part == "insert",
       "Choose all members or one of the four named parts.");

// Derived, read-only dimensions, corresponding to the FeatureScript variables
// and computed blank lengths. They always describe the complete frame.
echo(str("All dimensions below are inches; exported geometry is millimetres."));
echo(str("Visible opening: ", opening_width, " x ", opening_height));
echo(str("Outside frame: ", rail_length, " x ", stile_length));
echo(str("Rear pocket: ", Art_width + 2 * Clearance, " x ", Art_height + 2 * Clearance,
         Rabbet_depth == 0 ? " (rabbet omitted)" : ""));
echo(str("Rail blanks (2): ", rail_blank, " long x ", Member_width, " wide x ", Thickness, " thick"));
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
    (Joinery == "miter" || is_reinforced_miter) ? [[0, Thickness, "miter"]] :
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
// Corner coordinates: a and b run inward from the two outside edges.
// s crosses the miter; t follows the miter from its outside point inward.
function corner_sign(k) = [[-1,1],[1,1],[-1,-1],[1,-1]][k];
function corner_point(k,s,t,z) = let(sign=corner_sign(k), a=(t+s)/sqrt(2), b=(t-s)/sqrt(2))
    [sign[0]*(rail_length/2-a),sign[1]*(stile_length/2-b),z];
module corner_transform(k) {
    sign=corner_sign(k); c=1/sqrt(2);
    multmatrix([[-sign[0]*c,-sign[0]*c,0,sign[0]*rail_length/2*inch],
                [sign[1]*c,-sign[1]*c,0,sign[1]*stile_length/2*inch],
                [0,0,1,0],[0,0,0,1]]) children();
}
module miter_insert(k,j) corner_transform(k) {
    if (Joinery == "loose_tenon_miter")
        box([-loose_depth,loose_center-loose_width/2,tenon_back],
            [loose_depth,loose_center+loose_width/2,tenon_front]);
    else if (Joinery == "splined_miter") {
        z=Thickness*(j+1)/(Spline_count+1)-spline_thickness/2;
        translate([0,0,z*inch]) linear_extrude(height=spline_thickness*inch)
            polygon([[0,0],[-spline_depth,spline_depth],[spline_depth,spline_depth]]*inch);
    } else {
        // The buried edge is thicker than the outside tip: a real dovetail
        // cross-section, routed across the corner and trimmed flush outside.
        points=[for (side=[-1,1]) each [[0,0,Thickness/2+side*key_tip/2],
            [-key_depth,key_depth,Thickness/2+side*key_thickness/2],
            [key_depth,key_depth,Thickness/2+side*key_thickness/2]]];
        polyhedron(points=points*inch,faces=[[2,1,0],[4,5,3],[1,4,3,0],[2,5,4,1],[0,3,5,2]],convexity=4);
    }
}
module dowel(k,j) {
    sign=corner_sign(k);
    translate([sign[0]*opening_width/2,sign[1]*(opening_height/2+dowel_v(j)),Thickness/2]*inch)
        rotate([0,90,0]) cylinder(h=2*dowel_depth*inch,d=dowel_diameter*inch,center=true,$fn=32);
}
module mt_tool(k,overrun=false) {
    sign=corner_sign(k);
    x0=sign[0]*opening_width/2; x1=sign[0]*(opening_width/2+mt_depth);
    y0=sign[1]*(opening_height/2+tenon_inset); y1=sign[1]*(opening_height/2+tenon_inset+tenon_width);
    box([min(x0,x1)-(overrun && sign[0]>0 ? eps : 0),min(y0,y1),tenon_back],
        [max(x0,x1)+(overrun && sign[0]<0 ? eps : 0),max(y0,y1),tenon_front]);
}
module square_member(i) {
    rail=i<2; length=rail ? rail_blank : stile_length;
    difference() {
        linear_extrude(height=Thickness*inch)
            polygon([for(p=[[-length/2,0],[length/2,0],[length/2,Member_width],[-length/2,Member_width]]) xy(i,p[0],p[1])*inch]);
        if (is_mt && rail) for (sign=[-1,1]) {
            // Cut shoulders from one blank, retaining an integral rail tenon.
            for (cut=[[0,tenon_inset,-eps,Thickness+eps],
                      [tenon_inset+tenon_width,Member_width,-eps,Thickness+eps],
                      [0,Member_width,-eps,tenon_back],[0,Member_width,tenon_front,Thickness+eps]]) {
                translate([0,0,cut[2]*inch]) linear_extrude(height=(cut[3]-cut[2])*inch)
                    polygon([for(p=[[-length/2-eps,cut[0] == 0 ? -eps : cut[0]],[-opening_width/2,cut[0] == 0 ? -eps : cut[0]],
                                    [-opening_width/2,cut[1] == Member_width ? Member_width+eps : cut[1]],[-length/2-eps,cut[1] == Member_width ? Member_width+eps : cut[1]]])
                        xy(i,sign*p[0],p[1])*inch]);
            }
        }
        if (is_mt && !rail) for(k=[0:3]) mt_tool(k,true);
        if (Joinery == "dowelled_butt") for(k=[0:3]) for(j=[0:Dowel_count-1]) dowel(k,j);
        if (Rabbet_depth > 0) box([-Art_width/2-Clearance,-Art_height/2-Clearance,-eps],
                                 [Art_width/2+Clearance,Art_height/2+Clearance,Rabbet_depth]);
    }
}
module member(i) {
    if (Joinery == "half_lap") half_lap_member(i);
    else if (is_square) square_member(i);
    else difference() {
        shaped_member(i);
        if (is_reinforced_miter) for(k=[0:3]) for(j=[0:insert_count-1]) miter_insert(k,j);
    }
}
module frame(assembled = false) union() {
    for (i=[0:3]) if (assembled || Part == "all" || Part == part_ids[i])
        color(part_colors[i])
            translate((!assembled && Exploded && Part == "all" ? offsets[i] : [0,0,0])*inch) member(i);
    if (has_inserts) for(k=[0:3]) for(j=[0:insert_count-1])
        if (assembled || Part == "all" || (Part == "insert" && k == 0 && j == 0))
            color(insert_colors[k*3+j])
                translate((!assembled && Exploded && Part == "all" ?
                    [corner_sign(k)[0]*Member_width/2,corner_sign(k)[1]*Member_width/2,2*Thickness] : [0,0,0])*inch)
                    if (Joinery == "dowelled_butt") dowel(k,j); else miter_insert(k,j);
}

// Finished rectangular blanks BEFORE machining. Insert grain runs along the
// listed length (across the miter); dowel blanks are turned to the given diameter.
echo("CUTLIST_STOCK_V1", [14,10,0.0625,0.0625]);
echo("CUTLIST_V1", concat([for(i=[0:3])
    [part_ids[i],["Top rail","Bottom rail","Left stile","Right stile"][i],"Solid wood",1,
     Thickness,Member_width,i<2 ? rail_blank : stile_length,
     rail_blank == stile_length ? "Frame member" : i<2 ? "Rail" : "Stile"]],
    !has_inserts ? [] : [for(k=[0:3]) for(j=[0:insert_count-1])
        [str("insert-",k,"-",j),insert_name,"Solid wood",1,insert_thickness,insert_width,insert_length,insert_name]]));

// Witness coordinates encode whole mm + millionths to retain inch fractions
// through OpenSCAD echo's six-significant-digit formatting.
function dp(p) = [for (n = p * inch) [floor(n), round((n - floor(n)) * 1000000)]];
function dim(label, a, b, direction, side, tier = 1) = [label, dp(a), dp(b), direction, side, tier];
function guide(a, b) = [dp(a), dp(b)];
function section(depth, crop, breaks = [], notes = [], contacts = []) =
    [dp([depth,0,0])[0], [for(n=crop) dp([n,0,0])[0]], breaks, notes, contacts];
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

// New-joint manufacturing sheets. A blank sheet and a separate enlarged
// machining sheet keep small mortises legible without crowding full-length views.
function blank_sheet(rail) = let(
    length=rail ? rail_blank : stile_length,
    pocket_run=min(length,(rail ? Art_width : Art_height)+2*Clearance),
    base=lap_part_sheet(rail)
) [rail ? "rail" : "stile",rail ? "Rails" : "Stiles",2,[
    str(joint_title, ". Both ends match; see the enlarged machining sheet for joint cuts."),
    has_miter ? "Cut both ends at 45 degrees. Length is long point to long point." :
        rail && is_mt ? "Blank length includes two integral tenons. Square shoulders are spaced by the opening width." :
        rail ? "Square rail ends butt against the inside edges of the stiles." : "Stiles run the full outside height. Both ends are square.",
    Rabbet_depth > 0 ? "BACK rabbet: dashed lines mark centered cutting limits, including removed shoulder material." : "Rear rabbet omitted.",
    "Grain follows the blank length. Finished sizes shown; rough-stock allowances are in the cut list."
],base[4],[
    ["face","Front face / dashed: rear pocket cut limits",
     rail ? [[1,0,0],[0,1,0],[0,0,1]] : [[0,1,0],[-1,0,0],[0,0,1]],[
        pd(rail,"Blank length",[-length/2,Member_width,Thickness],[length/2,Member_width,Thickness],"horizontal",1),
        pd(rail,"Blank width",[length/2,0,Thickness],[length/2,Member_width,Thickness],"vertical",1),
        if (has_miter) pd(rail,"45 deg miter run",[-length/2,0,Thickness],[-length/2+Member_width,0,Thickness],"horizontal",-1),
        if (rail && is_mt) pd(rail,"Between shoulders",[-opening_width/2,0,Thickness],[opening_width/2,0,Thickness],"horizontal",-1),
        if (Rabbet_depth > 0 && length > pocket_run+eps)
            pd(rail,"Pocket end inset",[-length/2,0,0],[-pocket_run/2,0,0],"horizontal",-1,2),
        if (Rabbet_depth > 0) pd(rail,"Pocket cut run",[-pocket_run/2,0,0],[pocket_run/2,0,0],"horizontal",1,2)
     ],[],Rabbet_depth > 0 ? [
        pg(rail,[-pocket_run/2,0,0],[-pocket_run/2,rabbet_width,0]),
        pg(rail,[-pocket_run/2,rabbet_width,0],[pocket_run/2,rabbet_width,0]),
        pg(rail,[pocket_run/2,rabbet_width,0],[pocket_run/2,0,0])
     ] : []], base[5][2]
]];

ce_s=[1/sqrt(2),1/sqrt(2),0];
ce_t=[1/sqrt(2),-1/sqrt(2),0];
ce_z=[0,0,1];
function kp(s,t,z)=corner_point(0,s,t,z);
function kd(label,a,b,direction,side,tier=1)=dim(label,kp(a[0],a[1],a[2]),kp(b[0],b[1],b[2]),direction,side,tier);
function kg(a,b)=guide(kp(a[0],a[1],a[2]),kp(b[0],b[1],b[2]));
function kcrop(a,b,axes)=[kp(a[0],a[1],a[2])*axes[0],kp(a[0],a[1],a[2])*axes[1],
                         kp(b[0],b[1],b[2])*axes[0],kp(b[0],b[1],b[2])*axes[1]];
slot_t0=Joinery == "loose_tenon_miter" ? loose_center-loose_width/2 : 0;
slot_t1=Joinery == "loose_tenon_miter" ? loose_center+loose_width/2 : insert_width;
slot_z=Joinery == "splined_miter" ? Thickness/(Spline_count+1) : Joinery == "loose_tenon_miter" ? (tenon_back+tenon_front)/2 : Thickness/2;
slot_z0=slot_z-insert_thickness/2;
slot_z1=slot_z+insert_thickness/2;
slot_tc=(slot_t0+slot_t1)/2;

function miter_machining_sheet() = let(
    end_axes=[ce_t,ce_z,-ce_s], depth_axes=[ce_s,ce_z,ce_t],
    reach=Joinery == "loose_tenon_miter" ? loose_depth : slot_tc,
    max_s=slot_tc
) ["miter-machining","Miter end machining",4,[
    "Same machining at every 45-degree end. Top-left rail shown; mirror the opposite ends and mating stiles.",
    Joinery == "loose_tenon_miter" ? "Rectangular mortises normal to the miter face. Square the corners; use matching shop-made loose tenons." :
    Joinery == "splined_miter" ? str(Spline_count," slot(s) per corner, equally spaced through thickness. Slots run across the glued corner.") :
        str("Dovetail groove across the corner; ",Key_angle," degree flanks. Buried thickness is greater than the outside tip."),
    "End-face distances follow the 45-degree miter from its outside long point; they are not distances along an outside edge.",
    "Nominal zero-clearance fit. Test the cutter setup and fit inserts to the actual mortises."
],[184/255,121/255,36/255],[
    ["end","Miter end face / view from outside",end_axes,[
        kd("Miter face",[0,0,Thickness],[0,sqrt(2)*Member_width,Thickness],"horizontal",1),
        kd("Stock",[0,sqrt(2)*Member_width,0],[0,sqrt(2)*Member_width,Thickness],"vertical",1),
        kd(Joinery == "loose_tenon_miter" ? "Mortise width" : "Slot depth",[0,slot_t0,0],[0,slot_t1,0],"horizontal",-1),
        if (slot_t0 > eps) kd("Long point to mortise",[0,0,0],[0,slot_t0,0],"horizontal",-1,2),
        kd(Joinery == "dovetail_key_miter" ? "Buried thickness" : "Slot thickness",[0,slot_t1,slot_z0],[0,slot_t1,slot_z1],"vertical",-1),
        kd(Joinery == "dovetail_key_miter" ? "Back cheek at depth" : "Back to first slot",[0,slot_t1,0],[0,slot_t1,slot_z0],"vertical",-1,2),
        if (Joinery == "splined_miter" && Spline_count > 1)
            kd("Slot center spacing",[0,slot_t1,slot_z],[0,slot_t1,slot_z+Thickness/(Spline_count+1)],"vertical",1,2),
        if (Joinery == "dovetail_key_miter") kd("Tip thickness",[0,0,Thickness/2-key_tip/2],[0,0,Thickness/2+key_tip/2],"vertical",1,2)
     ],section(kp(0,0,0)*(-ce_s),kcrop([0,0,0],[0,sqrt(2)*Member_width,Thickness],end_axes))],
    ["embedment","Section normal to the miter / rail side",depth_axes,[
        kd("Embedment",[0,slot_tc,slot_z],[reach,slot_tc,slot_z],"horizontal",-1),
        kd("Stock",[max_s,slot_tc,0],[max_s,slot_tc,Thickness],"vertical",1)
     ],section(kp(0,slot_tc,0)*ce_t,kcrop([0,slot_tc,0],[max_s,slot_tc,Thickness],depth_axes),[],[
        str("Section distance from outside long point along miter: ",slot_tc," in."),
        Joinery == "loose_tenon_miter" ? "Depth is measured normal to each miter face." : "Slot passes through both outside edges; depth is set on the end-face view."
     ])]
]];

function reinforced_corner(plan) = let(
    axes=plan ? [ce_s,ce_t,ce_z] : [ce_s,ce_z,ce_t],
    span=Member_width/sqrt(2),
    reach=Joinery == "loose_tenon_miter" ? loose_depth : slot_tc,
    z0=Joinery == "dovetail_key_miter" ? Thickness/2-key_tip/2-slot_tc*tan(Key_angle) : slot_z0,
    z1=Joinery == "dovetail_key_miter" ? Thickness/2+key_tip/2+slot_tc*tan(Key_angle) : slot_z1
) [plan ? "joint-longitudinal" : "joint-transverse",
    plan ? "A-A / Plan through the first insert" : "B-B / Normal to the miter through insert center", axes,
    plan ? [
        kd("Insert blank length",[-insert_length/2,slot_t1,slot_z],[insert_length/2,slot_t1,slot_z],"horizontal",1),
        kd(Joinery == "loose_tenon_miter" ? "Mortise width" : "Slot depth",[0,slot_t0,slot_z],[0,slot_t1,slot_z],"vertical",-1),
        if (slot_t0 > eps) kd("Long point to mortise",[0,0,slot_z],[0,slot_t0,slot_z],"vertical",-1,2)
    ] : [
        kd("Each-side embedment",[0,slot_tc,slot_z],[reach,slot_tc,slot_z],"horizontal",-1),
        kd("Stock",[span,slot_tc,0],[span,slot_tc,Thickness],"vertical",1),
        kd("Insert at section",[0,slot_tc,z0],[0,slot_tc,z1],"vertical",-1),
        kd("Back to insert",[0,slot_tc,0],[0,slot_tc,z0],"vertical",-1,2)
    ], section(plan ? slot_z : kp(0,slot_tc,0)*ce_t,
        plan ? kcrop([-span,0,0],[span,Member_width*sqrt(2),0],axes)
             : kcrop([-span,slot_tc,0],[span,slot_tc,Thickness],axes),[],[
        "Top-left corner. All four corners match; inserts have separate colors.",
        plan ? str("Section above back: ",slot_z," in.") : str("Section along miter from outside point: ",slot_tc," in."),
        Joinery == "dovetail_key_miter" ? str("Dovetail cutter flank: ",Key_angle," degrees each side.") : "Miter angle: 45 degrees."
    ])];

// Square joints: local face coordinate v follows the rail width outward.
function sp(x,v,z)=[x,opening_height/2+v,z];
function sd(label,a,b,direction,side,tier=1)=dim(label,sp(a[0],a[1],a[2]),sp(b[0],b[1],b[2]),direction,side,tier);
function sg(a,b)=guide(sp(a[0],a[1],a[2]),sp(b[0],b[1],b[2]));
square_z0=is_mt ? tenon_back : (Thickness-dowel_diameter)/2;
square_z1=is_mt ? tenon_front : (Thickness+dowel_diameter)/2;
square_v=is_mt ? tenon_inset+tenon_width/2 : dowel_v(0);
square_depth=is_mt ? mt_depth : dowel_depth;

function square_machining_sheet(rail) = let(
    shoulder=-opening_width/2, outside=-rail_length/2,
    depth_x=rail ? -rail_blank/2 : shoulder,
    cut_v0=is_mt ? tenon_inset : dowel_v(0),
    cut_v1=is_mt ? tenon_inset+tenon_width : dowel_v(Dowel_count-1),
    lo=rail ? -rail_blank/2 : outside,
    hi=rail ? shoulder+min(Member_width,opening_width/2) : shoulder,
    color=rail ? [184/255,121/255,36/255] : [44/255,120/255,181/255]
) [rail ? "rail-machining" : "stile-machining",rail ? "Rail end machining" : "Stile corner machining",2,[
    "Machining detail for the same two members on the blank sheet; this is not an additional pair of parts.",
    is_mt ? (rail ? "Integral tenons at both ends. Four square shoulders surround each tenon." :
        Joinery == "through_mortise_tenon" ? "Rectangular mortises pass through the stile width. Tenon ends finish flush outside." :
        "Rectangular blind mortises open on the inside edge. Leave the dimensioned outside end wall.") :
        str(Dowel_count," round, blind holes at each corner. Hole centers are on the stock mid-thickness plane."),
    rail ? "End face: measure face offsets outward from the frame opening edge." :
        "Inside edge: measure the end inset from the stile's outside end. Repeat at its other end.",
    "Nominal zero-clearance fit. Fit to test stock; refer to the blank sheet for the rear rabbet."
],color,[
    ["end",is_mt && rail ? "Tenon end / dashed: original rail outline" : rail ? "Rail end / drilling pattern" : "Inside edge / top corner opening",
     [[0,1,0],[0,0,1],rail ? [-1,0,0] : [1,0,0]],[
        sd("Member width",[depth_x,0,Thickness],[depth_x,Member_width,Thickness],"horizontal",1),
        sd("Stock",[depth_x,Member_width,0],[depth_x,Member_width,Thickness],"vertical",1),
        if (is_mt) sd(rail ? "Tenon width" : "Mortise width",[depth_x,cut_v0,0],[depth_x,cut_v1,0],"horizontal",-1),
        if (!is_mt && Dowel_count > 1) sd("Hole spacing",[depth_x,dowel_v(0),Thickness/2],[depth_x,dowel_v(1),Thickness/2],"horizontal",-1),
        sd(rail ? "Opening edge inset" : "End inset",[depth_x,rail ? 0 : cut_v1,0],[depth_x,rail ? cut_v0 : Member_width,0],"horizontal",-1,2),
        sd(is_mt ? "Tongue / mortise" : "Hole diameter",[depth_x,cut_v0,square_z0],[depth_x,cut_v0,square_z1],"vertical",-1),
        sd(is_mt ? "Back cheek" : "Back to centers",[depth_x,0,0],[depth_x,0,is_mt ? square_z0 : Thickness/2],"vertical",-1,2)
     ],section(rail ? -depth_x : depth_x,[opening_height/2,0,stile_length/2,Thickness]),[
        sg([depth_x,0,0],[depth_x,Member_width,0]),sg([depth_x,0,Thickness],[depth_x,Member_width,Thickness]),
        sg([depth_x,0,0],[depth_x,0,Thickness]),sg([depth_x,Member_width,0],[depth_x,Member_width,Thickness]),
        if (!is_mt) for(j=[0:Dowel_count-1]) sg([depth_x,dowel_v(j),0],[depth_x,dowel_v(j),Thickness])
     ]],
    ["depth",is_mt ? "Section through tenon / mortise center" : "Section through first dowel center",[[1,0,0],[0,0,1],[0,-1,0]],[
        sd(is_mt ? (rail ? "Tenon length" : "Mortise depth") : "Hole depth",
           [shoulder-(is_mt || !rail ? square_depth : 0),square_v,0],
           [shoulder+(is_mt || !rail ? 0 : square_depth),square_v,0],"horizontal",-1),
        if (!rail && (!is_mt || Joinery == "blind_mortise_tenon"))
            sd("Outside wall",[outside,square_v,0],[shoulder-square_depth,square_v,0],"horizontal",1),
        sd("Stock",[hi,square_v,0],[hi,square_v,Thickness],"vertical",1)
     ],section(-opening_height/2-square_v,[lo,0,hi,Thickness],rail ? ["right"] : [],[
        str("Section offset from opening edge: ",square_v," in.")
     ])]
]];

function square_corner(plan) = let(
    shoulder=-opening_width/2, outside=-rail_length/2,
    hi=shoulder+min(Member_width,opening_width/2),
    z=is_mt ? (tenon_back+tenon_front)/2 : Thickness/2,
    lo_y=opening_height/2-min(Member_width,opening_height/2)
) [plan ? "joint-transverse" : "joint-longitudinal",
    plan ? "B-B / Plan through tongue or dowel centers" : "A-A / Longitudinal through first joint feature",
    plan ? [[1,0,0],[0,1,0],[0,0,1]] : [[1,0,0],[0,0,1],[0,-1,0]],
    plan ? [
        sd("Stile width",[outside,Member_width,z],[shoulder,Member_width,z],"horizontal",1),
        if (is_mt) each [
            sd("Tenon width",[shoulder,tenon_inset,z],[shoulder,tenon_inset+tenon_width,z],"vertical",1),
            sd("End shoulder",[outside,tenon_inset+tenon_width,z],[outside,Member_width,z],"vertical",-1)
        ],
        if (!is_mt && Dowel_count > 1) sd("Dowel spacing",[shoulder,dowel_v(0),z],[shoulder,dowel_v(1),z],"vertical",1),
        if (!is_mt) sd("End to outer center",[outside,dowel_v(Dowel_count-1),z],[outside,Member_width,z],"vertical",-1)
    ] : [
        sd(is_mt ? "Tenon / mortise depth" : "Each-side embedment",[shoulder-square_depth,square_v,0],[shoulder,square_v,0],"horizontal",-1),
        sd("Stock",[hi,square_v,0],[hi,square_v,Thickness],"vertical",1),
        sd(is_mt ? "Tenon thickness" : "Dowel diameter",[shoulder,square_v,square_z0],[shoulder,square_v,square_z1],"vertical",-1),
        sd("Back to feature",[shoulder,square_v,0],[shoulder,square_v,square_z0],"vertical",-1,2)
    ], section(plan ? z : -opening_height/2-square_v,
        plan ? [outside,lo_y,hi,stile_length/2] : [outside,0,hi,Thickness],plan ? ["right","bottom"] : ["right"],[
        "Top-left corner. Repeat at all four corners.",
        plan ? str("Section above back: ",z," in.") : str("Section offset from opening edge: ",square_v," in."),
        is_mt ? "Rail shoulders seat on the stile inside edge." : str(Dowel_count," dowels per corner, centered through stock thickness.")
    ])];

function insert_sheet() = Joinery == "dowelled_butt" ? let(
    x=-opening_width/2, v=dowel_v(0), z=Thickness/2, r=dowel_diameter/2
) ["insert","Dowels",4*Dowel_count,[
    str(Dowel_count," identical dowels per corner. Grain runs along the dowel axis."),
    "Cut list lists square turning blanks: diameter x diameter x length. Turn round, or cut equivalent purchased round dowel stock.",
    "Nominal diameter equals the drilled hole. Fit to test holes before assembly."
],[135/255,84/255,173/255],[
    ["side","Side / dowel length",[[1,0,0],[0,0,1],[0,-1,0]],[
        sd("Length",[x-dowel_depth,v,z],[x+dowel_depth,v,z],"horizontal",-1),
        sd("Diameter",[x,v,z-r],[x,v,z+r],"vertical",1)
    ]],
    ["end","End / round section",[[0,1,0],[0,0,1],[1,0,0]],[
        sd("Diameter",[x,v-r,z],[x,v+r,z],"horizontal",-1)
    ]]
]] : ["insert",Joinery == "splined_miter" ? "Splines" : Joinery == "loose_tenon_miter" ? "Loose tenons" : "Dovetail keys",4*insert_count,[
    Joinery == "loose_tenon_miter" ? "Rectangular shop-made tenons. Grain follows length, crossing the miter seam." :
        "Triangular plan: two equal 45-degree sides, centered apex. Grain follows blank length across the seam.",
    Joinery == "splined_miter" ? str(Spline_count," spline(s) per corner. Cut matching rectangular blanks, then trim flush to both outside faces.") :
        Joinery == "dovetail_key_miter" ? str("Dovetail flanks: ",Key_angle," degrees each side. Thickness increases from outside tip to buried edge.") :
        "Length includes equal embedment in each member. Square mortise corners to suit these tenons.",
    "Dimensions are nominal finished blanks. Adjust the actual fit to your cutter and test joints."
],[135/255,84/255,173/255],[
    ["plan","Front / grain along blank length",[ce_s,ce_t,ce_z],[
        kd("Blank length",[-insert_length/2,slot_t1,slot_z],[insert_length/2,slot_t1,slot_z],"horizontal",1),
        kd("Blank width",[0,slot_t0,slot_z],[0,slot_t1,slot_z],"vertical",-1)
    ]],
    ["edge",Joinery == "dovetail_key_miter" ? "Edge / dovetail taper" : "Edge / thickness",[ce_t,ce_z,ce_s],[
        kd("Width",[0,slot_t0,slot_z0],[0,slot_t1,slot_z0],"horizontal",-1),
        kd(Joinery == "dovetail_key_miter" ? "Buried thickness" : "Thickness",[0,slot_t1,slot_z0],[0,slot_t1,slot_z1],"vertical",1),
        if (Joinery == "dovetail_key_miter") kd("Tip thickness",[0,0,Thickness/2-key_tip/2],[0,0,Thickness/2+key_tip/2],"vertical",-1)
    ]]
]];

if (!is_undef($misc_drawing) && $misc_drawing) {
    echo("PART_DRAWINGS_V1", !has_machining_sheet ? [frame_part_sheet(true),frame_part_sheet(false)] : concat(
        [blank_sheet(true),blank_sheet(false)],
        is_reinforced_miter ? [miter_machining_sheet()] : [square_machining_sheet(true),square_machining_sheet(false)],
        has_inserts ? [insert_sheet()] : []));
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
        is_reinforced_miter ? reinforced_corner(true) : is_square ? square_corner(false) : corner_section(true),
        is_reinforced_miter ? reinforced_corner(false) : is_square ? square_corner(true) : corner_section(false)
    ], [str(joint_title, (Joinery == "bridle" || Joinery == "dowelled_butt") ? " detail" : " corner detail"),
        has_machining_sheet ? "Enlarged sections through the top-left joint features. Hatches distinguish members and inserts." :
        "Enlarged sections through the top-left corner, outside the rear pocket. Hatches distinguish rail and stile.",
        is_reinforced_miter ? "Matching 45-degree faces meet around fitted inserts. All four corners use the same joint." :
        is_mt ? "Integral rail tenons fit the stile mortises; four shoulders seat against the stile inside edge." :
        Joinery == "dowelled_butt" ? "Square rail ends seat against the stile inside edges; fitted dowels bridge the joint." :
        Joinery == "miter" ? "Contact: matching 45-degree end faces meet through the full stock thickness." :
        is_bridle ? "Contact: rail tongue seats between the stile cheeks. All four corners use the same joint." :
        "Contact: the rail front layer bears on the stile back layer. All four corners use the same joint."]]);
    frame(true);
} else frame();
