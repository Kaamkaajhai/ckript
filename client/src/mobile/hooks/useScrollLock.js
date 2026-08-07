import { useEffect } from "react";

/*
 * useScrollLock — stop the screen behind an overlay from scrolling.
 *
 * The mobile app has already locked the *document* (`ckm-html-lock` on <html>,
 * applied by MobileApp), so the thing that actually scrolls is the shell's own
 * `<main class="ckm-shell__scroll">`. Locking `body` here would therefore do
 * nothing at all — the usual copy-pasted scroll lock is a no-op in this app,
 * which is exactly why this hook exists rather than a one-line `overflow`
 * toggle inside each overlay.
 *
 * `inert` on the background is not a substitute. It blocks clicks, focus and
 * selection, but a touch drag over an inert scroll container still scrolls it
 * in current browsers, so the sheet would slide over content moving underneath.
 *
 * Two details worth the code:
 *   • scroll position is captured and restored. `overflow: hidden` is specified
 *     to keep scrollTop, but a locked surface can be re-laid-out while the
 *     overlay is open (the keyboard opening is enough), and coming back to the
 *     wrong row after closing a sheet is a real loss of place.
 *   • locks are reference-counted per element. Two stacked overlays each lock;
 *     the first to close must not unlock a surface the second still needs.
 */

const locks = new WeakMap();

export function lockScrollSurface(node) {
  if (!node) return () => {};
  const existing = locks.get(node);
  if (existing) {
    existing.count += 1;
  } else {
    locks.set(node, { count: 1, scrollTop: node.scrollTop, scrollLeft: node.scrollLeft });
    node.classList.add("is-scroll-locked");
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const entry = locks.get(node);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count > 0) return;
    locks.delete(node);
    node.classList.remove("is-scroll-locked");
    node.scrollTop = entry.scrollTop;
    node.scrollLeft = entry.scrollLeft;
  };
}

/**
 * @param enabled  lock while true
 * @param options.surfaceSelector  the surface to lock; defaults to the shell's
 *   single primary scroll surface, which the shell contract guarantees exists
 * @param options.within  optional root to search inside (defaults to document)
 */
export default function useScrollLock(enabled = true, {
  surfaceSelector = ".ckm-shell__scroll",
  within = null,
} = {}) {
  useEffect(() => {
    if (!enabled) return undefined;
    const root = within?.current ?? within ?? (typeof document === "undefined" ? null : document);
    const surface = root?.querySelector?.(surfaceSelector);
    if (!surface) return undefined;
    return lockScrollSurface(surface);
  }, [enabled, surfaceSelector, within]);
}
