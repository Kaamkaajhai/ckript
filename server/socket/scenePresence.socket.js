// Scene-anchored presence + locks (Phase 3 — Slice 1). Broadcasts who is in a script and
// which scene each person occupies, and enforces one-editor-per-scene soft locks.
//
// Presence is keyed by userId but tracks the set of that user's socket ids, so:
//   - opening the script in a second tab does NOT duplicate the person, and
//   - closing one tab does NOT drop a person who still has another tab open (ghost-safe).
//
// Locks are authoritative here, with a SERVER-SIDE EXPIRY BACKSTOP: a lock whose holder
// vanished (no heartbeat) is swept and released on its own, so a ghost can never block a
// scene forever (§4.3). Disconnect releases a user's locks immediately as well.

import { getScriptAccessSummary } from "../controllers/collab.controller.js";

// scriptId -> Map(userId -> { userId, name, activeSceneId, state, socketIds:Set })
const rooms = new Map();
// scriptId -> Map(sceneId -> { sceneId, holderId, holderName, acquiredAt, heartbeatAt, expiresAt })
const locks = new Map();

const LOCK_TTL_MS = 45000;   // a lock expires this long after its last heartbeat
const SWEEP_MS = 10000;      // how often the server sweeps for stale locks

const roomKey = (scriptId) => `scene:script:${scriptId}`;

const getRoom = (scriptId) => {
  const key = String(scriptId);
  if (!rooms.has(key)) rooms.set(key, new Map());
  return rooms.get(key);
};
const getLockRoom = (scriptId) => {
  const key = String(scriptId);
  if (!locks.has(key)) locks.set(key, new Map());
  return locks.get(key);
};

const resolveName = (socket) => {
  const u = socket.user || {};
  return String(u.writerProfile?.username || u.name || "Collaborator").trim() || "Collaborator";
};

const broadcastPresence = (io, scriptId) => {
  const people = [...getRoom(scriptId).values()].map((p) => ({
    userId: p.userId,
    name: p.name,
    activeSceneId: p.activeSceneId,
    state: p.state,
  }));
  io.to(roomKey(scriptId)).emit("scene:presence", { people });
};

const broadcastLocks = (io, scriptId) => {
  const map = {};
  for (const [sceneId, lock] of getLockRoom(scriptId)) {
    map[sceneId] = { sceneId, holderId: lock.holderId, holderName: lock.holderName };
  }
  io.to(roomKey(scriptId)).emit("scene:lock:change", { locks: map });
};

// Keep a user's presence "state" in sync with whether they hold any lock.
const syncPresenceState = (scriptId, userId) => {
  const entry = getRoom(scriptId).get(String(userId));
  if (!entry) return;
  const holdsAny = [...getLockRoom(scriptId).values()].some((l) => l.holderId === String(userId));
  entry.state = holdsAny ? "editing" : "viewing";
};

const removeSocketFromPresence = (io, scriptId, socket) => {
  const room = getRoom(scriptId);
  const userId = String(socket.user?._id || "");
  const entry = room.get(userId);
  if (!entry) return;
  entry.socketIds.delete(socket.id);
  if (entry.socketIds.size === 0) room.delete(userId);
  broadcastPresence(io, scriptId);
};

// Release a single lock (only the holder may, unless forced by disconnect/sweep).
const releaseLock = (io, scriptId, sceneId, userId, { force = false } = {}) => {
  const room = getLockRoom(scriptId);
  const lock = room.get(sceneId);
  if (!lock) return false;
  if (!force && lock.holderId !== String(userId)) return false;
  room.delete(sceneId);
  syncPresenceState(scriptId, lock.holderId);
  broadcastLocks(io, scriptId);
  broadcastPresence(io, scriptId);
  return true;
};

// Release every lock a user holds in a script (disconnect / leave backstop).
const releaseUserLocks = (io, scriptId, userId) => {
  const room = getLockRoom(scriptId);
  let changed = false;
  for (const [sceneId, lock] of [...room]) {
    if (lock.holderId === String(userId)) {
      room.delete(sceneId);
      changed = true;
    }
  }
  if (changed) {
    syncPresenceState(scriptId, userId);
    broadcastLocks(io, scriptId);
    broadcastPresence(io, scriptId);
  }
};

let sweepStarted = false;
const startStaleLockSweep = (io) => {
  if (sweepStarted) return;
  sweepStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [scriptId, room] of locks) {
      let changed = false;
      const touchedHolders = new Set();
      for (const [sceneId, lock] of [...room]) {
        if (lock.expiresAt <= now) {
          room.delete(sceneId);
          touchedHolders.add(lock.holderId);
          changed = true;
        }
      }
      if (changed) {
        touchedHolders.forEach((uid) => syncPresenceState(scriptId, uid));
        broadcastLocks(io, scriptId);
        broadcastPresence(io, scriptId);
      }
    }
  }, SWEEP_MS).unref?.();
};

export const registerScenePresence = (io) => {
  startStaleLockSweep(io);

  io.on("connection", (socket) => {
    socket.data.sceneScripts = socket.data.sceneScripts || new Set();

    socket.on("scene:join", async (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      if (!scriptId) return;

      // Access control — same gate the rest of the collab layer uses.
      let allowed = false;
      if (process.env.NODE_ENV === "test" || process.env.BYPASS_DB_AUTH === "true") {
        allowed = true;
      } else {
        try {
          const access = await getScriptAccessSummary(scriptId, socket.user?._id);
          allowed = Boolean(access?.allowed);
        } catch {
          allowed = false;
        }
      }
      if (!allowed) {
        socket.emit("scene:error", { message: "Access denied." });
        return;
      }

      socket.join(roomKey(scriptId));
      socket.data.sceneScripts.add(scriptId);

      const room = getRoom(scriptId);
      const userId = String(socket.user._id);
      const existing = room.get(userId);
      if (existing) {
        existing.socketIds.add(socket.id);
        existing.name = resolveName(socket);
      } else {
        room.set(userId, {
          userId,
          name: resolveName(socket),
          activeSceneId: null,
          state: "viewing",
          socketIds: new Set([socket.id]),
        });
      }
      // Reconnect reconciliation: send the current lock state so a returning client can
      // re-render and (client-side) reclaim its scene lock without duplicating.
      syncPresenceState(scriptId, userId);
      broadcastPresence(io, scriptId);
      socket.emit("scene:lock:change", (() => {
        const map = {};
        for (const [sceneId, lock] of getLockRoom(scriptId)) map[sceneId] = { sceneId, holderId: lock.holderId, holderName: lock.holderName };
        return { locks: map };
      })());
    });

    // Debounced on the client to "moved to a new scene" — never per keystroke.
    socket.on("scene:active", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sceneId = payload.sceneId != null ? String(payload.sceneId) : null;
      if (!scriptId) return;
      const entry = getRoom(scriptId).get(String(socket.user?._id || ""));
      if (!entry) return;
      if (entry.activeSceneId === sceneId) return; // no-op churn guard
      entry.activeSceneId = sceneId;
      broadcastPresence(io, scriptId);
    });

    // ── Locks ────────────────────────────────────────────────────────────────
    socket.on("scene:lock:request", (payload = {}, ack) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sceneId = String(payload.sceneId || "").trim();
      if (!scriptId || !sceneId) { ack?.({ granted: false }); return; }

      const room = getLockRoom(scriptId);
      const userId = String(socket.user?._id || "");
      const now = Date.now();
      const existing = room.get(sceneId);

      // Denied only if held by ANOTHER user and not yet expired. No forced steal.
      if (existing && existing.holderId !== userId && existing.expiresAt > now) {
        ack?.({ granted: false, holder: { holderId: existing.holderId, holderName: existing.holderName } });
        return;
      }

      room.set(sceneId, {
        sceneId,
        holderId: userId,
        holderName: resolveName(socket),
        acquiredAt: existing?.holderId === userId ? existing.acquiredAt : now,
        heartbeatAt: now,
        expiresAt: now + LOCK_TTL_MS,
      });
      syncPresenceState(scriptId, userId);
      broadcastLocks(io, scriptId);
      broadcastPresence(io, scriptId);
      ack?.({ granted: true });
    });

    socket.on("scene:lock:release", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sceneId = String(payload.sceneId || "").trim();
      if (!scriptId || !sceneId) return;
      releaseLock(io, scriptId, sceneId, socket.user?._id);
    });

    socket.on("scene:lock:heartbeat", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sceneId = String(payload.sceneId || "").trim();
      if (!scriptId || !sceneId) return;
      const lock = getLockRoom(scriptId).get(sceneId);
      if (lock && lock.holderId === String(socket.user?._id || "")) {
        lock.heartbeatAt = Date.now();
        lock.expiresAt = Date.now() + LOCK_TTL_MS;
      }
    });

    // "Request edit" — notify the current holder's sockets; the holder chooses to release.
    socket.on("scene:lock:request-edit", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sceneId = String(payload.sceneId || "").trim();
      if (!scriptId || !sceneId) return;
      const lock = getLockRoom(scriptId).get(sceneId);
      if (!lock) return;
      const holderEntry = getRoom(scriptId).get(lock.holderId);
      holderEntry?.socketIds.forEach((sid) => io.to(sid).emit("scene:lock:edit-requested", {
        sceneId,
        byUserId: String(socket.user?._id || ""),
        byName: resolveName(socket),
      }));
    });

    socket.on("scene:leave", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      if (!scriptId) return;
      socket.leave(roomKey(scriptId));
      socket.data.sceneScripts?.delete(scriptId);
      releaseUserLocks(io, scriptId, socket.user?._id);
      removeSocketFromPresence(io, scriptId, socket);
    });

    socket.on("disconnect", () => {
      const scripts = socket.data?.sceneScripts || new Set();
      [...scripts].forEach((scriptId) => {
        // If this was the user's last socket, release their locks (immediate backstop;
        // the sweep is the ultimate one). Other tabs keep presence/locks alive.
        const entry = getRoom(scriptId).get(String(socket.user?._id || ""));
        const isLastSocket = entry ? (entry.socketIds.size <= 1) : true;
        removeSocketFromPresence(io, scriptId, socket);
        if (isLastSocket) releaseUserLocks(io, scriptId, socket.user?._id);
      });
    });
  });
};
