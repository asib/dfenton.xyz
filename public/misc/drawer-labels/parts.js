// What each kind of part puts on its label, written the way the drawer labels
// already are: 1/4-20×1-1/4", M4×35mm, #10×1" over WOOD, 5/16" over FLAT WASHER.
// A heat-set insert is just its size, M3×5.7mm: its icon says what it is.

export const PARTS = [
  { id: 'hex', name: 'Hex bolt', icon: 'hex', kind: 'screw' },
  { id: 'socket', name: 'Socket head', icon: 'socket', kind: 'screw' },
  { id: 'button', name: 'Button head', icon: 'button', kind: 'screw' },
  { id: 'flat-socket', name: 'Flat head, hex', icon: 'flat-socket', kind: 'screw' },
  { id: 'flat-phillips', name: 'Flat head, Phillips', icon: 'flat-phillips', kind: 'screw' },
  { id: 'combo', name: 'Round head', icon: 'combo', kind: 'screw' },
  { id: 'wood', name: 'Wood screw', icon: 'flat-phillips', kind: 'wood', bottom: 'WOOD' },
  { id: 'nut', name: 'Hex nut', icon: 'nut', kind: 'nut' },
  { id: 'insert', name: 'Heat-set insert', icon: 'insert', kind: 'insert' },
  { id: 'washer', name: 'Flat washer', icon: 'washer', kind: 'washer', bottom: 'FLAT WASHER' },
  { id: 'text', name: 'Text only', icon: 'none', kind: 'text' },
];

const IMPERIAL_THREADS = ['#2-56', '#4-40', '#6-32', '#8-32', '#10-24', '#10-32', '#12-24',
  '1/4-20', '1/4-28', '5/16-18', '5/16-24', '3/8-16', '3/8-24', '7/16-14', '1/2-13', '5/8-11', '3/4-10'];
const METRIC_THREADS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16'];
const WOOD_GAUGES = ['#4', '#6', '#8', '#9', '#10', '#12', '#14'];
const WASHER_SIZES = ['#4', '#6', '#8', '#10', '#12', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"',
  'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'];
const INSERT_THREADS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8',
  '#2-56', '#4-40', '#6-32', '#8-32', '#10-24', '#10-32', '1/4-20', '5/16-18', '3/8-16'];
const INCH_LENGTHS = ['1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1', '1-1/4', '1-1/2', '1-3/4',
  '2', '2-1/4', '2-1/2', '3', '3-1/2', '4'];
const MM_LENGTHS = ['4', '5', '6', '8', '10', '12', '14', '16', '20', '25', '30', '35', '40',
  '45', '50', '55', '60', '65', '70', '80', '90', '100'];
// Inserts are short, and often sold by decimal length.
const INSERT_INCH_LENGTHS = ['0.115', '0.135', '0.15', '0.188', '0.25', '0.3', '0.375', '1/8', '3/16', '1/4', '5/16', '3/8', '1/2'];
const INSERT_MM_LENGTHS = ['3', '4', '5', '5.7', '6', '7', '8', '8.1', '9.5', '10', '12.7'];

export const partById = (id) => PARTS.find((part) => part.id === id) ?? PARTS[0];
export const isMetric = (thread) => /^M\d/i.test(thread.trim());

export function sizeSuggestions(part) {
  if (part.kind === 'wood') return WOOD_GAUGES;
  if (part.kind === 'washer') return WASHER_SIZES;
  if (part.kind === 'insert') return INSERT_THREADS;
  if (part.kind === 'text') return [];
  return [...IMPERIAL_THREADS, ...METRIC_THREADS];
}

export function lengthSuggestions(part, size) {
  if (part.kind === 'insert') return isMetric(size) ? INSERT_MM_LENGTHS : INSERT_INCH_LENGTHS;
  if (part.kind === 'nut' || part.kind === 'washer' || part.kind === 'text') return [];
  return isMetric(size) ? MM_LENGTHS : INCH_LENGTHS;
}

export const hasLength = (part) => part.kind === 'screw' || part.kind === 'wood' || part.kind === 'insert';

const tidy = (text) => (text ?? '').trim().replace(/\s+/g, ' ');

// 'm4' → 'M4'; '10' → '#10' for gauges; '5/16' → '5/16"' for washers.
function size(part, text) {
  let value = tidy(text).replace(/^m(?=\d)/, 'M');
  if (part.kind === 'wood' && /^\d+$/.test(value)) value = `#${value}`;
  if (part.kind === 'washer' && /^\d+(\/\d+|-\d+\/\d+)?$/.test(value) && value.includes('/')) value = `${value}"`;
  return value;
}

// '1 1/4' → '1-1/4'; units dropped, since the size decides them.
function length(text) {
  return tidy(text)
    .replace(/\s*(mm|millimet(er|re)s?|"|''|in\.?|inch(es)?)$/i, '')
    .replace(/^(\d+) (\d+\/\d+)$/, '$1-$2');
}

// The label's lines for a part and what was typed: { icon, top, bottom }.
export function labelSpec(part, fields) {
  const bottom = tidy(fields.bottom);
  if (part.kind === 'text') return { icon: 'none', top: tidy(fields.top), bottom };
  const thread = size(part, fields.size);
  let top = thread;
  if (hasLength(part)) {
    const len = length(fields.length);
    if (thread && len) top = `${thread}×${len}${isMetric(thread) ? 'mm' : '"'}`;
  }
  return { icon: part.icon, top, bottom };
}
