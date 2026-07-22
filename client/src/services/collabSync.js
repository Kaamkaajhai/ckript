// CollabSync — the swappable sync-layer boundary (Phase 3 §2).
//
// The editor, navigator, presence list, and comment UI depend on THIS interface — never on
// raw socket.io messages. One implementation backs it today (socket.io scene locks); the
// interface is what lets a future CRDT (Yjs) slot in without touching the editor or UI.
//
// Interface (all implementations honor this shape):
//   join(scriptId, user) -> void
//   leave() -> void
//   onPresence(cb) -> unsubscribe        // cb(Presence[])
//   setActiveScene(sceneId) -> void       // debounced caret-scene signal
//   requestLock(sceneId) -> Promise<{ granted, holder? }>
//   releaseLock(sceneId) -> void
//   heartbeat(sceneId) -> void
//   onLockChange(cb) -> unsubscribe       // cb(locksBySceneId)
//   requestEdit(sceneId) -> void          // ask the current holder to release
//   sendSceneContent(sceneId, text, heading) -> void   // stream the scene you hold (throttled)
//   onSceneContent(cb) -> unsubscribe     // cb({ sceneId, text, heading, byUserId, byName })
//   onReconnect(cb) -> unsubscribe
//   onDisconnect(cb) -> unsubscribe
//   destroy() -> void

import { io } from "socket.io-client";
import { getApiBaseUrl } from "../utils/apiOrigin";

const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");

// Deterministic, legible presence color from a user id (stable across sessions).
const PRESENCE_COLORS = ["#2f7fd1", "#cf5b3a", "#3ea16f", "#9b59b6", "#d39a2f", "#1f9fae", "#c0507a", "#5b6bd6"];
export const colorForUser = (userId = "") => {
  const s = String(userId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length];
};

// Minimal multi-subscriber callback set.
const listeners = () => {
  const set = new Set();
  return {
    add: (cb) => { set.add(cb); return () => set.delete(cb); },
    emit: (...args) => set.forEach((cb) => { try { cb(...args); } catch { /* ignore */ } }),
    clear: () => set.clear(),
  };
};

const ACTIVE_SCENE_DEBOUNCE_MS = 400;
const SCENE_CONTENT_THROTTLE_MS = 300;

// ── Single-user / disabled implementation ───────────────────────────────────
// Used when collaboration is off or there's no auth token. You are always alone, so every
// lock is granted to you and no remote presence/lock events ever fire.
class LocalCollabSync {
  constructor() {
    this._presence = listeners();
    this._locks = listeners();
    this._editReq = listeners();
    this._comments = listeners();
    this._content = listeners();
    this._reconnect = listeners();
    this._disconnect = listeners();
  }
  join() {}
  leave() {}
  onPresence(cb) { return this._presence.add(cb); }
  setActiveScene() {}
  async requestLock() { return { granted: true }; }
  releaseLock() {}
  heartbeat() {}
  onLockChange(cb) { return this._locks.add(cb); }
  requestEdit() {}
  sendSceneContent() {}
  onSceneContent(cb) { return this._content.add(cb); }
  onEditRequested(cb) { return this._editReq.add(cb); }
  onCommentsChanged(cb) { return this._comments.add(cb); }
  onReconnect(cb) { return this._reconnect.add(cb); }
  onDisconnect(cb) { return this._disconnect.add(cb); }
  destroy() {
    this._presence.clear(); this._locks.clear(); this._editReq.clear(); this._comments.clear();
    this._content.clear(); this._reconnect.clear(); this._disconnect.clear();
  }
}

// ── socket.io implementation (scene-anchored presence + locks) ───────────────
// Talks to scene-prefixed server events. The server owns the authoritative lock state
// (with a server-side expiry backstop) and broadcasts presence + lock changes.
class SocketCollabSync {
  constructor(token) {
    this._token = token;
    this._scriptId = null;
    this._user = null;
    this._socket = null;
    this._activeTimer = null;
    this._contentTimer = null;
    this._pendingContent = null;
    this._presence = listeners();
    this._locks = listeners();
    this._editReq = listeners();
    this._comments = listeners();
    this._content = listeners();
    this._reconnect = listeners();
    this._disconnect = listeners();
  }

  join(scriptId, user) {
    this._scriptId = String(scriptId);
    this._user = user || null;

    const socket = io(SOCKET_ORIGIN, { auth: { token: this._token } });
    this._socket = socket;

    socket.on("connect", () => {
      socket.emit("scene:join", { scriptId: this._scriptId });
    });
    socket.io.on("reconnect", () => {
      // Re-join so the server reconciles presence + any reclaimable locks.
      socket.emit("scene:join", { scriptId: this._scriptId });
      this._reconnect.emit();
    });
    socket.on("disconnect", () => this._disconnect.emit());

    socket.on("scene:presence", (payload = {}) => {
      this._presence.emit(Array.isArray(payload.people) ? payload.people : []);
    });
    socket.on("scene:lock:change", (payload = {}) => {
      this._locks.emit(payload.locks || {});
    });
    socket.on("scene:lock:edit-requested", (payload = {}) => {
      this._editReq.emit(payload);
    });
    socket.on("scene:comment:change", (payload = {}) => {
      this._comments.emit(payload);
    });
    socket.on("scene:content:updated", (payload = {}) => {
      this._content.emit(payload);
    });
  }

  leave() {
    if (!this._socket) return;
    this._socket.emit("scene:leave", { scriptId: this._scriptId });
  }

  onPresence(cb) { return this._presence.add(cb); }

  setActiveScene(sceneId) {
    if (this._activeTimer) clearTimeout(this._activeTimer);
    // Debounced to "moved to a new scene" — never a message per keystroke.
    this._activeTimer = setTimeout(() => {
      this._socket?.emit("scene:active", { scriptId: this._scriptId, sceneId });
    }, ACTIVE_SCENE_DEBOUNCE_MS);
  }

  requestLock(sceneId) {
    return new Promise((resolve) => {
      if (!this._socket) return resolve({ granted: false });
      let settled = false;
      const done = (res) => { if (!settled) { settled = true; resolve(res); } };
      // socket.io ack with a short safety timeout so the UI never hangs.
      this._socket.emit("scene:lock:request", { scriptId: this._scriptId, sceneId }, (res) =>
        done(res || { granted: false })
      );
      setTimeout(() => done({ granted: false, timedOut: true }), 4000);
    });
  }

  releaseLock(sceneId) {
    this._socket?.emit("scene:lock:release", { scriptId: this._scriptId, sceneId });
  }

  heartbeat(sceneId) {
    this._socket?.emit("scene:lock:heartbeat", { scriptId: this._scriptId, sceneId });
  }

  onLockChange(cb) { return this._locks.add(cb); }

  requestEdit(sceneId) {
    this._socket?.emit("scene:lock:request-edit", { scriptId: this._scriptId, sceneId });
  }

  // Stream the scene you hold. Trailing-throttled so a fast typist sends ~3 msgs/sec instead of one
  // per keystroke, while the final keystroke of a burst is always delivered.
  sendSceneContent(sceneId, text, heading = "") {
    if (!this._socket || !sceneId) return;
    this._pendingContent = { scriptId: this._scriptId, sceneId, text, heading };
    if (this._contentTimer) return;
    this._contentTimer = setTimeout(() => {
      this._contentTimer = null;
      const pending = this._pendingContent;
      this._pendingContent = null;
      if (pending) this._socket?.emit("scene:content:change", pending);
    }, SCENE_CONTENT_THROTTLE_MS);
  }

  onSceneContent(cb) { return this._content.add(cb); }
  onEditRequested(cb) { return this._editReq.add(cb); }
  onCommentsChanged(cb) { return this._comments.add(cb); }
  onReconnect(cb) { return this._reconnect.add(cb); }
  onDisconnect(cb) { return this._disconnect.add(cb); }

  destroy() {
    if (this._activeTimer) clearTimeout(this._activeTimer);
    if (this._contentTimer) clearTimeout(this._contentTimer);
    this.leave();
    this._socket?.disconnect();
    this._socket = null;
    this._presence.clear(); this._locks.clear(); this._editReq.clear(); this._comments.clear();
    this._content.clear(); this._reconnect.clear(); this._disconnect.clear();
  }
}

/**
 * Factory: returns a CollabSync. Falls back to the single-user Local implementation when
 * collaboration is disabled or there's no auth token, so the editor/UI can always depend on
 * the same interface.
 */
export function createCollabSync({ enabled = true } = {}) {
  let token = "";
  try { token = JSON.parse(localStorage.getItem("user") || "{}")?.token || ""; } catch { token = ""; }
  if (!enabled || !token) return new LocalCollabSync();
  return new SocketCollabSync(token);
}

export { LocalCollabSync, SocketCollabSync };
