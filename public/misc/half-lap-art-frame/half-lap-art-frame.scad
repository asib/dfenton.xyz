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

union()
    for (i = [0:3])
        if (Part == "all" || Part == part_ids[i])
            color(part_colors[i])
                translate((Exploded && Part == "all" ? offsets[i] : [0, 0, 0]) * inch)
                    member(i);
