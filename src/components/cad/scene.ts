import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { SectionPlane } from './section';
import { edgeTopology, faceEdges, faceRegions, type Topology } from './topology';
import { createViewCube, namedViews, type NamedView } from './viewCube';

export type RenderMode = 'solid' | 'edges' | 'wireframe';
// `sections` are the planes cutting the model (section.ts), up to `maxSections`. With several,
// only material on the removed side of every one is removed, as in Onshape's corner cutaways.
// `handle` places one plane's manipulator, or null hides it. `excluded` parts and pieces (by
// legend part ID or piece key) are left whole.
export const maxSections = 3;
// `perspective` shows the model in perspective; it's orthographic otherwise, as Onshape shows it.
export interface ViewSettings {
  mode: RenderMode;
  perspective?: boolean;
  sections: SectionPlane[];
  handle?: SectionHandle | null;
  excluded?: string[];
}
type Vec3 = [number, number, number];
// The section manipulator, in model coordinates: its point, its arrow (toward the removed
// side) and the axes its two arcs tilt the plane about.
export interface SectionHandle { point: Vec3; arrow: Vec3; axes: [Vec3, Vec3] }
// A drag of the manipulator, measured from where it started: millimetres along the arrow, or
// degrees about an arc's axis (right-handed). Clicking the arrow without dragging flips it.
export type HandleDrag = { kind: 'depth'; distance: number; done: boolean } | { kind: 'tilt'; axis: 0 | 1; degrees: number; done: boolean } | { kind: 'flip' };
// A unit arc about the X axis, beside an arrow along Z, for the manipulator's tilt handles.
class ArcCurve extends THREE.Curve<THREE.Vector3> {
  // How far the arc runs on past each end, in radians, as its outline does.
  readonly overrun: number;
  constructor(overrun = 0) { super(); this.overrun = overrun; }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const angle = 0.3 - this.overrun + t * (0.75 + 2 * this.overrun);
    return target.set(0, Math.sin(angle) * 0.62, Math.cos(angle) * 0.62);
  }
}
// A face under a click, as a point on it and its normal, in model coordinates.
export interface PickedFace { point: [number, number, number]; normal: [number, number, number] }
// View-only appearance, keyed by legend part ID or by piece key (the piece's
// "#rrggbb" source color). A piece's own entry overrides its legend part's.
// The downloadable model never changes.
export interface PartAppearance { hidden?: boolean; opacity?: number }
export type PartAppearances = Partial<Record<string, PartAppearance>>;

// Models retain the OpenSCAD convention: millimeters, Z up. Center only for orbiting.
const defaultCamera: [number, number, number] = [1.35, 1.8, 1.1];

// One layer per geometry group (a colored piece, or the whole STL), so each
// piece can be faded, hidden or highlighted with its own edges, and cut with its own cap.
interface Layer {
  part: string | null;
  piece: string | null;
  // The group's first vertex, whose color is the piece's.
  first: number;
  // Whole edges and vertices of the piece, in scene coordinates, and its faces: each triangle's
  // face, numbered from 0, as regions its drawn edges enclose, or a STEP file's own faces.
  topology: Topology;
  faces: { faceOf: Int32Array; count: number };
  solid: THREE.MeshStandardMaterial;
  // The piece's own triangles, sharing the model's buffer, for its stencil count, and the
  // sphere around them, which places its caps.
  view: THREE.BufferGeometry;
  bounds: THREE.Sphere;
  // Whether each section plane passes through the piece.
  crossed: boolean[];
  // Back and front stencil materials and meshes, and the cap, for each section plane.
  stencil: THREE.MeshBasicMaterial[][];
  counts: THREE.Mesh[][];
  caps: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
  edges: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

export function createScene(host: HTMLElement, geometry: THREE.BufferGeometry, cameraDirection = defaultCamera,
  onPick?: (id: string | null, face: PickedFace | null) => void, onHover?: (id: string | null) => void, onHandle?: (drag: HandleDrag) => void) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.isEmpty()) throw new Error('The model has no geometry.');
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const sourceMin = bounds.min.clone();
  // Scene coordinates are centered; adding the origin gives model coordinates.
  const origin = center.clone();
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();
  let radius = geometry.boundingSphere?.radius ?? size.length() / 2;
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('The model has invalid dimensions.');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D model');
  renderer.domElement.setAttribute('aria-describedby', 'cad-help');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, radius / 100, radius * 100);
  camera.up.set(0, 0, 1);
  // The perspective camera is the eye that orbiting, panning, zooming and the named views move.
  // Shown orthographically, as by default, the orthographic camera copies its view each time
  // the view is drawn, picked or measured (`lens`): it sees as much as the perspective camera
  // does at the target's distance, so moving the eye nearer still zooms, and the point under
  // the pointer stays put as in perspective. It sits well back along the line of sight, so the
  // model is always in front of it, however near the eye has come.
  const ortho = new THREE.OrthographicCamera();
  let perspective = false;
  const lens = (): THREE.Camera => {
    if (perspective) return camera;
    const half = camera.position.distanceTo(controls.target) * Math.tan(camera.fov * Math.PI / 360);
    ortho.left = -half * camera.aspect;
    ortho.right = half * camera.aspect;
    ortho.top = half;
    ortho.bottom = -half;
    const back = controls.target.length() + radius * 4;
    ortho.near = radius / 100;
    ortho.far = back + controls.target.length() + radius * 2;
    ortho.position.copy(controls.target).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -back);
    ortho.quaternion.copy(camera.quaternion);
    ortho.updateProjectionMatrix();
    ortho.updateMatrixWorld();
    return ortho;
  };
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = radius * 0.25;
  controls.maxDistance = radius * 15;
  controls.enableDamping = false;
  // Onshape's mouse: right-drag orbits about the point under the cursor, Ctrl- (or
  // Cmd-/Shift-) right-drag and middle-drag pan it, the wheel zooms about it, and
  // left-click selects; on touch, one finger orbits and two pan and pinch. Each is the
  // viewer's own (orbitAbout, panTo and zoomAbout below), so the controls' are disabled:
  // they keep the camera's target and distance limits, capture the pointer for drags
  // and suppress the context menu.
  controls.enableRotate = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  // Render only on interaction; idle models don't consume an animation loop.
  // The measurement label is HTML over the canvas, placed after every render.
  let placeLabel: () => void = () => undefined;
  let placeHandle: () => void = () => undefined;
  // Clicking the orientation cube or its arrows turns the view and leaves keyboard focus on
  // the canvas; the views menu keeps focus for keyboard use.
  const focusCanvas = () => { markPointerFocus(); renderer.domElement.focus({ preventScroll: true }); };
  const viewCube = createViewCube(host, {
    pick: direction => { orient(direction); focusCanvas(); },
    rotate: (axis, angle) => { rotate(axis, angle); focusCanvas(); },
    view: name => { view(name); },
  });
  const render = () => { placeHandle(); renderer.render(scene, lens()); placeLabel(); viewCube.update(camera); };
  controls.addEventListener('change', render);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(2, 3, 4);
  const fill = new THREE.DirectionalLight(0xffffff, 1.4);
  fill.position.set(-3, -2, 1);
  scene.add(key, fill);

  // Three keeps the side each plane faces. A cap is kept only where every other plane removes
  // material, so it uses those planes turned around.
  const planes = Array.from({ length: maxSections }, () => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  const capClips = planes.map(() => new THREE.Plane());
  // Count back/front intersections in stencil so the cut is filled only inside
  // the solid. Cavities remain empty. Based on Three.js's clipping-stencil example;
  // for each plane, each piece counts with only that plane clipping, then fills its own
  // cap, in its own color, and clears, so pieces that touch keep their own colors.
  const stencilMaterial = (side: THREE.Side, plane: THREE.Plane) => {
    const operation = side === THREE.BackSide ? THREE.IncrementWrapStencilOp : THREE.DecrementWrapStencilOp;
    return new THREE.MeshBasicMaterial({
      side, depthWrite: false, depthTest: false, colorWrite: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: operation, stencilZFail: operation, stencilZPass: operation,
      clippingPlanes: [plane],
    });
  };
  // A cut shows its piece's color brightened, toward white, so it stands out from the model's
  // lit faces, hatched as a section is in a drawing with diagonal lines darker, so it reads as
  // a cut in any color. The lines are spaced on the screen, so zooming doesn't spread them.
  const cutLift = 0.2, hatch = { shade: 0.6, spacing: 7 * renderer.getPixelRatio(), width: 1.5 * renderer.getPixelRatio() };
  const white = new THREE.Color(1, 1, 1);
  const hatchCut = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if (mod(gl_FragCoord.x - gl_FragCoord.y, ${hatch.spacing.toFixed(1)}) < ${hatch.width.toFixed(1)}) gl_FragColor.rgb *= ${hatch.shade.toFixed(2)};`);
  };
  // A cap: a square on the plane, filled where its piece's count is nonzero.
  const capMesh = (shape: THREE.PlaneGeometry) => {
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    material.onBeforeCompile = hatchCut;
    material.customProgramCacheKey = () => 'hatched-cut';
    const cap = new THREE.Mesh(shape, material);
    cap.onAfterRender = () => { renderer.clearStencil(); };
    return cap;
  };
  // Every cap is this unit square, placed and sized on its plane for its piece.
  const capGeometry = new THREE.PlaneGeometry(1, 1);
  const buildLayers = (source: THREE.BufferGeometry): Layer[] => {
    if (!source.groups.length) source.addGroup(0, source.getAttribute('position').count, 0);
    const parts = (source.userData.partIds ?? []) as (string | null)[];
    const pieces = (source.userData.pieceKeys ?? []) as (string | undefined)[];
    const positions = source.getAttribute('position').array;
    // A STEP file's edges are where its faces meet; other models' are their creases.
    const faces = source.userData.brepFaces as Int32Array | undefined;
    return source.groups.map((group, index) => {
      group.materialIndex = index;
      const slice = new THREE.BufferGeometry();
      slice.setAttribute('position', new THREE.BufferAttribute(positions.slice(group.start * 3, (group.start + group.count) * 3), 3));
      let lines: THREE.BufferGeometry = new THREE.BufferGeometry();
      if (faces) lines.setAttribute('position', new THREE.BufferAttribute(faceEdges(slice.getAttribute('position').array, faces.subarray(group.start / 3, (group.start + group.count) / 3)), 3));
      else lines = new THREE.EdgesGeometry(slice, 25);
      const edges = new THREE.LineSegments(lines, new THREE.LineBasicMaterial());
      edges.renderOrder = 4;
      const part = parts[index] ?? null;
      const view = new THREE.BufferGeometry();
      view.setAttribute('position', source.getAttribute('position'));
      view.setDrawRange(group.start, group.count);
      const bounds = new THREE.Box3().setFromBufferAttribute(slice.getAttribute('position') as THREE.BufferAttribute).getBoundingSphere(new THREE.Sphere());
      slice.dispose();
      const stencil = planes.map(plane => [stencilMaterial(THREE.BackSide, plane), stencilMaterial(THREE.FrontSide, plane)]);
      return {
        part,
        piece: part ? pieces[index] ?? null : null,
        first: group.start,
        // Picking uses exactly the creases that are drawn, joined into whole edges.
        topology: edgeTopology(edges.geometry.getAttribute('position').array, 1e-3, !!faces),
        faces: faceRegions(positions.subarray(group.start * 3, (group.start + group.count) * 3), 25, faces?.subarray(group.start / 3, (group.start + group.count) / 3)),
        solid: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        view,
        bounds,
        crossed: planes.map(() => false),
        stencil,
        counts: stencil.map(pair => pair.map(material => new THREE.Mesh(view, material))),
        caps: planes.map(() => capMesh(capGeometry)),
        edges,
      };
    });
  };
  const disposeLayers = (old: Layer[]) => {
    for (const layer of old) {
      layer.solid.dispose();
      layer.stencil.flat().forEach((material) => { material.dispose(); });
      layer.caps.forEach((cap) => { cap.material.dispose(); });
      layer.view.dispose();
      layer.edges.geometry.dispose();
      layer.edges.material.dispose();
    }
  };
  let layers = buildLayers(geometry);
  const mesh = new THREE.Mesh(geometry, layers.map((layer) => layer.solid));
  mesh.renderOrder = 3;
  const edgesGroup = new THREE.Group();
  edgesGroup.add(...layers.map((layer) => layer.edges));
  scene.add(mesh, edgesGroup);
  // Each plane's pieces count their stencils and fill their caps in turn, between the model
  // and its edges.
  const cutGroups = planes.map(() => new THREE.Group());
  const mountCuts = () => {
    const steps = maxSections * layers.length;
    cutGroups.forEach((group, index) => {
      group.clear();
      layers.forEach((layer, l) => {
        const order = 1 + 1.9 * (index * layers.length + l) / steps;
        layer.counts[index].forEach((count) => { count.renderOrder = order; group.add(count); });
        layer.caps[index].renderOrder = order + 0.9 / steps;
        group.add(layer.caps[index]);
      });
    });
  };
  // Each plane outlines its pieces' cuts, where it crosses their triangles, so pieces of one
  // color that touch still show their joint. The lines sit a hair toward the removed side, in
  // front of the caps, and are drawn in Solid + edges, as the model's edges are.
  const cutLines = planes.map(() => {
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    lines.renderOrder = 4;
    return lines;
  });
  scene.add(...cutLines);
  const outlineCuts = (index: number, pieces: Layer[]) => {
    const plane = planes[index], positions = geometry.getAttribute('position').array, segments: number[] = [];
    const lift = plane.normal.clone().multiplyScalar(-radius * 5e-4), corner = new THREE.Vector3();
    // Where the side from one corner to another crosses the plane.
    const cross = (from: number, to: number, a: number, b: number) => {
      const t = a / (a - b);
      for (let axis = 0; axis < 3; axis++) segments.push(positions[from + axis] + (positions[to + axis] - positions[from + axis]) * t + lift.getComponent(axis));
    };
    for (const layer of pieces) {
      const { start, count } = layer.view.drawRange;
      for (let vertex = start; vertex < start + count; vertex += 3) {
        const a = vertex * 3, b = a + 3, c = a + 6;
        const da = plane.distanceToPoint(corner.fromArray(positions, a)), db = plane.distanceToPoint(corner.fromArray(positions, b)), dc = plane.distanceToPoint(corner.fromArray(positions, c));
        if ((da < 0) !== (db < 0)) cross(a, b, da, db);
        if ((db < 0) !== (dc < 0)) cross(b, c, db, dc);
        if ((dc < 0) !== (da < 0)) cross(c, a, dc, da);
      }
    }
    cutLines[index].geometry.dispose();
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    cutLines[index].geometry = next;
  };
  // A cap covers only where the plane crosses its piece's bounding sphere: the square around
  // that disk. So caps fill no more of the screen than their pieces, and a piece the plane
  // misses draws no stencil count or cap at all.
  const placeCaps = (index: number) => {
    const plane = planes[index];
    for (const layer of layers) {
      const distance = plane.distanceToPoint(layer.bounds.center), reach = layer.bounds.radius ** 2 - distance ** 2;
      layer.crossed[index] = reach > 0;
      if (reach <= 0) continue;
      const cap = layer.caps[index];
      cap.position.copy(layer.bounds.center).addScaledVector(plane.normal, -distance);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
      cap.scale.setScalar(2 * Math.sqrt(reach));
    }
  };
  mountCuts();
  scene.add(...cutGroups);

  // The section manipulator, as in Onshape: an arrow toward the removed side, dragged to move
  // the plane along it and clicked to flip it, and two arcs dragged to tilt the plane about its
  // axes. Built at unit size about its point, kept a constant size on screen as it renders, and
  // drawn over the model. Each handle has a wider invisible copy that is easier to grab.
  // Its own colors and a dark outline under each part keep it clear against the cut faces,
  // the model and the page alike: the outline is the part grown by about a pixel and a half.
  const handleMaterials = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true }));
  const outlineMaterial = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const handleGeometries = [
    new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12).translate(0, 0.36, 0).rotateX(Math.PI / 2),
    new THREE.ConeGeometry(0.075, 0.28, 20).translate(0, 0.86, 0).rotateX(Math.PI / 2),
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.CylinderGeometry(0.1, 0.1, 1.05, 8).translate(0, 0.52, 0).rotateX(Math.PI / 2),
    new THREE.TubeGeometry(new ArcCurve(), 24, 0.022, 8),
    new THREE.TubeGeometry(new ArcCurve(), 12, 0.09, 6),
  ];
  // The shaft, head, base and arc outlines, in the same order.
  const outlineGeometries = [
    new THREE.CylinderGeometry(0.038, 0.038, 0.72, 12).translate(0, 0.36, 0).rotateX(Math.PI / 2),
    new THREE.ConeGeometry(0.096, 0.358, 20).translate(0, 0.883, 0).rotateX(Math.PI / 2),
    new THREE.SphereGeometry(0.071, 16, 12),
    new THREE.TubeGeometry(new ArcCurve(0.026), 24, 0.038, 8),
  ];
  const handle = new THREE.Group(), arrow = new THREE.Group();
  const outlines = outlineGeometries.map(part => new THREE.Mesh(part, outlineMaterial));
  const arrowHit = new THREE.Mesh(handleGeometries[3], hitMaterial);
  arrow.add(...outlines.slice(0, 3), ...[0, 1, 2].map(index => new THREE.Mesh(handleGeometries[index], handleMaterials[0])), arrowHit);
  const arcs = [1, 2].map(material => new THREE.Mesh(handleGeometries[4], handleMaterials[material]));
  const arcHits = arcs.map(arc => { const hit = new THREE.Mesh(handleGeometries[5], hitMaterial); arc.add(hit); return hit; });
  arcs.forEach((arc, index) => { arc.add(index ? outlines[3].clone() : outlines[3]); });
  const handleHits = [arrowHit, ...arcHits];
  handle.add(arrow, ...arcs);
  // Outlines draw first, so no part's outline crosses another part.
  handle.traverse((part) => { part.renderOrder = part instanceof THREE.Mesh && part.material === outlineMaterial ? 9 : 10; });
  handle.visible = false;
  scene.add(handle);
  const handleColors = { idle: '', active: '' };
  let handleHover: number | null = null, handleActive: number | null = null;
  const paintHandle = () => {
    handleMaterials.forEach((material, index) => { material.color.set(index === (handleActive ?? handleHover) ? handleColors.active : handleColors.idle); });
  };
  placeHandle = () => {
    if (!handle.visible) return;
    // A pixel's size where the handle is; orthographically, the same at every depth.
    const pixels = 2 * camera.position.distanceTo(perspective ? handle.position : controls.target) * Math.tan(camera.fov * Math.PI / 360) / (renderer.domElement.clientHeight || 1);
    handle.scale.setScalar(pixels * 84);
  };

  // Selected and hovered edges draw as wide lines, vertices as round markers.
  const lineMaterials = [0, 1].map(() => new LineMaterial({ linewidth: 3.5, worldUnits: false }));
  const edgeOverlays = lineMaterials.map((material) => {
    const lines = new LineSegments2(new LineSegmentsGeometry(), material);
    lines.renderOrder = 6;
    lines.visible = false;
    return lines;
  });
  // Selected and hovered faces draw over the model in the selection colors, half see-through.
  const faceMaterials = [0, 1].map(() => new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const faceOverlays = faceMaterials.map((material) => {
    const overlay = new THREE.Mesh(new THREE.BufferGeometry(), material);
    overlay.renderOrder = 5;
    overlay.visible = false;
    return overlay;
  });
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 32;
  const dotContext = dotCanvas.getContext('2d');
  if (dotContext) { dotContext.fillStyle = '#fff'; dotContext.beginPath(); dotContext.arc(16, 16, 14, 0, Math.PI * 2); dotContext.fill(); }
  const dotTexture = new THREE.CanvasTexture(dotCanvas);
  const pointMaterials = [0, 1].map(() => new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, map: dotTexture, transparent: true, alphaTest: 0.5, depthTest: false }));
  const vertexOverlays = pointMaterials.map((material) => {
    const points = new THREE.Points(new THREE.BufferGeometry(), material);
    points.renderOrder = 7;
    points.visible = false;
    return points;
  });
  // While orbiting about a point on a part, a marker shows the pivot.
  const pivotMaterial = new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, map: dotTexture, transparent: true, alphaTest: 0.5, depthTest: false });
  const pivotMarker = new THREE.Points(new THREE.BufferGeometry(), pivotMaterial);
  pivotMarker.renderOrder = 8;
  pivotMarker.visible = false;
  // A measurement's dimension line and end markers draw over everything.
  const measureMaterial = new LineMaterial({ linewidth: 1.5, worldUnits: false, depthTest: false, transparent: true });
  const measureLine = new LineSegments2(new LineSegmentsGeometry(), measureMaterial);
  measureLine.renderOrder = 9;
  measureLine.visible = false;
  const measureEndsMaterial = new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, map: dotTexture, transparent: true, alphaTest: 0.5, depthTest: false });
  const measureEnds = new THREE.Points(new THREE.BufferGeometry(), measureEndsMaterial);
  measureEnds.renderOrder = 9;
  measureEnds.visible = false;
  const measureLabel = document.createElement('div');
  measureLabel.className = 'cad-measure-label';
  measureLabel.setAttribute('aria-hidden', 'true');
  measureLabel.hidden = true;
  host.appendChild(measureLabel);
  const labelAnchor = new THREE.Vector3();
  placeLabel = () => {
    if (!measureLabel.textContent) return;
    const p = labelAnchor.clone().project(lens());
    measureLabel.hidden = p.z > 1;
    measureLabel.style.transform = `translate(${String((p.x + 1) / 2 * host.clientWidth)}px, ${String((1 - p.y) / 2 * host.clientHeight)}px) translate(-50%, -135%)`;
  };
  scene.add(...faceOverlays, ...edgeOverlays, ...vertexOverlays, pivotMarker, measureLine, measureEnds);

  // Faces, edges and vertices are keyed "edge:<version>:<layer>:<index>"; regenerating the
  // model bumps the version, so a stale key can never name a different edge.
  let version = 0;
  const entityAt = (key: string | null) => {
    const match = key ? /^(face|edge|vertex):(\d+):(\d+):(\d+)$/.exec(key) : null;
    if (!match || Number(match[2]) !== version) return undefined;
    const layer = layers[Number(match[3])] as Layer | undefined;
    const index = Number(match[4]);
    if (!layer) return undefined;
    if (match[1] === 'face') return index < layer.faces.count ? { kind: 'face' as const, layer, face: index } : undefined;
    if (match[1] === 'edge') {
      const edge = layer.topology.edges[index] as Topology['edges'][number] | undefined;
      return edge ? { kind: 'edge' as const, layer, edge } : undefined;
    }
    const vertex = layer.topology.vertices[index] as number[] | undefined;
    return vertex ? { kind: 'vertex' as const, layer, vertex } : undefined;
  };
  // Segment pairs along an edge polyline, for the wide-line overlay.
  const edgeSegments = (points: number[]) => {
    const pairs: number[] = [];
    for (let i = 0; i + 5 < points.length; i += 3) pairs.push(...points.slice(i, i + 6));
    return pairs;
  };
  // A face's triangles, in scene coordinates.
  const faceTriangles = (layer: Layer, face: number) => {
    const positions = geometry.getAttribute('position').array, points: number[] = [];
    layer.faces.faceOf.forEach((of, triangle) => {
      if (of !== face) return;
      const from = (layer.first / 3 + triangle) * 9;
      for (let i = 0; i < 9; i++) points.push(positions[from + i]);
    });
    return points;
  };
  const drawEntities = (keys: string[], overlay: 0 | 1) => {
    const found = keys.map(entityAt).filter((item) => !!item && !visible(item.layer).hidden);
    const shapes = found.flatMap((item) => item?.kind === 'face' ? faceTriangles(item.layer, item.face) : []);
    const area = new THREE.BufferGeometry();
    area.setAttribute('position', new THREE.Float32BufferAttribute(shapes, 3));
    faceOverlays[overlay].geometry.dispose();
    faceOverlays[overlay].geometry = area;
    faceOverlays[overlay].visible = shapes.length > 0;
    // Cut as the model is, unless every face shown is on a part left whole.
    const cut = found.every(item => item?.kind === 'face' ? whole(item.layer) : true) ? [] : planes.slice(0, settings.sections.length);
    faceMaterials[overlay].clippingPlanes = cut;
    faceMaterials[overlay].clipIntersection = cut.length > 1;
    faceMaterials[overlay].needsUpdate = true;
    const segments = found.flatMap((item) => item?.kind === 'edge' ? edgeSegments(item.edge.points) : []);
    const dots = found.flatMap((item) => item?.kind === 'vertex' ? item.vertex : []);
    // Fresh geometries each time: a refilled instanced line geometry keeps the
    // renderer's first instance count, so only the first selected edge would draw.
    const lines = new LineSegmentsGeometry();
    if (segments.length) lines.setPositions(segments);
    edgeOverlays[overlay].geometry.dispose();
    edgeOverlays[overlay].geometry = lines;
    edgeOverlays[overlay].visible = segments.length > 0;
    const points = new THREE.BufferGeometry();
    points.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
    vertexOverlays[overlay].geometry.dispose();
    vertexOverlays[overlay].geometry = points;
    vertexOverlays[overlay].visible = dots.length > 0;
  };

  let settings: ViewSettings = { mode: 'edges', sections: [] };
  let appearances: PartAppearances = {};
  let selected: string[] = [];
  // Hover comes from the pointer over the canvas, or from the legend; the pointer wins.
  let pointerHover: string | null = null;
  let externalHover: string | null = null;
  const colors = { body: '', edge: '', selected: '', hover: '' };
  const matches = (layer: Layer, key: string | null) => !!key && (key === layer.part || key === layer.piece);
  // Selection and hover only change colors and edge visibility, so moving the
  // pointer never recompiles materials.
  const paint = () => {
    const hover = pointerHover ?? externalHover;
    const pieceColors = geometry.hasAttribute('colorLight') ? geometry.getAttribute('color') : undefined;
    for (const layer of layers) {
      const selectedLayer = selected.some(key => matches(layer, key));
      const hovered = !selectedLayer && matches(layer, hover);
      const tint = selectedLayer ? colors.selected : hovered ? colors.hover : '#000000';
      layer.solid.emissive.set(tint);
      layer.solid.emissiveIntensity = selectedLayer ? 0.35 : hovered ? 0.22 : 0;
      layer.edges.visible = !visible(layer).hidden && (settings.mode === 'edges' || selectedLayer || hovered);
      layer.edges.material.color.set(selectedLayer ? colors.selected : hovered ? colors.hover : colors.edge);
      // A cut shows its piece's color brightened, and is tinted as its faces are.
      const cut = pieceColors ? new THREE.Color().fromBufferAttribute(pieceColors, layer.first) : new THREE.Color(colors.body);
      cut.lerp(white, cutLift);
      if (selectedLayer || hovered) cut.lerp(new THREE.Color(tint), selectedLayer ? 0.35 : 0.22);
      for (const cap of layer.caps) cap.material.color.copy(cut);
    }
    for (const lines of cutLines) lines.material.color.set(colors.edge);
    faceMaterials[0].color.set(colors.selected);
    faceMaterials[1].color.set(colors.hover);
    lineMaterials[0].color.set(colors.selected);
    lineMaterials[1].color.set(colors.hover);
    pivotMaterial.color.set(colors.edge);
    measureMaterial.color.set(colors.selected);
    measureEndsMaterial.color.set(colors.selected);
    pointMaterials[0].color.set(colors.selected);
    pointMaterials[1].color.set(colors.hover);
    drawEntities(selected, 0);
    drawEntities(hover && !selected.includes(hover) ? [hover] : [], 1);
    render();
  };
  const visible = (layer: Layer) => {
    const look = (layer.piece ? appearances[layer.piece] : undefined) ?? (layer.part ? appearances[layer.part] : undefined);
    return { hidden: !!look?.hidden || look?.opacity === 0, opacity: look?.opacity ?? 1 };
  };
  // Excluded parts and pieces are left whole; material is clipped where every plane removes it.
  const whole = (layer: Layer) => !!settings.excluded?.some(key => key === layer.piece || key === layer.part);
  const clipped = (layer: Layer, point: THREE.Vector3) => settings.sections.length > 0 && !whole(layer) &&
    planes.slice(0, settings.sections.length).every(plane => plane.distanceToPoint(point) < 0);
  // Apply display mode, section, theme colors and per-part appearance to every layer.
  const apply = () => {
    const { mode } = settings;
    const active = planes.slice(0, settings.sections.length);
    const colored = geometry.hasAttribute('colorLight');
    const capped = planes.map((): Layer[] => []);
    for (const layer of layers) {
      const { hidden, opacity } = visible(layer);
      const translucent = opacity < 0.999;
      layer.solid.visible = !hidden;
      layer.solid.vertexColors = colored;
      layer.solid.color.set(colored ? '#ffffff' : colors.body);
      layer.solid.transparent = translucent;
      layer.solid.opacity = opacity;
      // Translucent parts let parts behind them show through.
      layer.solid.depthWrite = !translucent;
      layer.solid.wireframe = mode === 'wireframe';
      const cut = whole(layer) ? [] : active;
      layer.solid.clippingPlanes = cut;
      layer.solid.clipIntersection = cut.length > 1;
      layer.solid.needsUpdate = true;
      layer.edges.material.transparent = translucent;
      layer.edges.material.opacity = opacity;
      layer.edges.material.clippingPlanes = cut;
      layer.edges.material.clipIntersection = cut.length > 1;
      layer.edges.material.needsUpdate = true;
      // Section caps fill only fully opaque, visible, cut parts.
      layer.stencil.forEach((pair, index) => {
        const shown = !hidden && !translucent && index < cut.length && layer.crossed[index];
        pair.forEach((material) => { material.visible = shown; });
        layer.caps[index].visible = shown;
        if (shown) capped[index].push(layer);
      });
    }
    cutGroups.forEach((group, index) => { group.visible = index < active.length && mode !== 'wireframe'; });
    cutLines.forEach((lines, index) => {
      lines.visible = index < active.length && mode === 'edges';
      if (lines.visible) outlineCuts(index, capped[index]);
    });
    paint();
  };

  const setTheme = () => {
    const style = getComputedStyle(host);
    if (geometry.hasAttribute('colorLight')) {
      geometry.setAttribute('color', geometry.getAttribute(document.documentElement.classList.contains('dark') ? 'colorDark' : 'colorLight'));
    }
    colors.body = style.getPropertyValue('--cad-body').trim();
    colors.edge = style.getPropertyValue('--cad-edge').trim();
    colors.selected = style.getPropertyValue('--cad-selected').trim() || '#c2006b';
    colors.hover = style.getPropertyValue('--cad-hover').trim() || '#e389c0';
    handleColors.idle = style.getPropertyValue('--cad-handle').trim();
    handleColors.active = style.getPropertyValue('--cad-handle-active').trim();
    outlineMaterial.color.set(style.getPropertyValue('--cad-handle-outline').trim());
    paintHandle();
    apply();
  };

  // A plane's caps are kept only where the other planes remove material.
  const clipCaps = () => {
    for (const layer of layers) {
      layer.caps.forEach((cap, index) => {
        cap.material.clippingPlanes = capClips.filter((_, other) => other !== index && other < settings.sections.length);
        cap.material.needsUpdate = true;
      });
    }
    cutLines.forEach((lines, index) => {
      lines.material.clippingPlanes = capClips.filter((_, other) => other !== index && other < settings.sections.length);
      lines.material.needsUpdate = true;
    });
  };
  const setSettings = (next: ViewSettings) => {
    settings = next;
    perspective = !!next.perspective;
    next.sections.slice(0, maxSections).forEach((section, index) => {
      // Each plane faces away from the side it removes. Scene coordinates are model
      // coordinates less the origin.
      const normal = new THREE.Vector3(...section.normal);
      // Cut a hair past the plane, so a face lying on it is removed rather than flickering
      // against the cut of the piece behind it.
      planes[index].set(normal.clone().negate(), section.constant - normal.dot(origin) - radius * 1e-4);
      placeCaps(index);
      capClips[index].copy(planes[index]).negate();
    });
    clipCaps();
    handle.visible = next.sections.length > 0 && !!next.handle;
    if (next.handle) {
      const direction = new THREE.Vector3(...next.handle.arrow).normalize();
      handle.position.set(...next.handle.point).sub(origin);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      // Each arc turns about its axis, swinging beside the arrow.
      next.handle.axes.forEach((axis, index) => {
        const x = new THREE.Vector3(...axis).normalize();
        const z = direction.clone().addScaledVector(x, -direction.dot(x));
        arcs[index].visible = z.lengthSq() > 1e-12;
        if (!arcs[index].visible) return;
        z.normalize();
        arcs[index].quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z));
      });
    }
    apply();
  };

  const setAppearance = (next: PartAppearances, nextSelected: string[]) => {
    appearances = next;
    selected = nextSelected;
    apply();
    scheduleHover(); // A part may have been hidden under the pointer.
  };
  // Show a measurement from model coordinates: an optional dimension line and a label.
  const setMeasurement = (measurement: { line?: [number[], number[]]; anchor: number[]; text: string } | null) => {
    const toScene = (p: number[]) => p.map((n, i) => n - origin.getComponent(i));
    const segment = measurement?.line ? [...toScene(measurement.line[0]), ...toScene(measurement.line[1])] : [];
    const lines = new LineSegmentsGeometry();
    if (segment.length) lines.setPositions(segment);
    measureLine.geometry.dispose();
    measureLine.geometry = lines;
    measureLine.visible = segment.length > 0;
    const ends = new THREE.BufferGeometry();
    ends.setAttribute('position', new THREE.Float32BufferAttribute(segment, 3));
    measureEnds.geometry.dispose();
    measureEnds.geometry = ends;
    measureEnds.visible = segment.length > 0;
    measureLabel.textContent = measurement?.text ?? '';
    measureLabel.hidden = !measurement;
    if (measurement) labelAnchor.fromArray(toScene(measurement.anchor));
    render();
  };
  const setHover = (key: string | null) => {
    if (key === externalHover) return;
    externalHover = key;
    paint();
  };

  const reset = () => {
    // Fit the bounding sphere to the narrower field of view (including phones).
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFov = Math.atan(Math.tan(vertical) * Math.min(camera.aspect, 1));
    const distance = radius / Math.sin(halfFov) * 1.12;
    cancelAnimationFrame(turning);
    camera.up.set(0, 0, 1);
    camera.position.copy(new THREE.Vector3(...cameraDirection).normalize().multiplyScalar(distance));
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  };

  // Turn the camera rigidly about the target to the orientation `end`, keeping the target and
  // distance: its rotation eases (slerp), so turns, rolls and named views move without a jump.
  // `up` is then the axis the orbit turns about.
  let turning = 0;
  const local = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const turnTo = (end: THREE.Quaternion, up: THREE.Vector3) => {
    const start = camera.quaternion.clone();
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350, begun = performance.now();
    cancelAnimationFrame(turning);
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - begun) / duration) : 1, eased = t * t * (3 - 2 * t);
      const q = start.clone().slerp(end, eased);
      // Zooming or panning meanwhile is kept.
      const distance = camera.position.distanceTo(controls.target);
      camera.position.copy(controls.target).addScaledVector(local.z.clone().applyQuaternion(q), distance);
      camera.up.copy(t < 1 ? local.y.clone().applyQuaternion(q) : up);
      controls.update();
      turning = t < 1 ? requestAnimationFrame(step) : 0;
    };
    turning = requestAnimationFrame(step);
  };
  // Look from `direction` toward the target, upright with Z up (the cube's faces, edges and
  // corners, and named views). Top and bottom views lean a hair toward the front, so a top view
  // has the front at the bottom and a bottom view at the top.
  const orient = (direction: THREE.Vector3) => {
    const eye = Math.hypot(direction.x, direction.y) < 1e-9 ? new THREE.Vector3(0, -1e-4, Math.sign(direction.z)) : direction.clone();
    const up = local.z.clone();
    turnTo(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye.normalize(), new THREE.Vector3(), up)), up);
  };
  // Turn the view 90° about one of the screen's axes, as the cube's arrows do: x (horizontal) and
  // y (vertical) turn to a neighbouring side, z (the line of sight) rolls the view. The orbit then
  // turns about the new screen-up, so the view can end up on its side until a named view rights it.
  const rotate = (axis: 'x' | 'y' | 'z', angle: number) => {
    const end = new THREE.Quaternion().setFromAxisAngle(local[axis].clone().applyQuaternion(camera.quaternion), angle).multiply(camera.quaternion);
    turnTo(end, local.y.clone().applyQuaternion(end));
  };
  const view = (name: NamedView) => { orient(new THREE.Vector3(...namedViews[name])); };

  const replaceGeometry = (next: THREE.BufferGeometry) => {
    next.computeBoundingBox();
    const nextBounds = next.boundingBox;
    if (!nextBounds || nextBounds.isEmpty()) throw new Error('The model has no geometry.');
    const nextSize = nextBounds.getSize(new THREE.Vector3());
    const nextMin = nextBounds.min.clone();
    const nextCenter = nextBounds.getCenter(new THREE.Vector3());
    next.translate(-nextCenter.x, -nextCenter.y, -nextCenter.z);
    next.computeBoundingSphere();
    const nextRadius = next.boundingSphere?.radius ?? 0;
    if (!Number.isFinite(nextRadius) || nextRadius <= 0) throw new Error('The model has invalid dimensions.');
    const nextLayers = buildLayers(next);
    version += 1;
    origin.copy(nextCenter);
    geometry.dispose();
    disposeLayers(layers);
    geometry = next;
    layers = nextLayers;
    mesh.geometry = next;
    mesh.material = layers.map((layer) => layer.solid);
    edgesGroup.clear();
    edgesGroup.add(...layers.map((layer) => layer.edges));
    mountCuts();
    size.copy(nextSize);
    sourceMin.copy(nextMin);
    radius = nextRadius;
    camera.near = radius / 100;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 0.25;
    controls.maxDistance = radius * 15;
    // Preserve camera/pan/zoom and part appearance; the section follows the new bounds.
    setTheme();
    setSettings(settings);
    scheduleHover();
  };
  let previousWidth = 0;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    [...lineMaterials, measureMaterial].forEach((material) => { material.resolution.set(width, height); });
    if (!previousWidth) reset();
    previousWidth = width;
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const themeObserver = new MutationObserver(setTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const onKey = (event: KeyboardEvent) => {
    const offset = camera.position.clone().sub(controls.target);
    if (event.key === '+' || event.key === '=') offset.multiplyScalar(0.9);
    else if (event.key === '-') offset.multiplyScalar(1.1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      offset.applyAxisAngle(camera.up, event.key === 'ArrowLeft' ? 0.12 : -0.12);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
      offset.applyAxisAngle(right, event.key === 'ArrowUp' ? 0.12 : -0.12);
    } else return;
    event.preventDefault();
    offset.clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };

  // The nearest visible, unclipped surface at a client position, with its piece (or legend part).
  const raycaster = new THREE.Raycaster();
  const hitAt = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), lens());
    for (const hit of raycaster.intersectObject(mesh, false)) {
      const layer = layers[hit.face?.materialIndex ?? -1] as Layer | undefined;
      if (!layer || visible(layer).hidden || clipped(layer, hit.point)) continue;
      return { hit, layer };
    }
    return null;
  };
  const pickAt = (x: number, y: number) => {
    const found = hitAt(x, y);
    return found ? found.layer.piece ?? found.layer.part : null;
  };
  // The manipulator's handle under a client position: 0 for the arrow, 1 and 2 for the arcs.
  const rayAt = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), lens());
    return raycaster.ray;
  };
  const handleAt = (x: number, y: number) => {
    if (!handle.visible) return null;
    rayAt(x, y);
    const hit = raycaster.intersectObjects(handleHits.filter(part => part.parent?.visible), false)[0] as THREE.Intersection | undefined;
    return hit ? handleHits.findIndex(part => part === hit.object) : null;
  };
  // A drag follows the pointer: along the arrow, the point on its line nearest the pointer's
  // ray; about an arc's axis, the pointer's ray meeting the plane square to that axis.
  let handleDrag: { pointerId: number; part: number; x: number; y: number; moved: boolean; center: THREE.Vector3; direction: THREE.Vector3; start: THREE.Vector3 | number } | null = null;
  const alongArrow = (ray: THREE.Ray, center: THREE.Vector3, direction: THREE.Vector3) => {
    const between = center.clone().sub(ray.origin), b = direction.dot(ray.direction), denominator = 1 - b * b;
    if (denominator < 1e-6) return null;
    return (b * ray.direction.dot(between) - direction.dot(between)) / denominator;
  };
  const aroundAxis = (ray: THREE.Ray, center: THREE.Vector3, axis: THREE.Vector3) => {
    if (Math.abs(ray.direction.dot(axis)) < 0.08) return null;
    const hit = ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(axis, center), new THREE.Vector3());
    return hit?.sub(center) ?? null;
  };
  const startHandleDrag = (part: number, event: PointerEvent) => {
    const center = handle.position.clone();
    const direction = part === 0 ? new THREE.Vector3(0, 0, 1).applyQuaternion(arrow.quaternion) : new THREE.Vector3(1, 0, 0).applyQuaternion(arcs[part - 1].quaternion);
    const ray = rayAt(event.clientX, event.clientY);
    const start = part === 0 ? alongArrow(ray, center, direction) : aroundAxis(ray, center, direction);
    if (start === null) return false;
    handleDrag = { pointerId: event.pointerId, part, x: event.clientX, y: event.clientY, moved: false, center, direction, start };
    handleActive = part;
    paintHandle();
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
    render();
    return true;
  };
  const dragHandle = (event: PointerEvent, done: boolean) => {
    if (!handleDrag) return;
    const { part, center, direction, start } = handleDrag;
    handleDrag.moved ||= Math.hypot(event.clientX - handleDrag.x, event.clientY - handleDrag.y) > 3;
    if (!handleDrag.moved) return;
    const ray = rayAt(event.clientX, event.clientY);
    if (typeof start === 'number') {
      const along = alongArrow(ray, center, direction);
      if (along !== null) onHandle?.({ kind: 'depth', distance: along - start, done });
    } else {
      const now = aroundAxis(ray, center, direction);
      if (now) onHandle?.({ kind: 'tilt', axis: part === 1 ? 0 : 1, degrees: Math.atan2(direction.dot(start.clone().cross(now)), start.dot(now)) * 180 / Math.PI, done });
    }
  };
  const endHandleDrag = (event: PointerEvent, cancelled: boolean) => {
    if (!handleDrag) return;
    if (!cancelled) dragHandle(event, true);
    if (!cancelled && !handleDrag.moved && handleDrag.part === 0) onHandle?.({ kind: 'flip' });
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    handleDrag = null;
    handleActive = null;
    dragging = false;
    paintHandle();
    render();
    scheduleHover();
  };
  // The face under a click, in model coordinates, for sectioning through it.
  const faceAt = (x: number, y: number): PickedFace | null => {
    const face = hitAt(x, y)?.hit;
    if (!face?.face) return null;
    const point = face.point.clone().add(origin);
    return { point: [point.x, point.y, point.z], normal: [face.face.normal.x, face.face.normal.y, face.face.normal.z] };
  };
  // Snap to a vertex within 8 px, else an edge within 6 px, else the face's piece.
  // Candidates must be on a visible piece, on the kept side of a section, and not
  // hidden behind opaque material; hidden or translucent parts never occlude.
  const projected = new THREE.Vector3();
  const toScreen = (p: number[], rect: DOMRect) => {
    projected.set(p[0], p[1], p[2]).project(lens());
    return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height, behind: projected.z > 1 };
  };
  const unobstructed = (point: THREE.Vector3, owner: Layer) => {
    if (clipped(owner, point)) return false;
    // The line of sight to the point: from the eye, or orthographically straight along the
    // view from beyond the model.
    const from = perspective ? camera.position.clone() : point.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -radius * 3);
    const direction = point.clone().sub(from);
    const distance = direction.length();
    raycaster.set(from, direction.normalize());
    for (const hit of raycaster.intersectObject(mesh, false)) {
      if (hit.distance >= distance - radius * 2e-3) return true;
      const layer = layers[hit.face?.materialIndex ?? -1] as Layer | undefined;
      const look = layer ? visible(layer) : undefined;
      if (!layer || !look || look.hidden || look.opacity < 0.999 || clipped(layer, hit.point)) continue;
      return false;
    }
    return true;
  };
  // The nearest unobstructed vertex or edge within its snap distance, with the snapped point.
  const snapAt = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const vertices: { key: string; distance: number; point: THREE.Vector3; layer: Layer }[] = [];
    const edges: typeof vertices = [];
    layers.forEach((layer, l) => {
      if (visible(layer).hidden) return;
      layer.topology.vertices.forEach((p, v) => {
        const s = toScreen(p, rect);
        const distance = Math.hypot(s.x - x, s.y - y);
        if (!s.behind && distance <= 8) vertices.push({ key: `vertex:${String(version)}:${String(l)}:${String(v)}`, distance, point: new THREE.Vector3(p[0], p[1], p[2]), layer });
      });
      layer.topology.edges.forEach((edge, e) => {
        let best: (typeof vertices)[number] | null = null;
        for (let i = 0; i + 5 < edge.points.length; i += 3) {
          const a = toScreen(edge.points.slice(i, i + 3), rect), b = toScreen(edge.points.slice(i + 3, i + 6), rect);
          if (a.behind || b.behind) continue;
          const dx = b.x - a.x, dy = b.y - a.y, span = dx * dx + dy * dy;
          const t = span ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / span)) : 0;
          const distance = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
          if (distance > 6 || (best && best.distance <= distance)) continue;
          const point = new THREE.Vector3(...edge.points.slice(i, i + 3)).lerp(new THREE.Vector3(...edge.points.slice(i + 3, i + 6)), t);
          best = { key: `edge:${String(version)}:${String(l)}:${String(e)}`, distance, point, layer };
        }
        if (best) edges.push(best);
      });
    });
    for (const candidates of [vertices, edges]) {
      candidates.sort((a, b) => a.distance - b.distance);
      for (const candidate of candidates.slice(0, 8)) if (unobstructed(candidate.point, candidate.layer)) return candidate;
    }
    return null;
  };
  // The face under a client position, as a key.
  const faceKeyAt = (x: number, y: number) => {
    const found = hitAt(x, y), triangle = found?.hit.faceIndex;
    if (!found || typeof triangle !== 'number') return null;
    const face = found.layer.faces.faceOf[triangle - found.layer.first / 3] as number | undefined;
    return face === undefined ? null : `face:${String(version)}:${String(layers.indexOf(found.layer))}:${String(face)}`;
  };
  // A corner or edge near the pointer, or else the face under it.
  const pickEntityAt = (x: number, y: number): string | null => snapAt(x, y)?.key ?? faceKeyAt(x, y);
  // A click (not an orbit or pan drag) selects. Hover is picked at most once per
  // animation frame, not while dragging or for touch, and again after the view
  // or appearance changes; keyboard shortcuts also use the last pointer position.
  let pressed: { x: number; y: number } | null = null;
  let pointer: { x: number; y: number } | null = null;
  let dragging = false, touch = false, frame = 0;
  const updateHover = () => {
    frame = 0;
    // The manipulator is drawn over the model, so it comes first.
    const grab = pointer && !dragging && !touch ? handleAt(pointer.x, pointer.y) : null;
    if (grab !== handleHover) { handleHover = grab; paintHandle(); render(); }
    const next = pointer && !dragging && !touch && grab === null ? pickEntityAt(pointer.x, pointer.y) : null;
    if (!handleDrag) renderer.domElement.style.cursor = grab !== null ? 'grab' : next ? 'pointer' : '';
    if (next === pointerHover) return;
    pointerHover = next;
    paint();
    onHover?.(next);
  };
  const scheduleHover = () => { if (!frame && (pointer || pointerHover)) frame = requestAnimationFrame(updateHover); };
  // Orbit about the grabbed point (right-drag, or one finger on touch): the camera
  // and its target rotate rigidly about the pivot, yaw about Z then pitch about the
  // view's horizontal axis, so the pivot stays under the cursor and the view never
  // jumps. Speed and the pole limits match the orbit controls.
  const pivot = new THREE.Vector3();
  const pointers = new Map<number, { x: number; y: number }>();
  let orbiting: { id: number; x: number; y: number } | null = null;
  const surfaceAt = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), lens());
    for (const hit of raycaster.intersectObject(mesh, false)) {
      const layer = layers[hit.face?.materialIndex ?? -1] as Layer | undefined;
      if (!layer || visible(layer).hidden || clipped(layer, hit.point)) continue;
      return hit.point;
    }
    return null;
  };
  const orbitAbout = (dx: number, dy: number) => {
    const height = renderer.domElement.clientHeight || 1;
    const offset = camera.position.clone().sub(controls.target);
    // The orbit turns about camera.up: Z, or the screen-up after the cube's arrows turn or roll the view.
    const up = camera.up.clone().normalize();
    const polar = Math.acos(Math.min(1, Math.max(-1, offset.dot(up) / offset.length())));
    // Positive pitch lowers the polar angle (looks down more), as dragging down does.
    const pitch = Math.min(polar - 1e-3, Math.max(polar - (Math.PI - 1e-3), 2 * Math.PI * dy / height));
    const rotation = new THREE.Quaternion().setFromAxisAngle(up, -2 * Math.PI * dx / height);
    const axis = offset.clone().cross(up);
    if (axis.lengthSq() > 1e-12) rotation.multiply(new THREE.Quaternion().setFromAxisAngle(axis.normalize(), pitch));
    for (const point of [camera.position, controls.target]) point.sub(pivot).applyQuaternion(rotation).add(pivot);
    controls.update();
  };
  const stopOrbit = () => {
    orbiting = null;
    if (pivotMarker.visible) { pivotMarker.visible = false; render(); }
  };
  // The point the pointer is on, to orbit or zoom about: on the part under it, else a
  // snapped corner or edge.
  const grabAt = (x: number, y: number) => surfaceAt(x, y) ?? snapAt(x, y)?.point ?? null;
  const startOrbit = (id: number, x: number, y: number) => {
    orbiting = { id, x, y };
    // The point the cursor is on, else the center.
    const grabbed = grabAt(x, y);
    pivot.copy(grabbed ?? controls.target);
    pivotMarker.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pivot.toArray(), 3));
    pivotMarker.visible = !!grabbed;
  };
  // Panning and zooming hold the point under the pointer there, as Onshape does: the point
  // the pointer is on, or over empty space the point on its ray as far away as the target.
  // The plane square to the view through a point, which panning slides the camera across.
  const depthPlane = (point: THREE.Vector3) => new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), point);
  let anchor: THREE.Vector3 | null = null;
  const anchorAt = (x: number, y: number) => {
    // Zooming leaves the point where it was on screen, so while the pointer stays put it's reused.
    if (anchor) {
      const at = toScreen(anchor.toArray(), renderer.domElement.getBoundingClientRect());
      if (!at.behind && Math.hypot(at.x - x, at.y - y) < 1) return anchor;
    }
    anchor = grabAt(x, y) ?? rayAt(x, y).intersectPlane(depthPlane(controls.target), new THREE.Vector3()) ?? controls.target.clone();
    return anchor;
  };
  // Pan: the camera and its target slide across the view until the point is under the pointer.
  // This and zooming move the camera only; controls.update() then applies and renders the move.
  const panTo = (point: THREE.Vector3, x: number, y: number) => {
    camera.updateMatrixWorld();
    const under = rayAt(x, y).intersectPlane(depthPlane(point), new THREE.Vector3());
    if (!under) return;
    const shift = point.clone().sub(under);
    camera.position.add(shift);
    controls.target.add(shift);
  };
  let panning: { id: number; point: THREE.Vector3 } | null = null;
  // Zoom: the camera and its target move toward the point or away by the same factor, so it
  // stays under the pointer, and the camera keeps its distance limits from the target.
  const zoomAbout = (center: THREE.Vector3, factor: number) => {
    const distance = camera.position.distanceTo(controls.target);
    const scale = Math.min(controls.maxDistance, Math.max(controls.minDistance, distance * factor)) / distance;
    for (const point of [camera.position, controls.target]) point.sub(center).multiplyScalar(scale).add(center);
  };
  // Wheel steps zoom as the orbit controls' did: lines and pages count as pixels, and a
  // trackpad pinch (Ctrl set without the key held) moves in small steps, so counts ten times.
  let controlHeld = false;
  const onControl = (event: KeyboardEvent) => { if (event.key === 'Control') controlHeld = event.type === 'keydown'; };
  const onWindowBlur = () => { controlHeld = false; };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1) * (event.ctrlKey && !controlHeld ? 10 : 1);
    if (!delta) return;
    zoomAbout(anchorAt(event.clientX, event.clientY), Math.pow(0.95, -delta * 0.01));
    controls.update();
  };
  // Two fingers hold the point between them as they land there, panning as they move together
  // and zooming as they spread or pinch.
  let pinch: { center: THREE.Vector3; span: number } | null = null;
  const fingers = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, span: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  // The focus ring shows only when the 3D view is reached from the keyboard. A click or
  // tap marks the focus as the pointer's until the view loses it (not just the window).
  const markPointerFocus = () => { renderer.domElement.dataset.pointerFocus = ''; };
  const onBlur = () => { if (document.activeElement !== renderer.domElement) delete renderer.domElement.dataset.pointerFocus; };
  const onPointerDown = (event: PointerEvent) => {
    markPointerFocus();
    // Grabbing the model takes over from a turn to a named view.
    cancelAnimationFrame(turning);
    // A lone left button or finger on the section manipulator drags it.
    const grabbed = event.button === 0 && !pointers.size && !handleDrag ? handleAt(event.clientX, event.clientY) : null;
    if (grabbed !== null && startHandleDrag(grabbed, event)) { pressed = null; dragging = true; return; }
    // Only a lone pointer can tap; a second finger makes it a gesture.
    pressed = event.button === 0 && !pointers.size ? { x: event.clientX, y: event.clientY } : null;
    dragging = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const finger = event.pointerType === 'touch';
    const modified = event.ctrlKey || event.metaKey || event.shiftKey;
    const orbitButton = finger ? event.button === 0 : event.button === 2 && !modified;
    const panButton = !finger && (event.button === 1 || (event.button === 2 && modified));
    if (orbitButton && pointers.size === 1) startOrbit(event.pointerId, event.clientX, event.clientY);
    else stopOrbit(); // A second finger hands over to pinch and pan.
    panning = panButton && pointers.size === 1 ? { id: event.pointerId, point: anchorAt(event.clientX, event.clientY) } : null;
    if (finger && pointers.size === 2) {
      const { x, y, span } = fingers();
      pinch = { center: anchorAt(x, y), span };
    } else pinch = null;
    scheduleHover();
  };
  // When a pinch ends with one finger still down, that finger orbits again from where it is.
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    pinch = panning = null;
    stopOrbit();
    if (event.pointerType === 'touch' && pointers.size === 1) for (const [id, at] of pointers) startOrbit(id, at.x, at.y);
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (handleDrag?.pointerId === event.pointerId) { endHandleDrag(event, true); return; }
    release(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (handleDrag?.pointerId === event.pointerId) { endHandleDrag(event, false); return; }
    release(event);
    dragging = false;
    scheduleHover();
    if (!onPick || !pressed || event.button !== 0 || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 5) return;
    pressed = null;
    onPick(pickEntityAt(event.clientX, event.clientY), faceAt(event.clientX, event.clientY));
  };
  const onPointerMove = (event: PointerEvent) => {
    if (handleDrag?.pointerId === event.pointerId) { pointer = { x: event.clientX, y: event.clientY }; dragHandle(event, false); return; }
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.has(event.pointerId) && pointers.size === 2) {
      const { x, y, span } = fingers();
      panTo(pinch.center, x, y);
      if (pinch.span > 0 && span > 0) zoomAbout(pinch.center, pinch.span / span);
      pinch.span = span;
      controls.update();
    }
    if (panning?.id === event.pointerId) {
      panTo(panning.point, event.clientX, event.clientY);
      controls.update();
    }
    if (orbiting?.id === event.pointerId) {
      orbitAbout(event.clientX - orbiting.x, event.clientY - orbiting.y);
      orbiting.x = event.clientX;
      orbiting.y = event.clientY;
    }
    pointer = { x: event.clientX, y: event.clientY };
    touch = event.pointerType === 'touch';
    dragging = event.buttons !== 0;
    scheduleHover();
  };
  const onPointerLeave = () => { pointer = null; scheduleHover(); };
  controls.addEventListener('change', scheduleHover);
  renderer.domElement.addEventListener('keydown', onKey);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('blur', onBlur);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onControl, true);
  window.addEventListener('keyup', onControl, true);
  window.addEventListener('blur', onWindowBlur);
  setTheme();
  setSettings({ mode: 'edges', sections: [] });
  resize();

  return {
    size, sourceMin, setSettings, setAppearance, setHover, setMeasurement, reset, replaceGeometry,
    // The piece or part under the pointer, if it is over the canvas.
    hovered: () => pointer ? pickAt(pointer.x, pointer.y) : null,
    pointerInside: () => !!pointer,
    // Focus the 3D view after pointer use of the viewer's own controls, without the focus ring.
    focus: focusCanvas,
    // Look from a named direction, as the views menu and Shift+1 to Shift+7 do.
    view,
    // Look back along a direction, as viewing normal to a section does.
    lookAlong: (direction: [number, number, number]) => { orient(new THREE.Vector3(...direction)); },
    // An edge or vertex in model coordinates, with the piece it belongs to.
    entity: (key: string) => {
      const found = entityAt(key);
      if (!found) return undefined;
      const toModel = (p: number[]) => p.map((n, i) => n + origin.getComponent(i));
      const owner = { part: found.layer.part, piece: found.layer.piece };
      if (found.kind === 'face') return { ...owner, kind: 'face' as const };
      if (found.kind === 'vertex') return { ...owner, kind: 'vertex' as const, position: toModel(found.vertex) };
      const points: number[][] = [];
      for (let i = 0; i + 2 < found.edge.points.length; i += 3) points.push(toModel(found.edge.points.slice(i, i + 3)));
      return { ...owner, kind: 'edge' as const, points, closed: found.edge.closed, length: found.edge.length };
    },
    dispose() {
      observer.disconnect();
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('blur', onBlur);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onControl, true);
      window.removeEventListener('keyup', onControl, true);
      window.removeEventListener('blur', onWindowBlur);
      pivotMarker.geometry.dispose();
      pivotMaterial.dispose();
      measureLine.geometry.dispose();
      measureEnds.geometry.dispose();
      measureMaterial.dispose();
      measureEndsMaterial.dispose();
      measureLabel.remove();
      viewCube.dispose();
      cancelAnimationFrame(turning);
      controls.removeEventListener('change', scheduleHover);
      cancelAnimationFrame(frame);
      controls.removeEventListener('change', render);
      controls.dispose();
      geometry.dispose();
      disposeLayers(layers);
      capGeometry.dispose();
      cutLines.forEach((lines) => { lines.geometry.dispose(); lines.material.dispose(); });
      [...handleGeometries, ...outlineGeometries].forEach((part) => { part.dispose(); });
      [...handleMaterials, outlineMaterial, hitMaterial].forEach((material) => { material.dispose(); });
      edgeOverlays.forEach((lines) => { lines.geometry.dispose(); });
      faceOverlays.forEach((overlay) => { overlay.geometry.dispose(); });
      faceMaterials.forEach((material) => { material.dispose(); });
      vertexOverlays.forEach((points) => { points.geometry.dispose(); });
      [...lineMaterials, ...pointMaterials].forEach((material) => { material.dispose(); });
      dotTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
