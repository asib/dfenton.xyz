import { useEffect, useRef, useState } from 'react';
import type { CadEntry } from '../../misc';
import { compileJob } from './compiler';
import type { CompiledModel } from './compiler.worker';
import type { CutListOutput } from './cutList';
import type { DrawingOutput, DrawingSheet } from './drawings';
import { availableOptions, conditionMatches, configuredSource, defaults, parameterLabel, parseParameters, type Parameter, type Values } from './parameters';

type Entry = CadEntry & { href: string; source: string };
interface Source { text: string; parameters: Parameter[] }
interface Result { values: Values; stl: string; source: string; output: string; drawings?: DrawingSheet }

export default function ParametricControls({ entry, available, onCompiled, onOutput, onViewCutList, onDrawings }: {
  entry: Entry; available: boolean; onCompiled: (model: CompiledModel) => void;
  onOutput: (output: CutListOutput) => void;
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
        const parameters = parseParameters(schema.json);
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
  const edit = (name: string, value: string | number | boolean) => {
    cancelAutoUpdate();
    job.current?.abort();
    setPhase('');
    setError('');
    const next = { ...draftValues.current, [name]: value };
    for (const parameter of source?.parameters ?? []) {
      const condition = entry.customizer?.conditions?.[parameter.name];
      const options = availableOptions(parameter, entry.customizer?.optionConditions?.[parameter.name], next);
      if (options?.length && !options.some(option => option.value === next[parameter.name])) next[parameter.name] = options[0].value;
      // An empty field must not prevent switching to a mode that ignores it.
      if (condition && !conditionMatches(condition, next) && typeof next[parameter.name] !== parameter.type) {
        next[parameter.name] = parameter.value;
      }
    }
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
      setError(invalid ? `${parameterLabel(invalid.name)}: ${invalid.validationMessage}` : 'Enter valid parameter values.');
      return;
    }
    const values = draftValues.current;
    if (JSON.stringify(values) !== JSON.stringify(result?.values)) void apply(values);
  };
  const reset = () => {
    cancelAutoUpdate();
    if (!source) return;
    job.current?.abort();
    const values = defaults(source.parameters);
    draftValues.current = values;
    edited.current = false;
    setDraft(values);
    setError('');
    setPhase('');
    if (JSON.stringify(values) !== JSON.stringify(result?.values)) void apply(values);
  };
  const groups = [...new Set(source?.parameters.map((parameter) => parameter.group))];

  return <aside className="cad-parameters" aria-label="Model parameters">
    <h2 className="sr-only">Model parameters</h2>
    <p className="cad-parameter-intro">Dimensions in {entry.customizer?.units ?? 'mm'}. Changes update the model after a 1-second pause, or when you leave a field.</p>
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
