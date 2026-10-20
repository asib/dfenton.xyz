interface EntryBase {
  title: string;
  description: string;
  date: string;
  preview: string;
  previewDark?: string;
}

interface DiagramEntry extends EntryBase {
  type?: 'diagram';
}

export interface PartColor { id: string; label: string; color: string; darkColor: string }
export type ParameterCondition = { parameter: string; hide?: boolean } &
  ({ value: string | number | boolean; values?: never } | { values: (string | number | boolean)[]; value?: never });

export interface CadEntry extends EntryBase {
  type: 'cad';
  model: string;
  displayModel?: string;
  source?: string;
  sourceUrl?: string;
  notes?: string;
  customizer?: {
    units?: 'mm' | 'inches';
    outputLabel?: string;
    cutList?: boolean;
    drawings?: boolean;
    parts?: PartColor[];
    conditions?: Record<string, ParameterCondition>;
    optionConditions?: Record<string, Record<string, ParameterCondition>>;
  };
  attribution?: { text: string; url: string };
}

type MiscEntry = DiagramEntry | CadEntry;

const previewFilename = /^[a-z0-9][a-z0-9-]*\.(svg|png|webp|jpe?g)$/;

function validCustomizer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if ('units' in value && value.units !== undefined && value.units !== 'mm' && value.units !== 'inches') return false;
  if ('outputLabel' in value && value.outputLabel !== undefined &&
      (typeof value.outputLabel !== 'string' || !value.outputLabel.trim())) return false;
  if ('drawings' in value && value.drawings !== undefined && typeof value.drawings !== 'boolean') return false;
  if ('cutList' in value && value.cutList !== undefined &&
      (typeof value.cutList !== 'boolean' || (value.cutList && (!('units' in value) || value.units !== 'inches')))) return false;
  if ('parts' in value && value.parts !== undefined &&
      (!Array.isArray(value.parts) || !value.parts.every((part: unknown) =>
        typeof part === 'object' && part !== null &&
        'id' in part && typeof part.id === 'string' && /^[a-z0-9-]+$/.test(part.id) &&
        'label' in part && typeof part.label === 'string' && !!part.label.trim() &&
        'color' in part && typeof part.color === 'string' && /^#[0-9a-f]{6}$/i.test(part.color) &&
        'darkColor' in part && typeof part.darkColor === 'string' && /^#[0-9a-f]{6}$/i.test(part.darkColor)))) return false;
  const validCondition = (condition: unknown): boolean => typeof condition === 'object' && condition !== null &&
    'parameter' in condition && typeof condition.parameter === 'string' &&
    (!('hide' in condition) || typeof condition.hide === 'boolean') &&
    (('value' in condition && !('values' in condition) && ['string', 'number', 'boolean'].includes(typeof condition.value)) ||
      ('values' in condition && !('value' in condition) && Array.isArray(condition.values) && condition.values.length > 0 &&
        condition.values.every((value: unknown) => ['string', 'number', 'boolean'].includes(typeof value))));
  if ('conditions' in value && value.conditions !== undefined &&
      (typeof value.conditions !== 'object' || value.conditions === null || Array.isArray(value.conditions) ||
       !Object.entries(value.conditions).every(([name, condition]: [string, unknown]) =>
         /^[a-zA-Z_]\w*$/.test(name) && validCondition(condition)))) return false;
  if ('optionConditions' in value && value.optionConditions !== undefined &&
      (typeof value.optionConditions !== 'object' || value.optionConditions === null || Array.isArray(value.optionConditions) ||
       !Object.entries(value.optionConditions).every(([name, options]: [string, unknown]) =>
         /^[a-zA-Z_]\w*$/.test(name) && typeof options === 'object' && options !== null && !Array.isArray(options) &&
         Object.values(options).every(validCondition)))) return false;
  return true;
}

const metadata = import.meta.glob<MiscEntry>('../public/misc/*/meta.json', {
  eager: true,
  import: 'default',
});

export const miscEntries = Object.entries(metadata).map(([path, entry]) => {
  const slug = path.split('/')[3];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      typeof entry.title !== 'string' || !entry.title.trim() ||
      typeof entry.description !== 'string' || !entry.description.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      typeof entry.preview !== 'string' || !previewFilename.test(entry.preview) ||
      (entry.previewDark !== undefined && !previewFilename.test(entry.previewDark))) {
    throw new Error(`Invalid Misc metadata: ${path}`);
  }
  if (entry.type !== undefined && !['diagram', 'cad'].includes(entry.type)) {
    throw new Error(`Unknown Misc entry type: ${path}`);
  }
  if (entry.type === 'cad' && (
    typeof entry.model !== 'string' || !/^[a-z0-9][a-z0-9-]*\.stl$/.test(entry.model) ||
    (entry.displayModel !== undefined && (typeof entry.displayModel !== 'string' || !/^[a-z0-9][a-z0-9-]*\.json$/.test(entry.displayModel))) ||
    (entry.source !== undefined && (typeof entry.source !== 'string' || !/^[a-z0-9][a-z0-9-]*\.scad$/.test(entry.source))) ||
    (entry.sourceUrl !== undefined && (typeof entry.sourceUrl !== 'string' || !entry.sourceUrl.startsWith('https://'))) ||
    (entry.notes !== undefined && typeof entry.notes !== 'string') ||
    (entry.customizer !== undefined && (!entry.source || !validCustomizer(entry.customizer))) ||
    (entry.attribution !== undefined && (
      typeof entry.attribution.text !== 'string' ||
      typeof entry.attribution.url !== 'string' || !entry.attribution.url.startsWith('https://')
    ))
  )) {
    throw new Error(`Invalid CAD metadata: ${path}`);
  }
  return { ...entry, href: `/misc/${slug}/` };
}).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
