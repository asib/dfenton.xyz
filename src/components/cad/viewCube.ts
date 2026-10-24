import * as THREE from 'three';

// An orientation cube, as CAD programs have: it turns with the camera, and clicking a
// face, edge or corner looks at the model from that side. Each face is a 3 x 3 grid:
// the centre picks the face, the sides its edges and the corners its corners. Faces are
// HTML with CSS 3D transforms, so the browser does the hit testing; hidden faces turn
// away (backface-visibility), so the convex cube never needs depth sorting.
interface Face { name: string; normal: THREE.Vector3; up: THREE.Vector3; right: THREE.Vector3 }
const face = (name: string, normal: [number, number, number], up: [number, number, number]): Face => {
  const n = new THREE.Vector3(...normal), u = new THREE.Vector3(...up);
  return { name, normal: n, up: u, right: u.clone().cross(n) };
};
// Z is up and the front faces -Y. The top keeps the front at the bottom of the screen and
// the bottom keeps it at the top, as top and bottom views do.
const faces = [
  face('Front', [0, -1, 0], [0, 0, 1]), face('Back', [0, 1, 0], [0, 0, 1]),
  face('Right', [1, 0, 0], [0, 0, 1]), face('Left', [-1, 0, 0], [0, 0, 1]),
  face('Top', [0, 0, 1], [0, 1, 0]), face('Bottom', [0, 0, -1], [0, -1, 0]),
];
const axes = [{ name: 'X', vector: new THREE.Vector3(1, 0, 0) }, { name: 'Y', vector: new THREE.Vector3(0, 1, 0) }, { name: 'Z', vector: new THREE.Vector3(0, 0, 1) }];
const SIZE = 56, TRIAD = 20;

export function createViewCube(host: HTMLElement, onPick: (direction: THREE.Vector3) => void) {
  const root = document.createElement('div');
  root.className = 'cad-view-cube';
  // Pointer-only; the arrow keys and named views cover the keyboard.
  root.setAttribute('aria-hidden', 'true');
  // Keep focus (and the pick under the pointer) with the canvas.
  root.addEventListener('pointerdown', event => { event.preventDefault(); });
  const elements = faces.map(({ name, normal, up, right }) => {
    const element = document.createElement('div');
    element.className = 'cad-view-cube-face';
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      const zone = document.createElement('span');
      if (row === 1 && column === 1) zone.textContent = name;
      // The centre looks at the face; the rest add the neighbouring faces' normals.
      const direction = normal.clone().addScaledVector(right, column - 1).addScaledVector(up, 1 - row).normalize();
      zone.addEventListener('click', () => { onPick(direction); });
      element.appendChild(zone);
    }
    root.appendChild(element);
    return element;
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'cad-view-cube-triad');
  svg.setAttribute('viewBox', '-30 -30 60 60');
  root.appendChild(svg);
  host.appendChild(root);

  // World vectors in CSS space: the camera's rotation, with y pointing down.
  const rotation = new THREE.Matrix4();
  const css = (vector: THREE.Vector3) => { const v = vector.clone().applyMatrix4(rotation); return new THREE.Vector3(v.x, -v.y, v.z); };
  const update = (camera: THREE.Camera) => {
    rotation.extractRotation(camera.matrixWorldInverse);
    faces.forEach(({ normal, up, right }, i) => {
      const x = css(right), y = css(up.clone().negate()), z = css(normal), t = z.clone().multiplyScalar(SIZE / 2);
      elements[i].style.transform = `matrix3d(${[x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, t.x, t.y, t.z, 1].map(n => n.toFixed(5)).join(',')})`;
    });
    // Axes pointing away are drawn first and fainter.
    svg.innerHTML = axes.map(axis => ({ ...axis, screen: css(axis.vector) })).sort((a, b) => a.screen.z - b.screen.z).map(({ name, screen }) => {
      const x = screen.x * TRIAD, y = screen.y * TRIAD, away = screen.z < -0.2 ? ' data-away=""' : '';
      return `<g data-axis="${name}"${away}><line x1="0" y1="0" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>` +
        `<text x="${(screen.x * (TRIAD + 7)).toFixed(2)}" y="${(screen.y * (TRIAD + 7)).toFixed(2)}">${name}</text></g>`;
    }).join('');
  };
  return { update, dispose: () => { root.remove(); } };
}
