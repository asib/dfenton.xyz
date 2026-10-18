import { useEffect, useRef, useState } from 'react';
import DarkModeToggle from './components/DarkModeToggle';
import { miscEntries } from './misc';

export default function MiscPage() {
  const [height, setHeight] = useState(720);
  const frame = useRef<HTMLIFrameElement>(null);
  const path = window.location.pathname.replace(/\/$/, '');
  const entry = miscEntries.find((item) => item.href.replace(/\/$/, '') === path);
  const isIndex = path === '/misc';
  const title = isIndex ? 'Misc' : entry?.title ?? 'Page not found';
  const syncTheme = () => {
    frame.current?.contentWindow?.postMessage({
      type: 'site-theme',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    }, window.location.origin);
  };

  useEffect(() => {
    document.title = `${title} — Jacob Fenton`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', entry?.description ?? 'Interactive diagrams and other miscellany by Jacob Fenton.');
    const resize = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === 'diagram-height' && typeof data.height === 'number' &&
          Number.isFinite(data.height) && data.height > 0 && data.height <= 10_000) {
        setHeight(Math.ceil(data.height) + 2);
      }
    };
    window.addEventListener('storage', syncTheme);
    window.addEventListener('message', resize);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('message', resize);
    };
  }, [title, entry]);

  return (
    <>
      <DarkModeToggle />
      <main className={`mx-auto my-4 px-6 md:px-12 ${entry ? 'max-w-[916px]' : 'max-w-[calc(65ch+6rem)]'}`}>
        <nav aria-label="Site navigation" className="text-sm mb-8 pr-12">
          <a className="underline underline-offset-4 decoration-dotted hover:decoration-solid" href={isIndex ? '/' : '/misc/'}>
            ← {isIndex ? 'Jacob Fenton' : 'Misc'}
          </a>
        </nav>
        <h1 className="text-3xl md:text-4xl mb-8">{title}</h1>
        {isIndex && (
          <ul className="space-y-8 text-sm">
            {miscEntries.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-lg underline underline-offset-4 decoration-dotted hover:decoration-solid">{item.title}</a>
                <p className="mt-2 opacity-70">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
        {entry && <iframe ref={frame} onLoad={syncTheme} src={`${entry.href}diagram.html`} title={entry.title} className="block w-full border-0" style={{ height }} />}
        {!entry && !isIndex && <p>There’s no page at this address. <a className="underline" href="/misc/">Browse Misc</a>.</p>}
      </main>
    </>
  );
}
