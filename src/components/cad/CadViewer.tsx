import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import type { CadEntry, PartColor } from '../../misc';
import { createScene, type PartAppearances, type PickedFace, type RenderMode } from './scene';
import { defaultPlanes, depthRange, facePlane, planeNames, sectionPlane, startSection, type DefaultPlane, type SectionState, type Vec3 } from './section';
import ParametricControls, { type LocalModel } from './ParametricControls';
import { coloredGeometry, geometryPieces, parseDisplayMesh, parsePieceLabels, visiblePartColors, type DisplayMesh } from './displayMesh';
import type { CompiledModel } from './compiler.worker';
import CutListTable from './CutListTable';
import { fileParts, stlMesh, type FileParts } from './fileParts';
import { inches } from './cutList';
import { measure, type Measurable } from './measure';
import SheetLayoutTable from './SheetLayoutTable';
import type { CutListOutput } from './cutList';
import { useFullscreen } from './useFullscreen';
import { viewKeys } from './viewCube';
import DrawingSheets from './DrawingSheets';
import type { DrawingOutput } from './drawings';
import { emptyWorksheets, type CutListDraft, type DraftUpdate, type SheetLayoutDraft, type WorksheetDrafts } from './worksheets';
import './cad.css';

type Viewer = ReturnType<typeof createScene>;
const tuple = (vector: { x: number; y: number; z: number }): Vec3 => [vector.x, vector.y, vector.z];

// What a visitor's file's parts are, for the legend.
const partsHints: Record<FileParts['from'], string> = {
  color: 'Each color in this file is a part, numbered in file order.',
  solid: 'Each separate solid in this file is a part, numbered in file order.',
  listed: 'Each solid this file lists is a part, by the name it gives, or else numbered in file order.',
};

// A model's geometry and the parts its legend lists. The site's models name their parts; a
// visitor's file (`generic`) gets numbered ones when it has several colors or solids.
function modelGeometry(display: DisplayMesh | undefined, stl: ArrayBuffer | undefined, palette: PartColor[] | undefined, generic: boolean) {
  if (generic) {
    const mesh = stl && new STLLoader().parse(stl);
    const found = fileParts(display, mesh && stlMesh(mesh));
    if (found) return { geometry: coloredGeometry(found.display, found.parts), parts: found.parts, from: found.from };
    if (mesh && !display) return { geometry: mesh, parts: undefined, from: undefined };
  }
  if (display) return { geometry: coloredGeometry(display, palette), parts: palette && visiblePartColors(display, palette), from: undefined };
  if (!stl) throw new Error('The model has no geometry.');
  return { geometry: new STLLoader().parse(stl), parts: palette, from: undefined };
}

// `downloads` offers the model and source files; the model viewer turns it off for visitors' own
// files. `local` is a visitor's SCAD file, compiled already, which opens without a request.
// `fileUnits` are a visitor's file's units: an inch file is scaled to the scene's millimetres,
// and lengths show in its units first. Site models give their units in the customizer instead.
// `genericParts` numbers a visitor's file's colors or solids as parts, for the legend.
export default function CadViewer({ entry, local, fileUnits, genericParts = false, downloads = true }: {
  entry: CadEntry & { href: string }; local?: LocalModel; fileUnits?: 'mm' | 'inches'; genericParts?: boolean; downloads?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const { workspace, toggleButton, fullscreen, enter, leave } = useFullscreen();
  const [legendOpen, setLegendOpen] = useState(true);
  const [parametersOpen, setParametersOpen] = useState(true);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [status, setStatus] = useState('Loading model…');
  const [mode, setMode] = useState<RenderMode>('edges');
  // The section view (section.ts), or null when off; Shift+X brings back the last one.
  // `picking` waits for a click on a face to section through; `depthDraft` is a typed depth.
  const [section, setSection] = useState<SectionState | null>(null);
  const [picking, setPicking] = useState(false);
  const [depthDraft, setDepthDraft] = useState<string | null>(null);
  const lastSection = useRef<SectionState | null>(null);
  const [, setRevision] = useState(0);
  const [cutList, setCutList] = useState<CutListOutput>({ text: '', stale: true });
  const [drawings, setDrawings] = useState<DrawingOutput>({ stale: true });
  // Worksheet settings live here so saved configurations and share links can carry them.
  const [worksheets, setWorksheets] = useState<WorksheetDrafts>(emptyWorksheets);
  const onSheetLayout = useCallback<DraftUpdate<SheetLayoutDraft>>((update) => {
    setWorksheets((previous) => ({ ...previous, sheetLayout: update(previous.sheetLayout) }));
  }, []);
  const onCutList = useCallback<DraftUpdate<CutListDraft>>((update) => {
    setWorksheets((previous) => ({ ...previous, cutList: update(previous.cutList) }));
  }, []);
  // View-only part appearance survives regeneration and theme changes; it never changes downloads.
  const [appearances, setAppearances] = useState<PartAppearances>({});
  // Selected legend part IDs and piece keys; clicking toggles them, as in Onshape.
  const [selected, setSelected] = useState<string[]>([]);
  // The piece or part under the pointer in the 3D view, mirrored in the legend.
  const [canvasHover, setCanvasHover] = useState<string | null>(null);
  const [pieces, setPieces] = useState<{ key: string; part: string }[]>([]);
  const modelUrl = `${entry.href}${entry.model}`;
  const displayUrl = entry.displayModel ? `${entry.href}${entry.displayModel}` : undefined;
  const palette = entry.customizer?.parts;
  const camera = entry.camera;
  const units = fileUnits ?? entry.customizer?.units ?? 'mm';
  const scale = fileUnits === 'inches' ? 25.4 : 1;
  // A local file's latest model, so a change of units rebuilds the scene from current settings.
  const latestModel = useRef(local?.model);
  const [visibleParts, setVisibleParts] = useState(palette);
  // What a visitor's file's generic parts are.
  const [partsFrom, setPartsFrom] = useState<FileParts['from']>();
  const hasParameters = !!(entry.customizer && entry.source);
  const hasLegend = !!visibleParts?.length;
  const hasPanels = hasLegend || hasParameters;
  const viewCutList = (headingId: string) => {
    void leave().then(() => {
      requestAnimationFrame(() => {
        const heading = document.getElementById(headingId);
        heading?.scrollIntoView({ block: 'start' });
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      });
    });
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const controller = new AbortController();
    let active: Viewer | null = null;
    const lost = () => { setStatus(`The 3D view was interrupted. ${downloads ? 'Reload the page to restore it, or download the model below.' : 'Open the file again to restore it.'}`); };
    const load = async () => {
      try {
        // Start with saved colored triangles when provided, so cold loads don't
        // show a monochrome STL while the parametric engine initializes.
        let display: DisplayMesh | undefined, stl: ArrayBuffer | undefined;
        const model = local && (latestModel.current ?? local.model);
        if (model) ({ display, stl } = model);
        else {
          const response = await fetch(displayUrl ?? modelUrl, { signal: controller.signal });
          if (!response.ok) throw new Error('Model request failed.');
          if (displayUrl) display = parseDisplayMesh(await response.json());
          else stl = await response.arrayBuffer();
        }
        const { geometry, parts, from } = modelGeometry(display, stl, palette, genericParts);
        if (scale !== 1) geometry.scale(scale, scale, scale);
        if (controller.signal.aborted) { geometry.dispose(); return; }
        setVisibleParts(parts);
        setPartsFrom(from);
        setPieces(geometryPieces(geometry));
        try {
          active = createScene(element, geometry, camera, (key, face) => { pick.current(key, face); }, setCanvasHover);
        } catch (error) {
          geometry.dispose();
          throw error;
        }
        element.querySelector('canvas')?.addEventListener('webglcontextlost', lost);
        setViewer(active);
        setStatus('');
      } catch {
        if (!controller.signal.aborted) {
          setStatus(downloads ? 'The 3D view could not load. You can still download the model below.' : 'The 3D view could not load this file.');
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      element.querySelector('canvas')?.removeEventListener('webglcontextlost', lost);
      active?.dispose();
    };
  }, [local, modelUrl, displayUrl, palette, genericParts, camera, downloads, scale]);

  useEffect(() => {
    viewer?.setSettings({ mode, section: section && sectionPlane(section) });
    if (section) lastSection.current = section;
  }, [viewer, mode, section]);
  // A change of units rescales the model, so the section moves with it.
  const sectionScale = useRef(scale);
  useEffect(() => {
    const ratio = scale / sectionScale.current;
    sectionScale.current = scale;
    if (ratio === 1) return;
    const rescale = (current: SectionState | null) => current && { ...current, depth: current.depth * ratio, reference: { ...current.reference, offset: current.reference.offset * ratio } };
    lastSection.current = rescale(lastSection.current);
    setSection(rescale);
  }, [scale]);

  const pieceLabels = useMemo(() => parsePieceLabels(cutList.text), [cutList.text]);
  const partPieces = (id: string) => pieces.filter(piece => piece.part === id);
  const pieceLabel = (piece: { key: string; part: string }) => pieceLabels.get(piece.key) ??
    `${visibleParts?.find(part => part.id === piece.part)?.label ?? 'Piece'} · ${String(partPieces(piece.part).indexOf(piece) + 1)}`;
  // A legend part ID or piece key as a target; a piece of a single-piece part is the part itself.
  const resolve = (key: string | null) => {
    if (!key) return null;
    const direct = visibleParts?.find(part => part.id === key);
    const piece = direct ? undefined : pieces.find(candidate => candidate.key === key);
    const part = direct ?? visibleParts?.find(candidate => candidate.id === piece?.part);
    if (!part) return null;
    return piece && partPieces(part.id).length > 1 ? { key: piece.key, part, piece, label: pieceLabel(piece) } : { key: part.id, part, piece: undefined, label: part.label };
  };
  type Target = NonNullable<ReturnType<typeof resolve>>;
  // Edges and vertices are measured, not hidden: they belong to a part for labels only.
  const resolveEntity = (key: string | null) => {
    const entity = key ? viewer?.entity(key) : undefined;
    if (!key || !entity) return null;
    const owner = resolve(entity.piece ?? entity.part);
    const kind = entity.kind === 'edge' ? 'Edge' : 'Vertex';
    return { key, entity, owner, label: owner ? `${kind} · ${owner.label}` : kind };
  };
  type EntityTarget = NonNullable<ReturnType<typeof resolveEntity>>;
  const items = selected.map(key => resolve(key) ?? resolveEntity(key)).filter((item): item is Target | EntityTarget => !!item);
  // Appearance actions apply to the selected parts and pieces.
  const selection = items.filter((item): item is Target => 'part' in item);
  // Selected edges and vertices are measured automatically, as in Onshape.
  const measured = items.flatMap((item): Measurable[] => 'entity' in item ? [item.entity.kind === 'edge'
    ? { kind: 'edge', points: item.entity.points, closed: item.entity.closed, length: item.entity.length }
    : { kind: 'vertex', position: item.entity.position }] : []);
  const measurement = measure(measured);
  // Lengths in the model's units first, then the other; inches snap to 64ths within float precision.
  const inchText = (mm: number) => {
    const value = mm / 25.4, sixtyFourths = Math.round(value * 64);
    return Math.abs(value - sixtyFourths / 64) < 2e-5 ? `${inches(sixtyFourths / 64)}″` : `${value.toFixed(3)}″`;
  };
  const formatLength = (mm: number) => {
    const mmText = `${mm.toFixed(2)} mm`;
    return units === 'inches' ? [inchText(mm), mmText] : [mmText, inchText(mm)];
  };
  // A section's depth, which may be negative, in the model's units.
  const depthText = (mm: number) => {
    const text = units === 'inches' ? inchText(Math.abs(mm)) : `${Math.abs(mm).toFixed(1)} mm`;
    return mm < 0 && /[1-9]/.test(text) ? `−${text}` : text;
  };
  const formatRow = (row: { value: number; unit: 'length' | 'angle' }) => row.unit === 'angle' ? [`${row.value.toFixed(2)}°`, ''] : formatLength(row.value);
  const measurementKey = measurement ? JSON.stringify(measurement) : '';
  useEffect(() => {
    if (!viewer) return;
    const shown = measurementKey ? JSON.parse(measurementKey) as NonNullable<typeof measurement> : null;
    viewer.setMeasurement(shown ? { line: shown.line, anchor: shown.anchor, text: formatRow(shown.rows[0])[0] } : null);
    // formatRow depends only on the units, and a change of units rebuilds the viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, measurementKey]);
  const selectionKey = items.map(item => item.key).join(' ');
  useEffect(() => {
    viewer?.setAppearance(appearances, selectionKey ? selectionKey.split(' ') : []);
  }, [viewer, appearances, selectionKey]);
  // Clicking a part or piece adds it to the selection or removes it; empty space clears it.
  // A whole group absorbs its selected pieces, and clicking one piece of a selected group
  // leaves the group's other pieces selected.
  const toggleSelect = (key: string | null) => {
    if (resolveEntity(key)) {
      setSelected(previous => previous.includes(key ?? '') ? previous.filter(item => item !== key) : [...previous, key ?? '']);
      return;
    }
    const target = resolve(key);
    if (!target) { setSelected([]); return; }
    const siblings = partPieces(target.part.id).map(piece => piece.key);
    setSelected(previous => {
      const current = previous.map(item => resolve(item)?.key ?? (resolveEntity(item) ? item : undefined)).filter((item): item is string => !!item);
      if (current.includes(target.key)) return current.filter(item => item !== target.key);
      if (target.piece && current.includes(target.part.id)) return [...current.filter(item => item !== target.part.id), ...siblings.filter(item => item !== target.key)];
      if (!target.piece) return [...current.filter(item => !siblings.includes(item)), target.key];
      return [...current, target.key];
    });
  };
  // A click selects, or while picking, sections through the face clicked.
  const pick = useRef<(key: string | null, face: PickedFace | null) => void>(toggleSelect);
  pick.current = (key, face) => {
    if (!picking) { toggleSelect(key); return; }
    if (!face || !viewer) return;
    setSection(startSection(facePlane(face.point, face.normal), tuple(viewer.sourceMin), tuple(viewer.size)));
    setDepthDraft(null);
    setPicking(false);
  };
  // Hovering an edge or vertex marks the part it belongs to in the legend.
  const hoverTarget = resolve(canvasHover) ?? resolveEntity(canvasHover)?.owner ?? null;
  // Pointing at or focusing a legend entry, piece or selected item lights it in 3D.
  const hoverProps = (key: string) => ({
    onMouseEnter: () => { viewer?.setHover(key); }, onMouseLeave: () => { viewer?.setHover(null); },
    onFocus: () => { viewer?.setHover(key); }, onBlur: () => { viewer?.setHover(null); },
  });
  // A piece's own setting overrides its legend part's.
  const look = (key: string) => {
    const piece = pieces.find(candidate => candidate.key === key);
    const value = appearances[key] ?? (piece ? appearances[piece.part] : undefined);
    return { hidden: !!value?.hidden, opacity: value?.opacity ?? 1 };
  };
  const changed = (key: string) => look(key).hidden || look(key).opacity < 1;
  const lookLabel = (key: string) => look(key).hidden ? ' · hidden' : look(key).opacity < 1 ? ` · ${String(Math.round(look(key).opacity * 100))}%` : '';
  const setLook = (key: string, change: { hidden?: boolean; opacity?: number }) => {
    const isPiece = pieces.some(piece => piece.key === key);
    const current = look(key);
    setAppearances(previous => {
      if (isPiece) return { ...previous, [key]: { ...current, ...change } };
      // A part-wide change replaces its pieces' own settings.
      const keep = Object.entries(previous).filter(([id]) => !partPieces(key).some(piece => piece.key === id));
      return { ...Object.fromEntries(keep), [key]: { ...previous[key], ...change } };
    });
  };
  const setLooks = (targets: Target[], change: (key: string) => { hidden?: boolean; opacity?: number }) => {
    for (const target of targets) setLook(target.key, change(target.key));
  };
  // Isolate (hide everything else) and ghost (fade it) are toggles: repeating the same one
  // restores the appearance from before, unless something has changed since it was applied.
  const [isolation, setIsolation] = useState<{ mode: 'hide' | 'ghost'; previous: PartAppearances; applied: PartAppearances } | null>(null);
  const isolated = (mode: 'hide' | 'ghost') => isolation?.mode === mode && isolation.applied === appearances;
  const toggleIsolation = (mode: 'hide' | 'ghost', targets: Target[]) => {
    if (isolation && isolated(mode)) {
      setAppearances(isolation.previous);
      setIsolation(null);
    } else if (targets.length && visibleParts) isolate(targets, mode, visibleParts);
  };
  const isolate = (targets: Target[], mode: 'hide' | 'ghost', parts: NonNullable<typeof visibleParts>) => {
    const others = mode === 'hide' ? { hidden: true } : { opacity: 0.15 };
    const kept = new Set(targets.map(target => target.part.id));
    const next: PartAppearances = Object.fromEntries(parts.filter(part => !kept.has(part.id)).map(part => [part.id, others]));
    // Within a partly selected group, only its selected pieces stay.
    for (const id of kept) if (!targets.some(target => target.key === id)) {
      for (const piece of partPieces(id)) if (!targets.some(target => target.key === piece.key)) next[piece.key] = others;
    }
    setAppearances(next);
    setIsolation({ mode, previous: isolated('hide') || isolated('ghost') ? isolation?.previous ?? {} : appearances, applied: next });
  };
  const changedParts = visibleParts?.filter(part => changed(part.id) || partPieces(part.id).some(piece => changed(piece.key))).length ?? 0;
  const allHidden = (targets: Target[]) => targets.length > 0 && targets.every(target => look(target.key).hidden);
  const hideOrShow = (targets: Target[]) => {
    const show = allHidden(targets);
    setLooks(targets, key => ({ hidden: !show, opacity: look(key).opacity || 1 }));
  };
  // Shows the hidden targets, otherwise every hidden part and piece; fades are kept.
  const showHidden = (targets: Target[]) => {
    const hidden = targets.filter(target => look(target.key).hidden);
    if (hidden.length) { setLooks(hidden, key => ({ hidden: false, opacity: look(key).opacity || 1 })); return; }
    setAppearances(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, hidden: false }])));
  };
  const toggleTransparent = (targets: Target[]) => {
    const fade = targets.every(target => look(target.key).opacity >= 1);
    setLooks(targets, () => ({ hidden: false, opacity: fade ? 0.3 : 1 }));
  };
  const anyHidden = Object.values(appearances).some(value => value?.hidden);
  // A default plane from the Section menu opens through the middle of the model; "Face" waits
  // for a click on one. Shift+X brings back the last section, or else the front plane.
  const chooseSection = (value: string) => {
    setDepthDraft(null);
    if (value === 'face') { setPicking(true); return; }
    setPicking(false);
    setSection(value === 'off' || !viewer ? null : startSection(defaultPlanes[value as DefaultPlane], tuple(viewer.sourceMin), tuple(viewer.size)));
  };
  const toggleSection = () => {
    setPicking(false);
    setDepthDraft(null);
    const fallback = viewer && startSection(defaultPlanes.front, tuple(viewer.sourceMin), tuple(viewer.size));
    setSection(current => current ? null : lastSection.current ?? fallback);
  };
  // Look back along the section's normal, at the cut face on.
  const viewNormal = () => { if (section) viewer?.lookAlong(sectionPlane(section).normal); };
  // Onshape-style keys: Y hides, Shift+Y shows, Shift+I ghosts everything else, Shift+T toggles
  // transparency, and Space (from the 3D view) clears the selection. Shift+X turns the section
  // off and on, N views normal to it, and Escape stops picking a face. Actions apply to
  // the selection or, with nothing selected, to the part under the cursor. Returns whether the
  // key was used. From the 3D view Space is always used, so it never scrolls the page. Models
  // without a legend have no parts, but their edges and corners can be selected, so Space
  // works for every model.
  const runShortcut = (event: { key: string; code: string; shiftKey: boolean; altKey: boolean }, fromCanvas: boolean) => {
    const { code, shiftKey: shift, altKey: alt } = event;
    const hovered = () => resolve(viewer?.hovered() ?? null);
    // A selected edge or vertex stands for the part it belongs to.
    const owners = items.map(item => 'part' in item ? item : item.owner).filter((target): target is Target => !!target)
      .filter((target, i, all) => all.findIndex(other => other.key === target.key) === i);
    const targets = ['KeyY', 'KeyI', 'KeyT'].includes(code) && !alt
      ? owners.length ? owners : [hovered()].filter((target): target is Target => !!target) : [];
    if (code === 'KeyX' && shift && !alt) toggleSection();
    else if (code === 'KeyN' && !shift && !alt && section) viewNormal();
    else if (code === 'Escape' && picking) setPicking(false);
    else if (code === 'Space' && fromCanvas) setSelected(current => current.length ? [] : current);
    else if (code === 'KeyY' && !shift && targets.length && !allHidden(targets)) setLooks(targets, key => ({ hidden: true, opacity: look(key).opacity || 1 }));
    else if (code === 'KeyY' && shift && (anyHidden || targets.some(target => look(target.key).hidden))) showHidden(targets);
    else if (code === 'KeyI' && shift && (targets.length || isolated('ghost'))) toggleIsolation('ghost', targets);
    else if (code === 'KeyT' && shift && targets.length) toggleTransparent(targets);
    else return false;
    return true;
  };
  // Onshape's named views, Shift+1 to Shift+7, work for every model, with or without a legend.
  const namedView = (event: { code: string; shiftKey: boolean; altKey: boolean }) => event.shiftKey && !event.altKey ? viewKeys[event.code] : undefined;
  // From the 3D view or the part legend, never while typing in a field.
  const onShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.ctrlKey || event.metaKey || !(target.tagName === 'CANVAS' || target.closest('#cad-legend')) ||
        target.matches('input:not([type=range]), select, textarea')) return;
    const view = namedView(event);
    if (view) viewer?.view(view);
    else if (!runShortcut(event, target.tagName === 'CANVAS')) return;
    event.preventDefault();
    event.stopPropagation();
  };
  // With nothing focused, shortcuts still work while the pointer is over the model.
  const latestShortcut = useRef(runShortcut);
  latestShortcut.current = runShortcut;
  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const active = document.activeElement;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey ||
          (active && active !== document.body) || !viewer.pointerInside()) return;
      const view = namedView(event);
      if (view) { viewer.view(view); event.preventDefault(); }
      else if (latestShortcut.current(event, true)) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [viewer]);

  // Mouse use of the viewer's own controls (toolbar, display controls, legend and the panel
  // headings) hands focus back to the 3D view, so keys keep their viewer meaning: Space clears
  // the selection instead of pressing the clicked button again. Keyboard use and the parameter
  // form keep their focus.
  const pointerTarget = useRef<EventTarget | null>(null);
  const focusView = () => { if (!status) viewer?.focus(); };
  const viewerControl = (target: EventTarget | null, controls: string) => {
    const control = target instanceof Element ? target.closest(controls) : null;
    return !!control?.closest('.cad-workspace-toolbar, .cad-viewer, #cad-legend, .cad-panel > summary');
  };
  // Immediately for a control, before fullscreen records the focus to restore on exit. A label
  // focuses its checkbox or slider only after the click, so other clicks check focus then.
  const onWorkspaceClick = (event: MouseEvent<HTMLDivElement>) => {
    const controls = 'button, summary, input[type=checkbox], input[type=range]';
    if (event.detail === 0) return;
    if (viewerControl(event.target, controls)) focusView();
    else setTimeout(() => { if (viewerControl(document.activeElement, controls)) focusView(); });
  };
  // A dropdown hands focus back only when the pointer opened it, so arrow keys can still change it.
  const onWorkspaceChange = (event: ChangeEvent<HTMLDivElement>) => {
    if (event.target === pointerTarget.current && viewerControl(event.target, 'select')) focusView();
  };

  const reset = () => {
    setMode('edges');
    setSection(null);
    setPicking(false);
    setDepthDraft(null);
    viewer?.reset();
  };
  const onCompiled = useCallback((model: CompiledModel) => {
    if (!viewer) throw new Error('The 3D view is unavailable.');
    const { geometry, parts, from } = modelGeometry(model.display, model.stl, entry.customizer?.parts, genericParts);
    if (scale !== 1) geometry.scale(scale, scale, scale);
    latestModel.current = model;
    try { viewer.replaceGeometry(geometry); }
    catch (error) { geometry.dispose(); throw error; }
    setVisibleParts(parts);
    setPartsFrom(from);
    setPieces(geometryPieces(geometry));
    setRevision((revision) => revision + 1);
  }, [viewer, entry.customizer?.parts, genericParts, scale]);

  return (
    <section className="cad" aria-label="CAD model">
      <p className="cad-description">{entry.description}</p>
      {entry.customizer?.drawings && <p className="cad-drawing-jump"><a href="#cad-drawings-title">View drawings ↓</a></p>}
      <div ref={workspace} className="cad-workspace" data-fullscreen={fullscreen || undefined}
        onKeyDown={(event) => { pointerTarget.current = null; onShortcut(event); }} onPointerDown={(event) => { pointerTarget.current = event.target; }}
        onClick={onWorkspaceClick} onChange={onWorkspaceChange}
        role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? `${entry.title} fullscreen viewer` : undefined}>
        <div className="cad-workspace-toolbar">
          <span className="cad-workspace-title">{entry.title}</span>
          <button ref={toggleButton} type="button" aria-pressed={fullscreen} onClick={() => { if (fullscreen) void leave(); else void enter(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d={fullscreen ? 'M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5' : 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5'} />
            </svg>
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
        <div className="cad-workbench" data-has-panels={hasPanels || undefined}>
        <div className="cad-viewer">
          <div className="cad-stage" data-picking={picking || undefined}>
            <div ref={host} className="cad-canvas" aria-hidden={!!status} />
            {status && <div className="cad-fallback">
              <img className={entry.previewDark ? 'cad-preview-light' : ''} src={`${entry.href}${entry.preview}`} alt={entry.title} />
              {entry.previewDark && <img className="cad-preview-dark" src={`${entry.href}${entry.previewDark}`} alt={entry.title} />}
              <p role="status">{status}</p>
            </div>}
            {!status && measured.length > 0 && <div className="cad-measure" role="status" aria-live="polite">
              <strong>Measure</strong>
              {measurement ? <dl>{measurement.rows.map(row => {
                const [primary, secondary] = formatRow(row);
                return <div key={row.label}><dt>{row.label}</dt><dd>{primary}{secondary && <span>{secondary}</span>}</dd></div>;
              })}</dl> : <p>{measured.length === 1 ? 'Select another edge or vertex to measure a distance.' : 'Select up to two items, or only edges, to measure.'}</p>}
            </div>}
            {!status && <span className="cad-stage-label" aria-hidden="true">{picking ? 'Click a face to section through it'
              : section ? `${planeNames[section.reference.plane]} section · depth ${depthText(section.depth)}` : `Z up · ${units === 'inches' ? 'inches' : 'mm'}`}</span>}
          </div>
          <p id="cad-help" className="cad-help">Right-drag to rotate about the point under the cursor · Ctrl+right-drag or middle-drag to pan · scroll or pinch to zoom · on touch, one finger rotates and two fingers pan. Click a face, edge or corner of the cube at the top right to look from that side; its arrows turn the view 90° about the screen’s axes, its curved arrows roll it, and its Views menu or Shift+1–7 give the front, back, left, right, top, bottom and isometric views. Focus the model and use arrow keys to rotate, +/− to zoom. Section the model by a default plane or a face you click, from the Section menu; N views it normal to the cut, and Shift+X turns it off and on.{hasLegend
            ? ' Click parts, edges or corners to add them to the selection or remove them; click empty space to clear it. Y hides and Shift+Y shows; Shift+I fades everything else and restores it when pressed again; Shift+T toggles transparency; Space clears the selection. With nothing selected, keys act on the part under the cursor.'
            : ' Click edges or corners to measure them, adding them to the selection or removing them; click empty space to clear it. Space clears the selection.'}</p>
          <fieldset className="cad-controls" disabled={!viewer || !!status}>
            <legend className="sr-only">Model display controls</legend>
            <label>Display
              <select value={mode} onChange={(event) => { setMode(event.target.value as RenderMode); }}>
                <option value="edges">Solid + edges</option>
                <option value="solid">Solid</option>
                <option value="wireframe">Wireframe</option>
              </select>
            </label>
            <label>Section
              <select value={picking ? 'face' : section?.reference.plane ?? 'off'} aria-keyshortcuts="Shift+X" onChange={(event) => { chooseSection(event.target.value); }}>
                <option value="off">Off</option>
                <option value="front">Front plane</option>
                <option value="top">Top plane</option>
                <option value="right">Right plane</option>
                <option value="face">{section?.reference.plane === 'face' ? 'Face' : 'Face…'}</option>
              </select>
            </label>
            <button type="button" onClick={reset}>Reset view</button>
            {picking && <p className="cad-section-pick" role="status">Click a face of the model to section through it.{' '}
              <button type="button" onClick={() => { setPicking(false); }} aria-keyshortcuts="Escape">Cancel</button></p>}
            {section && viewer && (() => {
              const [low, high] = depthRange(section.reference, tuple(viewer.sourceMin), tuple(viewer.size));
              const typed = units === 'inches' ? Number((section.depth / 25.4).toFixed(4)) : Number(section.depth.toFixed(2));
              return <div className="cad-section-controls">
                <label className="cad-slider">Depth <output>{depthText(section.depth)}</output>
                  <input type="range" min={low} max={high} step={(high - low) / 1000 || 0.001} value={Math.min(high, Math.max(low, section.depth))}
                    aria-valuetext={`${depthText(section.depth)} from the ${planeNames[section.reference.plane].toLowerCase()}`}
                    onChange={(event) => { setDepthDraft(null); setSection({ ...section, depth: Number(event.target.value) }); }} />
                </label>
                <label className="cad-section-depth">Exact depth
                  <span><input type="number" step={units === 'inches' ? 1 / 64 : 0.1} value={depthDraft ?? String(typed)}
                    onChange={(event) => {
                      setDepthDraft(event.target.value);
                      const value = Number(event.target.value);
                      if (event.target.value.trim() && Number.isFinite(value)) setSection({ ...section, depth: units === 'inches' ? value * 25.4 : value });
                    }}
                    onBlur={() => { setDepthDraft(null); }} /> {units === 'inches' ? 'in' : 'mm'}</span>
                </label>
                <label className="cad-checkbox"><input type="checkbox" checked={section.flipped} onChange={(event) => { setSection({ ...section, flipped: event.target.checked }); }} />Flip cut</label>
                <button type="button" onClick={viewNormal} title="View normal to the section (N)" aria-keyshortcuts="N">View normal</button>
                <button type="button" onClick={() => { setPicking(true); }}>Pick a face</button>
                {mode !== 'wireframe' && <span className="cad-section-key"><i aria-hidden="true" />Cut surface</span>}
              </div>;
            })()}
          </fieldset>
          {viewer && <p className="cad-dimensions">Bounds: {units === 'inches'
            ? `${[viewer.size.x, viewer.size.y, viewer.size.z].map(inchText).join(' × ')} (X × Y × Z) · ${viewer.size.x.toFixed(1)} × ${viewer.size.y.toFixed(1)} × ${viewer.size.z.toFixed(1)} mm`
            : `${viewer.size.x.toFixed(1)} × ${viewer.size.y.toFixed(1)} × ${viewer.size.z.toFixed(1)} mm (X × Y × Z)`}</p>}
          {downloads && !entry.customizer && <div className="cad-downloads">
            <a href={modelUrl} download>Download STL ↓</a>
            {entry.source && <a href={`${entry.href}${entry.source}`} download>OpenSCAD source ↓</a>}
            {entry.sourceUrl && <a href={entry.sourceUrl}>CAD source ↗</a>}
          </div>}
        </div>
        <div className="cad-sidebar" hidden={!hasPanels}>
          {hasLegend && <details id="cad-legend" className="cad-panel" open={legendOpen} onToggle={(event) => { setLegendOpen(event.currentTarget.open); }}>
            <summary>Part legend</summary>
            <p className="cad-part-hint">{partsFrom && `${partsHints[partsFrom]} `}
              Click a part in the model or below to fade, hide or isolate it.</p>
            <ul className="cad-part-key" aria-label="Part colors">
              {visibleParts.map((part) => <li key={part.id}>
                <button type="button" className="cad-part-select" aria-pressed={selection.some(target => target.key === part.id)}
                  data-hidden={look(part.id).hidden || undefined} data-piece-selected={selection.some(target => target.piece && target.part.id === part.id) || undefined}
                  data-hovered={hoverTarget?.part.id === part.id || undefined} {...hoverProps(part.id)}
                  onClick={() => { toggleSelect(part.id); }}>
                  <i className="cad-part-swatch" aria-hidden="true" style={{ '--part-color': part.color, '--part-dark-color': part.darkColor } as CSSProperties} />
                  <span>{part.label}{changed(part.id) ? lookLabel(part.id) : partPieces(part.id).some(piece => changed(piece.key)) ? ' · pieces changed' : ''}</span>
                </button>
              </li>)}
            </ul>
            {items.length > 0 && <div className="cad-part-controls" role="group" aria-label="Selection">
              <p>Selected: {items.length === 1
                ? <><strong>{items[0].label}</strong>{'part' in items[0] && items[0].piece && <> · in {items[0].part.label}</>}</>
                : <strong>{items.length} items</strong>}</p>
              {items.length > 1 && <ul className="cad-piece-list" aria-label="Selected items">
                {items.map(target => <li key={target.key}>
                  <button type="button" className="cad-part-select" title="Remove from the selection" data-hovered={canvasHover === target.key || hoverTarget?.key === target.key || undefined}
                    {...hoverProps(target.key)} onClick={() => { toggleSelect(target.key); }}>
                    <span>{target.label}{'part' in target ? lookLabel(target.key) : ''}</span><span aria-hidden="true">×</span>
                  </button>
                </li>)}
              </ul>}
              {selection.length > 0 && <>
              <label className="cad-slider">Opacity <output>{Math.round(look(selection[0].key).opacity * 100)}%</output>
                <input type="range" min="0" max="100" step="5" value={Math.round(look(selection[0].key).opacity * 100)}
                  onChange={(event) => { const opacity = Number(event.target.value) / 100; setLooks(selection, () => ({ opacity, hidden: false })); }} />
              </label>
              <div className="cad-part-actions">
                <button type="button" onClick={() => { hideOrShow(selection); }} title={allHidden(selection) ? 'Show (Shift+Y)' : 'Hide (Y)'}
                  aria-keyshortcuts={allHidden(selection) ? 'Shift+Y' : 'Y'}>
                  {allHidden(selection) ? 'Show' : 'Hide'}
                </button>
                <button type="button" onClick={() => { toggleIsolation('hide', selection); }} aria-pressed={isolated('hide')}
                  title={isolated('hide') ? 'Restore the other parts' : 'Hide everything else'}>{isolated('hide') ? 'Unisolate' : 'Isolate'}</button>
                <button type="button" onClick={() => { toggleIsolation('ghost', selection); }} aria-pressed={isolated('ghost')}
                  title={isolated('ghost') ? 'Restore the other parts (Shift+I)' : 'Fade everything else (Shift+I)'} aria-keyshortcuts="Shift+I">{isolated('ghost') ? 'Unghost others' : 'Ghost others'}</button>
              </div>
              </>}
              <div className="cad-part-actions">
                <button type="button" onClick={() => { setSelected([]); }} title="Clear the selection (Space)" aria-keyshortcuts="Space">Clear selection</button>
              </div>
              {selection.length === 1 && items.length === 1 && (selection[0].piece
                ? <button type="button" className="cad-piece-up" onClick={() => { setSelected([selection[0].part.id]); }}>Select all {selection[0].part.label}</button>
                : partPieces(selection[0].part.id).length > 1 && <ul className="cad-piece-list" aria-label={`Pieces of ${selection[0].part.label}`}>
                  {partPieces(selection[0].part.id).map(piece => <li key={piece.key}>
                    <button type="button" className="cad-part-select" data-hidden={look(piece.key).hidden || undefined}
                      data-hovered={hoverTarget?.key === piece.key || undefined} {...hoverProps(piece.key)} onClick={() => { setSelected([piece.key]); }}>
                      <span>{pieceLabel(piece)}{lookLabel(piece.key)}</span>
                    </button>
                  </li>)}
                </ul>)}
            </div>}
            {changedParts > 0 && <button type="button" className="cad-part-reset" onClick={() => { setAppearances({}); }} title="Show all parts and clear fades">Show all parts ({changedParts} changed)</button>}
          </details>}
          {entry.customizer && entry.source && <details id="cad-parameter-panel" className="cad-panel" open={parametersOpen} onToggle={(event) => { setParametersOpen(event.currentTarget.open); }}>
            <summary>Model parameters</summary>
            <ParametricControls entry={{ ...entry, source: entry.source }} local={local} available={!!viewer && !status} onCompiled={onCompiled} onOutput={setCutList} onDrawings={setDrawings} onViewCutList={fullscreen ? viewCutList : undefined}
              worksheets={worksheets} onWorksheets={setWorksheets} />
          </details>}
        </div>
        </div>
      </div>
      {entry.customizer?.drawings && <DrawingSheets output={drawings} title={entry.title} />}
      {entry.customizer?.sheetLayout && <SheetLayoutTable output={cutList} title={entry.title} filename={entry.model.replace(/\.stl$/, '-sheet-layout.csv')} palette={entry.customizer.parts}
        draft={worksheets.sheetLayout} onDraft={onSheetLayout} />}
      {entry.customizer?.cutList && <CutListTable output={cutList} title={entry.title} filename={entry.model.replace(/\.stl$/, '-cut-list.csv')} palette={entry.customizer.parts}
        draft={worksheets.cutList} onDraft={onCutList} />}
      {entry.notes && <p className="cad-notes">{entry.notes}</p>}
      {entry.attribution && <p className="cad-attribution">{entry.attribution.text} <a href={entry.attribution.url}>Original design ↗</a></p>}
    </section>
  );
}
