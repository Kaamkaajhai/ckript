import { useEffect, useState } from "react";

/*
 * useKeyboardInset — how many pixels of the viewport the virtual keyboard is
 * currently covering.
 *
 * Needed because `env(safe-area-inset-bottom)` describes the home indicator and
 * says nothing about the keyboard, and because the two platforms disagree:
 *
 *   • iOS Safari keeps the layout viewport at full height and shrinks only the
 *     *visual* viewport, so a `position: absolute; bottom: 0` action bar stays
 *     exactly where it was — underneath the keyboard, invisible, untappable.
 *   • Android Chrome resizes the visual viewport too, but by default does not
 *     resize the layout viewport either.
 *
 * In both cases the honest measurement is the same one: how far the visual
 * viewport's bottom edge now sits above the layout viewport's bottom edge.
 * A sheet's sticky footer adds this to its own bottom padding, so "Save" stays
 * on screen while a field in that same sheet is being typed into.
 *
 * Small values are treated as zero. The visual viewport also moves a few pixels
 * when the browser's own chrome collapses on scroll, and a footer that shuffled
 * upward every time the address bar hid would be its own bug.
 */
const KEYBOARD_THRESHOLD = 80;

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > KEYBOARD_THRESHOLD ? Math.round(covered) : 0);
    };
    // resize and scroll both fire in bursts while the keyboard animates in.
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
    };
  }, []);

  return inset;
}
