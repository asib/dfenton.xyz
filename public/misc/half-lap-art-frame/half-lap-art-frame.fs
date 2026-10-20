FeatureScript 3083;
import(path : "onshape/std/common.fs", version : "3083.0");

// XY is the frame face. Back is Z=0; front is Z=stock thickness.
// Reveal means overlap of the art at EACH edge, not a gap.
annotation { "Feature Type Name" : "Half-lap art frame", "Feature Type Description" : "Four separate frame members with complementary half-laps and a rear art rabbet. Reveal is overlap per edge.", "Feature Name Template" : "Art frame - overlap #reveal" }
export const artFrame = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Name" : "Art width" }
        isLength(definition.artWidth, { (inch) : [1, 30.375, 200] } as LengthBoundSpec);
        annotation { "Name" : "Art height" }
        isLength(definition.artHeight, { (inch) : [1, 21.3125, 200] } as LengthBoundSpec);
        annotation { "Name" : "Reveal / overlap per edge", "Description" : "Try 1/4 in or 1/2 in. Opening = art size minus twice this value." }
        isLength(definition.reveal, { (inch) : [0.01, 0.25, 4] } as LengthBoundSpec);
        annotation { "Name" : "Rail and stile width" }
        isLength(definition.memberWidth, { (inch) : [0.25, 2.5, 12] } as LengthBoundSpec);
        annotation { "Name" : "Stock thickness" }
        isLength(definition.thickness, { (inch) : [0.125, 0.75, 4] } as LengthBoundSpec);
        annotation { "Name" : "Back rabbet depth", "Description" : "Measured from back face. Set to zero to omit the rabbet." }
        isLength(definition.rabbetDepth, { (inch) : [0, 0.25, 3] } as LengthBoundSpec);
        annotation { "Name" : "Art fitting clearance per edge", "Description" : "Enlarges the back pocket only; does not change the visible opening." }
        isLength(definition.clearance, { (inch) : [0, 0.03125, 0.25] } as LengthBoundSpec);
        annotation { "Name" : "Separate parts to inspect joints", "Default" : false }
        definition.exploded is boolean;
        annotation { "Name" : "Rail blank length (2 pieces)", "UIHint" : UIHint.READ_ONLY }
        isLength(definition.railBlank, LENGTH_BOUNDS);
        annotation { "Name" : "Stile blank length (2 pieces)", "UIHint" : UIHint.READ_ONLY }
        isLength(definition.stileBlank, LENGTH_BOUNDS);
    }
    {
        const a = definition.artWidth;
        const h = definition.artHeight;
        const r = definition.reveal;
        const b = definition.memberWidth;
        const t = definition.thickness;
        const d = definition.rabbetDepth;
        const c = definition.clearance;
        const iw = a - 2 * r;
        const ih = h - 2 * r;
        const ow = iw + 2 * b;
        const oh = ih + 2 * b;
        const zero = 0 * inch;
        const eps = 0.01 * millimeter;
        if (iw <= zero || ih <= zero)
            throw regenError("Overlap leaves no opening.", ["reveal"]);
        if (r + c >= b)
            throw regenError("Overlap plus clearance must be less than member width.", ["reveal", "clearance", "memberWidth"]);
        if (d >= t)
            throw regenError("Rabbet depth must be less than stock thickness.", ["rabbetDepth", "thickness"]);

        // Rails keep the FRONT half at their ends. Stiles keep the BACK half.
        var members = [];
        const names = ["Top rail", "Bottom rail", "Left stile", "Right stile"];
        for (var i = 0; i < 4; i += 1)
        {
            const mid = id + ("member" ~ i);
            var lo;
            var hi;
            if (i < 2)
            {
                const y0 = i == 0 ? ih / 2 : -oh / 2;
                lo = vector(-ow / 2, y0, zero);
                hi = vector(ow / 2, y0 + b, t);
            }
            else
            {
                const x0 = i == 2 ? -ow / 2 : iw / 2;
                lo = vector(x0, -oh / 2, zero);
                hi = vector(x0 + b, oh / 2, t);
            }
            fCuboid(context, mid + "blank", { "corner1" : lo, "corner2" : hi });
            const part = qCreatedBy(mid + "blank", EntityType.BODY);
            if (i < 2)
            {
                subtractBox(context, mid + "leftLap", part,
                    vector(-ow / 2 - eps, lo[1] - eps, -eps),
                    vector(-iw / 2, hi[1] + eps, t / 2));
                subtractBox(context, mid + "rightLap", part,
                    vector(iw / 2, lo[1] - eps, -eps),
                    vector(ow / 2 + eps, hi[1] + eps, t / 2));
            }
            else
            {
                subtractBox(context, mid + "bottomLap", part,
                    vector(lo[0] - eps, -oh / 2 - eps, t / 2),
                    vector(hi[0] + eps, -ih / 2, t + eps));
                subtractBox(context, mid + "topLap", part,
                    vector(lo[0] - eps, ih / 2, t / 2),
                    vector(hi[0] + eps, oh / 2 + eps, t + eps));
            }
            if (d > zero)
                subtractBox(context, mid + "rabbet", part,
                    vector(-a / 2 - c, -h / 2 - c, -eps),
                    vector(a / 2 + c, h / 2 + c, d));
            setProperty(context, { "entities" : part, "propertyType" : PropertyType.NAME, "value" : names[i] });
            setProperty(context, { "entities" : part, "propertyType" : PropertyType.APPEARANCE,
                "value" : i < 2 ? color(0.65, 0.43, 0.24) : color(0.55, 0.34, 0.18) });
            if (definition.exploded)
            {
                const offsets = [vector(zero, 2*b, t), vector(zero, -2*b, t), vector(-2*b, zero, zero), vector(2*b, zero, zero)];
                opTransform(context, mid + "separate", { "bodies" : part, "transform" : transform(offsets[i]) });
            }
            members = append(members, part);
        }
        const allParts = qUnion(members);
        const expectedVolume = (ow * oh - iw * ih) * t - ((a + 2*c) * (h + 2*c) - iw * ih) * d;
        if (size(evaluateQuery(context, allParts)) != 4 || abs(evVolume(context, { "entities" : allParts }) - expectedVolume) > 1e-8 * meter^3)
            throw regenError("Frame geometry check failed: expected four members with complementary laps.");
        setVariable(context, "openingWidth", iw);
        setVariable(context, "openingHeight", ih);
        setVariable(context, "railLength", ow);
        setVariable(context, "stileLength", oh);
        setVariable(context, "lapDepth", t / 2);
        setVariable(context, "rabbetWidth", r + c);
        setFeatureComputedParameter(context, id, { "name" : "railBlank", "value" : ow });
        setFeatureComputedParameter(context, id, { "name" : "stileBlank", "value" : oh });
    });

function subtractBox(context is Context, id is Id, target is Query, lo is Vector, hi is Vector)
{
    fCuboid(context, id + "tool", { "corner1" : lo, "corner2" : hi });
    opBoolean(context, id + "cut", { "tools" : qCreatedBy(id + "tool", EntityType.BODY), "targets" : target, "operationType" : BooleanOperationType.SUBTRACTION });
}
