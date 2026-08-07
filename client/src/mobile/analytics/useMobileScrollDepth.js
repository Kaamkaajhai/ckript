import { useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { sendTrackEvent } from "../../tracking/analyticsClient";
import { getUserContext } from "../../tracking/userContext";
import { useAnalyticsConsent } from "../../tracking/useAnalyticsConsent";

/*
 * Mobile scroll-depth tracking (canonical plan §11, Phase 0 analytics item).
 *
 * WHY THIS EXISTS — read before adding any other mobile tracker:
 * `AnalyticsBootstrap` is mounted above the experience resolver, so a mobile
 * screen ALREADY emits `session_start`, `user_returned`, `page_enter`,
 * `page_exit`, `session_end` and `click` with the same canonical path as its
 * desktop page. Do not re-fire any of those from mobile code; duplicates would
 * corrupt session and funnel reporting.
 *
 * The single event the desktop implementation cannot produce on mobile is
 * `scroll_depth`. `usePageTracking` listens for `window` scroll and measures
 * `document.documentElement`, but the mobile app locks the document
 * (`.ckm-html-lock`) and scrolls inside the shell's own surface — so the window
 * never scrolls and depth would always read as one static value. This hook
 * measures the element that actually scrolls and emits the identical payload,
 * tagged with the screen so mobile depth can be compared per screen.
 *
 * Thresholds mirror `usePageTracking` exactly: report on every 5% gain and
 * always at 100%, never regress the max, and reset per URL.
 */

const DEPTH_STEP = 5;

export function useMobileScrollDepth(scrollRef, { screenId = "" } = {}) {
  const enabled = useAnalyticsConsent();
  const { user } = useContext(AuthContext) || {};
  const { pathname, search } = useLocation();
  const maxDepthRef = useRef(0);

  // Read the latest user at send time instead of resubscribing the scroll
  // listener whenever the auth object's identity changes.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // A new URL is a new page for depth purposes, even though the shell and its
  // scroll element persist across mobile screens.
  useEffect(() => {
    maxDepthRef.current = 0;
  }, [pathname, search]);

  useEffect(() => {
    const element = scrollRef?.current;
    if (!enabled || !element) return undefined;

    let ticking = false;
    const raf = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(cb, 16);

    const measure = () => {
      const { scrollTop, clientHeight } = element;
      const full = element.scrollHeight || 1;
      // A screen shorter than its viewport is fully seen the moment it renders.
      const depth = full <= clientHeight
        ? 100
        : Math.min(100, Math.round(((scrollTop + clientHeight) / full) * 100));

      const shouldSend = depth >= maxDepthRef.current + DEPTH_STEP || (depth === 100 && maxDepthRef.current < 100);
      if (!shouldSend) {
        ticking = false;
        return;
      }

      maxDepthRef.current = Math.max(maxDepthRef.current, depth);

      void sendTrackEvent({
        eventType: "scroll_depth",
        path: `${pathname}${search}`,
        scrollDepth: depth,
        metadata: { surface: "mobile-shell", screenId: screenId || undefined },
        userContext: getUserContext(userRef.current),
      });

      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf(measure);
    };

    element.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", onScroll);
    };
  }, [enabled, scrollRef, pathname, search, screenId]);
}

export default useMobileScrollDepth;
