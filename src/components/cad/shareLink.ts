// Shareable configuration links: the values that differ from the source defaults,
// as JSON, deflated where the browser supports it, in URL-safe base64 inside
// the page fragment (#config=...). The fragment never reaches the server.
// "1." prefixes deflated data and "0." plain JSON.
const MAX_LENGTH = 20000;

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

export async function encodeConfiguration(values: Record<string, unknown>): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(values));
  if (typeof CompressionStream === 'undefined') return `0.${toBase64Url(json)}`;
  return `1.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

// Anything malformed, oversized or not a plain object decodes to null.
export async function decodeConfiguration(encoded: string): Promise<Record<string, unknown> | null> {
  if (encoded.length > MAX_LENGTH) return null;
  const match = /^([01])\.([A-Za-z0-9_-]+)$/.exec(encoded);
  if (!match) return null;
  try {
    let bytes: Bytes = fromBase64Url(match[2]);
    if (match[1] === '1') {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? data as Record<string, unknown> : null;
  } catch { return null; }
}

export const readConfigurationHash = (hash: string) => /(?:^#|&)config=([^&]+)/.exec(hash)?.[1] ?? null;
export const configurationLink = (href: string, encoded: string) => `${href.replace(/#.*$/, '')}#config=${encoded}`;
