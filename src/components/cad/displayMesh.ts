import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import type { PartColor } from '../../misc';

interface Group { start: number; count: number; color: number[]; mode: string }
export interface DisplayMesh { positions: Float32Array; normals: Float32Array; groups: Group[] }

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
