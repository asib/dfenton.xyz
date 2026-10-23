import { useEffect, useMemo, useRef, useState } from 'react';
import type { CadEntry } from '../../misc';
import { compileJob } from './compiler';
import type { CompiledModel } from './compiler.worker';
import type { CutListOutput } from './cutList';
import type { DrawingOutput, DrawingSheet } from './drawings';
import { changedValues, fingerprint, readConfigurations, reconcile, storageKey, writeConfigurations, type Configuration } from './configurations';
import { configurationLink, decodeConfiguration, encodeConfiguration, readConfigurationHash } from './shareLink';
import { availableOptions, conditionMatches, configuredSource, defaults, parameterLabel, parseParameters, type Parameter, type ListValue, type ParameterValue, type Values } from './parameters';
import { emptyWorksheets, loadWorksheets, saveWorksheets, type WorksheetDrafts } from './worksheets';

type Entry = CadEntry & { href: string; source: string };
interface Source { text: string; parameters: Parameter[] }
interface Result { values: Values; stl: string; source: string; output: string; drawings?: DrawingSheet }

export default function ParametricControls({ entry, available, onCompiled, onOutput, onViewCutList, onDrawings, worksheets, onWorksheets }: {
  entry: Entry; available: boolean; onCompiled: (model: CompiledModel) => void;
  onOutput: (output: CutListOutput) => void;
  // Cut list and sheet layout settings, saved and loaded with configurations.
  worksheets: WorksheetDrafts; onWorksheets: (drafts: WorksheetDrafts) => void;
  onViewCutList?: (headingId: string) => void;
  onDrawings?: (output: DrawingOutput) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState<Values>({});
  const [result, setResult] = useState<Result | null>(null);
  const [phase, setPhase] = useState('Loading parameters…');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [initialModel, setInitialModel] = useState<CompiledModel | null>(null);
  // Named configurations saved in this browser for this item.
  const storage = useMemo(() => { try { return window.localStorage; } catch { return null; } }, []);
  const configurationKey = storageKey(entry.href);
  const [configurations, setConfigurations] = useState<Configuration[]>(() => readConfigurations(storage, configurationKey));
  const [activeName, setActiveName] = useState('');
  const [loadedValues, setLoadedValues] = useState<Values | null>(null);
  const [loadedWorksheets, setLoadedWorksheets] = useState<string | null>(null);
  const savedWorksheets = useMemo(() => saveWorksheets(worksheets), [worksheets]);
  const [configurationNotice, setConfigurationNotice] = useState('');
  const [naming, setNaming] = useState<{ mode: 'save' | 'rename'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A share link the clipboard refused, shown for copying by hand.
  const [manualLink, setManualLink] = useState('');
  const job = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const updateTimer = useRef<number>();
  const draftValues = useRef<Values>({});
  const edited = useRef(false);
  const sourceUrl = `${entry.href}${entry.source}`;
  const modelUrl = `${entry.href}${entry.model}`;
  const outputLabel = entry.customizer?.outputLabel;
  const hasParts = !!entry.customizer?.parts?.length;
  const hasCutList = !!entry.customizer?.cutList;
  const hasSheetLayout = !!entry.customizer?.sheetLayout;
  const hasDrawings = !!entry.customizer?.drawings;
  // What configurations and links carry, for their notices.
  const carried = hasCutList && hasSheetLayout ? 'parameters, cut list and sheet layout settings'
    : hasCutList ? 'parameters and cut list settings' : hasSheetLayout ? 'parameters and sheet layout settings' : 'parameters';

  useEffect(() => {
    const controller = new AbortController();
    job.current = controller;
    const load = async () => {
      try {
        const response = await fetch(sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('The parameter source could not load.');
        const text = await response.text();
        const schema = await compileJob({ kind: 'parameters', source: text }, controller.signal);
        if (controller.signal.aborted || schema.kind !== 'parameters') return;
        const parameters = parseParameters(schema.json, text);
        const values = defaults(parameters);
        // Verify that configured downloads can preserve these literal assignments.
        configuredSource(text, parameters, values);
        // Entries with textual output also compute their default cut list in the
        // worker. The committed fallback mesh stays visible while this runs.
        let output = '';
        let drawings: DrawingSheet | undefined;
        if (outputLabel || hasParts || hasCutList || hasSheetLayout || hasDrawings) {
          const compiled = await compileJob({ kind: 'compile', source: text, drawings: hasDrawings }, controller.signal);
          controller.signal.throwIfAborted();
          if (compiled.kind !== 'model') return;
          output = compiled.output;
          drawings = compiled.drawings;
          setInitialModel(compiled);
        }
        setSource({ text, parameters });
        draftValues.current = values;
        edited.current = false;
        setDraft(values);
        setResult({ values, stl: modelUrl, source: sourceUrl, output, drawings });
        setPhase('');
      } catch (failure) {
        if (controller.signal.aborted) return;
        setPhase('');
        setError(failure instanceof Error ? failure.message : 'Parameters could not load.');
      }
    };
    void load();
    return () => { controller.abort(); job.current?.abort(); window.clearTimeout(updateTimer.current); };
  }, [sourceUrl, modelUrl, outputLabel, hasParts, hasCutList, hasSheetLayout, hasDrawings, retry]);

  useEffect(() => {
    if (!available || !initialModel) return;
    try { onCompiled(initialModel); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The colored model could not load.'); }
    setInitialModel(null);
  }, [available, initialModel, onCompiled]);

  useEffect(() => () => {
    if (result?.stl.startsWith('blob:')) URL.revokeObjectURL(result.stl);
    if (result?.source.startsWith('blob:')) URL.revokeObjectURL(result.source);
  }, [result]);

  const pending = !!result && JSON.stringify(draft) !== JSON.stringify(result.values);
  const canDownload = !!result && !pending && !phase && !error;
  useEffect(() => {
    onOutput({ text: result?.output ?? '', stale: !canDownload });
  }, [result?.output, canDownload, onOutput]);
  useEffect(() => {
    onDrawings?.({ sheet: result?.drawings, stale: !canDownload });
  }, [result?.drawings, canDownload, onDrawings]);
  const cancelAutoUpdate = () => {
    window.clearTimeout(updateTimer.current);
    updateTimer.current = undefined;
  };
  // Keep choices and conditional fields consistent after any change of values.
  const settle = (next: Values) => {
    for (const parameter of source?.parameters ?? []) {
      const condition = entry.customizer?.conditions?.[parameter.name];
      const options = availableOptions(parameter, entry.customizer?.optionConditions?.[parameter.name], next);
      if (options?.length && !options.some(option => option.value === next[parameter.name])) next[parameter.name] = options[0].value;
      // An empty field must not prevent switching to a mode that ignores it.
      if (condition && !conditionMatches(condition, next) && parameter.type !== 'list' && typeof next[parameter.name] !== parameter.type) {
        next[parameter.name] = parameter.value;
      }
    }
    return next;
  };
  const edit = (name: string, value: ParameterValue) => {
    cancelAutoUpdate();
    job.current?.abort();
    setPhase('');
    setError('');
    const next = settle({ ...draftValues.current, [name]: value });
    // Blur can follow an input event before React renders the new draft.
    draftValues.current = next;
    edited.current = true;
    setDraft(next);
    updateTimer.current = window.setTimeout(() => {
      if (form.current) commit(form.current);
    }, 1000);
  };
  const apply = async (values: Values) => {
    if (!source) return;
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setError('');
    setPhase('Loading geometry engine…');
    try {
      const text = configuredSource(source.text, source.parameters, values);
      const compiled = await compileJob({ kind: 'compile', source: text, drawings: hasDrawings }, controller.signal, () => {
        if (!controller.signal.aborted) setPhase('Updating model…');
      });
      if (controller.signal.aborted || compiled.kind !== 'model') return;
      onCompiled(compiled);
      setResult({ values: { ...values },
        stl: URL.createObjectURL(new Blob([compiled.stl], { type: 'model/stl' })),
        source: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
        output: compiled.output,
        drawings: compiled.drawings,
      });
      setPhase('');
    } catch (failure) {
      if (controller.signal.aborted) return;
      setPhase('');
      setError(failure instanceof Error ? failure.message : 'The model could not be generated.');
    }
  };
  const commit = (form: HTMLFormElement) => {
    cancelAutoUpdate();
    if (!available) return;
    edited.current = false;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement>('input:invalid, select:invalid');
      // List cells name their row and column; other fields use their parameter name.
      setError(invalid ? `${invalid.getAttribute('aria-label') ?? parameterLabel(invalid.name)}: ${invalid.validationMessage}` : 'Enter valid parameter values.');
      return;
    }
    const values = draftValues.current;
    if (JSON.stringify(values) !== JSON.stringify(result?.values)) void apply(values);
  };
  const reset = () => {
    cancelAutoUpdate();
    if (!source) return;
    setActiveName('');
    setLoadedValues(null);
    setLoadedWorksheets(null);
    job.current?.abort();
    const values = defaults(source.parameters);
    draftValues.current = values;
    edited.current = false;
    setDraft(values);
    setError('');
    setPhase('');
    if (JSON.stringify(values) !== JSON.stringify(result?.values)) void apply(values);
  };
  const persist = (next: Configuration[]) => {
    if (writeConfigurations(storage, configurationKey, next)) { setConfigurations(next); return true; }
    setConfigurationNotice('This browser did not allow saving; private windows and blocked site data prevent it.');
    return false;
  };
  // Loading applies a configuration like Reset applies the defaults, then compiles it.
  const loadConfiguration = (name: string) => {
    setNaming(null);
    setConfirmDelete(false);
    if (!source) return;
    if (!name) { reset(); onWorksheets(emptyWorksheets); setConfigurationNotice(''); return; }
    const configuration = configurations.find(item => item.name === name);
    if (!configuration) return;
    applySaved(configuration.values, configuration.worksheets, name, configuration.fingerprint !== fingerprint(source.parameters)
      ? 'Saved for an earlier version of this model; every setting still applies.' : '');
  };
  // Shared by saved configurations and share links: values that still fit apply over
  // the defaults, settle like an edit, and compile. Worksheet settings replace the
  // current ones, missing settings returning to their defaults.
  const applySaved = (saved: Record<string, unknown>, savedSheets: unknown, name: string, notice: string) => {
    if (!source) return;
    const { values, dropped: droppedValues } = reconcile(source.parameters, saved);
    const sheets = loadWorksheets(savedSheets);
    const dropped = [...droppedValues, ...sheets.dropped];
    onWorksheets(sheets.drafts);
    setLoadedWorksheets(name ? JSON.stringify(saveWorksheets(sheets.drafts).saved) : null);
    const settled = settle(values);
    cancelAutoUpdate();
    job.current?.abort();
    draftValues.current = settled;
    edited.current = false;
    setDraft(settled);
    setError('');
    setPhase('');
    setActiveName(name);
    setLoadedValues(name ? settled : null);
    setConfigurationNotice(dropped.length
      ? `${notice ? `${notice} ` : ''}${String(dropped.length)} ${dropped.length === 1 ? 'setting no longer applies and was reset to its default' : 'settings no longer apply and were reset to their defaults'}: ${dropped.join(', ')}.`
      : notice);
    if (JSON.stringify(settled) !== JSON.stringify(result?.values)) void apply(settled);
  };
  // Copy a link carrying the values that differ from the source defaults, and the
  // worksheet settings that would be saved.
  const copyLink = async () => {
    if (!source) return;
    setNaming(null);
    setConfirmDelete(false);
    if (form.current && !form.current.checkValidity()) {
      setConfigurationNotice('Correct the invalid parameter values before sharing.');
      return;
    }
    if (savedWorksheets.invalid.length) {
      setConfigurationNotice(`Correct the invalid worksheet settings before sharing: ${savedWorksheets.invalid.join(', ')}.`);
      return;
    }
    const sheets = savedWorksheets.saved;
    const link = configurationLink(window.location.href, await encodeConfiguration({
      values: changedValues(source.parameters, draftValues.current), ...(Object.keys(sheets).length ? { worksheets: sheets } : {}) }));
    try {
      await navigator.clipboard.writeText(link);
      setManualLink('');
      setConfigurationNotice(`Link copied. Opening it loads these ${carried}.`);
    } catch {
      setManualLink(link);
      setConfigurationNotice(`Copy this link to share these ${carried}.`);
    }
  };
  // Opening a share link (or pasting one into this tab) loads it once the model is ready.
  const ready = !!source && !!result && available;
  const sharedRef = useRef(applySaved);
  sharedRef.current = applySaved;
  useEffect(() => {
    if (!ready) return;
    const loadShared = async () => {
      const encoded = readConfigurationHash(window.location.hash);
      if (!encoded) return;
      const shared = await decodeConfiguration(decodeURIComponent(encoded));
      // Keep the address clean: later edits would no longer match the link.
      history.replaceState(history.state, '', window.location.pathname + window.location.search);
      if (shared) sharedRef.current(shared.values, shared.worksheets, '', 'Loaded a shared configuration; use Save as to keep it.');
      else setConfigurationNotice('The configuration link could not be read.');
    };
    void loadShared();
    const onHash = () => { void loadShared(); };
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('hashchange', onHash); };
  }, [ready]);
  // Saves the values in the form and the worksheet settings, which must be valid; an
  // existing name is replaced in place.
  const saveConfiguration = (name: string) => {
    if (!source) return;
    if (form.current && !form.current.checkValidity()) {
      setConfigurationNotice('Correct the invalid parameter values before saving.');
      return;
    }
    if (savedWorksheets.invalid.length) {
      setConfigurationNotice(`Correct the invalid worksheet settings before saving: ${savedWorksheets.invalid.join(', ')}.`);
      return;
    }
    const values = draftValues.current;
    const sheets = savedWorksheets.saved;
    const configuration = { name, values, ...(Object.keys(sheets).length ? { worksheets: sheets } : {}),
      fingerprint: fingerprint(source.parameters), savedAt: new Date().toISOString() };
    const exists = configurations.some(item => item.name === name);
    if (!persist(exists ? configurations.map(item => item.name === name ? configuration : item) : [...configurations, configuration])) return;
    setActiveName(name);
    setLoadedValues(values);
    setLoadedWorksheets(JSON.stringify(sheets));
    setNaming(null);
    setConfigurationNotice(exists ? `Saved over “${name}”.` : `Saved “${name}”.`);
  };
  const renameConfiguration = (name: string) => {
    if (name !== activeName && configurations.some(item => item.name === name)) {
      setConfigurationNotice(`A configuration named “${name}” already exists.`);
      return;
    }
    if (!persist(configurations.map(item => item.name === activeName ? { ...item, name } : item))) return;
    setActiveName(name);
    setNaming(null);
    setConfigurationNotice(`Renamed to “${name}”.`);
  };
  const deleteConfiguration = () => {
    if (!persist(configurations.filter(item => item.name !== activeName))) return;
    setConfigurationNotice(`Deleted “${activeName}”.`);
    setActiveName('');
    setLoadedValues(null);
    setLoadedWorksheets(null);
    setConfirmDelete(false);
  };
  const submitName = () => {
    const name = naming?.text.trim() ?? '';
    if (!name) { setConfigurationNotice('Enter a name for the configuration.'); return; }
    if (naming?.mode === 'rename') renameConfiguration(name); else saveConfiguration(name);
  };
  const modified = !!activeName && !!loadedValues && (JSON.stringify(draft) !== JSON.stringify(loadedValues) ||
    savedWorksheets.invalid.length > 0 || JSON.stringify(savedWorksheets.saved) !== loadedWorksheets);
  const groups = [...new Set(source?.parameters.map((parameter) => parameter.group))];

  return <aside className="cad-parameters" aria-label="Model parameters">
    <h2 className="sr-only">Model parameters</h2>
    <p className="cad-parameter-intro">Dimensions in {entry.customizer?.units ?? 'mm'}. Changes update the model after a 1-second pause, or when you leave a field.</p>
    {source && <section className="cad-configurations" aria-labelledby="cad-configurations-title">
      <h3 id="cad-configurations-title">Saved configurations</h3>
      {!storage ? <>
        <div className="cad-configuration-actions">
          <button type="button" disabled={!available} onClick={() => { void copyLink(); }}>Copy link</button>
        </div>
        <p>Saving configurations needs browser storage, which is unavailable here; links still work.</p>
      </> : <>
        <label className="cad-configuration-select">Configuration
          <select value={activeName} disabled={!available} onChange={(event) => { loadConfiguration(event.target.value); }}>
            <option value="">Source defaults</option>
            {configurations.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        {naming ? <div className="cad-configuration-actions">
          <input aria-label={naming.mode === 'rename' ? 'New configuration name' : 'Configuration name'} value={naming.text} maxLength={60} autoFocus
            onChange={(event) => { setNaming({ ...naming, text: event.target.value }); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); submitName(); }
              if (event.key === 'Escape') { event.preventDefault(); setNaming(null); }
            }} />
          <button type="button" onClick={submitName}>{naming.mode === 'rename' ? 'Rename' : 'Save'}</button>
          <button type="button" onClick={() => { setNaming(null); }}>Cancel</button>
        </div> : <div className="cad-configuration-actions">
          <button type="button" disabled={!available} onClick={() => { setConfirmDelete(false); setConfigurationNotice(''); setNaming({ mode: 'save', text: '' }); }}>Save as…</button>
          <button type="button" disabled={!activeName || !modified} onClick={() => { saveConfiguration(activeName); }}>Update</button>
          <button type="button" disabled={!activeName} onClick={() => { setConfirmDelete(false); setNaming({ mode: 'rename', text: activeName }); }}>Rename</button>
          {confirmDelete
            ? <button type="button" className="cad-configuration-danger" onClick={deleteConfiguration}>Confirm delete</button>
            : <button type="button" disabled={!activeName} onClick={() => { setConfirmDelete(true); }}>Delete</button>}
          <button type="button" disabled={!available} onClick={() => { void copyLink(); }}>Copy link</button>
        </div>}
        {modified && <p>Changed since loading “{activeName}”; Update keeps the changes.</p>}
        {configurationNotice && <p role="status">{configurationNotice}</p>}
        <p className="cad-configuration-help">Configurations keep the {carried} in this browser only; Copy link shares the current ones.</p>
      </>}
      {manualLink && <input className="cad-configuration-link" readOnly aria-label="Configuration link" value={manualLink}
        onFocus={(event) => { event.currentTarget.select(); }} />}
    </section>}
    {source && <form ref={form}
      onInvalidCapture={(event) => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true; }}
      onBlur={(event) => {
        if (!edited.current || !(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
        // A pressed action button commits or resets itself. Merely tabbing to it
        // still counts as leaving the edited field and must update automatically.
        if (event.currentTarget.querySelector('button:active')) return;
        commit(event.currentTarget);
      }}
      onSubmit={(event) => { event.preventDefault(); commit(event.currentTarget); }}>
      <fieldset disabled={!available}>
        <legend className="sr-only">Model parameters</legend>
        {groups.filter(group => source.parameters.some(parameter => {
          const condition = entry.customizer?.conditions?.[parameter.name];
          return parameter.group === group && (!condition?.hide || conditionMatches(condition, draft));
        })).map((group, index) => <details key={group} open={index === 0}>
          <summary>{group}</summary>
          {source.parameters.filter((parameter) => parameter.group === group).map((parameter) => {
            const id = `parameter-${parameter.name}`;
            const condition = entry.customizer?.conditions?.[parameter.name];
            const disabled = !!condition && !conditionMatches(condition, draft);
            if (disabled && condition.hide) return null;
            const value = draft[parameter.name];
            if (parameter.type === 'list') {
              const rows = Array.isArray(value) ? value : [];
              const { columns = [], minRows = 1, maxRows, rowLabel = 'Row' } = parameter.control;
              const defaultRows = parameter.value as ListValue;
              const setRows = (next: ListValue) => { edit(parameter.name, next); };
              const row = rowLabel.toLowerCase();
              return <div key={parameter.name} className="cad-parameter cad-list-parameter" data-inactive={disabled || undefined}>
                <span id={`${id}-label`} className="cad-list-title">{parameterLabel(parameter.name)}</span>
                <p id={`${id}-help`}>{parameter.description}</p>
                <div className="cad-list-scroll">
                  <table className="cad-list-table" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`}>
                    <thead><tr>
                      <th scope="col">{rowLabel}</th>
                      {columns.map(column => <th key={column.label} scope="col">{column.label}</th>)}
                      <th scope="col"><span className="sr-only">Remove</span></th>
                    </tr></thead>
                    <tbody>{rows.map((cells, r) => <tr key={r}>
                      <th scope="row">{r + 1}</th>
                      {cells.map((cell, c) => <td key={c}>
                        <input type="number" name={parameter.name} aria-label={`${rowLabel} ${String(r + 1)} ${columns[c].label.toLowerCase()}`}
                          value={String(cell)} min={columns[c].min} max={columns[c].max} step={columns[c].step ?? 'any'} required disabled={disabled}
                          onChange={(event) => {
                            const raw = event.target.value;
                            setRows(rows.map((other, i) => i === r ? other.map((item, j) => j === c ? (raw === '' ? '' : Number(raw)) : item) : other));
                          }} />
                      </td>)}
                      <td><button type="button" className="cad-list-remove" aria-label={`Remove ${row} ${String(r + 1)}`}
                        disabled={disabled || rows.length <= minRows} onClick={() => { setRows(rows.filter((_, i) => i !== r)); }}>×</button></td>
                    </tr>)}</tbody>
                  </table>
                </div>
                {/* New rows copy the source's last default row. */}
                <button type="button" className="cad-list-add" disabled={disabled || (maxRows !== undefined && rows.length >= maxRows)}
                  onClick={() => { setRows([...rows, [...defaultRows[defaultRows.length - 1]]]); }}>Add {row}</button>
              </div>;
            }
            const { min, max, step } = parameter.control;
            const options = availableOptions(parameter, entry.customizer?.optionConditions?.[parameter.name], draft);
            const changeNumber = (raw: string) => { edit(parameter.name, raw === '' ? '' : Number(raw)); };
            return <div key={parameter.name} className="cad-parameter" data-inactive={disabled || undefined}>
              <label htmlFor={id}>{parameterLabel(parameter.name)}</label>
              {options ? <select id={id} name={parameter.name} value={String(value)} disabled={disabled}
                aria-describedby={`${id}-help`} onChange={(event) => {
                  const option = options.find((candidate) => String(candidate.value) === event.target.value);
                  if (option) edit(parameter.name, option.value);
                }}>
                {options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
              </select> : parameter.type === 'boolean' ? <input id={id} name={parameter.name} type="checkbox" checked={value === true}
                disabled={disabled} aria-describedby={`${id}-help`} onChange={(event) => { edit(parameter.name, event.target.checked); }} /> :
                <input id={id} name={parameter.name} type={parameter.type === 'number' ? 'number' : 'text'}
                  value={String(value)} min={min} max={max} step={step ?? 'any'} required disabled={disabled}
                  aria-describedby={`${id}-help`} onChange={(event) => {
                    if (parameter.type === 'number') changeNumber(event.target.value);
                    else edit(parameter.name, event.target.value);
                  }} />}
              {parameter.type === 'number' && min !== undefined && max !== undefined && <input type="range"
                aria-label={`${parameterLabel(parameter.name)} slider`} min={min} max={max} step={step ?? 'any'}
                value={value === '' ? parameter.value as number : Number(value)} disabled={disabled}
                onChange={(event) => { changeNumber(event.target.value); }} />}
              <p id={`${id}-help`}>{parameter.description}</p>
            </div>;
          })}
        </details>)}
      </fieldset>
      <div className="cad-parameter-actions">
        <button type="submit" disabled={!available || !!phase || (!pending && !error)}>Update now</button>
        <button type="button" onClick={reset} disabled={!available}>Reset parameters</button>
      </div>
    </form>}
    <div className="cad-compile-status" aria-live="polite" aria-atomic="true">
      {error ? <p className="cad-error">{error.replace(/^evaluation error:\s*/i, '')} {source ? 'The previous valid model is still shown.' : ''}</p> :
        <p>{phase ? `${phase}${source ? ' The previous valid model is still shown.' : ''}` :
          pending ? 'Waiting for a pause in editing… The previous valid model is still shown.' : source ? 'Model is up to date.' : ''}</p>}
    </div>
    {outputLabel && result?.output && <details className="cad-model-output">
      <summary>{outputLabel}{!canDownload ? ' · previous settings' : ''}</summary>
      {/* Versioned machine-readable echoes (CUTLIST_V1, SHEET_PARTS_V1, ...) feed the worksheets, not this panel. */}
      <pre>{result.output.split('\n').filter(line => !/^ECHO:\s*"[A-Z_]+_V\d+",/.test(line)).join('\n')
        .replace(/^ECHO:\s*/gm, '').replace(/"/g, '')}</pre>
    </details>}
    {hasSheetLayout && result?.output && <p className="cad-compile-status"><a href="#sheet-layout-title" onClick={(event) => {
      if (onViewCutList) { event.preventDefault(); onViewCutList('sheet-layout-title'); }
    }}>View sheet layout ↓</a></p>}
    {hasCutList && result?.output && <p className="cad-compile-status"><a href="#cut-list-title" onClick={(event) => {
      if (onViewCutList) { event.preventDefault(); onViewCutList('cut-list-title'); }
    }}>View cut list ↓</a></p>}
    {!source && error && <button type="button" onClick={() => { setError(''); setPhase('Loading parameters…'); setRetry((value) => value + 1); }}>Retry controls</button>}
    <div className="cad-downloads">
      {canDownload ? <>
        <a href={result.stl} download={entry.model}>Download STL ↓</a>
        <a href={result.source} download={entry.source.replace(/\.scad$/, '-configured.scad')}>Configured source ↓</a>
      </> : source ? <span className="cad-download-pending">Update successfully to download these settings.</span> :
        <a href={modelUrl} download>Default STL ↓</a>}
      <a href={sourceUrl} download>Original source ↓</a>
      {entry.sourceUrl && <a href={entry.sourceUrl}>CAD source ↗</a>}
    </div>
  </aside>;
}
