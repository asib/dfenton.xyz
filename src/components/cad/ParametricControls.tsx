import { useEffect, useRef, useState } from 'react';
import type { CadEntry } from '../../misc';
import { compileJob } from './compiler';
import { configuredSource, defaults, parameterLabel, parseParameters, type Parameter, type Values } from './parameters';

type Entry = CadEntry & { href: string; source: string };
interface Source { text: string; parameters: Parameter[] }
interface Result { values: Values; stl: string; source: string }

export default function ParametricControls({ entry, available, onCompiled }: {
  entry: Entry; available: boolean; onCompiled: (stl: ArrayBuffer) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState<Values>({});
  const [result, setResult] = useState<Result | null>(null);
  const [phase, setPhase] = useState('Loading parameters…');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const job = useRef<AbortController | null>(null);
  const sourceUrl = `${entry.href}${entry.source}`;
  const modelUrl = `${entry.href}${entry.model}`;

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
        setSource({ text, parameters });
        setDraft(values);
        setResult({ values, stl: modelUrl, source: sourceUrl });
        setPhase('');
      } catch (failure) {
        if (controller.signal.aborted) return;
        setPhase('');
        setError(failure instanceof Error ? failure.message : 'Parameters could not load.');
      }
    };
    void load();
    return () => { controller.abort(); job.current?.abort(); };
  }, [sourceUrl, modelUrl, retry]);

  useEffect(() => () => {
    if (result?.stl.startsWith('blob:')) URL.revokeObjectURL(result.stl);
    if (result?.source.startsWith('blob:')) URL.revokeObjectURL(result.source);
  }, [result]);

  const pending = !!result && JSON.stringify(draft) !== JSON.stringify(result.values);
  const canDownload = !!result && !pending && !phase && !error;
  const edit = (name: string, value: string | number | boolean) => {
    job.current?.abort();
    setPhase('');
    setError('');
    setDraft((previous) => {
      const next = { ...previous, [name]: value };
      for (const parameter of source?.parameters ?? []) {
        const condition = entry.customizer?.conditions?.[parameter.name];
        // An empty field must not prevent switching to a mode that ignores it.
        if (condition && next[condition.parameter] !== condition.value && typeof next[parameter.name] !== parameter.type) {
          next[parameter.name] = parameter.value;
        }
      }
      return next;
    });
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
      const compiled = await compileJob({ kind: 'compile', source: text }, controller.signal, () => {
        if (!controller.signal.aborted) setPhase('Updating model…');
      });
      if (controller.signal.aborted || compiled.kind !== 'model') return;
      onCompiled(compiled.stl);
      setResult({ values: { ...values },
        stl: URL.createObjectURL(new Blob([compiled.stl], { type: 'model/stl' })),
        source: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
      });
      setPhase('');
    } catch (failure) {
      if (controller.signal.aborted) return;
      setPhase('');
      setError(failure instanceof Error ? failure.message : 'The model could not be generated.');
    }
  };
  const reset = () => {
    if (!source) return;
    job.current?.abort();
    const values = defaults(source.parameters);
    setDraft(values);
    setError('');
    setPhase('');
    if (JSON.stringify(values) !== JSON.stringify(result?.values)) void apply(values);
  };
  const groups = [...new Set(source?.parameters.map((parameter) => parameter.group))];

  return <aside className="cad-parameters" aria-label="Model parameters">
    <h2>Customize the guide</h2>
    <p className="cad-parameter-intro">Dimensions in mm. Change the settings, then update the model.</p>
    {source && <form onInvalidCapture={(event) => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true; }} onSubmit={(event) => { event.preventDefault(); void apply(draft); }}>
      <fieldset disabled={!available}>
        <legend className="sr-only">Model parameters</legend>
        {groups.map((group, index) => <details key={group} open={index === 0}>
          <summary>{group}</summary>
          {source.parameters.filter((parameter) => parameter.group === group).map((parameter) => {
            const id = `parameter-${parameter.name}`;
            const condition = entry.customizer?.conditions?.[parameter.name];
            const disabled = !!condition && draft[condition.parameter] !== condition.value;
            const value = draft[parameter.name];
            const { options, min, max, step } = parameter.control;
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
        <button type="submit" disabled={!available || !!phase}>Update model</button>
        <button type="button" onClick={reset} disabled={!available}>Reset parameters</button>
      </div>
    </form>}
    <div className="cad-compile-status" aria-live="polite" aria-atomic="true">
      {error ? <p className="cad-error">{error.replace(/^evaluation error:\s*/i, '')} {source ? 'The previous valid model is still shown.' : ''}</p> :
        <p>{phase ? `${phase}${source ? ' The previous valid model is still shown.' : ''}` :
          pending ? 'Unapplied changes. The previous valid model is still shown.' : source ? 'Model is up to date.' : ''}</p>}
    </div>
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
