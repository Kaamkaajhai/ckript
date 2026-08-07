import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { sendTrackEvent, sendTrackSession } from "./analyticsClient";
import {
  clearSessionId,
  ensureAnonymousId,
  ensureSessionId,
  getAnonymousId,
  getSessionId,
  hasConsent,
  markReturnEventSentForSession,
  wasReturnEventSentForSession,
} from "./storage";
import { getUserContext } from "./userContext";

export const usePageTracking = ({ user, enabled = false } = {}) => {
  const location = useLocation();
  const pageStartRef = useRef(Date.now());
  const prevPathRef = useRef("");
  const startedSessionRef = useRef("");
  const maxScrollDepthRef = useRef(0);

  useEffect(() => {
    if (!enabled || !hasConsent()) return;

    const hadAnonymousId = Boolean(getAnonymousId());
    ensureAnonymousId();
    const sessionId = ensureSessionId();

    if (startedSessionRef.current !== sessionId) {
      startedSessionRef.current = sessionId;
      void sendTrackSession({
        sessionId,
        action: "session_start",
        path: `${location.pathname}${location.search}`,
        startedAt: new Date().toISOString(),
        userContext: getUserContext(user),
      });
    }

    if (hadAnonymousId && !wasReturnEventSentForSession(sessionId)) {
      markReturnEventSentForSession(sessionId);
      void sendTrackSession({
        sessionId,
        action: "user_returned",
        path: `${location.pathname}${location.search}`,
        isReturning: true,
        metadata: { source: "cookie-detected" },
      });
    }
  }, [enabled, location.pathname, location.search, user?._id]);

  useEffect(() => {
    if (!enabled || !hasConsent()) return;

    const currentPath = `${location.pathname}${location.search}`;
    const previousPath = prevPathRef.current;

    if (previousPath) {
      const spentSeconds = Math.max(Math.round((Date.now() - pageStartRef.current) / 1000), 0);
      void sendTrackEvent({
        eventType: "page_exit",
        path: previousPath,
        timeSpentSeconds: spentSeconds,
        sessionDurationSeconds: spentSeconds,
        userContext: getUserContext(user),
      });
    }

    pageStartRef.current = Date.now();
    prevPathRef.current = currentPath;
    maxScrollDepthRef.current = 0;

    void sendTrackEvent({
      eventType: "page_enter",
      path: currentPath,
      title: document.title,
      referrer: document.referrer || "",
      userContext: getUserContext(user),
    });
  }, [enabled, location.pathname, location.search, user?._id]);

  useEffect(() => {
    if (!enabled || !hasConsent()) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
        const full = document.documentElement.scrollHeight || 1;
        const depth = Math.min(100, Math.round(((scrollTop + viewport) / full) * 100));

        const shouldSend = depth >= maxScrollDepthRef.current + 5 || depth === 100;
        if (!shouldSend) {
          ticking = false;
          return;
        }

        maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, depth);

        void sendTrackEvent({
          eventType: "scroll_depth",
          path: `${window.location.pathname}${window.location.search}`,
          scrollDepth: depth,
          userContext: getUserContext(user),
        });

        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled, user?._id]);

  useEffect(() => {
    if (!enabled || !hasConsent()) return;

    const onBeforeUnload = () => {
      const path = prevPathRef.current || `${window.location.pathname}${window.location.search}`;
      const spentSeconds = Math.max(Math.round((Date.now() - pageStartRef.current) / 1000), 0);

      void sendTrackEvent(
        {
          eventType: "page_exit",
          path,
          timeSpentSeconds: spentSeconds,
          sessionDurationSeconds: spentSeconds,
          userContext: getUserContext(user),
        },
        { preferBeacon: true }
      );

      void sendTrackSession(
        {
          anonymousId: getAnonymousId(),
          sessionId: getSessionId(),
          action: "session_end",
          path,
          endedAt: new Date().toISOString(),
          userContext: getUserContext(user),
        },
        { preferBeacon: true }
      );

      clearSessionId();
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, user?._id]);
};
