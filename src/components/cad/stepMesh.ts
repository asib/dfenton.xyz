import type { OcctNode, OcctParams, OcctResult } from 'occt-import-js';
import type { Mesh } from './fileParts';

// A STEP file records its length unit. Inch and foot files read in inches, the rest in
// millimetres, as the viewer's lengths do.
export type StepUnits = 'mm' | 'inches';
export interface StepModel { mesh: Mesh; units: StepUnits }

// The unit the geometry uses is the length unit its representation context assigns: a file
// may define others, as an inch is defined from the millimetre.
export function stepUnits(text: string): StepUnits {
  const entity = (id: string) => new RegExp(`#${id}\\s*=\\s*([^;]*);`).exec(text)?.[1] ?? '';
  const assigned = /GLOBAL_UNIT_ASSIGNED_CONTEXT\s*\(\s*\(([^)]*)\)/i.exec(text)?.[1] ?? '';
  const ids = [...assigned.matchAll(/#(\d+)/g)].map(match => match[1]);
  const length = ids.map(entity).find(unit => /\bLENGTH_UNIT\s*\(/i.test(unit)) ?? '';
  return /CONVERSION_BASED_UNIT\s*\(\s*'(INCH|FOOT)'/i.test(length) ? 'inches' : 'mm';
}

// The other files an assembly may keep its parts in, which open only beside it.
export const referencedFiles = (text: string) =>
  [...new Set([...text.matchAll(/DOCUMENT_FILE\s*\(\s*'([^']*)'/gi)].map(match => match[1].trim()).filter(Boolean))];

// The reader's options: output in the file's units, and curved faces fine enough that their
// facets meet at well under the 25° the viewer draws edges at.
export const readOptions = (units: StepUnits): OcctParams => ({ linearUnit: units === 'inches' ? 'inch' : 'millimeter', angularDeflection: 0.2 });

// OpenCascade gives colors in linear RGB; the page's are sRGB.
const channel = (linear: number) => {
  const value = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0');
};
const srgb = (rgb: [number, number, number]) => `#${rgb.map(channel).join('')}`;

// The bodies, as one triangle list with a group (vertex range) per body, in file order. A body
// takes its own name, or else the name of the product holding it, when the name tells parts
// apart; its color is its own, or else its first face's.
export function stepMesh(result: OcctResult): Mesh {
  const holders: string[] = [];
  const visit = (node: OcctNode) => {
    for (const index of node.meshes) holders[index] = node.name;
    node.children.forEach(visit);
  };
  visit(result.root);
  const total = result.meshes.reduce((sum, mesh) => sum + mesh.index.array.length, 0);
  const positions = new Float32Array(total * 3), normals = new Float32Array(total * 3);
  const groups: NonNullable<Mesh['groups']> = [];
  let vertex = 0;
  result.meshes.forEach((mesh, index) => {
    const start = vertex, points = mesh.attributes.position.array, directions = mesh.attributes.normal?.array, corners = mesh.index.array;
    for (let i = 0; i < corners.length; i += 3) {
      const triangle = [corners[i], corners[i + 1], corners[i + 2]];
      // Without normals, a face's normal comes from its corners.
      const flat = directions ? null : faceNormal(triangle.map(corner => [points[corner * 3], points[corner * 3 + 1], points[corner * 3 + 2]]));
      for (const corner of triangle) {
        for (let axis = 0; axis < 3; axis++) {
          positions[vertex * 3 + axis] = points[corner * 3 + axis];
          normals[vertex * 3 + axis] = flat ? flat[axis] : directions?.[corner * 3 + axis] ?? 0;
        }
        vertex++;
      }
    }
    const rgb = mesh.color ?? mesh.brep_faces.find(face => face.color)?.color ?? undefined;
    const named = [mesh.name, holders[index] ?? ''].find(name => !placeholder.test(name.trim())) ?? '';
    groups.push({ start, count: vertex - start, name: named, ...(rgb ? { color: srgb(rgb) } : {}) });
  });
  return { positions, normals, groups };
}

// Exporters' stand-ins for a name, which tell no parts apart.
const placeholder = /^(|none|unnamed|solid|shape|open cascade step translator\b.*)$/i;

function faceNormal([a, b, c]: number[][]) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map(value => value / length);
}
