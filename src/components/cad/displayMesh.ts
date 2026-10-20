import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import type { PartColor } from '../../misc';

interface Group { start: number; count: number; color: number[]; mode: string }
export interface DisplayMesh { positions: Float32Array; normals: Float32Array; groups: Group[] }

export function parseDisplayMesh(data: unknown): DisplayMesh {
  const numbers = (value: unknown): value is number[] => Array.isArray(value) &&
    value.every((number: unknown) => typeof number === 'number' && Number.isFinite(number));
  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1 ||
      !('positions' in data) || !numbers(data.positions) ||
      !('normals' in data) || !numbers(data.normals) || !('groups' in data)) {
    throw new Error('Invalid saved colored geometry.');
  }
  const mesh = displayMesh(new Float32Array(data.positions), new Float32Array(data.normals), JSON.stringify(data.groups));
  if (!mesh) throw new Error('The saved colored model has no geometry.');
  return mesh;
}

// The engine's preview ranges count vertices, not floats or triangles. Keep
// these separate from the boolean-unioned mesh used for STL downloads.
export function displayMesh(positions: Float32Array, normals: Float32Array, json: string): DisplayMesh | undefined {
  if (!positions.length) return;
  const groups: unknown = JSON.parse(json);
  let end = 0;
  if (positions.length % 9 || normals.length !== positions.length ||
      !positions.every(Number.isFinite) || !normals.every(Number.isFinite) ||
      !Array.isArray(groups) || !groups.length || !groups.every((group: unknown) => {
        if (typeof group !== 'object' || !group ||
            !('start' in group) || group.start !== end ||
            !('count' in group) || typeof group.count !== 'number' || !Number.isInteger(group.count) || group.count <= 0 || group.count % 3 ||
            !('mode' in group) || group.mode !== 'solid' ||
            !('color' in group) || !Array.isArray(group.color) || group.color.length !== 4 ||
            !group.color.every((value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) || group.color[3] !== 1) return false;
        end += group.count;
        return true;
      }) || end * 3 !== positions.length) throw new Error('Unsupported colored model geometry.');
  return { positions, normals, groups: groups as Group[] };
}

export function coloredGeometry(display: DisplayMesh, palette: PartColor[] = []) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(display.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(display.normals, 3));
  const light = new Float32Array(display.positions.length);
  const dark = new Float32Array(display.positions.length);
  for (const group of display.groups) {
    const base = new Color().setRGB(group.color[0], group.color[1], group.color[2], SRGBColorSpace);
    // Match source RGB after the engine's float conversion.
    const part = palette.find(({ color }) => {
      const candidate = new Color(color);
      return Math.abs(candidate.r - base.r) + Math.abs(candidate.g - base.g) + Math.abs(candidate.b - base.b) < 0.0001;
    });
    const night = part ? new Color(part.darkColor) : base;
    for (let vertex = group.start; vertex < group.start + group.count; vertex++) {
      base.toArray(light, vertex * 3);
      night.toArray(dark, vertex * 3);
    }
  }
  geometry.setAttribute('colorLight', new BufferAttribute(light, 3));
  geometry.setAttribute('colorDark', new BufferAttribute(dark, 3));
  geometry.setAttribute('color', geometry.getAttribute('colorLight'));
  return geometry;
}

// The source may expose parts used only by some joint configurations. Keep the
// legend aligned with the mesh actually on screen, including individual exports.
export function visiblePartColors(display: DisplayMesh, palette: PartColor[]) {
  return palette.filter(part => {
    const rgb = part.color.slice(1).match(/../g)?.map(n => parseInt(n, 16) / 255);
    return rgb && display.groups.some(group => rgb.every((n, i) => Math.abs(n - group.color[i]) < 0.00001));
  });
}
