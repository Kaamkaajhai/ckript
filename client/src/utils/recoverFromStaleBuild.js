/**
 * Recover a tab that is running a build the server no longer has.
 *
 * Every route in this app is `lazy(() => import(...))`, so the entry bundle only names its chunks —
 * it fetches them when you navigate. Deploy while someone has the page open and those names stop
 * resolving: the chunk hashes changed, the old files are gone, and the next navigation throws
 * "Failed to fetch dynamically imported module". The tab is stranded on a build that no longer
 * exists, and nothing recovers it but a manual refresh, which the user has no reason to think of —
 * they just see a blank page.
 *
 * Vite fires `vite:preloadError` for exactly this. Reloading re-fetches index.html, which names the
 * current chunks, and the tab is whole again.
 *
 * The reload is allowed ONCE per tab. If the chunk is missing for any reason a reload cannot fix —
 * a broken deploy, an asset that never uploaded, an offline device — a naive handler would spin the
 * page in an infinite refresh loop, which is worse than the blank page it replaced. The flag lives
 * in sessionStorage so it is scoped to this tab and clears itself when the tab closes.
 */

const RELOAD_FLAG = "ckript:reloaded-for-stale-build";

/** sessionStorage throws in private mode and when storage is disabled; a failure here must not break boot. */
const readFlag = () => {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    return true; // cannot track attempts → never reload, rather than risk a loop
  }
};

const writeFlag = () => {
  try {
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* nothing to do — the read above already fails closed */
  }
};

export const clearStaleBuildFlag = () => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
};

export default function recoverFromStaleBuild() {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    if (readFlag()) {
      // Already tried. Let the error surface so the error boundary can show something honest
      // instead of the page silently reloading forever.
      console.error("[build] chunk still missing after a reload — not retrying", event?.payload);
      return;
    }

    // Stop Vite rethrowing it as an unhandled rejection; we are handling it.
    event.preventDefault();
    writeFlag();
    console.warn("[build] a chunk from a previous deploy is gone — reloading to pick up the new build");
    window.location.reload();
  });
}
