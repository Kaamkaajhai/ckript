import { useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   Reference-counted body scroll lock.

   There is exactly ONE owner of document.body's scroll state. Any number
   of surfaces (modals, drawers, share sheets) may hold the lock at once;
   the body is locked while at least one holder exists and restored to its
   ORIGINAL state only when the last holder releases.

   Why this exists: the previous pattern had every modal capture/restore
   document.body.style.overflow independently. That assumes a single owner
   per lifetime — which breaks the moment two surfaces overlap. The auth
   surfaces deliberately hand off to one another (sign-in → onboarding →
   recovery → pricing), and with exit animations the outgoing modal is still
   mounted as the next one mounts. The incoming modal would then capture
   "hidden" as its "original" and write it back on close, leaving the page
   permanently unscrollable. Counting locks removes the ordering assumption
   entirely.

   Bonus: while locked we pad the body by the width of the (now hidden)
   scrollbar, so locking never shifts centered layouts like the landing hero.
   ───────────────────────────────────────────────────────────── */

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function engage() {
  const { body, documentElement } = document;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;

  // Compensate for the scrollbar that hiding overflow will remove, so the
  // page doesn't jump sideways when a modal opens.
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const basePadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${basePadding + scrollbarWidth}px`;
  }
}

function release() {
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) engage();
  lockCount += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined" || lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) release();
}

/* Lock the body scroll for as long as the calling component is mounted (and
   `active` is true). Pass a boolean for surfaces that toggle via a prop while
   staying mounted. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return unlockScroll;
  }, [active]);
}

export default useScrollLock;
