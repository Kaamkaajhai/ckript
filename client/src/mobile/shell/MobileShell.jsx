import { useCallback, useRef } from "react";
import { useMobileScrollDepth } from "../analytics/useMobileScrollDepth";
import { getShellModeConfig, isMobileShellMode, MOBILE_SHELL_MODE } from "./mobileShellModes";
import "./MobileShell.css";

/*
 * MobileShell — the single app-shell primitive for every mobile screen.
 *
 * It owns exactly four things so screens do not have to:
 *   • the column layout (fixed app bar, ONE primary scroll surface, fixed
 *     bottom chrome) — no screen may introduce a second competing shell;
 *   • which chrome the declared shell mode allows (§8.1);
 *   • safe-area padding and scroll behaviour for the chosen mode;
 *   • scroll-depth analytics for the surface that actually scrolls, plus the
 *     section label the global click tracker reads.
 *
 * Adoption is DOM-compatible on purpose: `className` and `scrollClassName`
 * append to the shell's own classes, so an existing screen can move onto the
 * shell without changing a single selector or losing its visual baseline.
 *
 * The shell is route-level and therefore assumes Router context.
 */
export default function MobileShell({
  mode = MOBILE_SHELL_MODE.STANDARD,
  screenId = "",
  appBar = null,
  children,
  bottomNav = null,
  overlays = null,
  className = "",
  scrollClassName = "",
  onScrollNode = null,
  scrollProps = {},
  ...rest
}) {
  const resolvedMode = isMobileShellMode(mode) ? mode : MOBILE_SHELL_MODE.STANDARD;
  const config = getShellModeConfig(resolvedMode);

  // The shell always needs its own handle on the scroll surface (analytics).
  // A screen that also needs it passes an `onScrollNode` callback rather than
  // a ref object, so nothing outside the shell can retarget the surface.
  const scrollNodeRef = useRef(null);
  const setScrollNode = useCallback((node) => {
    scrollNodeRef.current = node;
    if (typeof onScrollNode === "function") onScrollNode(node);
  }, [onScrollNode]);

  useMobileScrollDepth(scrollNodeRef, { screenId });

  // A mode that forbids a slot never renders it, even if a screen passes one.
  // That keeps "which chrome does this route have?" answerable from the
  // manifest alone rather than from the screen's JSX.
  const showAppBar = config.appBar && appBar != null;
  const showBottomNav = config.bottomNav && bottomNav != null;

  const rootClass = ["ckm-shell", `ckm-shell--${resolvedMode}`, className]
    .filter(Boolean)
    .join(" ");
  const scrollClass = ["ckm-shell__scroll", "ckm-scroll", scrollClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClass}
      data-shell-mode={resolvedMode}
      data-screen-id={screenId || undefined}
      {...rest}
    >
      {showAppBar ? <div className="ckm-shell__app-bar">{appBar}</div> : null}

      {/* data-track-section is what the global click tracker reads first, so a
          mobile tap outside any <section> still reports a real screen name. */}
      <main
        className={scrollClass}
        ref={setScrollNode}
        data-track-section={screenId || undefined}
        {...scrollProps}
      >
        {children}
      </main>

      {showBottomNav ? <div className="ckm-shell__bottom">{bottomNav}</div> : null}

      {overlays}
    </div>
  );
}
