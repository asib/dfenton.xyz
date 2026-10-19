/*
  TOOL TOTE — parametric solid-wood construction, from IMG_2348.HEIC.
  Dimensions entered in INCHES; generated geometry is in MILLIMETRES.
  X = tote length / grain of sides, handle and bottom.
  Y = tote width. Z = height above the bottom edge of the wooden sides.

  Confirmed: 10.75 is RISER LENGTH, not overall tote height. The handle
  starts as a 3 x 1.125 blank, laminated from two pieces across its width.
  Its underside notches seat 3 above the 6-high sides. The 0.75 notch depth
  and 0.25 riser housing depth are adjustable, user-confirmed defaults.
  Each underside notch continues out through the handle end. Its flat
  ceiling rests on the riser-slot floor, with no second step at the tip.
  The bottom is two edge-glued, bookmatched halves resawn from ONE parent
  board, NOT plywood. Keep stock at least 14 long through jointing/planing
  and 10 long through table-saw operations; finish shorter parts afterward.

  Interpretations left adjustable: end panels sit 0.75 in from side ends,
  enter 0.25-deep side dados, and have square tops; risers start at Z=0.
  Bottom grooves sit 0.5 above the wall bottoms. The side grooves are
  stopped within the end panels, at the roots of the end-panel grooves.
  Screws enter through the riser's outside face along X, below the slot
  floor, into the handle's notch-shoulder end grain. Optional nominal pilot
  bores are off by default; size, height and embedment remain adjustable
  placeholders. No fasteners, countersinks or stepped holes are modeled.

  OpenSCAD 2021.01-compatible; no external libraries.
  Also see https://github.com/matthova/openrscad and
  https://openrscad.com/playground for the OpenRSCAD engine/playground.
  Open the Customizer, or edit parameters below. Use individual Part views
  for mesh export: touching components may fuse in an assembly STL.
*/

/* [View] */
Part = "assembly"; // [assembly, exploded, side, end, riser, handle, handle_laminate_1, handle_laminate_2, bottom, bottom_half_1, bottom_half_2, joint_detail]
// Separation in the exploded view, inches. Does not change the joinery.
Explode = 1.5; // [0:0.125:4]
Show_cut_list = true;

/* [Body - inches] */
Body_length = 18;
Body_width = 9;
Side_height = 6;
Side_thickness = 0.75;
End_thickness = 0.75;
// Distance from a side's end to the OUTSIDE face of its end panel.
End_setback = 0.75;
// End panels enter transverse dados cut into the side boards.
End_dado_depth = 0.25;

/* [Risers - inches] */
Riser_length = 10.75;
Riser_width = 2.5;
Riser_thickness = 0.75;
// Housing cut into the OUTSIDE face of each end panel.
Riser_dado_depth = 0.25;

/* [Laminated handle - inches] */
Handle_length = 20;
Handle_blank_height = 3;
Handle_width = 1.125;
// Two laminations across handle width; 0.5 means equal 9/16-inch layers.
Handle_lamination_fraction = 0.5; // [0.2:0.05:0.8]
// Distance from side-board TOP to the horizontal seat in each handle notch.
Notch_clearance_above_sides = 3;
// Depth of the continuous underside notch, from each riser's inside edge through the handle end. Its ceiling seats on the riser-slot floor.
Handle_notch_depth = 0.75;

/* [Bookmatched solid bottom - inches] */
Bottom_thickness = 0.25;
Bottom_groove_depth = 0.25;
// Height to the LOWER face of the bottom panel/groove.
Bottom_groove_height = 0.5;
// TOTAL allowance between the two opposing groove roots, not per edge.
Bottom_width_allowance = 0.125;
Bottom_length_allowance = 0.125;
// Total vertical play in a bottom groove, cut above the supported panel.
Bottom_groove_fit = 0;

/* [Joinery fit - inches] */
// Total extra width on dados/notches. Zero gives nominal mating surfaces.
Joint_fit = 0;

/* [Optional end-grain screw bores - inches] */
// X-axis pilot path through each riser into the handle's notch shoulder, centered across handle width. Size/depth are provisional.
End_grain_screw_bores = false;
Screw_bore_diameter = 0.15625;
// Pilot depth into the handle, measured from its end-grain notch shoulder.
Screw_embedment = 1;
// Fraction of notch depth above the handle's middle underside.
Screw_height_fraction = 0.5; // [0.2:0.1:0.8]

/* [Hidden] */
// One color per physical piece; IDs match the viewer legend.
side_a_color = [44/255, 120/255, 181/255];
side_b_color = [57/255, 152/255, 165/255];
end_a_color = [184/255, 121/255, 36/255];
end_b_color = [182/255, 72/255, 59/255];
riser_a_color = [119/255, 98/255, 175/255];
riser_b_color = [180/255, 84/255, 139/255];
handle_a_color = [214/255, 108/255, 50/255];
handle_b_color = [86/255, 125/255, 50/255];
bottom_a_color = [122/255, 134/255, 154/255];
bottom_b_color = [188/255, 169/255, 73/255];

// Stock-preparation defaults for the console cut list and web worksheet.
// These affect stock planning only, not the finished model. Web worksheet
// controls can override them without changing the finished SCAD dimensions.
stock_milling_min_length = 14;
stock_saw_min_length = 10;
stock_resaw_kerf = 1/16;
stock_resaw_cleanup_per_half = 1/16;

inch = 25.4;
eps = 0.001;
$fn = 40;

inner_w = Body_width - 2 * Side_thickness;
end_w = inner_w + 2 * End_dado_depth;
end_outer_x = Body_length / 2 - End_setback;
end_inner_x = end_outer_x - End_thickness;
inner_l = 2 * end_inner_x;
// Canonical end/riser geometry is the +X end; mirror for the other end.
riser_inner_x = end_outer_x - Riser_dado_depth;
riser_center_x = riser_inner_x + Riser_thickness / 2;
riser_outer_x = riser_inner_x + Riser_thickness;
notch_seat_z = Side_height + Notch_clearance_above_sides;
handle_bottom_z = notch_seat_z - Handle_notch_depth;
handle_top_z = handle_bottom_z + Handle_blank_height;
bridle_engagement = Riser_length - notch_seat_z;
bottom_w = inner_w + 2 * Bottom_groove_depth - Bottom_width_allowance;
bottom_l = inner_l + 2 * Bottom_groove_depth - Bottom_length_allowance;
side_groove_half_length = end_inner_x + Bottom_groove_depth;
lamination_y = -Handle_width / 2 + Handle_width * Handle_lamination_fraction;
handle_notch_x = riser_inner_x - Joint_fit/2;
screw_z = handle_bottom_z + Handle_notch_depth * Screw_height_fraction;
screw_inner_x = handle_notch_x - Screw_embedment;

assert(Body_length > 0 && Body_width > 0 && Side_height > 0,
       "Body dimensions must be positive.");
assert(Side_thickness > 0 && End_thickness > 0 && inner_l > 0 && inner_w > 0,
       "Wall thicknesses/end placement leave no usable interior.");
assert(End_setback >= 0 && End_dado_depth > 0 && End_dado_depth < Side_thickness,
       "End dados must leave wood behind them.");
assert(End_setback == 0 || End_setback > Joint_fit / 2,
       "End dado fit breaks through the side end; increase End_setback.");
assert(Riser_length > Side_height && Riser_width > Handle_width + Joint_fit &&
       Riser_width + Joint_fit < inner_w && Riser_thickness > 0,
       "Risers must fit the end panels and leave two bridle cheeks.");
assert(Riser_dado_depth > 0 && Riser_dado_depth < End_thickness &&
       Riser_dado_depth < Riser_thickness,
       "Riser housing must be shallower than both mating boards.");
assert(Bottom_groove_depth > 0 && Bottom_groove_depth < Side_thickness &&
       Bottom_groove_depth + Riser_dado_depth < End_thickness,
       "Leave a web between the end's bottom groove and riser housing.");
assert(Bottom_thickness > 0 && Bottom_groove_height > 0 &&
       Bottom_groove_height + Bottom_thickness + Bottom_groove_fit < Side_height,
       "Bottom groove must fit within the side height.");
assert(Bottom_width_allowance >= 0 && Bottom_length_allowance >= 0 &&
       Bottom_width_allowance < 2 * Bottom_groove_depth &&
       Bottom_length_allowance < 2 * Bottom_groove_depth && bottom_w > 0 && bottom_l > 0,
       "Bottom panel must engage all four grooves.");
assert(Joint_fit >= 0 && Bottom_groove_fit >= 0, "Fits cannot be negative.");
assert(Handle_notch_depth > 0 && Handle_notch_depth < Handle_blank_height &&
       handle_bottom_z > Side_height && bridle_engagement > 0 &&
       handle_top_z >= Riser_length,
       "Handle must clear sides, engage riser slots and cover riser tops.");
assert(Handle_length / 2 > riser_outer_x + Joint_fit / 2,
       "Handle ends must extend beyond both risers.");
assert(Handle_lamination_fraction > 0 && Handle_lamination_fraction < 1,
       "Both handle laminations must have positive thickness.");
assert(!End_grain_screw_bores ||
       (Screw_bore_diameter > 0 && Screw_bore_diameter < Handle_width &&
        Screw_embedment > 0 && screw_inner_x > 0 &&
        screw_z - Screw_bore_diameter / 2 > handle_bottom_z &&
        screw_z + Screw_bore_diameter / 2 < notch_seat_z),
       "Screw bores must stay inside the notch shoulder and stop before the handle midpoint.");

// Coordinates and cutters below are INCHES, scaled once at the output.
module box_at(p, s) { translate(p) cube(s); }
module at_end(sign) {
    if (sign == 1) children();
    else mirror([1, 0, 0]) children();
}

module side_board() {
    // Canonical side is at +Y; its inside face is y=inner_w/2.
    difference() {
        box_at([-Body_length/2, inner_w/2, 0],
               [Body_length, Side_thickness, Side_height]);
        // Full-height transverse housings for both end panels.
        for (s = [-1, 1]) at_end(s)
            box_at([end_inner_x - Joint_fit/2, inner_w/2 - eps, -eps],
                   [End_thickness + Joint_fit, End_dado_depth + eps, Side_height + 2*eps]);
        // Stopped bottom groove: extend into the end-panel joinery only.
        // Follow the end groove roots as body/end dimensions change.
        box_at([-side_groove_half_length, inner_w/2-eps, Bottom_groove_height],
               [2*side_groove_half_length, Bottom_groove_depth+eps,
                Bottom_thickness+Bottom_groove_fit]);
    }
}

module end_board() {
    difference() {
        box_at([end_inner_x, -end_w/2, 0], [End_thickness, end_w, Side_height]);
        // Vertical riser housing, outside face.
        box_at([riser_inner_x, -(Riser_width+Joint_fit)/2, -eps],
               [Riser_dado_depth+eps, Riser_width+Joint_fit, Side_height+2*eps]);
        // Horizontal bottom groove, inside face.
        box_at([end_inner_x-eps, -end_w/2-eps, Bottom_groove_height],
               [Bottom_groove_depth+eps, end_w+2*eps,
                Bottom_thickness+Bottom_groove_fit]);
    }
}

module end_grain_bore() {
    translate([screw_inner_x, 0, screw_z]) rotate([0, 90, 0])
        cylinder(h=riser_outer_x-screw_inner_x+eps, d=Screw_bore_diameter);
}

module riser_board() {
    difference() {
        box_at([riser_inner_x, -Riser_width/2, 0],
               [Riser_thickness, Riser_width, Riser_length]);
        // Open bridle slot down from the riser top to the notch seat.
        box_at([riser_inner_x-eps, -(Handle_width+Joint_fit)/2, notch_seat_z],
               [Riser_thickness+2*eps, Handle_width+Joint_fit, bridle_engagement+eps]);
        if (End_grain_screw_bores) end_grain_bore();
    }
}

module handle_piece(y0, width) {
    difference() {
        box_at([-Handle_length/2, y0, handle_bottom_z],
               [Handle_length, width, Handle_blank_height]);
        // One continuous underside shoulder rests on each riser-slot floor
        // and extends through the handle end. Both laminations share it.
        for (s = [-1, 1]) at_end(s) {
            box_at([handle_notch_x, -Handle_width/2-eps, handle_bottom_z-eps],
                   [Handle_length/2-riser_inner_x+Joint_fit/2+eps,
                    Handle_width+2*eps, Handle_notch_depth+eps]);
            if (End_grain_screw_bores) end_grain_bore();
        }
    }
}

module handle_board() { handle_piece(-Handle_width/2, Handle_width); }

module handle_laminate(index) {
    y0 = index == 0 ? -Handle_width/2 : lamination_y;
    w = Handle_width * (index == 0 ? Handle_lamination_fraction : 1-Handle_lamination_fraction);
    handle_piece(y0, w);
}

module bottom_half(index) {
    // Edge-glued mirror mates, grain runs X; seam along y=0.
    box_at([-bottom_l/2, index == 0 ? -bottom_w/2 : 0, Bottom_groove_height],
           [bottom_l, bottom_w/2, Bottom_thickness]);
}

module assembly(e=0) {
    for (s = [-1, 1]) {
        color(s == -1 ? side_a_color : side_b_color) translate([0, s*e, 0])
            if (s == 1) side_board(); else mirror([0, 1, 0]) side_board();
        color(s == -1 ? end_a_color : end_b_color) translate([s*e, 0, 0]) at_end(s) end_board();
        color(s == -1 ? riser_a_color : riser_b_color) translate([s*2*e, 0, e/2]) at_end(s) riser_board();
    }
    for (i = [0, 1]) {
        color(i == 0 ? handle_a_color : handle_b_color)
            translate([0, (i == 0 ? -1 : 1)*e/5, 2*e]) handle_laminate(i);
        color(i == 0 ? bottom_a_color : bottom_b_color)
            translate([0, (i == 0 ? -1 : 1)*e/4, -e]) bottom_half(i);
    }
}

module selected_part() {
    if (Part == "assembly") assembly();
    else if (Part == "exploded") assembly(Explode);
    else if (Part == "side") color(side_b_color) translate([Body_length/2, -inner_w/2, 0]) side_board();
    else if (Part == "end") color(end_b_color) translate([-end_inner_x, end_w/2, 0]) end_board();
    else if (Part == "riser") color(riser_b_color) translate([-riser_inner_x, Riser_width/2, 0]) riser_board();
    else if (Part == "handle") translate([Handle_length/2, Handle_width/2, -handle_bottom_z]) for(i=[0,1]) color(i == 0 ? handle_a_color : handle_b_color) handle_laminate(i);
    else if (Part == "handle_laminate_1") color(handle_a_color)
        translate([Handle_length/2, Handle_width/2, -handle_bottom_z]) handle_laminate(0);
    else if (Part == "handle_laminate_2") color(handle_b_color)
        translate([Handle_length/2, -lamination_y, -handle_bottom_z]) handle_laminate(1);
    else if (Part == "bottom")
        translate([bottom_l/2, bottom_w/2, -Bottom_groove_height])
            for(i=[0,1]) color(i == 0 ? bottom_a_color : bottom_b_color) bottom_half(i);
    else if (Part == "bottom_half_1" || Part == "bottom_half_2")
        color(Part == "bottom_half_1" ? bottom_a_color : bottom_b_color) cube([bottom_l, bottom_w/2, Bottom_thickness]);
    else if (Part == "joint_detail") intersection() {
        assembly();
        box_at([riser_inner_x-1, -Riser_width/2-0.5, Side_height+0.25],
               [Riser_thickness+2.5, Riser_width+1, handle_top_z-Side_height+0.5]);
    }
    else assert(false, str("Unknown Part: ", Part));
}

if (Show_cut_list) {
    echo("CUTLIST_STOCK_V1", [stock_milling_min_length, stock_saw_min_length,
                             stock_resaw_kerf, stock_resaw_cleanup_per_half]);
    // Structured worksheet: id, name, material, quantity, thickness, width, length, blank kind, optional resaw-parent group.
    // Finished rectangular blanks, before joinery; all dimensions in inches.
    echo("CUTLIST_V1", [
        ["side-a", "Side A", "Solid hardwood", 1, Side_thickness, Side_height, Body_length, "Side"],
        ["side-b", "Side B", "Solid hardwood", 1, Side_thickness, Side_height, Body_length, "Side"],
        ["end-a", "End A", "Solid hardwood", 1, End_thickness, Side_height, end_w, "End"],
        ["end-b", "End B", "Solid hardwood", 1, End_thickness, Side_height, end_w, "End"],
        ["riser-a", "Riser A", "Solid hardwood", 1, Riser_thickness, Riser_width, Riser_length, "Riser"],
        ["riser-b", "Riser B", "Solid hardwood", 1, Riser_thickness, Riser_width, Riser_length, "Riser"],
        ["handle-a", "Handle lamination A", "Solid hardwood", 1, Handle_width*Handle_lamination_fraction, Handle_blank_height, Handle_length, "Handle lamination"],
        ["handle-b", "Handle lamination B", "Solid hardwood", 1, Handle_width*(1-Handle_lamination_fraction), Handle_blank_height, Handle_length, "Handle lamination"],
        ["bottom-a", "Bottom half A", "Bookmatched hardwood", 1, Bottom_thickness, bottom_w/2, bottom_l, "Bottom half", "bottom-parent"],
        ["bottom-b", "Bottom half B", "Bookmatched hardwood", 1, Bottom_thickness, bottom_w/2, bottom_l, "Bottom half", "bottom-parent"]
    ]);
    echo("FINISHED BLANKS: inches; allow additional stock for machining.");
    echo("Sides x2: L, H, T", [Body_length, Side_height, Side_thickness]);
    echo("Ends x2: W, H, T", [end_w, Side_height, End_thickness]);
    echo("Risers x2: L, W, T", [Riser_length, Riser_width, Riser_thickness]);
    echo("Handle lamination A: L, H, T", [Handle_length, Handle_blank_height, Handle_width*Handle_lamination_fraction]);
    echo("Handle lamination B: L, H, T", [Handle_length, Handle_blank_height, Handle_width*(1-Handle_lamination_fraction)]);
    echo("Bookmatched bottom halves x2: L, W, T", [bottom_l, bottom_w/2, Bottom_thickness]);
    echo("Bottom parent x1: minimum milled T, rough W, rough L",
         [2*(Bottom_thickness+stock_resaw_cleanup_per_half)+stock_resaw_kerf,
          bottom_w/2+0.5, max(bottom_l+1, stock_milling_min_length, stock_saw_min_length)]);
    echo("Keep stock at least this long through jointer/planer and table-saw operations",
         [stock_milling_min_length, stock_saw_min_length]);
    echo("Glued bottom panel: L, W, T", [bottom_l, bottom_w, Bottom_thickness]);
    echo("Inside clear length/width", [inner_l, inner_w]);
    echo("Handle notch seat / handle top / riser top", [notch_seat_z, handle_top_z, Riser_length]);
    echo("Riser-slot engagement", bridle_engagement);
    echo("Continuous handle notch depth / remaining tip height",
         [Handle_notch_depth, Handle_blank_height-Handle_notch_depth]);
    echo("Body end setback and riser dado depth", [End_setback, Riser_dado_depth]);
}

// Drawing dimensions refer to actual model coordinates, in millimetres.
// Each view defines right/up/toward-camera axes, then dimension witnesses:
// [label, point A, point B, horizontal|vertical, outside side (-1|1), tier].
// The private drawing pass always renders the assembled tote, independent of Part.
// Avoid echo's six-significant-digit rounding: encode each millimetre
// coordinate as integer whole millimetres plus integer millionths.
function drawing_point(p) = [for (n=p*inch) [floor(n), round((n-floor(n))*1000000)]];
// Crop only the drawing, not the model. Breaks mark continuing material.
drawing_notch_x = handle_notch_x;
drawing_left_x = drawing_notch_x - 1;
drawing_bottom_z = max(Side_height + (handle_bottom_z-Side_height)/2, handle_bottom_z-0.75);
drawing_laminate_section_y = -Handle_width/2 + Handle_width*Handle_lamination_fraction/2;
// Part sheets select one physical mesh by its source color. Dimensions are
// finished sizes; stock preparation stays in the cut list. The optional sixth
// view field contains dashed machining/reference lines, not model edges.
function drawing_dim(label, a, b, direction, side, tier=1) =
    [label, drawing_point(a), drawing_point(b), direction, side, tier];
function drawing_line(a, b) = [drawing_point(a), drawing_point(b)];
function drawing_section(depth, crop, breaks=[]) = [depth*inch, crop*inch, breaks, [], []];
drawing_groove_top = Bottom_groove_height + Bottom_thickness + Bottom_groove_fit;
drawing_profile_top = min(Side_height, drawing_groove_top + 0.75);
drawing_dado_inner = end_inner_x - Joint_fit/2;
drawing_dado_outer = min(Body_length/2, end_outer_x + Joint_fit/2);
drawing_dado_left = max(-Body_length/2, drawing_dado_inner - 1);
drawing_cheek_y = ((Handle_width+Joint_fit)/2 + Riser_width/2)/2;

function drawing_handle_part(index, quantity) = let(
    y0 = index == 0 ? -Handle_width/2 : lamination_y,
    y1 = index == 0 ? lamination_y : Handle_width/2,
    outside_y = index == 0 ? y0 : y1,
    has_bore = End_grain_screw_bores && y0 < Screw_bore_diameter/2 && y1 > -Screw_bore_diameter/2,
    end_plane = (drawing_notch_x+Handle_length/2)/2
) [index == 0 ? "handle-a" : "handle-b",
   quantity == 2 ? "Handle laminations" : str("Handle lamination ", index == 0 ? "A" : "B"), quantity,
   ["Grain along length. Both underside notches have the same dimensions; mirror at the other end.",
    "Glue the two laminations face to face. The notch roof bears on the riser-slot floor; see joint sheet.",
    End_grain_screw_bores ? "Drill after laminating, along X into notch-shoulder end grain, centered across the glued handle width." : "Optional screw bores are off.",
    if (End_grain_screw_bores) has_bore ? "Full bore diameter is for the glued handle. Size, height and embedment are adjustable placeholders." : "The selected bore lies in the other lamination; this piece needs no bore relief."],
   index == 0 ? handle_a_color : handle_b_color, [
    ["face", "Broad face / both ends notched", [[1,0,0],[0,0,1],[0,-1,0]], [
        drawing_dim("Length", [-Handle_length/2,y0,handle_top_z], [Handle_length/2,y0,handle_top_z], "horizontal", 1),
        drawing_dim("Blank height", [0,y0,handle_bottom_z], [0,y0,handle_top_z], "vertical", 1),
        drawing_dim("Notch depth", [-drawing_notch_x,y0,handle_bottom_z], [-drawing_notch_x,y0,notch_seat_z], "vertical", -1),
        drawing_dim("Each notch", [drawing_notch_x,y0,notch_seat_z], [Handle_length/2,y0,notch_seat_z], "horizontal", -1),
        if (has_bore) drawing_dim("Axis above bottom", [-drawing_notch_x,0,handle_bottom_z], [-drawing_notch_x,0,screw_z], "vertical", -1, 2)
    ], [], [
        if (has_bore) for (s=[-1,1]) drawing_line([s*screw_inner_x,0,screw_z], [s*drawing_notch_x,0,screw_z])
    ]],
    ["end", "Section through notched end", [[0,1,0],[0,0,1],[1,0,0]], [
        drawing_dim("Lamination thickness", [end_plane,y0,notch_seat_z], [end_plane,y1,notch_seat_z], "horizontal", -1),
        drawing_dim("Above notch", [end_plane,y1,notch_seat_z], [end_plane,y1,handle_top_z], "vertical", 1)
    ], drawing_section(end_plane,[y0,notch_seat_z,y1,handle_top_z])],
    if (has_bore)
    ["bores", "Pilot path / section at screw height", [[1,0,0],[0,1,0],[0,0,1]], [
        drawing_dim("Embedment", [screw_inner_x,0,screw_z], [drawing_notch_x,0,screw_z], "horizontal", -1),
        drawing_dim("Full bore diameter", [drawing_notch_x,-Screw_bore_diameter/2,screw_z], [drawing_notch_x,Screw_bore_diameter/2,screw_z], "vertical", 1),
        drawing_dim("Axis from outside face", [screw_inner_x,outside_y,screw_z], [screw_inner_x,0,screw_z], "vertical", -1)
    ], drawing_section(screw_z,[screw_inner_x-0.25,min(y0,-Screw_bore_diameter/2),drawing_notch_x,max(y1,Screw_bore_diameter/2)],["left"]), [
        drawing_line([screw_inner_x-0.125,0,screw_z],[drawing_notch_x,0,screw_z])
    ]]
]];

function drawing_part_sheets() = [
    ["side", "Sides", 2,
     ["Inside face shown. Grain along length. End dados are mirrored: use the same inset at both ends.",
      "Dashed line marks the stopped bottom-groove run; its ends overlap the end-panel dados.",
      "Cut only the inside face. The two sides are identical blanks, turned inward when assembled."], side_b_color, [
        ["face", "Inside face", [[1,0,0],[0,0,1],[0,-1,0]], [
            drawing_dim("Length", [-Body_length/2,inner_w/2,Side_height], [Body_length/2,inner_w/2,Side_height], "horizontal", 1),
            drawing_dim("Height", [-Body_length/2,inner_w/2,0], [-Body_length/2,inner_w/2,Side_height], "vertical", -1),
            drawing_dim("Stopped groove run", [-side_groove_half_length,inner_w/2,Bottom_groove_height], [side_groove_half_length,inner_w/2,Bottom_groove_height], "horizontal", -1),
            drawing_dim("Stop from each end", [-Body_length/2,inner_w/2,Bottom_groove_height], [-side_groove_half_length,inner_w/2,Bottom_groove_height], "horizontal", -1, 2)
        ], [], [
            drawing_line([-side_groove_half_length,inner_w/2,(Bottom_groove_height+drawing_groove_top)/2], [side_groove_half_length,inner_w/2,(Bottom_groove_height+drawing_groove_top)/2]),
            for (s=[-1,1]) drawing_line([s*side_groove_half_length,inner_w/2,Bottom_groove_height], [s*side_groove_half_length,inner_w/2,drawing_groove_top])
        ]],
        ["dado", "End dado / section above bottom groove", [[1,0,0],[0,1,0],[0,0,1]], [
            drawing_dim("Dado width", [drawing_dado_inner,inner_w/2,0], [drawing_dado_outer,inner_w/2,0], "horizontal", 1),
            if (drawing_dado_outer < Body_length/2)
                drawing_dim("Inset from end", [drawing_dado_outer,inner_w/2,0], [Body_length/2,inner_w/2,0], "horizontal", 1, 2),
            drawing_dim("Side thickness", [Body_length/2,inner_w/2,0], [Body_length/2,Body_width/2,0], "vertical", 1),
            drawing_dim("Dado depth", [drawing_dado_inner,inner_w/2,0], [drawing_dado_inner,inner_w/2+End_dado_depth,0], "vertical", -1)
        ], drawing_section((Side_height+drawing_groove_top)/2,[drawing_dado_left,inner_w/2,Body_length/2,Body_width/2],drawing_dado_left > -Body_length/2 ? ["left"] : [])],
        ["groove", "Bottom groove / section at side midpoint", [[0,1,0],[0,0,1],[1,0,0]], [
            drawing_dim("Groove depth", [0,inner_w/2,Bottom_groove_height], [0,inner_w/2+Bottom_groove_depth,Bottom_groove_height], "horizontal", -1),
            drawing_dim("From bottom", [0,inner_w/2,0], [0,inner_w/2,Bottom_groove_height], "vertical", -1),
            drawing_dim("Groove width", [0,inner_w/2,Bottom_groove_height], [0,inner_w/2,drawing_groove_top], "vertical", -1, 2)
        ], drawing_section(0,[inner_w/2,0,Body_width/2,drawing_profile_top],drawing_profile_top < Side_height ? ["top"] : [])]
    ]],
    ["end", "Ends", 2,
     ["Grain along the full end-panel length. Riser housing is centered on the OUTSIDE face; bottom groove is INSIDE.",
      "Both cuts run through their respective panel edges. Dashed section line marks the original outside face.",
      "Center panels in the side dados and align all wall bottoms. Turn the two ends to face opposite directions."], end_b_color, [
        ["inside", "Inside face / bottom groove", [[0,-1,0],[0,0,1],[-1,0,0]], [
            drawing_dim("Length", [end_inner_x,-end_w/2,Side_height], [end_inner_x,end_w/2,Side_height], "horizontal", 1),
            drawing_dim("Height", [end_inner_x,end_w/2,0], [end_inner_x,end_w/2,Side_height], "vertical", -1),
            drawing_dim("From bottom", [end_inner_x,-end_w/2,0], [end_inner_x,-end_w/2,Bottom_groove_height], "vertical", 1),
            drawing_dim("Groove width", [end_inner_x,-end_w/2,Bottom_groove_height], [end_inner_x,-end_w/2,drawing_groove_top], "vertical", 1, 2)
        ]],
        ["outside", "Outside face / centered riser housing", [[0,1,0],[0,0,1],[1,0,0]], [
            drawing_dim("Housing width", [end_outer_x,-(Riser_width+Joint_fit)/2,Side_height], [end_outer_x,(Riser_width+Joint_fit)/2,Side_height], "horizontal", 1),
            drawing_dim("Each margin", [end_outer_x,-end_w/2,0], [end_outer_x,-(Riser_width+Joint_fit)/2,0], "horizontal", -1)
        ]],
        ["section", "Lower end / section through housing center", [[1,0,0],[0,0,1],[0,-1,0]], [
            drawing_dim("Blank thickness", [end_inner_x,0,0], [end_outer_x,0,0], "horizontal", -1, 2),
            drawing_dim("Groove depth", [end_inner_x,0,Bottom_groove_height], [end_inner_x+Bottom_groove_depth,0,Bottom_groove_height], "horizontal", -1),
            drawing_dim("Housing depth", [riser_inner_x,0,drawing_profile_top], [end_outer_x,0,drawing_profile_top], "horizontal", 1)
        ], drawing_section(0,[end_inner_x,0,end_outer_x,drawing_profile_top],drawing_profile_top < Side_height ? ["top"] : []), [
            drawing_line([end_outer_x,0,0], [end_outer_x,0,drawing_profile_top])
        ]]
    ]],
    ["riser", "Risers", 2,
     ["Grain along riser length. Bridle slot is centered across the width and cut through the full thickness.",
      str("Bottoms align with tote wall bottoms; each is housed ", Riser_dado_depth, " in into an end's outside face."),
      End_grain_screw_bores ? "Optional X-axis bore is centered across width, below the slot floor. Size and height are adjustable placeholders." : "Optional screw bores are off."], riser_b_color, [
        ["face", "Broad face / centered bridle slot", [[0,1,0],[0,0,1],[1,0,0]], [
            drawing_dim("Length", [riser_outer_x,-Riser_width/2,0], [riser_outer_x,-Riser_width/2,Riser_length], "vertical", -1),
            drawing_dim("Width", [riser_outer_x,-Riser_width/2,0], [riser_outer_x,Riser_width/2,0], "horizontal", -1),
            drawing_dim("Slot width", [riser_outer_x,-(Handle_width+Joint_fit)/2,Riser_length], [riser_outer_x,(Handle_width+Joint_fit)/2,Riser_length], "horizontal", 1),
            drawing_dim("Slot depth", [riser_outer_x,Riser_width/2,notch_seat_z], [riser_outer_x,Riser_width/2,Riser_length], "vertical", 1)
        ]],
        ["cheek", "Upper cheek / section along thickness", [[1,0,0],[0,0,1],[0,-1,0]], [
            drawing_dim("Thickness", [riser_inner_x,drawing_cheek_y,Riser_length], [riser_outer_x,drawing_cheek_y,Riser_length], "horizontal", -1)
        ], drawing_section(-drawing_cheek_y,[riser_inner_x,max(0,notch_seat_z-0.5),riser_outer_x,Riser_length],["bottom"])],
        if (End_grain_screw_bores)
        ["bores", "Screw entry / section through riser", [[0,1,0],[0,0,1],[1,0,0]], [
            drawing_dim("Bore diameter", [riser_center_x,-Screw_bore_diameter/2,screw_z], [riser_center_x,Screw_bore_diameter/2,screw_z], "horizontal", 1),
            drawing_dim("Axis below slot", [riser_center_x,0,screw_z], [riser_center_x,0,notch_seat_z], "vertical", 1)
        ], drawing_section(riser_center_x,[-Riser_width/2,handle_bottom_z-0.25,Riser_width/2,notch_seat_z+0.25],["bottom","top"]), [
            drawing_line([riser_center_x,-Screw_bore_diameter,screw_z],[riser_center_x,Screw_bore_diameter,screw_z]),
            drawing_line([riser_center_x,0,handle_bottom_z],[riser_center_x,0,notch_seat_z])
        ]]
    ]],
    drawing_handle_part(0, Handle_lamination_fraction == 0.5 ? 2 : 1),
    if (Handle_lamination_fraction != 0.5) drawing_handle_part(1,1),
    ["bottom", "Bookmatched bottom halves", 2,
     ["Resaw ONE parent board, open as a book, then edge-glue the two halves. Grain runs along length.",
      str("Glued panel: ", bottom_l, " x ", bottom_w, " x ", Bottom_thickness, " in. Dashed edge is the glue joint."),
      str("Total panel clearance: ", Bottom_width_allowance, " in across width; ", Bottom_length_allowance, " in along length; split equally at opposing edges."),
      "Dimensions are finished sizes. See the cut list for parent-stock thickness, resaw kerf, cleanup and machining allowances."], bottom_a_color, [
        ["face", "One half / face view", [[1,0,0],[0,1,0],[0,0,1]], [
            drawing_dim("Length", [-bottom_l/2,0,Bottom_groove_height], [bottom_l/2,0,Bottom_groove_height], "horizontal", 1),
            drawing_dim("Half width", [-bottom_l/2,-bottom_w/2,Bottom_groove_height], [-bottom_l/2,0,Bottom_groove_height], "vertical", -1)
        ], [], [drawing_line([-bottom_l/2,0,Bottom_groove_height],[bottom_l/2,0,Bottom_groove_height])]],
        ["edge", "End grain / finished thickness", [[0,1,0],[0,0,1],[1,0,0]], [
            drawing_dim("Thickness", [bottom_l/2,0,Bottom_groove_height], [bottom_l/2,0,Bottom_groove_height+Bottom_thickness], "vertical", 1)
        ]]
    ]]
];

if (!is_undef($misc_drawing) && $misc_drawing) {
    echo("PART_DRAWINGS_V1", drawing_part_sheets());
    echo("DRAWING_V1", ["inches", [
        ["front", "Front", [[1,0,0], [0,0,1], [0,-1,0]], [
            ["Handle", drawing_point([-Handle_length/2,0,handle_top_z]), drawing_point([Handle_length/2,0,handle_top_z]), "horizontal", 1, 1],
            ["Body", drawing_point([-Body_length/2,0,0]), drawing_point([Body_length/2,0,0]), "horizontal", -1, 1],
            ["Overall", drawing_point([Handle_length/2,0,0]), drawing_point([Handle_length/2,0,handle_top_z]), "vertical", 1, 1],
            ["Sides", drawing_point([-Body_length/2,0,0]), drawing_point([-Body_length/2,0,Side_height]), "vertical", -1, 1]
        ]],
        ["top", "Top", [[1,0,0], [0,1,0], [0,0,1]], [
            ["Body", drawing_point([Body_length/2,-Body_width/2,0]), drawing_point([Body_length/2,Body_width/2,0]), "vertical", 1, 1]
        ]],
        ["right", "Right end", [[0,1,0], [0,0,1], [1,0,0]], [
            ["Body", drawing_point([0,-Body_width/2,0]), drawing_point([0,Body_width/2,0]), "horizontal", -1, 1],
            ["Handle", drawing_point([0,-Handle_width/2,handle_top_z]), drawing_point([0,Handle_width/2,handle_top_z]), "horizontal", 1, 1],
            ["Risers", drawing_point([riser_outer_x,Riser_width/2,0]), drawing_point([riser_outer_x,Riser_width/2,Riser_length]), "vertical", 1, 1]
        ]],
        ["joint-longitudinal", "A-A / Longitudinal section", [[1,0,0], [0,0,1], [0,-1,0]], [
            ["Notch", drawing_point([drawing_notch_x,0,handle_bottom_z]), drawing_point([drawing_notch_x,0,notch_seat_z]), "vertical", -1, 1],
            ["Blank height", drawing_point([drawing_left_x,0,handle_bottom_z]), drawing_point([drawing_left_x,0,handle_top_z]), "vertical", -1, 2],
            ["Notch length", drawing_point([drawing_notch_x,0,notch_seat_z]), drawing_point([Handle_length/2,0,notch_seat_z]), "horizontal", -1, 1],
            ["Riser thickness", drawing_point([riser_inner_x,0,notch_seat_z]), drawing_point([riser_outer_x,0,notch_seat_z]), "horizontal", -1, 2],
            ["Overhang", drawing_point([riser_outer_x,0,handle_top_z]), drawing_point([Handle_length/2,0,handle_top_z]), "horizontal", 1, 1]
        ], [-drawing_laminate_section_y*inch,
            inch*[drawing_left_x,drawing_bottom_z,Handle_length/2,handle_top_z], ["left","bottom"],
            ["Section through handle lamination A; inboard to the left.",
             "Handle continues left; riser continues down at the break marks.",
             str("Seat is ", Notch_clearance_above_sides, " in above the tote side tops."),
             if (End_grain_screw_bores) "Screw axis is Y=0; see transverse section B-B."],
            [[drawing_point([riser_inner_x,drawing_laminate_section_y,notch_seat_z]), drawing_point([riser_outer_x,drawing_laminate_section_y,notch_seat_z])]]
        ]],
        ["joint-transverse", "B-B / Transverse section", [[0,1,0], [0,0,1], [1,0,0]], [
            ["Lam. A", drawing_point([riser_center_x,-Handle_width/2,handle_top_z]), drawing_point([riser_center_x,lamination_y,handle_top_z]), "horizontal", 1, 1],
            ["Lam. B", drawing_point([riser_center_x,lamination_y,handle_top_z]), drawing_point([riser_center_x,Handle_width/2,handle_top_z]), "horizontal", 1, 2],
            ["Handle width", drawing_point([riser_center_x,-Handle_width/2,handle_top_z]), drawing_point([riser_center_x,Handle_width/2,handle_top_z]), "horizontal", 1, 3],
            ["Slot width", drawing_point([riser_center_x,-(Handle_width+Joint_fit)/2,notch_seat_z]), drawing_point([riser_center_x,(Handle_width+Joint_fit)/2,notch_seat_z]), "horizontal", -1, 1],
            ["Riser width", drawing_point([riser_center_x,-Riser_width/2,drawing_bottom_z]), drawing_point([riser_center_x,Riser_width/2,drawing_bottom_z]), "horizontal", -1, 2],
            ["Slot depth", drawing_point([riser_center_x,Riser_width/2,notch_seat_z]), drawing_point([riser_center_x,Riser_width/2,Riser_length]), "vertical", 1, 1],
            if (handle_top_z > Riser_length)
                ["Above riser", drawing_point([riser_center_x,Handle_width/2,Riser_length]), drawing_point([riser_center_x,Handle_width/2,handle_top_z]), "vertical", 1, 2]
        ], [riser_center_x*inch,
            inch*[-Riser_width/2,drawing_bottom_z,Riser_width/2,handle_top_z], ["bottom"],
            ["Section through the middle of the riser thickness.",
             str("Slot includes ", Joint_fit, " in total width clearance."),
             End_grain_screw_bores ? "X-axis screw bore shown below the slot floor." : "Optional screw bores are off."],
            [[drawing_point([riser_center_x,-Handle_width/2,notch_seat_z]), drawing_point([riser_center_x,Handle_width/2,notch_seat_z])]]
        ]]
    ]]);
    scale([inch, inch, inch]) assembly();
} else scale([inch, inch, inch]) selected_part();
