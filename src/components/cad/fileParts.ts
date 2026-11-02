import type { PartColor } from '../../misc';
import { pieceKey, type DisplayMesh } from './displayMesh';

// Visitors' files have no part list, so their parts are numbered in file order, "Part 1",
// "Part 2" and so on: each color of a colored OpenSCAD design, as OpenSCAD groups them, or
// otherwise each separate solid, in a color of its own. A file of one solid, or of more than
// `maxParts` parts, has none.
export const maxParts = 50;
export interface FileParts { display: DisplayMesh; parts: PartColor[]; from: 'color' | 'solid' }
interface Mesh { positions: Float32Array; normals: Float32Array }

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

// Triangles that share a corner belong to the same solid. Returns each triangle's solid,
// numbered in order of first appearance.
export function solids(positions: Float32Array): { solidOf: Int32Array; count: number } {
  const ids = new Map<string, number>(), parent: number[] = [];
  const find = (id: number) => {
    while (parent[id] !== id) { parent[id] = parent[parent[id]]; id = parent[id]; }
    return id;
  };
  const corners = new Int32Array(positions.length / 3);
  for (let vertex = 0; vertex < corners.length; vertex++) {
    const key = `${String(positions[vertex * 3])},${String(positions[vertex * 3 + 1])},${String(positions[vertex * 3 + 2])}`;
    let id = ids.get(key);
    if (id === undefined) { id = parent.length; parent.push(id); ids.set(key, id); }
    corners[vertex] = id;
  }
  for (let vertex = 0; vertex < corners.length; vertex += 3) {
    const root = find(corners[vertex]);
    parent[find(corners[vertex + 1])] = root;
    parent[find(corners[vertex + 2])] = root;
  }
  const order = new Map<number, number>(), solidOf = new Int32Array(corners.length / 3);
  for (let triangle = 0; triangle < solidOf.length; triangle++) {
    const root = find(corners[triangle * 3]);
    let index = order.get(root);
    if (index === undefined) { index = order.size; order.set(root, index); }
    solidOf[triangle] = index;
  }
  return { solidOf, count: order.size };
}

// The mesh's triangles reordered by part, one display group per part.
function regroup({ positions, normals }: Mesh, partOf: Int32Array, colors: string[]): DisplayMesh {
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

// `display` is a colored design's mesh; `mesh` is the STL's, whose solids are already unioned.
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
  const { solidOf, count } = solids(mesh.positions);
  if (count < 2 || count > maxParts) return;
  const palette = Array.from({ length: count }, (_, solid) => solidColor(solid));
  return {
    display: regroup(mesh, solidOf, palette.map(({ color }) => color)), from: 'solid',
    parts: palette.map((colors, solid) => ({ id: `solid-${String(solid + 1)}`, label: `Part ${String(solid + 1)}`, ...colors })),
  };
}
