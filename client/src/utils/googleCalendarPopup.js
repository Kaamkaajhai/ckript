/**
 * Talking to the Google Calendar consent popup, given that we cannot hold a reference to it.
 *
 * Google's OAuth pages send Cross-Origin-Opener-Policy. The moment the popup navigates there the
 * browser severs the opener relationship: `window.opener` is null on their side, and on ours
 * `popup.closed` is blocked — Chrome logs "Cross-Origin-Opener-Policy policy would block the
 * window.closed call" and the read comes back TRUE. Believing it, as this code first did, reports a
 * cancellation about a second after the popup opens, while the producer is still reading the consent
 * screen. There is no way to poll a window handle through COOP; the signal has to travel some other
 * way.
 *
 * It travels through storage, which COOP does not touch. Our own OAuth callback redirects the popup
 * back to this app, so the popup ends up running this code on our origin — where it can announce the
 * outcome and close itself.
 *
 * `window.name` is what lets the popup recognise itself. We set it when opening, and unlike
 * `window.opener` it survives the cross-origin trip.
 */

export const POPUP_NAME = "ckript-google-calendar";
const CHANNEL = "ckript:google-calendar";
const STORAGE_PING = "ckript:google-calendar:result";

/** Both paths, because BroadcastChannel is the clean one and `storage` is the one that always works. */
const broadcast = (status) => {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ status });
    channel.close();
  } catch {
    /* not supported — the storage write below still gets through */
  }
  try {
    // A changing value matters: `storage` only fires when the value actually differs.
    localStorage.setItem(STORAGE_PING, `${status}:${Date.now()}`);
  } catch {
    /* private mode — the opener falls back to polling the API */
  }
};

/**
 * Run on app boot. If this window IS the consent popup returning from Google, announce the result to
 * the opener and close. Returns true when it recognised itself, so the caller can skip rendering an
 * app nobody will see.
 */
export const announceIfCalendarPopup = () => {
  if (typeof window === "undefined") return false;
  if (window.name !== POPUP_NAME) return false;

  const status = new URLSearchParams(window.location.search).get("calendar");
  if (!status) return false;

  broadcast(status);
  try {
    window.close();
  } catch {
    /* if the close is refused the opener still got the message */
  }
  return true;
};

/**
 * Listen for that announcement. Returns an unsubscribe function.
 * @param {(status: string) => void} onResult called with "connected" | "error"
 */
export const onCalendarPopupResult = (onResult) => {
  const handlers = [];

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event?.data?.status) onResult(String(event.data.status));
    };
    handlers.push(() => channel.close());
  } catch {
    /* fall through to storage */
  }

  const onStorage = (event) => {
    if (event.key !== STORAGE_PING || !event.newValue) return;
    onResult(String(event.newValue).split(":")[0]);
  };
  window.addEventListener("storage", onStorage);
  handlers.push(() => window.removeEventListener("storage", onStorage));

  return () => handlers.forEach((off) => off());
};
