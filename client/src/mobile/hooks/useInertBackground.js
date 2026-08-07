import { useEffect } from "react";

/*
 * useInertBackground — hide everything that is not the topmost overlay, using
 * the browser's own `inert` rather than a hand-rolled equivalent.
 *
 * This is the half of "modal" that is genuinely hard to write correctly, and
 * the platform already does it: an inert subtree fires no clicks, takes no
 * focus, cannot be text-selected, is skipped by find-in-page, and — the part
 * that matters most — is removed from the accessibility tree. A screen-reader
 * user swiping past the end of a sheet lands on nothing behind it, which is the
 * whole point of `aria-modal` and the thing `aria-modal` alone does not do.
 *
 * ---------------------------------------------------------------------------
 * Why there is a stack here instead of one effect per overlay
 * ---------------------------------------------------------------------------
 * The obvious version — "each overlay marks its own siblings inert" — is wrong,
 * and its own test caught it: with a confirm dialog open over a sheet, the
 * sheet's effect marked the dialog inert and the dialog's effect marked the
 * sheet inert, so *both* were inert and neither could be used. Order of effects
 * decided the outcome, which is not something correctness may depend on.
 *
 * Only one overlay is ever live: the topmost. So the open overlays are kept in
 * one module-level stack, and every change recomputes from scratch — clear all
 * previous marks, then walk up from the top overlay marking every sibling at
 * each level. The lower overlays are siblings of the top one, so they are made
 * inert by that same walk rather than by a rule of their own.
 *
 * Marks this module did not make are never touched, and marks it did make are
 * always removed by it, so an element that was inert for its own unrelated
 * reasons keeps its attribute.
 */

const stack = [];
const marked = new Set();

function recompute(boundarySelector) {
  for (const element of marked) element.removeAttribute("inert");
  marked.clear();

  const top = stack[stack.length - 1];
  if (!top?.isConnected) return;

  const boundary = top.closest(boundarySelector) || top.ownerDocument?.body;
  if (!boundary) return;

  for (let current = top; current && current !== boundary; current = current.parentElement) {
    const parent = current.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling === current || sibling.nodeType !== 1) continue;
      // Already inert for someone else's reasons — leave it entirely alone.
      if (sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      marked.add(sibling);
    }
  }
}

export default function useInertBackground(ref, enabled = true, { boundarySelector = ".ckm-root" } = {}) {
  useEffect(() => {
    const node = ref?.current;
    if (!enabled || !node) return undefined;

    stack.push(node);
    recompute(boundarySelector);

    return () => {
      const index = stack.lastIndexOf(node);
      if (index !== -1) stack.splice(index, 1);
      recompute(boundarySelector);
    };
  }, [ref, enabled, boundarySelector]);
}
