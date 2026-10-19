/*
  TOOL TOTE — parametric solid-wood construction, from IMG_2348.HEIC.
  Dimensions entered in INCHES; generated geometry is in MILLIMETRES.
  X = tote length / grain of sides, handle and bottom.
  Y = tote width. Z = height above the bottom edge of the wooden sides.

  Confirmed: 10.75 is RISER LENGTH, not overall tote height. The handle
  starts as a 3 x 1.125 blank, laminated from two pieces across its width.
  Its underside notches seat 3 above the 6-high sides. The 0.5 notch depth
  and 0.25 riser housing depth are adjustable, user-confirmed defaults.
  Both projecting handle ends are cut away underneath, beyond the risers.
  Cutaway depth defaults to an adjustable 1.5; it was not dimensioned.
  The bottom is two edge-glued, bookmatched halves resawn from ONE parent
  board, NOT plywood. Keep stock at least 14 long through jointing/planing
  and 10 long through table-saw operations; finish shorter parts afterward.

  Interpretations left adjustable: end panels sit 0.75 in from side ends,
  enter 0.25-deep side dados, and have square tops; risers start at Z=0.
  Bottom grooves sit 0.5 above the wall bottoms. The side grooves are
  stopped within the end panels, at the roots of the end-panel grooves.
  Screw locations/sizes were not supplied. Optional cheek-cross bores are
  a configurable proposal, disabled by default; no fasteners are modeled.

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
Handle_notch_depth = 0.5;
// Remove this height below each overhanging tip, from the outer notch edge to the end. Undimensioned in sketch; zero disables the cutaway.
Handle_end_cutaway_depth = 1.5;

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

/* [Optional screw bores - unconfirmed layout] */
// Proposed transverse screw axis is Y, through a riser cheek into the handle.
Cheek_screw_bores = false;
Screw_bore_diameter = 0.15625;
// Fraction of the engaged bridle height above the notch seat.
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
screw_z = notch_seat_z + bridle_engagement * Screw_height_fraction;

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
assert(Handle_end_cutaway_depth >= 0 && Handle_end_cutaway_depth < Handle_blank_height,
       "Handle end cutaway depth must be nonnegative and leave wood above each tip.");
assert(Handle_lamination_fraction > 0 && Handle_lamination_fraction < 1,
       "Both handle laminations must have positive thickness.");
assert(!Cheek_screw_bores ||
       (Screw_bore_diameter > 0 && Screw_bore_diameter < Riser_thickness &&
        screw_z - Screw_bore_diameter / 2 > notch_seat_z &&
        screw_z + Screw_bore_diameter / 2 < Riser_length),
       "Screw bore must lie inside the engaged bridle, clear of edges.");

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

module cheek_bore() {
    translate([riser_center_x, 0, screw_z]) rotate([90, 0, 0])
        cylinder(h=Riser_width+2*eps, d=Screw_bore_diameter, center=true);
}

module riser_board() {
    difference() {
        box_at([riser_inner_x, -Riser_width/2, 0],
               [Riser_thickness, Riser_width, Riser_length]);
        // Open bridle slot down from the riser top to the notch seat.
        box_at([riser_inner_x-eps, -(Handle_width+Joint_fit)/2, notch_seat_z],
               [Riser_thickness+2*eps, Handle_width+Joint_fit, bridle_engagement+eps]);
        if (Cheek_screw_bores) cheek_bore();
    }
}

module handle_piece(y0, width) {
    difference() {
        box_at([-Handle_length/2, y0, handle_bottom_z],
               [Handle_length, width, Handle_blank_height]);
        // Underside cross-notches fit over the solid portion of each riser.
        for (s = [-1, 1]) at_end(s) {
            box_at([riser_inner_x-Joint_fit/2, -Handle_width/2-eps, handle_bottom_z-eps],
                   [Riser_thickness+Joint_fit, Handle_width+2*eps, Handle_notch_depth+eps]);
            // Raise the underside of the overhanging tip, independently of
            // the bridle notch. Both laminations share this stepped profile.
            if (Handle_end_cutaway_depth > 0)
                box_at([riser_outer_x+Joint_fit/2, -Handle_width/2-eps, handle_bottom_z-eps],
                       [Handle_length/2-riser_outer_x-Joint_fit/2+eps,
                        Handle_width+2*eps, Handle_end_cutaway_depth+eps]);
            if (Cheek_screw_bores) cheek_bore();
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
    echo("Handle end cutaway depth / remaining tip height",
         [Handle_end_cutaway_depth, Handle_blank_height-Handle_end_cutaway_depth]);
    echo("Body end setback and riser dado depth", [End_setback, Riser_dado_depth]);
}

scale([inch, inch, inch]) selected_part();
