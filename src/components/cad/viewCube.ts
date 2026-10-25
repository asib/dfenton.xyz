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
const SIZE = 52, TRIAD = 18;

// Named views look from these directions; Onshape's Shift+1 to Shift+7 pick them.
export const namedViews = {
  front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0], top: [0, 0, 1], bottom: [0, 0, -1], isometric: [1, -1, 1],
} as const satisfies Record<string, readonly [number, number, number]>;
export type NamedView = keyof typeof namedViews;
const viewNames = Object.keys(namedViews) as NamedView[];
export const viewKeys: Partial<Record<string, NamedView>> = Object.fromEntries(viewNames.map((name, i) => [`Digit${String(i + 1)}`, name]));
const title = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
// The arrows turn the view 90° about the screen's axes, toward the side they point to: right
// from the front shows the right side, up the top. The curved arrows roll it about the line of
// sight (z, toward the viewer); a positive roll turns the model clockwise on screen.
const arrow = '<svg viewBox="0 0 10 10"><path d="M5 1.5 9 8.5H1z"/></svg>';
const curved = '<svg viewBox="0 0 10 10"><path d="M1.8 6.4A3.3 3.3 0 0 1 8.2 6.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.6 5.7H9.8L8.2 8.6z"/></svg>';
const turns = [
  { name: 'up', axis: 'x', angle: -Math.PI / 2, label: 'Turn the view up 90°', icon: arrow },
  { name: 'down', axis: 'x', angle: Math.PI / 2, label: 'Turn the view down 90°', icon: arrow },
  { name: 'left', axis: 'y', angle: -Math.PI / 2, label: 'Turn the view left 90°', icon: arrow },
  { name: 'right', axis: 'y', angle: Math.PI / 2, label: 'Turn the view right 90°', icon: arrow },
  { name: 'clockwise', axis: 'z', angle: Math.PI / 2, label: 'Roll the view 90° clockwise', icon: curved },
  { name: 'anticlockwise', axis: 'z', angle: -Math.PI / 2, label: 'Roll the view 90° anticlockwise', icon: curved },
] as const;

export interface ViewCubeActions {
  // Look from a direction (a face, edge or corner).
  pick: (direction: THREE.Vector3) => void;
  // Turn the view about a screen axis: x horizontal, y vertical, z the line of sight.
  rotate: (axis: 'x' | 'y' | 'z', angle: number) => void;
  view: (name: NamedView) => void;
}

export function createViewCube(host: HTMLElement, actions: ViewCubeActions) {
  const root = document.createElement('div');
  root.className = 'cad-view-cube';
  // Keep focus (and the pick under the pointer) with the canvas; the views menu opens normally.
  root.addEventListener('pointerdown', event => { if (!(event.target instanceof HTMLSelectElement)) event.preventDefault(); });
  // The cube and arrows are pointer-only; the views menu and Shift+1 to Shift+7 cover the keyboard.
  const hide = (element: Element) => { element.setAttribute('aria-hidden', 'true'); return element; };
  const elements = faces.map(({ name, normal, up, right }) => {
    const element = document.createElement('div');
    element.className = 'cad-view-cube-face';
    hide(element);
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      const zone = document.createElement('span');
      if (row === 1 && column === 1) zone.textContent = name;
      // The centre looks at the face; the rest add the neighbouring faces' normals.
      const direction = normal.clone().addScaledVector(right, column - 1).addScaledVector(up, 1 - row).normalize();
      zone.addEventListener('click', () => { actions.pick(direction); });
      element.appendChild(zone);
    }
    root.appendChild(element);
    return element;
  });
  for (const { name, axis, angle, label, icon } of turns) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cad-view-cube-turn';
    button.dataset.turn = name;
    button.tabIndex = -1;
    button.title = label;
    button.innerHTML = icon;
    button.addEventListener('click', () => { actions.rotate(axis, angle); });
    root.appendChild(hide(button));
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'cad-view-cube-triad');
  svg.setAttribute('viewBox', '-30 -30 60 60');
  root.appendChild(hide(svg));
  // A native menu: keyboard, screen-reader and touch friendly. It shows "Views" again after each pick.
  const select = document.createElement('select');
  select.className = 'cad-view-cube-views';
  select.setAttribute('aria-label', 'Named view');
  select.title = 'Named views (Shift+1 to Shift+7)';
  const placeholder = new Option('Views', '');
  placeholder.hidden = true;
  select.add(placeholder);
  viewNames.forEach((name, i) => { select.add(new Option(`${title(name)} · Shift+${String(i + 1)}`, name)); });
  select.addEventListener('change', () => {
    const name = select.value as NamedView | '';
    select.value = '';
    if (name) actions.view(name);
  });
  root.appendChild(select);
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
