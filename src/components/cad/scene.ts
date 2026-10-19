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

// Models retain the OpenSCAD convention: millimeters, Z up. Center only for orbiting.
export function createScene(host: HTMLElement, geometry: THREE.BufferGeometry) {
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
  const solidMaterial = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const mesh = new THREE.Mesh(geometry, solidMaterial);
  mesh.renderOrder = 3;
  let edgeGeometry = new THREE.EdgesGeometry(geometry, 25);
  const edgeMaterial = new THREE.LineBasicMaterial();
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edges.renderOrder = 4;
  scene.add(mesh, edges);

  // Count back/front intersections in stencil so the cut is filled only inside
  // the solid. Cavities remain empty. Based on Three.js's clipping-stencil example.
  const stencilMaterials = [THREE.BackSide, THREE.FrontSide].map((side, index) => {
    const operation = index === 0 ? THREE.IncrementWrapStencilOp : THREE.DecrementWrapStencilOp;
    return new THREE.MeshBasicMaterial({
      side, depthWrite: false, depthTest: false, colorWrite: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: operation, stencilZFail: operation, stencilZPass: operation,
      clippingPlanes: [plane],
    });
  });
  const stencilGroup = new THREE.Group();
  stencilMaterials.forEach((material) => {
    const stencilMesh = new THREE.Mesh(geometry, material);
    stencilMesh.renderOrder = 1;
    stencilGroup.add(stencilMesh);
  });
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

  const setTheme = () => {
    const style = getComputedStyle(host);
    const colored = geometry.hasAttribute('colorLight');
    solidMaterial.vertexColors = colored;
    if (colored) geometry.setAttribute('color', geometry.getAttribute(document.documentElement.classList.contains('dark') ? 'colorDark' : 'colorLight'));
    solidMaterial.color.set(colored ? '#ffffff' : style.getPropertyValue('--cad-body').trim());
    solidMaterial.needsUpdate = true;
    edgeMaterial.color.set(style.getPropertyValue('--cad-edge').trim());
    capMaterial.color.set(style.getPropertyValue('--cad-section').trim());
    render();
  };

  let settings: ViewSettings = { mode: 'edges', axis: 'off', position: 50, flipped: false };
  const setSettings = (next: ViewSettings) => {
    settings = next;
    const { mode, axis, position, flipped } = next;
    const clipping = axis !== 'off';
    const planes = clipping ? [plane] : [];
    solidMaterial.wireframe = mode === 'wireframe';
    solidMaterial.clippingPlanes = planes;
    solidMaterial.needsUpdate = true;
    edgeMaterial.clippingPlanes = planes;
    edgeMaterial.needsUpdate = true;
    edges.visible = mode === 'edges';
    stencilGroup.visible = cap.visible = clipping && mode !== 'wireframe';
    if (clipping) {
      const direction = new THREE.Vector3();
      direction[axis] = flipped ? 1 : -1;
      const coordinate = (position / 100 - 0.5) * size[axis];
      plane.set(direction, -direction[axis] * coordinate);
      plane.coplanarPoint(cap.position);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    }
    render();
  };

  const reset = () => {
    // Fit the bounding sphere to the narrower field of view (including phones).
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFov = Math.atan(Math.tan(vertical) * Math.min(camera.aspect, 1));
    const distance = radius / Math.sin(halfFov) * 1.12;
    camera.position.copy(new THREE.Vector3(1.35, 1.8, 1.1).normalize().multiplyScalar(distance));
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
    const nextEdges = new THREE.EdgesGeometry(next, 25);
    const nextCap = new THREE.PlaneGeometry(nextRadius * 3, nextRadius * 3);
    geometry.dispose();
    edgeGeometry.dispose();
    capGeometry.dispose();
    geometry = next;
    edgeGeometry = nextEdges;
    capGeometry = nextCap;
    mesh.geometry = next;
    edges.geometry = nextEdges;
    cap.geometry = nextCap;
    stencilGroup.children.forEach((child) => { (child as THREE.Mesh).geometry = next; });
    size.copy(nextSize);
    sourceMin.copy(nextMin);
    radius = nextRadius;
    camera.near = radius / 100;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 0.25;
    controls.maxDistance = radius * 15;
    // Preserve camera/pan/zoom; section percentage follows the new model bounds.
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
  renderer.domElement.addEventListener('keydown', onKey);
  setSettings({ mode: 'edges', axis: 'off', position: 50, flipped: false });
  setTheme();
  resize();

  return {
    size, sourceMin, setSettings, reset, replaceGeometry,
    dispose() {
      observer.disconnect();
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('keydown', onKey);
      controls.removeEventListener('change', render);
      controls.dispose();
      geometry.dispose();
      edgeGeometry.dispose();
      capGeometry.dispose();
      solidMaterial.dispose();
      edgeMaterial.dispose();
      capMaterial.dispose();
      stencilMaterials.forEach((material) => { material.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
