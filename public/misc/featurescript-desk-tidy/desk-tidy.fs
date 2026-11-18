FeatureScript 3112;
import(path : "onshape/std/geometry.fs", version : "3112.0");

// A showcase part for the engine: one feature that builds a desk tidy from std's features. A base plate (a sketched
// rectangle extruded, its corners filleted, its top edges rounded or chamfered and its bottom edges chamfered), a vase
// revolved from a fit spline and shelled, a tower lofted from a square to a circle, a handle swept along an arc, pins
// in a circular pattern, a row of slots in a linear pattern, counterbored holes at the corners, and a label engraved
// in the top, all joined into one part. Its parameters size the plate and choose its details; the layout follows the
// plate's size.
//
// Run on the engine: cargo run --release -p fs-fixtures --example run_part -- examples/showcase.fs showcase showcase

export enum EdgeFinish
{
    annotation { "Name" : "Rounded" }
    ROUND,
    annotation { "Name" : "Chamfered" }
    CHAMFER
}

const LENGTH = { (millimeter) : [110, 120, 200] } as LengthBoundSpec;
const WIDTH = { (millimeter) : [70, 80, 140] } as LengthBoundSpec;
const THICKNESS = { (millimeter) : [6, 10, 20] } as LengthBoundSpec;
const CORNER = { (millimeter) : [1, 10, 20] } as LengthBoundSpec;
const VASE = { (millimeter) : [25, 45, 90] } as LengthBoundSpec;
const HANDLE = { (millimeter) : [1.5, 3, 5] } as LengthBoundSpec;
const PINS = { (unitless) : [3, 8, 16] } as IntegerBoundSpec;

annotation { "Feature Type Name" : "Showcase" }
export const showcase = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Name" : "Plate length" }
        isLength(definition.length, LENGTH);
        annotation { "Name" : "Plate width" }
        isLength(definition.width, WIDTH);
        annotation { "Name" : "Plate thickness" }
        isLength(definition.thickness, THICKNESS);
        annotation { "Name" : "Corner radius" }
        isLength(definition.cornerRadius, CORNER);
        annotation { "Name" : "Top edges" }
        definition.edgeFinish is EdgeFinish;
        annotation { "Name" : "Vase height" }
        isLength(definition.vaseHeight, VASE);
        annotation { "Name" : "Pins" }
        isInteger(definition.pins, PINS);
        annotation { "Name" : "Counterbored holes", "Default" : true }
        definition.holes is boolean;
        annotation { "Name" : "Handle", "Default" : true }
        definition.handle is boolean;
        if (definition.handle)
        {
            annotation { "Name" : "Handle thickness" }
            isLength(definition.handleRadius, HANDLE);
        }
        annotation { "Name" : "Label", "Default" : "FS ENGINE" }
        definition.label is string;
    }
    {
        const l = definition.length / millimeter;
        const w = definition.width / millimeter;
        const t = definition.thickness / millimeter;
        const top = plane(vector(0, 0, t) * millimeter, vector(0, 0, 1), vector(1, 0, 0));
        const solid = function(name) { return qBodyType(qCreatedBy(id + name, EntityType.BODY), BodyType.SOLID); };
        const base = solid("base");
        const faceAt = function(body, p) { return qContainsPoint(qOwnedByBody(body, EntityType.FACE), p * millimeter); };
        const edgeAt = function(body, p) { return qContainsPoint(qOwnedByBody(body, EntityType.EDGE), p * millimeter); };
        const joinTo = function(name, tools)
        {
            opBoolean(context, id + name, { "tools" : qUnion([base, tools]), "operationType" : BooleanOperationType.UNION });
        };

        // ----- the base plate -----
        const plate = newSketchOnPlane(context, id + "plate", { "sketchPlane" : plane(vector(0, 0, 0) * millimeter, vector(0, 0, 1), vector(1, 0, 0)) });
        skRectangle(plate, "r", { "firstCorner" : vector(0, 0) * millimeter, "secondCorner" : vector(l, w) * millimeter });
        skSolve(plate);
        extrude(context, id + "base", { "entities" : qSketchRegion(id + "plate"), "endBound" : BoundingType.BLIND, "depth" : definition.thickness });
        fillet(context, id + "corners", { "entities" : qUnion([edgeAt(base, vector(0, 0, t / 2)), edgeAt(base, vector(l, 0, t / 2)),
                        edgeAt(base, vector(0, w, t / 2)), edgeAt(base, vector(l, w, t / 2))]), "radius" : definition.cornerRadius });
        const topEdges = qAdjacent(faceAt(base, vector(l / 2, w / 2, t)), AdjacencyType.EDGE, EntityType.EDGE);
        if (definition.edgeFinish == EdgeFinish.ROUND)
            fillet(context, id + "finish", { "entities" : topEdges, "radius" : 2 * millimeter });
        else
            chamfer(context, id + "finish", { "entities" : topEdges, "chamferType" : ChamferType.EQUAL_OFFSETS, "width" : 2 * millimeter });
        chamfer(context, id + "bevel", { "entities" : qAdjacent(faceAt(base, vector(l / 2, w / 2, 0)), AdjacencyType.EDGE, EntityType.EDGE),
                    "chamferType" : ChamferType.EQUAL_OFFSETS, "width" : 1 * millimeter });

        // ----- a vase revolved from a fit spline, shelled -----
        const z0 = t - 1;
        const h = definition.vaseHeight / millimeter + 1;
        const vase = newSketchOnPlane(context, id + "vaseProfile", { "sketchPlane" : plane(vector(28, w - 26, 0) * millimeter, vector(0, -1, 0), vector(1, 0, 0)) });
        skLineSegment(vase, "axis", { "start" : vector(0, z0 + h) * millimeter, "end" : vector(0, z0) * millimeter });
        skLineSegment(vase, "foot", { "start" : vector(0, z0) * millimeter, "end" : vector(12, z0) * millimeter });
        skFitSpline(vase, "side", { "points" : [vector(12, z0) * millimeter, vector(17, z0 + 0.3 * h) * millimeter,
                        vector(10, z0 + 0.64 * h) * millimeter, vector(14, z0 + h) * millimeter] });
        skLineSegment(vase, "lip", { "start" : vector(14, z0 + h) * millimeter, "end" : vector(0, z0 + h) * millimeter });
        skSolve(vase);
        revolve(context, id + "vase", { "entities" : qSketchRegion(id + "vaseProfile"),
                    "axis" : sketchEntityQuery(id + "vaseProfile", EntityType.EDGE, "axis"), "fullRevolve" : true });
        shell(context, id + "vaseShell", { "entities" : faceAt(solid("vase"), vector(28, w - 26, z0 + h)), "thickness" : 1.5 * millimeter });
        joinTo("joinVase", solid("vase"));

        // ----- a tower lofted from a square to a circle -----
        const tx = l - 28;
        const ty = w - 26;
        const foot = newSketchOnPlane(context, id + "towerFoot", { "sketchPlane" : plane(vector(0, 0, z0) * millimeter, vector(0, 0, 1), vector(1, 0, 0)) });
        skRectangle(foot, "r", { "firstCorner" : vector(tx - 10, ty - 10) * millimeter, "secondCorner" : vector(tx + 10, ty + 10) * millimeter });
        skSolve(foot);
        const crown = newSketchOnPlane(context, id + "towerTop", { "sketchPlane" : plane(vector(0, 0, t + 35) * millimeter, vector(0, 0, 1), vector(1, 0, 0)) });
        skCircle(crown, "c", { "center" : vector(tx, ty) * millimeter, "radius" : 7 * millimeter });
        skSolve(crown);
        loft(context, id + "tower", { "sheetProfilesArray" : [{ "sheetProfileEntities" : qSketchRegion(id + "towerFoot") },
                        { "sheetProfileEntities" : qSketchRegion(id + "towerTop") }] });
        joinTo("joinTower", solid("tower"));

        // ----- a handle swept along an arc -----
        if (definition.handle)
        {
            const x0 = 48;
            const x1 = l - 48;
            const path = newSketchOnPlane(context, id + "handlePath", { "sketchPlane" : plane(vector(0, w - 10, 0) * millimeter, vector(0, -1, 0), vector(1, 0, 0)) });
            skArc(path, "arc", { "start" : vector(x0, z0) * millimeter, "mid" : vector((x0 + x1) / 2, z0 + (x1 - x0) / 2) * millimeter,
                        "end" : vector(x1, z0) * millimeter });
            skSolve(path);
            const ring = newSketchOnPlane(context, id + "handleRing", { "sketchPlane" : plane(vector(x0, w - 10, z0) * millimeter, vector(0, 0, 1), vector(1, 0, 0)) });
            skCircle(ring, "c", { "center" : vector(0, 0) * millimeter, "radius" : definition.handleRadius });
            skSolve(ring);
            sweep(context, id + "handleSweep", { "profiles" : qSketchRegion(id + "handleRing"),
                        "path" : qOwnedByBody(qBodyType(qCreatedBy(id + "handlePath", EntityType.BODY), BodyType.WIRE), EntityType.EDGE) });
            joinTo("joinHandle", solid("handleSweep"));
        }

        // ----- pins in a circular pattern round the tower -----
        const pin = newSketchOnPlane(context, id + "pinSketch", { "sketchPlane" : top });
        skCircle(pin, "c", { "center" : vector(tx + 16, ty) * millimeter, "radius" : 2 * millimeter });
        skSolve(pin);
        extrude(context, id + "pin", { "entities" : qSketchRegion(id + "pinSketch"), "endBound" : BoundingType.BLIND, "depth" : 5 * millimeter });
        const axis = newSketchOnPlane(context, id + "towerAxis", { "sketchPlane" : plane(vector(tx, ty, 0) * millimeter, vector(0, -1, 0), vector(1, 0, 0)) });
        skLineSegment(axis, "l", { "start" : vector(0, 0) * millimeter, "end" : vector(0, 60) * millimeter });
        skSolve(axis);
        circularPattern(context, id + "pins", { "patternType" : PatternType.PART, "entities" : solid("pin"),
                    "axis" : qCreatedBy(id + "towerAxis", EntityType.EDGE), "angle" : 360 * degree, "instanceCount" : definition.pins, "equalSpace" : true });
        joinTo("joinPins", qUnion([solid("pin"), solid("pins")]));

        // ----- a row of slots in a linear pattern -----
        const slot = newSketchOnPlane(context, id + "slotSketch", { "sketchPlane" : top });
        skLineSegment(slot, "left", { "start" : vector(14, 18) * millimeter, "end" : vector(14, 32) * millimeter });
        skArc(slot, "top", { "start" : vector(14, 32) * millimeter, "mid" : vector(16, 34) * millimeter, "end" : vector(18, 32) * millimeter });
        skLineSegment(slot, "right", { "start" : vector(18, 32) * millimeter, "end" : vector(18, 18) * millimeter });
        skArc(slot, "bottom", { "start" : vector(18, 18) * millimeter, "mid" : vector(16, 16) * millimeter, "end" : vector(14, 18) * millimeter });
        skSolve(slot);
        extrude(context, id + "slot", { "entities" : qSketchRegion(id + "slotSketch"), "endBound" : BoundingType.BLIND, "depth" : 4 * millimeter,
                    "oppositeDirection" : true, "operationType" : NewBodyOperationType.REMOVE, "defaultScope" : false, "booleanScope" : base });
        const along = newSketchOnPlane(context, id + "alongX", { "sketchPlane" : top });
        skLineSegment(along, "l", { "start" : vector(0, 0) * millimeter, "end" : vector(10, 0) * millimeter });
        skSolve(along);
        linearPattern(context, id + "slots", { "patternType" : PatternType.FACE, "faces" : qCreatedBy(id + "slot", EntityType.FACE),
                    "directionOne" : qCreatedBy(id + "alongX", EntityType.EDGE), "distance" : 7 * millimeter, "instanceCount" : 3 });

        // ----- counterbored holes at the corners -----
        if (definition.holes)
        {
            const holes = newSketchOnPlane(context, id + "holeCentres", { "sketchPlane" : top });
            const corners = [[10, 10], [l - 10, 10], [10, w - 10], [l - 10, w - 10]];
            for (var i = 0; i < size(corners); i += 1)
                skPoint(holes, "p" ~ i, { "position" : vector(corners[i][0], corners[i][1]) * millimeter });
            skSolve(holes);
            hole(context, id + "holes", { "locations" : qOwnedByBody(qBodyType(qCreatedBy(id + "holeCentres", EntityType.BODY), BodyType.POINT), EntityType.VERTEX),
                        "scope" : base, "style" : HoleStyle.C_BORE, "holeDiameter" : 4 * millimeter, "cBoreDiameter" : 7 * millimeter,
                        "cBoreDepth" : 3 * millimeter, "endStyle" : HoleEndStyle.THROUGH });
        }

        // ----- a label engraved in the top -----
        if (definition.label != "")
        {
            const label = newSketchOnPlane(context, id + "label", { "sketchPlane" : top });
            skText(label, "t", { "text" : definition.label, "fontName" : "OpenSans-Bold.ttf", "firstCorner" : vector(42, 16) * millimeter,
                        "secondCorner" : vector(l - 16, 26) * millimeter });
            skSolve(label);
            extrude(context, id + "engrave", { "entities" : qSketchRegion(id + "label"), "endBound" : BoundingType.BLIND, "depth" : 1 * millimeter,
                        "oppositeDirection" : true, "operationType" : NewBodyOperationType.REMOVE, "defaultScope" : false, "booleanScope" : base });
        }
        setProperty(context, { "entities" : base, "propertyType" : PropertyType.NAME, "value" : "Desk tidy" });
    });
