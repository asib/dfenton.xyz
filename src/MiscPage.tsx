import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import DarkModeToggle from './components/DarkModeToggle';
import { miscEntries } from './misc';

const CadViewer = lazy(() => import('./components/cad/CadViewer'));

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
      <main className={`mx-auto my-4 px-6 md:px-12 ${entry?.type === 'cad' ? 'max-w-[1180px]' : entry ? 'max-w-[916px]' : 'max-w-[calc(65ch+6rem)]'}`}>
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
                <a href={item.href} className="group flex flex-col min-[480px]:flex-row gap-4 min-[480px]:gap-5 items-start rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  <span className="flex shrink-0 items-center justify-center w-44 h-28 p-3 border border-light-mode-text/20 dark:border-dark-mode-text/20 group-hover:border-light-mode-text/50 dark:group-hover:border-dark-mode-text/50 transition-colors" aria-hidden="true">
                    <img src={`${item.href}${item.preview}`} alt="" width="176" height="112" loading="lazy" className={`w-full h-full object-contain ${item.previewDark ? 'dark:hidden' : ''}`} />
                    {item.previewDark && <img src={`${item.href}${item.previewDark}`} alt="" width="176" height="112" loading="lazy" className="hidden dark:block w-full h-full object-contain" />}
                  </span>
                  <span>
                    <span className="block text-lg underline underline-offset-4 decoration-dotted group-hover:decoration-solid">{item.title}</span>
                    <span className="block mt-2 opacity-70">{item.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {entry?.type === 'cad' && <Suspense fallback={<p>Loading model viewer…</p>}><CadViewer key={entry.href} entry={entry} /></Suspense>}
        {entry && entry.type !== 'cad' && <iframe ref={frame} onLoad={syncTheme} src={`${entry.href}diagram.html`} title={entry.title} className="block w-full border-0" style={{ height }} />}
        {!entry && !isIndex && <p>There’s no page at this address. <a className="underline" href="/misc/">Browse Misc</a>.</p>}
      </main>
    </>
  );
}
