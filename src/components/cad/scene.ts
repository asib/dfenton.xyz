import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type RenderMode = 'solid' | 'edges' | 'wireframe';
export type SectionAxis = 'off' | 'x' | 'y' | 'z';
export interface ViewSettings {
  mode: RenderMode;
  axis: SectionAxis;
  position: number;
  flipped: boolean;
}
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
  solid: THREE.MeshStandardMaterial;
  stencil: THREE.MeshBasicMaterial[];
  edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
}

export function createScene(host: HTMLElement, geometry: THREE.BufferGeometry, cameraDirection = defaultCamera,
  onPick?: (id: string | null) => void) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.isEmpty()) throw new Error('The model has no geometry.');
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const sourceMin = bounds.min.clone();
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
  // Render only on interaction; idle models don't consume an animation loop.
  const render = () => { renderer.render(scene, camera); };
  controls.addEventListener('change', render);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(2, 3, 4);
  const fill = new THREE.DirectionalLight(0xffffff, 1.4);
  fill.position.set(-3, -2, 1);
  scene.add(key, fill);

  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  // Count back/front intersections in stencil so the cut is filled only inside
  // the solid. Cavities remain empty. Based on Three.js's clipping-stencil example.
  const stencilMaterial = (side: THREE.Side) => {
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
        solid: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        stencil: [stencilMaterial(THREE.BackSide), stencilMaterial(THREE.FrontSide)],
        edges,
      };
    });
  };
  const disposeLayers = (old: Layer[]) => {
    for (const layer of old) {
      layer.solid.dispose();
      layer.stencil.forEach((material) => { material.dispose(); });
      layer.edges.geometry.dispose();
      layer.edges.material.dispose();
    }
  };
  let layers = buildLayers(geometry);
  const mesh = new THREE.Mesh(geometry, layers.map((layer) => layer.solid));
  mesh.renderOrder = 3;
  const edgesGroup = new THREE.Group();
  edgesGroup.add(...layers.map((layer) => layer.edges));
  const stencilMeshes = [0, 1].map((side) => {
    const stencilMesh = new THREE.Mesh(geometry, layers.map((layer) => layer.stencil[side]));
    stencilMesh.renderOrder = 1;
    return stencilMesh;
  });
  const stencilGroup = new THREE.Group();
  stencilGroup.add(...stencilMeshes);
  scene.add(mesh, edgesGroup);

  let capGeometry = new THREE.PlaneGeometry(radius * 3, radius * 3);
  const capMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.renderOrder = 2;
  cap.onAfterRender = () => { renderer.clearStencil(); };
  scene.add(stencilGroup, cap);

  let settings: ViewSettings = { mode: 'edges', axis: 'off', position: 50, flipped: false };
  let appearances: PartAppearances = {};
  let selected: string | null = null;
  const colors = { body: '', edge: '', selected: '' };
  const visible = (layer: Layer) => {
    const look = (layer.piece ? appearances[layer.piece] : undefined) ?? (layer.part ? appearances[layer.part] : undefined);
    return { hidden: !!look?.hidden || look?.opacity === 0, opacity: look?.opacity ?? 1 };
  };
  // Apply display mode, section, theme colors and per-part appearance to every layer.
  const apply = () => {
    const { mode, axis } = settings;
    const clipping = axis !== 'off';
    const planes = clipping ? [plane] : [];
    const colored = geometry.hasAttribute('colorLight');
    for (const layer of layers) {
      const { hidden, opacity } = visible(layer);
      const translucent = opacity < 0.999;
      const highlighted = !!selected && (layer.part === selected || layer.piece === selected);
      layer.solid.visible = !hidden;
      layer.solid.vertexColors = colored;
      layer.solid.color.set(colored ? '#ffffff' : colors.body);
      layer.solid.emissive.set(highlighted ? colors.selected : '#000000');
      layer.solid.emissiveIntensity = highlighted ? 0.35 : 0;
      layer.solid.transparent = translucent;
      layer.solid.opacity = opacity;
      // Translucent parts let parts behind them show through.
      layer.solid.depthWrite = !translucent;
      layer.solid.wireframe = mode === 'wireframe';
      layer.solid.clippingPlanes = planes;
      layer.solid.needsUpdate = true;
      layer.edges.visible = !hidden && (mode === 'edges' || highlighted);
      layer.edges.material.color.set(highlighted ? colors.selected : colors.edge);
      layer.edges.material.transparent = translucent;
      layer.edges.material.opacity = opacity;
      layer.edges.material.clippingPlanes = planes;
      layer.edges.material.needsUpdate = true;
      // Section caps fill only fully opaque, visible parts.
      layer.stencil.forEach((material) => { material.visible = !hidden && !translucent; });
    }
    stencilGroup.visible = cap.visible = clipping && mode !== 'wireframe';
    render();
  };

  const setTheme = () => {
    const style = getComputedStyle(host);
    if (geometry.hasAttribute('colorLight')) {
      geometry.setAttribute('color', geometry.getAttribute(document.documentElement.classList.contains('dark') ? 'colorDark' : 'colorLight'));
    }
    colors.body = style.getPropertyValue('--cad-body').trim();
    colors.edge = style.getPropertyValue('--cad-edge').trim();
    colors.selected = style.getPropertyValue('--cad-selected').trim() || '#c2006b';
    capMaterial.color.set(style.getPropertyValue('--cad-section').trim());
    apply();
  };

  const setSettings = (next: ViewSettings) => {
    settings = next;
    const { axis, position, flipped } = next;
    if (axis !== 'off') {
      const direction = new THREE.Vector3();
      direction[axis] = flipped ? 1 : -1;
      const coordinate = (position / 100 - 0.5) * size[axis];
      plane.set(direction, -direction[axis] * coordinate);
      plane.coplanarPoint(cap.position);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    }
    apply();
  };

  const setAppearance = (next: PartAppearances, nextSelected: string | null) => {
    appearances = next;
    selected = nextSelected;
    apply();
  };

  const reset = () => {
    // Fit the bounding sphere to the narrower field of view (including phones).
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFov = Math.atan(Math.tan(vertical) * Math.min(camera.aspect, 1));
    const distance = radius / Math.sin(halfFov) * 1.12;
    camera.position.copy(new THREE.Vector3(...cameraDirection).normalize().multiplyScalar(distance));
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  };

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
    stencilMeshes.forEach((stencilMesh, side) => {
      stencilMesh.geometry = next;
      stencilMesh.material = layers.map((layer) => layer.stencil[side]);
    });
    cap.geometry = nextCap;
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
  };
  let previousWidth = 0;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (!previousWidth) reset();
    previousWidth = width;
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const themeObserver = new MutationObserver(setTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && selected) { onPick?.(null); return; }
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

  // A click (not an orbit or pan drag) selects the nearest visible, unclipped part.
  const raycaster = new THREE.Raycaster();
  let pressed: { x: number; y: number } | null = null;
  const onPointerDown = (event: PointerEvent) => { pressed = event.button === 0 ? { x: event.clientX, y: event.clientY } : null; };
  const onPointerUp = (event: PointerEvent) => {
    if (!onPick || !pressed || event.button !== 0 || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 5) return;
    pressed = null;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const clipping = settings.axis !== 'off';
    for (const hit of raycaster.intersectObject(mesh, false)) {
      const layer = layers[hit.face?.materialIndex ?? -1] as Layer | undefined;
      if (!layer || visible(layer).hidden || (clipping && plane.distanceToPoint(hit.point) < 0)) continue;
      onPick(layer.piece ?? layer.part);
      return;
    }
    onPick(null);
  };
  renderer.domElement.addEventListener('keydown', onKey);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  setTheme();
  setSettings({ mode: 'edges', axis: 'off', position: 50, flipped: false });
  resize();

  return {
    size, sourceMin, setSettings, setAppearance, reset, replaceGeometry,
    dispose() {
      observer.disconnect();
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.removeEventListener('change', render);
      controls.dispose();
      geometry.dispose();
      disposeLayers(layers);
      capGeometry.dispose();
      capMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
