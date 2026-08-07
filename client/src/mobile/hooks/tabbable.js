/*
 * tabbable — "what can Tab reach inside this element, in order?"
 *
 * Deliberately small. A general-purpose tabbable library has to cope with
 * `contenteditable`, shadow roots, `<audio controls>`, iframes, positive
 * tabindex and CSS visibility in a dozen combinations. This app renders its own
 * markup, so the honest scope is the controls the mobile primitives actually
 * produce — and being small is what makes it reviewable.
 *
 * Two rules it follows that a naive querySelectorAll does not:
 *
 *   • it drops anything inside an `inert` subtree. `inert` is how the overlay
 *     hides the background, and an inert control is not tabbable, so a trap
 *     that ignored it would count elements the browser will skip and then
 *     wrap at the wrong place.
 *   • it drops anything not rendered. `display: none`, `visibility: hidden`
 *     and the `hidden` attribute all remove a control from the tab order, and
 *     a sheet that is animating out still has its nodes in the DOM.
 *
 * Positive tabindex is intentionally NOT re-ordered. It is an anti-pattern the
 * plan's own components never emit; honouring it here would add a sort whose
 * only purpose is to support markup this app forbids.
 */

const TABBABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable=\"false\"])",
  "[tabindex]",
].join(",");

/** `true` when the element or one of its ancestors is inert. */
export function isInert(element) {
  return typeof element?.closest === "function" && element.closest("[inert]") != null;
}

/** `true` when the element is rendered at all — the cheap half of "visible". */
function isRendered(element) {
  if (element.hidden) return false;
  // offsetParent is null for display:none and for position:fixed elements, so
  // it is a hint, not a verdict; the client rects settle the fixed case.
  if (element.offsetParent == null && element.getClientRects().length === 0) {
    // happy-dom reports no layout at all, so treat "no boxes anywhere" as
    // rendered rather than silently emptying the trap in tests.
    return typeof element.ownerDocument?.defaultView?.getComputedStyle !== "function"
      || element.ownerDocument.defaultView.getComputedStyle(element).display !== "none";
  }
  return true;
}

export function isTabbable(element) {
  if (!element || element.nodeType !== 1) return false;
  if (element.disabled) return false;
  if (element.getAttribute?.("tabindex") === "-1") return false;
  if (element.matches?.('a:not([href]), [tabindex="-1"]')) return false;
  if (isInert(element)) return false;
  return isRendered(element);
}

/** Every element Tab can reach inside `root`, in document order. */
export function tabbableWithin(root) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(TABBABLE_SELECTOR)).filter(isTabbable);
}

/** The element that should hold focus when a surface opens. */
export function firstTabbableWithin(root) {
  return tabbableWithin(root)[0] ?? null;
}

/**
 * `true` when focus can still be given back to this element — the test the
 * focus-restoration policy needs before it trusts a remembered node. An element
 * removed from the document while an overlay was open is the common case.
 */
export function canReceiveFocus(element) {
  return Boolean(
    element
    && element.isConnected
    && typeof element.focus === "function"
    && !element.disabled
    && !isInert(element),
  );
}
