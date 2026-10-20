import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

export default function DrawingViewport({ zoom, label, children }: {
  zoom: number; label: string; children: (id: string) => ReactNode;
}) {
  const id = `drawing-${useId().replace(/:/g, '')}`;
  const scroll = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const clip = useRef<HTMLDivElement>(null);
  const copy = useRef<SVGSVGElement>(null);

  // Keep a clipped, noninteractive SVG instance behind the opaque paper. Apply
  // the shadow outside the clip so it can extend beyond the sheet's viewport.
  const sync = () => {
    if (!scroll.current || !content.current || !clip.current || !copy.current) return;
    clip.current.style.width = `${String(scroll.current.clientWidth)}px`;
    clip.current.style.height = `${String(scroll.current.clientHeight)}px`;
    const { width, height } = content.current.getBoundingClientRect();
    copy.current.style.width = `${String(width)}px`;
    copy.current.style.height = `${String(height)}px`;
    copy.current.style.transform = `translate(${String(-scroll.current.scrollLeft)}px, ${String(-scroll.current.scrollTop)}px)`;
  };
  useLayoutEffect(() => {
    const observer = new ResizeObserver(sync);
    if (scroll.current) observer.observe(scroll.current);
    if (content.current) observer.observe(content.current);
    sync();
    return () => { observer.disconnect(); };
  }, []);

  return <div className="cad-drawing-frame">
    <div className="cad-drawing-shadow" aria-hidden="true">
      <div ref={clip} className="cad-drawing-shadow-clip">
        <svg ref={copy} focusable="false" className="cad-drawing-shadow-copy">
          {/* SVG use shares the live linework, labels and hatches without a
              second React sheet or duplicate IDs. PDF export uses the source. */}
          <use href={`#${id}`} width="100%" height="100%" />
        </svg>
      </div>
    </div>
    <div ref={scroll} className="cad-drawing-scroll" tabIndex={0} role="region" aria-label={label} onScroll={sync}>
      <div ref={content} style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}>{children(id)}</div>
    </div>
  </div>;
}
