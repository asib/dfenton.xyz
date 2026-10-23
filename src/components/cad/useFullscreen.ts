import { useCallback, useEffect, useRef, useState } from 'react';

// Keep the existing canvas and controls mounted in native fullscreen or a viewport fallback.
export function useFullscreen() {
  const workspace = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const requested = useRef(false);
  const native = useRef(false);
  const scroll = useRef({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const isRequested = () => requested.current;

  const leave = useCallback(async () => {
    requested.current = false;
    if (document.fullscreenElement === workspace.current) {
      try { await document.exitFullscreen(); }
      catch { return; } // Keep the exit control available if the browser rejects an exit.
    }
    setFullscreen(false);
  }, []);

  const enter = async () => {
    const element = workspace.current;
    if (!element) return;
    scroll.current = { x: window.scrollX, y: window.scrollY };
    requested.current = true;
    setFullscreen(true);
    try {
      await element.requestFullscreen();
      // An Escape/click can arrive while the native request is pending.
      if (!isRequested() && document.fullscreenElement === element) await document.exitFullscreen();
    } catch {
      // Embedded browsers can deny the API; the same workspace still fills the viewport.
    }
  };

  useEffect(() => {
    const element = workspace.current;
    const changed = () => {
      if (document.fullscreenElement === element) native.current = true;
      else if (native.current) {
        native.current = false;
        requested.current = false;
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', changed);
    return () => {
      requested.current = false;
      document.removeEventListener('fullscreenchange', changed);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => { /* Removing the fullscreen element also makes the browser exit. */ });
    };
  }, []);

  useEffect(() => {
    const element = workspace.current;
    if (!fullscreen || !element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
    document.documentElement.dataset.cadFullscreen = 'true';
    // Make background content inert without moving/remounting the WebGL canvas.
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let child: HTMLElement = element;
    let parent = child.parentElement;
    while (parent) {
      for (const sibling of parent.children) {
        if (sibling !== child && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      child = parent;
      parent = parent.parentElement;
    }
    // Entering by mouse leaves focus in the 3D view, where Space can't exit by pressing the button.
    if (!element.contains(document.activeElement)) toggleButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); void leave(); return; }
      if (event.key !== 'Tab') return;
      const closedPanels = [...element.querySelectorAll('details:not([open])')];
      const focusable = [...element.querySelectorAll<HTMLElement>('a[href], button, input, select, summary, [tabindex="0"]')]
        .filter((item) => !item.matches(':disabled') && item.getClientRects().length > 0
          // Closed details can retain layout rectangles for hidden descendants.
          && closedPanels.every((panel) => !panel.contains(item) || panel.querySelector(':scope > summary')?.contains(item)));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!element.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      siblings.forEach(({ element: sibling, inert }) => { sibling.inert = inert; });
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      delete document.documentElement.dataset.cadFullscreen;
      previousFocus?.focus({ preventScroll: true });
      window.scrollTo(scroll.current.x, scroll.current.y);
    };
  }, [fullscreen, leave]);

  return { workspace, toggleButton, fullscreen, enter, leave };
}
