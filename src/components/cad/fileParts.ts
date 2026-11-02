import type { BufferGeometry } from 'three';
import type { PartColor } from '../../misc';
import { pieceKey, type DisplayMesh } from './displayMesh';

// Visitors' files have no part list, so their parts are numbered in file order, "Part 1",
// "Part 2" and so on: each color of a colored OpenSCAD design, as OpenSCAD groups them, or
// otherwise each solid, in a color of its own: those a text STL lists, by their names where
// it gives them, or else each separate closed surface. A STEP file's parts are its bodies, by
// their names and in their colors. A file of one solid, or of more than `maxParts` parts, has none.
export const maxParts = 50;
export interface FileParts { display: DisplayMesh; parts: PartColor[]; from: 'color' | 'solid' | 'listed' | 'body' }
// A text STL's solid or a STEP file's body, as a vertex range, with its name and any color.
interface Block { start: number; count: number; name: string; color?: string }
export interface Mesh { positions: Float32Array; normals: Float32Array; groups?: Block[] }

// An STL as Three's STLLoader reads it: a text STL's `solid … endsolid` blocks become groups
// (vertex ranges), their names the rest of each `solid` line.
export function stlMesh(geometry: BufferGeometry): Mesh {
  const names = (geometry.userData.groupNames ?? []) as string[];
  return {
    positions: geometry.getAttribute('position').array as Float32Array, normals: geometry.getAttribute('normal').array as Float32Array,
    groups: geometry.groups.map(group => ({ start: group.start, count: group.count, name: names[group.materialIndex ?? -1] ?? '' })),
  };
}

const hex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');
function hsl(hue: number, saturation: number, lightness: number) {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${[0, 8, 4].map(n => hex(channel(n))).join('')}`;
}
// Solids' colors step around the wheel by the golden angle, so neighbours differ, and are
// lighter on dark pages, as the site's part colors are.
export function solidColor(index: number) {
  const hue = (210 + index * 137.508) % 360;
  return { color: hsl(hue, 0.55, 0.45), darkColor: hsl(hue, 0.6, 0.66) };
}
const rgba = (color: string) => [...(color.slice(1).match(/../g) ?? []).map(n => parseInt(n, 16) / 255), 1];

type Vector = [number, number, number];
const minus = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// The triangles of one closed surface join along their edges, so solids that merely touch, at
// a corner, an edge or a face, stay apart. An edge two triangles share joins them. Where more
// share it (touching solids), each solid's material fills a wedge around the edge: sorted by
// angle, a triangle whose material lies ahead joins the next one, whose material lies behind.
// A piece that isn't closed, such as a stray sliver, joins a closed solid it touches at a
// corner; open pieces touching none join one another, as a mesh with holes. Returns each
// triangle's solid, numbered in order of first appearance.
export function solids(positions: Float32Array): { solidOf: Int32Array; count: number } {
  // Corners at the same position are the same vertex.
  const ids = new Map<string, number>(), corners = new Int32Array(positions.length / 3), points: Vector[] = [];
  for (let vertex = 0; vertex < corners.length; vertex++) {
    const x = positions[vertex * 3], y = positions[vertex * 3 + 1], z = positions[vertex * 3 + 2];
    const key = `${String(x)},${String(y)},${String(z)}`;
    let id = ids.get(key);
    if (id === undefined) { id = ids.size; ids.set(key, id); points.push([x, y, z]); }
    corners[vertex] = id;
  }
  const triangles = corners.length / 3, vertices = ids.size;
  const corner = (triangle: number, i: number) => corners[triangle * 3 + i];
  const parent = Int32Array.from({ length: triangles }, (_, triangle) => triangle);
  const find = (triangle: number) => {
    while (parent[triangle] !== triangle) { parent[triangle] = parent[parent[triangle]]; triangle = parent[triangle]; }
    return triangle;
  };
  const join = (a: number, b: number) => { parent[find(a)] = find(b); };

  // Each edge's triangles. A degenerate triangle, with a repeated corner, has no edges and is open.
  const edges = new Map<number, number[]>(), degenerate: number[] = [];
  const addEdge = (from: number, to: number, triangle: number) => {
    const key = Math.min(from, to) * vertices + Math.max(from, to);
    const list = edges.get(key);
    if (list) list.push(triangle);
    else edges.set(key, [triangle]);
  };
  for (let triangle = 0; triangle < triangles; triangle++) {
    const a = corner(triangle, 0), b = corner(triangle, 1), c = corner(triangle, 2);
    if (a === b || b === c || a === c) { degenerate.push(triangle); continue; }
    addEdge(a, b, triangle);
    addEdge(b, c, triangle);
    addEdge(c, a, triangle);
  }
  for (const [key, list] of edges) {
    if (list.length === 2) join(list[0], list[1]);
    if (list.length < 3) continue;
    const start = points[Math.floor(key / vertices)], axis = minus(points[key % vertices], start);
    const fins = list.map((triangle) => {
      const [a, b, c] = [0, 1, 2].map(i => points[corner(triangle, i)]);
      const tip = [a, b, c].find(point => point !== start && point !== points[key % vertices]) ?? a;
      const out = minus(tip, start), along = dot(out, axis) / dot(axis, axis);
      const spoke: Vector = [out[0] - axis[0] * along, out[1] - axis[1] * along, out[2] - axis[2] * along];
      // The outward normal facing ahead (increasing angle) puts the material behind.
      return { triangle, spoke, behind: dot(cross(minus(b, a), minus(c, a)), cross(axis, spoke)) > 0, angle: 0 };
    });
    const x = fins[0].spoke, y = cross(axis, x);
    // Angles from 0 to a full turn, those within rounding of a full turn being 0.
    const turn = 2 * Math.PI;
    for (const fin of fins) {
      const angle = Math.atan2(dot(fin.spoke, y) / Math.hypot(...y), dot(fin.spoke, x) / Math.hypot(...x));
      fin.angle = angle < 0 ? angle + turn : angle;
      if (turn - fin.angle < 1e-9) fin.angle = 0;
    }
    // Solids touching face to face share an angle; the one ending there comes first.
    fins.sort((a, b) => Math.abs(a.angle - b.angle) > 1e-9 ? a.angle - b.angle : Number(b.behind) - Number(a.behind));
    fins.forEach((fin, i) => {
      const next = fins[(i + 1) % fins.length];
      if (!fin.behind && next.behind) join(fin.triangle, next.triangle);
    });
  }
  // A piece is open where an edge has only one of its triangles.
  const openRoots = new Set(degenerate);
  for (const list of edges.values()) {
    if (list.length === 2) continue;
    const counts = new Map<number, number>();
    for (const triangle of list) counts.set(find(triangle), (counts.get(find(triangle)) ?? 0) + 1);
    for (const [root, count] of counts) if (count === 1) openRoots.add(root);
  }

  if (openRoots.size) {
    const piece = Int32Array.from({ length: triangles }, (_, triangle) => find(triangle));
    const closedAt = new Int32Array(vertices).fill(-1), openAt = new Int32Array(vertices).fill(-1);
    for (let triangle = 0; triangle < triangles; triangle++) {
      if (!openRoots.has(piece[triangle])) for (let i = 0; i < 3; i++) closedAt[corner(triangle, i)] = triangle;
    }
    // Each open piece joins one closed solid at most, so it never bridges two.
    const attached = new Set<number>();
    for (let triangle = 0; triangle < triangles; triangle++) {
      if (!openRoots.has(piece[triangle]) || attached.has(piece[triangle])) continue;
      const closed = [0, 1, 2].map(i => closedAt[corner(triangle, i)]).find(found => found >= 0);
      if (closed !== undefined) { join(triangle, closed); attached.add(piece[triangle]); }
    }
    for (let triangle = 0; triangle < triangles; triangle++) {
      if (!openRoots.has(piece[triangle]) || attached.has(piece[triangle])) continue;
      for (let i = 0; i < 3; i++) {
        const vertex = corner(triangle, i);
        if (openAt[vertex] >= 0) join(triangle, openAt[vertex]);
        else openAt[vertex] = triangle;
      }
    }
  }

  const order = new Map<number, number>(), solidOf = new Int32Array(triangles);
  for (let triangle = 0; triangle < triangles; triangle++) {
    const root = find(triangle);
    let index = order.get(root);
    if (index === undefined) { index = order.size; order.set(root, index); }
    solidOf[triangle] = index;
  }
  return { solidOf, count: order.size };
}

// A text STL may list its solids itself, as `solid … endsolid` blocks.
function listedSolids(blocks: Block[], triangles: number) {
  const solidOf = new Int32Array(triangles);
  blocks.forEach((block, index) => { solidOf.fill(index, block.start / 3, (block.start + block.count) / 3); });
  return { solidOf, count: blocks.length };
}

// A block's name, if it tells parts apart. A nameless block's reads on into its first facet
// (Three's pattern crosses the line break), and exporters' placeholders name no part.
const placeholder = /^(ascii|binary|stl|mesh|model|object|solid|openscad_model)$|^(exported|generated|created|made)\s+(from|by|with)\b/i;
function blockName(name: string) {
  const text = shortName(name);
  return /^facet\b/i.test(text) || placeholder.test(text) ? '' : text;
}
// A name with its whitespace collapsed, cut at 60 characters.
function shortName(name: string) {
  const text = name.replace(/\s+/g, ' ').trim();
  return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
}
// Repeated labels are numbered, as pieces are: "Leg · 1", "Leg · 2".
function distinct(labels: string[]) {
  return labels.map((label, i) => labels.filter(other => other === label).length > 1
    ? `${label} · ${String(labels.slice(0, i + 1).filter(other => other === label).length)}` : label);
}

// The mesh's triangles reordered by part, one display group per part.
function regroup({ positions, normals }: Pick<Mesh, 'positions' | 'normals'>, partOf: Int32Array, colors: string[]): DisplayMesh {
  const counts = colors.map(() => 0);
  for (const part of partOf) counts[part]++;
  const starts = counts.map((_, part) => counts.slice(0, part).reduce((sum, count) => sum + count, 0));
  const next = { positions: new Float32Array(positions.length), normals: new Float32Array(normals.length) };
  const cursor = [...starts];
  partOf.forEach((part, triangle) => {
    const from = triangle * 9, to = cursor[part]++ * 9;
    next.positions.set(positions.subarray(from, from + 9), to);
    next.normals.set(normals.subarray(from, from + 9), to);
  });
  return { ...next, groups: colors.map((color, part) => ({ start: starts[part] * 3, count: counts[part] * 3, color: rgba(color), mode: 'solid' })) };
}

// Each part needs a color of its own for the legend to tell it apart, so a color repeated, as
// for a file's several nuts, is shifted a step of 1/255 or two, too little to see.
function distinctColors(colors: string[]) {
  const used = new Set<string>();
  return colors.map((color) => {
    const rgb = (color.slice(1).match(/../g) ?? []).map(n => parseInt(n, 16));
    let candidate = color;
    for (let step = 1; used.has(candidate); step++) {
      const shifted = rgb.map((value, i) => i === (step - 1) % 3 ? value + (value > 127 ? -1 : 1) * Math.ceil(step / 3) : value);
      candidate = `#${shifted.map(value => value.toString(16).padStart(2, '0')).join('')}`;
    }
    used.add(candidate);
    return candidate;
  });
}

// A STEP file's bodies are its parts, by the names it gives them, or else numbered. They keep
// the file's colors in both themes, as a colored design's do; a body without one is colored as
// an STL's solids are.
export function bodyParts(mesh: Mesh): FileParts | undefined {
  const bodies = mesh.groups ?? [];
  if (bodies.length < 2 || bodies.length > maxParts) return;
  const looks = bodies.map((body, index) => body.color ? { color: body.color, darkColor: body.color } : solidColor(index));
  const colors = distinctColors(looks.map(look => look.color));
  const partOf = new Int32Array(mesh.positions.length / 9);
  bodies.forEach((body, index) => { partOf.fill(index, body.start / 3, (body.start + body.count) / 3); });
  return {
    display: regroup(mesh, partOf, colors), from: 'body',
    parts: distinct(bodies.map((body, index) => shortName(body.name) || `Part ${String(index + 1)}`)).map((label, index) => ({
      id: `body-${String(index + 1)}`, label, color: colors[index],
      darkColor: bodies[index].color ? colors[index] : looks[index].darkColor,
    })),
  };
}

// `display` is a colored design's mesh; `mesh` is the STL's, with any solids a text STL lists.
export function fileParts(display: DisplayMesh | undefined, mesh: Mesh | undefined): FileParts | undefined {
  const colors = [...new Set(display?.groups.map(group => pieceKey(group.color)))];
  if (display && colors.length > 1) {
    if (colors.length > maxParts) return;
    const partOf = new Int32Array(display.positions.length / 9);
    for (const group of display.groups) partOf.fill(colors.indexOf(pieceKey(group.color)), group.start / 3, (group.start + group.count) / 3);
    return {
      display: regroup(display, partOf, colors), from: 'color',
      parts: colors.map((color, part) => ({ id: `color-${color.slice(1)}`, label: `Part ${String(part + 1)}`, color, darkColor: color })),
    };
  }
  if (!mesh) return;
  const blocks = mesh.groups?.filter(group => group.count > 0) ?? [];
  const listed = blocks.length > 1;
  const { solidOf, count } = listed ? listedSolids(blocks, mesh.positions.length / 9) : solids(mesh.positions);
  if (count < 2 || count > maxParts) return;
  const palette = Array.from({ length: count }, (_, solid) => solidColor(solid));
  return {
    display: regroup(mesh, solidOf, palette.map(({ color }) => color)), from: listed ? 'listed' : 'solid',
    parts: distinct(palette.map((_, solid) => (listed ? blockName(blocks[solid].name) : '') || `Part ${String(solid + 1)}`))
      .map((label, solid) => ({ id: `solid-${String(solid + 1)}`, label, ...palette[solid] })),
  };
}
