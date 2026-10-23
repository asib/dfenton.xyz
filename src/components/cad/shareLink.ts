// Shareable configuration links: the values that differ from the source defaults and
// any worksheet settings, as JSON, deflated where the browser supports it, in URL-safe
// base64 inside the page fragment (#config=...). The fragment never reaches the server.
// "3." prefixes deflated and "2." plain JSON of { values, worksheets? }. The first
// links, "1." deflated and "0." plain, held the values alone; they still open.
const MAX_LENGTH = 20000;
export interface SharedConfiguration { values: Record<string, unknown>; worksheets?: unknown }

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
type Bytes = Uint8Array<ArrayBuffer>;
const fromBase64Url = (text: string): Bytes => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};
const pipe = async (bytes: Bytes, stream: CompressionStream | DecompressionStream): Promise<Bytes> =>
  new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function encodeConfiguration(configuration: SharedConfiguration): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(configuration));
  if (typeof CompressionStream === 'undefined') return `2.${toBase64Url(json)}`;
  return `3.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
// Anything malformed, oversized or without a plain object of values decodes to null.
// Worksheet settings pass through unchecked; loading them checks each one.
export async function decodeConfiguration(encoded: string): Promise<SharedConfiguration | null> {
  if (encoded.length > MAX_LENGTH) return null;
  const match = /^([0-3])\.([A-Za-z0-9_-]+)$/.exec(encoded);
  if (!match) return null;
  const format = Number(match[1]);
  try {
    let bytes: Bytes = fromBase64Url(match[2]);
    if (format % 2 === 1) {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isRecord(data)) return null;
    if (format < 2) return { values: data };
    return isRecord(data.values) ? { values: data.values, worksheets: data.worksheets } : null;
  } catch { return null; }
}

export const readConfigurationHash = (hash: string) => /(?:^#|&)config=([^&]+)/.exec(hash)?.[1] ?? null;
export const configurationLink = (href: string, encoded: string) => `${href.replace(/#.*$/, '')}#config=${encoded}`;
