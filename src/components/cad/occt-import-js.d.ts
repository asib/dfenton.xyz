// occt-import-js ships no types. Its result, as its README describes it: meshes in three.js's
// layout, each a body placed in the assembly, with the tree of products holding them.
declare module 'occt-import-js' {
  type Rgb = [number, number, number];
  export interface OcctMesh {
    name: string;
    color?: Rgb;
    brep_faces: { first: number; last: number; color: Rgb | null }[];
    attributes: { position: { array: number[] }; normal?: { array: number[] } };
    index: { array: number[] };
  }
  export interface OcctNode { name: string; meshes: number[]; children: OcctNode[] }
  export interface OcctResult { success: boolean; root: OcctNode; meshes: OcctMesh[] }
  export interface OcctParams {
    linearUnit?: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot';
    linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value';
    linearDeflection?: number;
    angularDeflection?: number;
  }
  export interface Occt { ReadStepFile(content: Uint8Array, params: OcctParams | null): OcctResult }
  export default function occtimportjs(overrides?: { locateFile?: (path: string) => string }): Promise<Occt>;
}
