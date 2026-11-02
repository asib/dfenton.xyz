import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { SectionPlane } from './section';
import { edgeTopology, type Topology } from './topology';
import { createViewCube, namedViews, type NamedView } from './viewCube';

export type RenderMode = 'solid' | 'edges' | 'wireframe';
// `sections` are the planes cutting the model (section.ts), up to `maxSections`. With several,
// only material on the removed side of every one is removed, as in Onshape's corner cutaways.
// `handle` places one plane's manipulator, or null hides it. `excluded` parts and pieces (by
// legend part ID or piece key) are left whole.
export const maxSections = 3;
export interface ViewSettings {
  mode: RenderMode;
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
  // Three's Curve constructor is protected.
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() { super(); }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const angle = 0.3 + t * 0.75;
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
// piece can be faded, hidden or highlighted with its own edges and stencil.
interface Layer {
  part: string | null;
  piece: string | null;
  // Whole edges and vertices of the piece, in scene coordinates.
  topology: Topology;
  solid: THREE.MeshStandardMaterial;
  // Back and front stencil materials for each section plane.
  stencil: THREE.MeshBasicMaterial[][];
  edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
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
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = radius * 0.25;
  controls.maxDistance = radius * 15;
  controls.enableDamping = false;
  // Onshape's mouse: right-drag orbits about the point under the cursor (orbitAbout
  // below), Ctrl- (or Cmd-/Shift-) right-drag and middle-drag pan, and left-click
  // selects. The controls keep panning, wheel/pinch zoom and two-finger gestures;
  // with their own rotation disabled, a plain right-drag is left to orbitAbout.
  // One finger is unmapped too, so a pinch that ends with a finger still down
  // resets them instead of leaving that finger zooming against a lifted one.
  controls.enableRotate = false;
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
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
  const render = () => { placeHandle(); renderer.render(scene, camera); placeLabel(); viewCube.update(camera); };
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
  // each plane counts with only itself clipping, then fills its cap and clears.
  const stencilMaterial = (side: THREE.Side, plane: THREE.Plane) => {
    const operation = side === THREE.BackSide ? THREE.IncrementWrapStencilOp : THREE.DecrementWrapStencilOp;
    return new THREE.MeshBasicMaterial({
      side, depthWrite: false, depthTest: false, colorWrite: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: operation, stencilZFail: operation, stencilZPass: operation,
      clippingPlanes: [plane],
    });
  };
  const buildLayers = (source: THREE.BufferGeometry): Layer[] => {
    if (!source.groups.length) source.addGroup(0, source.getAttribute('position').count, 0);
    const parts = (source.userData.partIds ?? []) as (string | null)[];
    const pieces = (source.userData.pieceKeys ?? []) as (string | undefined)[];
    const positions = source.getAttribute('position').array;
    return source.groups.map((group, index) => {
      group.materialIndex = index;
      const slice = new THREE.BufferGeometry();
      slice.setAttribute('position', new THREE.BufferAttribute(positions.slice(group.start * 3, (group.start + group.count) * 3), 3));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slice, 25), new THREE.LineBasicMaterial());
      slice.dispose();
      edges.renderOrder = 4;
      const part = parts[index] ?? null;
      return {
        part,
        piece: part ? pieces[index] ?? null : null,
        // Picking uses exactly the creases that are drawn, joined into whole edges.
        topology: edgeTopology(edges.geometry.getAttribute('position').array, 1e-3),
        solid: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        stencil: planes.map(plane => [stencilMaterial(THREE.BackSide, plane), stencilMaterial(THREE.FrontSide, plane)]),
        edges,
      };
    });
  };
  const disposeLayers = (old: Layer[]) => {
    for (const layer of old) {
      layer.solid.dispose();
      layer.stencil.flat().forEach((material) => { material.dispose(); });
      layer.edges.geometry.dispose();
      layer.edges.material.dispose();
    }
  };
  let layers = buildLayers(geometry);
  const mesh = new THREE.Mesh(geometry, layers.map((layer) => layer.solid));
  mesh.renderOrder = 3;
  const edgesGroup = new THREE.Group();
  edgesGroup.add(...layers.map((layer) => layer.edges));
  // Each plane's stencil count and cap draw in turn, between the model and its edges.
  const stencilMeshes = planes.map((_, index) => [0, 1].map((side) => {
    const stencilMesh = new THREE.Mesh(geometry, layers.map((layer) => layer.stencil[index][side]));
    stencilMesh.renderOrder = 1 + index / maxSections;
    return stencilMesh;
  }));
  const stencilGroups = stencilMeshes.map((pair) => { const group = new THREE.Group(); group.add(...pair); return group; });
  scene.add(mesh, edgesGroup);

  let capGeometry = new THREE.PlaneGeometry(radius * 3, radius * 3);
  const caps = planes.map((_, index) => {
    const cap = new THREE.Mesh(capGeometry, new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    }));
    cap.renderOrder = 1 + (index + 0.5) / maxSections;
    cap.onAfterRender = () => { renderer.clearStencil(); };
    return cap;
  });
  scene.add(...stencilGroups, ...caps);

  // The section manipulator, as in Onshape: an arrow toward the removed side, dragged to move
  // the plane along it and clicked to flip it, and two arcs dragged to tilt the plane about its
  // axes. Built at unit size about its point, kept a constant size on screen as it renders, and
  // drawn over the model. Each handle has a wider invisible copy that is easier to grab.
  const handleMaterials = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true }));
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const handleGeometries = [
    new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12).translate(0, 0.36, 0).rotateX(Math.PI / 2),
    new THREE.ConeGeometry(0.075, 0.28, 20).translate(0, 0.86, 0).rotateX(Math.PI / 2),
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.CylinderGeometry(0.1, 0.1, 1.05, 8).translate(0, 0.52, 0).rotateX(Math.PI / 2),
    new THREE.TubeGeometry(new ArcCurve(), 24, 0.022, 8),
    new THREE.TubeGeometry(new ArcCurve(), 12, 0.09, 6),
  ];
  const handle = new THREE.Group(), arrow = new THREE.Group();
  const arrowHit = new THREE.Mesh(handleGeometries[3], hitMaterial);
  arrow.add(...[0, 1, 2].map(index => new THREE.Mesh(handleGeometries[index], handleMaterials[0])), arrowHit);
  const arcs = [1, 2].map(material => new THREE.Mesh(handleGeometries[4], handleMaterials[material]));
  const arcHits = arcs.map(arc => { const hit = new THREE.Mesh(handleGeometries[5], hitMaterial); arc.add(hit); return hit; });
  const handleHits = [arrowHit, ...arcHits];
  handle.add(arrow, ...arcs);
  handle.traverse((part) => { part.renderOrder = 10; });
  handle.visible = false;
  scene.add(handle);
  const handleColors = { idle: '', active: '' };
  let handleHover: number | null = null, handleActive: number | null = null;
  const paintHandle = () => {
    handleMaterials.forEach((material, index) => { material.color.set(index === (handleActive ?? handleHover) ? handleColors.active : handleColors.idle); });
  };
  placeHandle = () => {
    if (!handle.visible) return;
    const pixels = 2 * camera.position.distanceTo(handle.position) * Math.tan(camera.fov * Math.PI / 360) / (renderer.domElement.clientHeight || 1);
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
    const p = labelAnchor.clone().project(camera);
    measureLabel.hidden = p.z > 1;
    measureLabel.style.transform = `translate(${String((p.x + 1) / 2 * host.clientWidth)}px, ${String((1 - p.y) / 2 * host.clientHeight)}px) translate(-50%, -135%)`;
  };
  scene.add(...edgeOverlays, ...vertexOverlays, pivotMarker, measureLine, measureEnds);

  // Edges and vertices are keyed "edge:<version>:<layer>:<index>"; regenerating the
  // model bumps the version, so a stale key can never name a different edge.
  let version = 0;
  const entityAt = (key: string | null) => {
    const match = key ? /^(edge|vertex):(\d+):(\d+):(\d+)$/.exec(key) : null;
    if (!match || Number(match[2]) !== version) return undefined;
    const layer = layers[Number(match[3])] as Layer | undefined;
    const index = Number(match[4]);
    if (!layer) return undefined;
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
  const drawEntities = (keys: string[], overlay: 0 | 1) => {
    const found = keys.map(entityAt).filter((item) => !!item && !visible(item.layer).hidden);
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
    for (const layer of layers) {
      const selectedLayer = selected.some(key => matches(layer, key));
      const hovered = !selectedLayer && matches(layer, hover);
      const tint = selectedLayer ? colors.selected : hovered ? colors.hover : '#000000';
      layer.solid.emissive.set(tint);
      layer.solid.emissiveIntensity = selectedLayer ? 0.35 : hovered ? 0.22 : 0;
      layer.edges.visible = !visible(layer).hidden && (settings.mode === 'edges' || selectedLayer || hovered);
      layer.edges.material.color.set(selectedLayer ? colors.selected : hovered ? colors.hover : colors.edge);
    }
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
        pair.forEach((material) => { material.visible = !hidden && !translucent && index < cut.length; });
      });
    }
    stencilGroups.forEach((group, index) => { group.visible = caps[index].visible = index < active.length && mode !== 'wireframe'; });
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
    caps.forEach((cap) => { cap.material.color.set(style.getPropertyValue('--cad-section').trim()); });
    handleColors.idle = style.getPropertyValue('--cad-section').trim();
    handleColors.active = colors.hover;
    paintHandle();
    apply();
  };

  const setSettings = (next: ViewSettings) => {
    settings = next;
    next.sections.slice(0, maxSections).forEach((section, index) => {
      // Each plane faces away from the side it removes. Scene coordinates are model
      // coordinates less the origin.
      const normal = new THREE.Vector3(...section.normal);
      planes[index].set(normal.clone().negate(), section.constant - normal.dot(origin));
      planes[index].coplanarPoint(caps[index].position);
      caps[index].quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), planes[index].normal);
      capClips[index].copy(planes[index]).negate();
    });
    caps.forEach((cap, index) => {
      cap.material.clippingPlanes = capClips.filter((_, other) => other !== index && other < next.sections.length);
      cap.material.needsUpdate = true;
    });
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
    const nextCap = new THREE.PlaneGeometry(nextRadius * 3, nextRadius * 3);
    version += 1;
    origin.copy(nextCenter);
    geometry.dispose();
    disposeLayers(layers);
    capGeometry.dispose();
    geometry = next;
    layers = nextLayers;
    capGeometry = nextCap;
    mesh.geometry = next;
    mesh.material = layers.map((layer) => layer.solid);
    edgesGroup.clear();
    edgesGroup.add(...layers.map((layer) => layer.edges));
    stencilMeshes.forEach((pair, index) => {
      pair.forEach((stencilMesh, side) => {
        stencilMesh.geometry = next;
        stencilMesh.material = layers.map((layer) => layer.stencil[index][side]);
      });
    });
    caps.forEach((cap) => { cap.geometry = nextCap; });
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
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
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
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
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
    projected.set(p[0], p[1], p[2]).project(camera);
    return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height, behind: projected.z > 1 };
  };
  const unobstructed = (point: THREE.Vector3, owner: Layer) => {
    if (clipped(owner, point)) return false;
    const direction = point.clone().sub(camera.position);
    const distance = direction.length();
    raycaster.set(camera.position, direction.normalize());
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
  const pickEntityAt = (x: number, y: number): string | null => snapAt(x, y)?.key ?? pickAt(x, y);
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
    raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
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
  const startOrbit = (id: number, x: number, y: number) => {
    orbiting = { id, x, y };
    // A point on the part under the cursor, else a snapped corner or edge, else the center.
    const grabbed = surfaceAt(x, y) ?? snapAt(x, y)?.point ?? null;
    pivot.copy(grabbed ?? controls.target);
    pivotMarker.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pivot.toArray(), 3));
    pivotMarker.visible = !!grabbed;
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
    const orbitButton = event.pointerType === 'touch' ? event.button === 0
      : event.button === 2 && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    if (orbitButton && pointers.size === 1) startOrbit(event.pointerId, event.clientX, event.clientY);
    else stopOrbit(); // A second finger hands over to pinch and pan.
    scheduleHover();
  };
  // When a pinch ends with one finger still down, that finger orbits again from where it is.
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
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
      caps.forEach((cap) => { cap.material.dispose(); });
      handleGeometries.forEach((part) => { part.dispose(); });
      [...handleMaterials, hitMaterial].forEach((material) => { material.dispose(); });
      edgeOverlays.forEach((lines) => { lines.geometry.dispose(); });
      vertexOverlays.forEach((points) => { points.geometry.dispose(); });
      [...lineMaterials, ...pointMaterials].forEach((material) => { material.dispose(); });
      dotTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
