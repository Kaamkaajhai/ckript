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
 *
 * ---------------------------------------------------------------------------
 * The one exemption: app-level live regions
 * ---------------------------------------------------------------------------
 * `inert` removes a subtree from the accessibility tree, and a live region that
 * is not in the accessibility tree cannot announce. So the toast layer — which
 * is a sibling of the shell, and would otherwise be swept up by this walk — must
 * be left live, or a message raised while a dialog is open would be delivered to
 * nobody: not shown to assistive technology, not dismissible, not announced.
 *
 * The exemption is deliberately narrow and opt-in by attribute. It is a real
 * trade: an action inside an exempt region stays clickable while a modal is
 * open, which is not what "modal" promises. That is accepted because the
 * alternative is an announcement the user can never receive, and it is bounded
 * by two rules the toast enforces for itself — at most one action, and a toast
 * is never the only place a message exists (plan §13, and the APG's warning
 * against alerts that vanish on their own).
 */

const stack = [];
const marked = new Set();

/* Opt-in, by attribute, so the exemption is visible in the DOM of whatever
   claims it rather than hidden in a selector list that grows quietly. */
const LIVE_REGION_SELECTOR = "[data-ckm-live-region]";

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
      // An app-level live region stays in the accessibility tree, or it cannot
      // announce at all. See the block comment above.
      if (sibling.matches?.(LIVE_REGION_SELECTOR)) continue;
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
