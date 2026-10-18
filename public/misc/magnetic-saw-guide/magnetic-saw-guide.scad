/*
Parametric magnetic dovetail / square saw guide
OpenSCAD conversion of the current Onshape design, 2026-10-18.

All dimensions are millimeters. Upload this single file to MakerWorld.
No external libraries, meshes, fonts, or other files are required.

The corner pocket always exists on each selected side. Each side has:
    1 + additional_horizontal_holes + additional_vertical_holes

Left/Right match the Onshape model: viewed from the open side of the L
toward its upright. Left is +X; Right is -X. Z is up, +Y is the reach.
Magnet gap is measured edge-to-edge ON the inclined saw face.
Changing reach or rise does not move the magnets.

Inspiration: WordsFail, "6:1 Small Dovetail Guide", Thangs model 207817.
https://thangs.com/designer/WordsFail/3d-model/6%3A1%20Small%20Dovetail%20Guide-207817
Reference license recorded in the Onshape source: CC-BY-NC-SA.
New parametric implementation; no reference mesh or artwork included.
Retain this attribution when sharing the file.
*/

/* [Guide slope] */

// Ratio uses 1:N; Angle uses degrees from square; Square is exactly 0 degrees.
slope_input = "Ratio"; // [Ratio, Angle, Square]

// N in 1:N. Enter 6 for 1:6 or 8 for 1:8. Used only in Ratio mode.
dovetail_ratio = 5; // [2:0.1:20]

// Degrees from square, used only in Angle mode. Zero makes a square guide.
angle_from_square = 0; // [0:0.1:30]

/* [Magnet layout] */

// Viewed from the open side of the L toward the upright. Both repeats the pattern on both faces.
magnet_side = "Both"; // [Left, Right, Both]

// Extra holes along the horizontal arm, excluding the always-present corner hole.
additional_horizontal_holes = 2; // [0:1:50]

// Extra holes up the upright, excluding the always-present corner hole.
additional_vertical_holes = 2; // [0:1:50]

// Equal edge-to-edge gap between neighboring pocket openings along the saw face (mm).
magnet_gap = 2; // [0.1:0.1:30]

/* [Magnet size and fit] */

// Disc magnet diameter (mm). 7.9375 mm is 5/16 inch.
magnet_diameter = 7.9375;

// Disc magnet thickness normal to the saw face (mm). 1.984375 mm is 5/64 inch.
magnet_depth = 1.984375;

// Total added diameter, not per-side clearance (mm).
diameter_clearance = 0.2; // [0:0.01:1]

// Extra pocket depth for glue or recess (mm). Zero gives nominal flush seating.
depth_allowance = 1; // [0:0.01:1]

/* [Guide body] */

// Minimum material margin at outer edges and behind pockets (mm). Magnet gap is independent.
minimum_wall = 2; // [1:0.1:10]

// Distance between the two sloping faces at the bottom (mm).
base_width = 35; // [10:0.1:150]

// Grip reach beyond the inside vertical registration face (mm). Does not move magnets.
horizontal_reach = 35; // [8:0.1:100]

// Grip rise above the inside horizontal registration face (mm). Does not move magnets.
upright_rise = 35; // [8:0.1:100]

/* [Hidden] */

// Keep derived values inside the module so they do not become Customizer fields.
module magnetic_dovetail_guide() {
    a = slope_input == "Square" ? 0 :
        slope_input == "Ratio" ? atan(1 / dovetail_ratio) : angle_from_square;
    slope = tan(a);
    radius = (magnet_diameter + diameter_clearance) / 2;
    pocket_depth = magnet_depth + depth_allowance;
    fence = 2 * (radius + minimum_wall);
    sole = 2 * (radius * cos(a) + pocket_depth * sin(a) + minimum_wall);
    height = sole + upright_rise;
    top_half_width = base_width / 2 - height * slope;

    pitch = 2 * radius + magnet_gap;
    corner_y = -fence / 2;
    corner_z = sole / 2;
    vertical_step = pitch * cos(a);
    outer_horizontal_y = corner_y + additional_horizontal_holes * pitch;
    outer_upright_z = corner_z + additional_vertical_holes * vertical_step;
    required_reach = outer_horizontal_y + radius + minimum_wall;
    required_rise = outer_upright_z + radius * cos(a) + minimum_wall - sole;
    back_wall = (base_width - 2 * outer_upright_z * slope) * cos(a)
                - pocket_depth * cos(2 * a) - radius * sin(2 * a);
    opposing_envelope = 2 * (pocket_depth * cos(a) + radius * sin(a));
    eps = 0.01;

    assert(slope_input == "Ratio" || slope_input == "Angle" || slope_input == "Square",
           "Slope input must be Ratio, Angle, or Square.");
    assert(slope_input != "Ratio" || (dovetail_ratio >= 2 && dovetail_ratio <= 20),
           "Dovetail ratio must be 2 to 20. For square cuts, choose Square.");
    assert(a >= 0 && a <= 30, "Angle must be between 0 and 30 degrees from square.");
    assert(magnet_side == "Left" || magnet_side == "Right" || magnet_side == "Both",
           "Magnet side must be Left, Right, or Both.");
    assert(additional_horizontal_holes >= 0 && additional_horizontal_holes <= 50 &&
           additional_horizontal_holes == floor(additional_horizontal_holes),
           "Additional horizontal holes must be a whole number from 0 to 50.");
    assert(additional_vertical_holes >= 0 && additional_vertical_holes <= 50 &&
           additional_vertical_holes == floor(additional_vertical_holes),
           "Additional vertical holes must be a whole number from 0 to 50.");
    assert(magnet_diameter >= 2 && magnet_diameter <= 30,
           "Magnet diameter must be between 2 and 30 mm.");
    assert(magnet_depth >= 0.5 && magnet_depth <= 12,
           "Magnet depth must be between 0.5 and 12 mm.");
    assert(diameter_clearance >= 0 && diameter_clearance <= 1 &&
           depth_allowance >= 0 && depth_allowance <= 1,
           "Diameter clearance and depth allowance must be between 0 and 1 mm.");
    assert(magnet_gap >= 0.1 && magnet_gap <= 30,
           "Magnet gap must be between 0.1 and 30 mm.");
    assert(minimum_wall >= 1 && minimum_wall <= 10,
           "Minimum wall must be between 1 and 10 mm.");
    assert(base_width >= 10 && base_width <= 150 &&
           horizontal_reach >= 8 && horizontal_reach <= 100 &&
           upright_rise >= 8 && upright_rise <= 100,
           "Base width must be 10 to 150 mm; reach and rise must be 8 to 100 mm.");
    assert(horizontal_reach >= required_reach,
           str("Horizontal pockets do not fit. Increase Horizontal reach to at least ",
               ceil(required_reach * 100) / 100,
               " mm, or reduce Additional horizontal holes, Magnet gap, or Magnet diameter."));
    assert(upright_rise >= required_rise,
           str("Vertical pockets do not fit. Increase Upright rise to at least ",
               ceil(required_rise * 100) / 100,
               " mm, or reduce Additional vertical holes, Magnet gap, or Magnet diameter."));
    assert(2 * top_half_width >= minimum_wall,
           "Too little material at the top. Increase Base width or reduce Upright rise or slope angle.");
    assert(back_wall >= minimum_wall,
           "Too little material behind the pockets. Increase Base width or reduce Magnet depth or the vertical hole count.");
    assert(magnet_side != "Both" ||
           base_width - 2 * outer_upright_z * slope >= opposing_envelope + minimum_wall,
           "Opposing pockets leave too little material. Increase Base width or reduce Magnet depth or the vertical hole count.");

    // Start just outside the saw face, cut inward by precisely pocket_depth.
    // The cylinder axis is normal to the face at every slope angle.
    module magnet_pocket(side, y, z) {
        outward = [side * cos(a), 0, sin(a)];
        center = [side * (base_width / 2 - z * slope), y, z];
        translate(center + eps * outward)
            rotate([0, -side * (90 + a), 0])
                cylinder(h = pocket_depth + eps, r = radius, $fn = 128);
    }

    difference() {
        // Extrude the XZ trapezoid from Y = reach back to Y = -fence.
        translate([0, horizontal_reach, 0])
            rotate([90, 0, 0])
                linear_extrude(height = fence + horizontal_reach, convexity = 10)
                    polygon(points = [
                        [-base_width / 2, 0],
                        [ base_width / 2, 0],
                        [ top_half_width, height],
                        [-top_half_width, height]
                    ]);

        // Exact square registration surfaces at Y = 0 and Z = sole.
        translate([-base_width, 0, sole])
            cube([2 * base_width, horizontal_reach + eps, upright_rise + eps]);

        for (side = [1, -1]) {
            if (magnet_side == "Both" ||
                (magnet_side == "Left" && side == 1) ||
                (magnet_side == "Right" && side == -1)) {
                magnet_pocket(side, corner_y, corner_z);

                // Explicit guards avoid OpenSCAD's descending [1:0] range.
                if (additional_horizontal_holes > 0)
                    for (i = [1:additional_horizontal_holes])
                        magnet_pocket(side, corner_y + i * pitch, corner_z);

                if (additional_vertical_holes > 0)
                    for (i = [1:additional_vertical_holes])
                        magnet_pocket(side, corner_y, corner_z + i * vertical_step);
            }
        }
    }
}

magnetic_dovetail_guide();
