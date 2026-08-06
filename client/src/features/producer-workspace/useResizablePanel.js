import { useCallback, useEffect, useState } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readStoredWidth = (storageKey, fallback, min, max) => {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(stored) && stored > 0
      ? clamp(stored, min, max)
      : fallback;
  } catch {
    return fallback;
  }
};

const useResizablePanel = ({ storageKey, initialWidth, minWidth, maxWidth }) => {
  const [width, setWidth] = useState(() => (
    readStoredWidth(storageKey, initialWidth, minWidth, maxWidth)
  ));
  const [collapsed, setCollapsed] = useState(false);

  const resize = useCallback((nextWidth) => {
    setCollapsed(false);
    setWidth(clamp(Math.round(nextWidth), minWidth, maxWidth));
  }, [maxWidth, minWidth]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width));
    } catch {
      // Storage can be unavailable in strict privacy contexts. Resizing still
      // works for the current session, so persistence is a progressive bonus.
    }
  }, [storageKey, width]);

  return { collapsed, resize, toggleCollapsed, width };
};

export default useResizablePanel;
