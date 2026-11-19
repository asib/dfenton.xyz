FeatureScript 3112;
import(path : "onshape/std/geometry.fs", version : "3112.0");

// A comically large toggle switch to print: flip it to inbox zero. A pill-shaped base has a track along its top, and a
// round knob slides along the track from OFF (left) to ON (right). Under the knob, a retainer's peg runs in a slot
// through the track's floor, and an M3 × 16 screw up through the retainer into the knob holds the knob down; the peg
// is a slot's shape and sits in a socket in the knob, so neither turns. Magnets in the track's floor at each end and in
// the knob's underside snap it to OFF or ON. The label is engraved in the base's front.
//
// The three parts print as they're laid out, each on its flat bottom, with no supports: the base's track floor
// bridges the retainer's pocket underneath it.

const LENGTH = { (millimeter) : [150, 220, 250] } as LengthBoundSpec;
const HEIGHT = { (millimeter) : [50, 64, 100] } as LengthBoundSpec;
const THICKNESS = { (millimeter) : [18, 24, 40] } as LengthBoundSpec;
const CLEARANCE = { (millimeter) : [0.1, 0.3, 1] } as LengthBoundSpec;
const MAGNET_DIAMETER = { (millimeter) : [3, 8, 10] } as LengthBoundSpec;
const MAGNET_THICKNESS = { (millimeter) : [1, 3, 4] } as LengthBoundSpec;

annotation { "Feature Type Name" : "Inbox zero toggle" }
export const inboxZeroToggle = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Name" : "Inbox zero", "Default" : true }
        definition.on is boolean;
        annotation { "Name" : "Length" }
        isLength(definition.length, LENGTH);
        annotation { "Name" : "Height" }
        isLength(definition.height, HEIGHT);
        annotation { "Name" : "Thickness" }
        isLength(definition.thickness, THICKNESS);
        annotation { "Name" : "Clearance" }
        isLength(definition.clearance, CLEARANCE);
        annotation { "Name" : "Magnets", "Default" : true }
        definition.magnets is boolean;
        if (definition.magnets)
        {
            annotation { "Name" : "Magnet diameter" }
            isLength(definition.magnetDiameter, MAGNET_DIAMETER);
            annotation { "Name" : "Magnet thickness" }
            isLength(definition.magnetThickness, MAGNET_THICKNESS);
        }
        annotation { "Name" : "Label", "Default" : "INBOX ZERO" }
        definition.label is string;
    }
    {
        // Millimetres throughout. The base lies along X with its front facing -Y, its bottom on Z = 0.
        const l = definition.length / millimeter;
        const t = definition.thickness / millimeter;
        const c = definition.clearance / millimeter;
        const r = definition.height / millimeter / 2; // the pill's end radius; its centreline is Y = r
        const rim = 5;                // round the track
        const depth = 4;              // the track's
        const web = 6;                // the track floor's thickness
        const gap = 1.5;              // between the knob and the track's side
        const rise = 8;               // how far the knob stands above the base
        const pegRadius = 5;
        const pegReach = 4;           // the peg's half-length between its ends' centres
        const socket = 2;             // how far the peg goes into the knob
        const retainerRadius = 10;
        const retainerThickness = 4;
        const floorZ = t - depth;
        const pocketZ = floorZ - web; // the top of the retainer's pocket
        const knobRadius = r - rim - gap;
        const knobBottom = floorZ + c / 2;
        const pegBottom = pocketZ - c / 2;
        const off = r;
        const on = l - r;
        const knobX = definition.on ? on : off;
        const magnetOffset = (pegRadius + knobRadius) / 2;

        const mm = function(x, y) { return vector(x, y) * millimeter; };
        const level = function(z) { return plane(vector(0, 0, z) * millimeter, vector(0, 0, 1), vector(1, 0, 0)); };
        const solid = function(name) { return qBodyType(qCreatedBy(id + name, EntityType.BODY), BodyType.SOLID); };
        const faceAt = function(body, p) { return qContainsPoint(qOwnedByBody(body, EntityType.FACE), p * millimeter); };
        const edgeAt = function(body, p) { return qContainsPoint(qOwnedByBody(body, EntityType.EDGE), p * millimeter); };
        // A slot's shape round the centres (x0, y) and (x1, y).
        const stadium = function(sketch, name, x0, x1, y, radius)
        {
            skLineSegment(sketch, name ~ "front", { "start" : mm(x0, y - radius), "end" : mm(x1, y - radius) });
            skArc(sketch, name ~ "right", { "start" : mm(x1, y - radius), "mid" : mm(x1 + radius, y), "end" : mm(x1, y + radius) });
            skLineSegment(sketch, name ~ "back", { "start" : mm(x1, y + radius), "end" : mm(x0, y + radius) });
            skArc(sketch, name ~ "left", { "start" : mm(x0, y + radius), "mid" : mm(x0 - radius, y), "end" : mm(x0, y - radius) });
        };
        // Sketches circles at Z = z and cuts them from body, up (+1) or down (-1) by depth.
        const holes = function(name, body, z, centres, radius, cut, direction)
        {
            const sketch = newSketchOnPlane(context, id + (name ~ "Sketch"), { "sketchPlane" : level(z) });
            for (var i = 0; i < size(centres); i += 1)
                skCircle(sketch, "c" ~ i, { "center" : mm(centres[i][0], centres[i][1]), "radius" : radius * millimeter });
            skSolve(sketch);
            extrude(context, id + name, { "entities" : qSketchRegion(id + (name ~ "Sketch")), "endBound" : BoundingType.BLIND,
                        "depth" : cut * millimeter, "oppositeDirection" : direction < 0, "operationType" : NewBodyOperationType.REMOVE,
                        "defaultScope" : false, "booleanScope" : body });
        };

        // ----- the base: a pill, its top edge rounded and its bottom edge chamfered -----
        const outline = newSketchOnPlane(context, id + "outline", { "sketchPlane" : level(0) });
        stadium(outline, "o", off, on, r, r);
        skSolve(outline);
        extrude(context, id + "base", { "entities" : qSketchRegion(id + "outline"), "endBound" : BoundingType.BLIND, "depth" : definition.thickness });
        const base = solid("base");
        fillet(context, id + "baseTop", { "entities" : qAdjacent(faceAt(base, vector(l / 2, r, t)), AdjacencyType.EDGE, EntityType.EDGE),
                    "radius" : 2 * millimeter });
        chamfer(context, id + "baseBottom", { "entities" : qAdjacent(faceAt(base, vector(l / 2, r, 0)), AdjacencyType.EDGE, EntityType.EDGE),
                    "chamferType" : ChamferType.EQUAL_OFFSETS, "width" : 0.6 * millimeter });

        // The track, its edge rounded; the retainer's pocket underneath; the slot between them.
        const track = newSketchOnPlane(context, id + "trackSketch", { "sketchPlane" : level(t) });
        stadium(track, "s", off, on, r, r - rim);
        skSolve(track);
        extrude(context, id + "track", { "entities" : qSketchRegion(id + "trackSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : depth * millimeter, "oppositeDirection" : true, "operationType" : NewBodyOperationType.REMOVE,
                    "defaultScope" : false, "booleanScope" : base });
        fillet(context, id + "trackEdge", { "entities" : qUnion([edgeAt(base, vector(l / 2, rim, t)), edgeAt(base, vector(l / 2, 2 * r - rim, t)),
                        edgeAt(base, vector(off - r + rim, r, t)), edgeAt(base, vector(on + r - rim, r, t))]), "radius" : 1 * millimeter });
        const pocket = newSketchOnPlane(context, id + "pocketSketch", { "sketchPlane" : level(0) });
        stadium(pocket, "s", off, on, r, retainerRadius + 1);
        skSolve(pocket);
        extrude(context, id + "pocket", { "entities" : qSketchRegion(id + "pocketSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : pocketZ * millimeter, "operationType" : NewBodyOperationType.REMOVE, "defaultScope" : false, "booleanScope" : base });
        const slot = newSketchOnPlane(context, id + "slotSketch", { "sketchPlane" : level(floorZ) });
        stadium(slot, "s", off - pegReach, on + pegReach, r, pegRadius + c);
        skSolve(slot);
        extrude(context, id + "slot", { "entities" : qSketchRegion(id + "slotSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : (web + 1) * millimeter, "oppositeDirection" : true, "operationType" : NewBodyOperationType.REMOVE,
                    "defaultScope" : false, "booleanScope" : base });

        // ----- the knob: a disc in the track, its top edge rounded -----
        const knobSketch = newSketchOnPlane(context, id + "knobSketch", { "sketchPlane" : level(knobBottom) });
        skCircle(knobSketch, "c", { "center" : mm(knobX, r), "radius" : knobRadius * millimeter });
        skSolve(knobSketch);
        extrude(context, id + "knob", { "entities" : qSketchRegion(id + "knobSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : (t + rise - knobBottom) * millimeter });
        const knob = solid("knob");
        fillet(context, id + "knobEdge", { "entities" : edgeAt(knob, vector(knobX + knobRadius, r, t + rise)), "radius" : 4 * millimeter });
        // The peg's socket and the screw's pilot hole.
        const socketSketch = newSketchOnPlane(context, id + "socketSketch", { "sketchPlane" : level(knobBottom) });
        stadium(socketSketch, "s", knobX - pegReach, knobX + pegReach, r, pegRadius + c / 2);
        skSolve(socketSketch);
        extrude(context, id + "socket", { "entities" : qSketchRegion(id + "socketSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : socket * millimeter, "operationType" : NewBodyOperationType.REMOVE, "defaultScope" : false, "booleanScope" : knob });
        holes("pilot", knob, knobBottom, [[knobX, r]], 1.25, socket + 7, 1);

        // ----- the retainer: a washer under the track's floor, its peg up through the slot into the knob -----
        const washer = newSketchOnPlane(context, id + "washerSketch", { "sketchPlane" : level(pegBottom - retainerThickness) });
        skCircle(washer, "c", { "center" : mm(knobX, r), "radius" : retainerRadius * millimeter });
        skSolve(washer);
        extrude(context, id + "retainer", { "entities" : qSketchRegion(id + "washerSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : retainerThickness * millimeter });
        const retainer = solid("retainer");
        const peg = newSketchOnPlane(context, id + "pegSketch", { "sketchPlane" : level(pegBottom) });
        stadium(peg, "s", knobX - pegReach, knobX + pegReach, r, pegRadius);
        skSolve(peg);
        extrude(context, id + "peg", { "entities" : qSketchRegion(id + "pegSketch"), "endBound" : BoundingType.BLIND,
                    "depth" : (knobBottom - pegBottom + socket - c / 2) * millimeter, "operationType" : NewBodyOperationType.ADD,
                    "defaultScope" : false, "booleanScope" : retainer });
        // The screw's clearance hole, counterbored for its head.
        holes("clearance", retainer, pegBottom - retainerThickness, [[knobX, r]], 1.7, retainerThickness + web + c + socket, 1);
        holes("counterbore", retainer, pegBottom - retainerThickness, [[knobX, r]], 3.25, 2.5, 1);

        // ----- magnets: two at each end of the track's floor, and two in the knob's underside over them -----
        if (definition.magnets)
        {
            const radius = definition.magnetDiameter / millimeter / 2 + 0.1;
            const cut = definition.magnetThickness / millimeter + 0.2;
            holes("trackMagnets", base, floorZ, [[off, r - magnetOffset], [off, r + magnetOffset], [on, r - magnetOffset], [on, r + magnetOffset]],
                radius, cut, -1);
            holes("knobMagnets", knob, knobBottom, [[knobX, r - magnetOffset], [knobX, r + magnetOffset]], radius, cut, 1);
        }

        // ----- the label, engraved 1 mm deep in the base's front, centred and shrunk to fit if need be -----
        if (definition.label != "")
        {
            const h = min(0.4 * t, 12);
            const front = newSketchOnPlane(context, id + "labelSketch", { "sketchPlane" : plane(vector(0, -1, 0) * millimeter, vector(0, -1, 0), vector(1, 0, 0)) });
            skText(front, "t", { "text" : definition.label, "fontName" : "OpenSans-Bold.ttf", "firstCorner" : mm(0, 0), "secondCorner" : mm(1, h) });
            skSolve(front);
            extrude(context, id + "label", { "entities" : qSketchRegion(id + "labelSketch"), "endBound" : BoundingType.BLIND,
                        "depth" : 2 * millimeter, "oppositeDirection" : true });
            const label = solid("label");
            const bounds = evBox3d(context, { "topology" : label, "tight" : true });
            const middle = (bounds.minCorner + bounds.maxCorner) / 2;
            const centre = vector(l / 2, 0, t / 2) * millimeter;
            const room = (on - off - 2 * rim) * millimeter;
            const fit = min(1, room / (bounds.maxCorner[0] - bounds.minCorner[0]));
            opTransform(context, id + "centreLabel", { "bodies" : label,
                        "transform" : scaleUniformly(fit, centre) * transform(vector(centre[0] - middle[0], 0 * millimeter, centre[2] - middle[2])) });
            opBoolean(context, id + "engrave", { "tools" : label, "targets" : base, "operationType" : BooleanOperationType.SUBTRACTION });
        }

        setProperty(context, { "entities" : base, "propertyType" : PropertyType.NAME, "value" : "Base" });
        setProperty(context, { "entities" : knob, "propertyType" : PropertyType.NAME, "value" : "Knob" });
        setProperty(context, { "entities" : retainer, "propertyType" : PropertyType.NAME, "value" : "Retainer" });
    });
