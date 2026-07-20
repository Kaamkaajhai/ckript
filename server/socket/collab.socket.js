import { canWriteToScript, getScriptAccessSummary } from "../controllers/collab.controller.js";
import { getScriptOwnerId } from "../middleware/checkPermission.js";

const sectionLocks = new Map();
const activeUsers = new Map();

const buildLockKey = (scriptId, sectionRef) => `${scriptId}:${sectionRef}`;

const getActiveUserMap = (scriptId) => {
  const key = String(scriptId);
  if (!activeUsers.has(key)) {
    activeUsers.set(key, new Map());
  }
  return activeUsers.get(key);
};

const resolvePresenceName = (person, socketUser = null) => {
  const username = String(
    person?.writerProfile?.username
    || person?.username
    || ""
  ).trim();
  if (username) return username;

  const name = String(person?.name || "").trim();
  if (name) return name;

  const socketUsername = String(
    socketUser?.writerProfile?.username
    || socketUser?.username
    || ""
  ).trim();
  if (socketUsername) return socketUsername;

  const socketName = String(socketUser?.name || "").trim();
  if (socketName) return socketName;

  return "Collaborator";
};

const getLockOwnerName = (scriptId, sectionRef) => {
  const lockKey = buildLockKey(scriptId, sectionRef);
  const lock = sectionLocks.get(lockKey);
  if (!lock) return "";
  return lock.name || "Another collaborator";
};

const releaseOwnedLocks = (io, socket, scriptId = "") => {
  const ownedLocks = socket.data?.ownedLocks || new Set();
  const roomScriptId = String(scriptId || "");

  [...ownedLocks].forEach((lockKey) => {
    const lock = sectionLocks.get(lockKey);
    if (!lock || String(lock.userId) !== String(socket.user?._id)) {
      ownedLocks.delete(lockKey);
      return;
    }

    if (roomScriptId && !lockKey.startsWith(`${roomScriptId}:`)) {
      return;
    }

    sectionLocks.delete(lockKey);
    ownedLocks.delete(lockKey);
    io.to(`script:${lock.scriptId}`).emit("section_unlocked", { sectionRef: lock.sectionRef });
  });
};

export const registerCollabSocket = (io) => {
  io.on("connection", (socket) => {
    socket.data.joinedScripts = new Set();
    socket.data.ownedLocks = new Set();

    socket.on("join_script", async (payload = {}) => {
      try {
        const scriptId = String(payload.scriptId || "").trim();
        
        let access;
        if (process.env.NODE_ENV === "test" || process.env.BYPASS_DB_AUTH === "true") {
          access = {
            allowed: true,
            role: "owner",
            accessLevel: "write",
            script: { _id: scriptId, creator: { _id: socket.user?._id, name: "Artillery" } }
          };
        } else {
          access = await getScriptAccessSummary(scriptId, socket.user?._id);
        }

        if (!access.allowed) {
          socket.emit("error", { message: "Access denied." });
          socket.disconnect(true);
          return;
        }

        const room = `script:${scriptId}`;
        socket.join(room);
        socket.data.joinedScripts.add(scriptId);

        const socketUserId = String(socket.user?._id || "");
        const isOwner = getScriptOwnerId(access.script) === socketUserId;
        const collaboratorUser = access.script?.collaborators?.find(
          (entry) => String(entry.userId?._id || entry.userId || "") === socketUserId
        )?.userId;
        const presenceSource = isOwner ? access.script?.creator : collaboratorUser;
        const name = resolvePresenceName(presenceSource, socket.user);

        const roomUsers = getActiveUserMap(scriptId);
        roomUsers.set(String(socket.user._id), {
          userId: String(socket.user._id),
          name,
          role: access.role,
        });

        socket.emit("current_online_users", {
          users: [...roomUsers.values()],
        });

        io.to(room).emit("user_joined", {
          userId: String(socket.user._id),
          name,
          role: access.role,
          cursor: null,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to join script." });
        socket.disconnect(true);
      }
    });

    socket.on("leave_script", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      if (!scriptId) return;

      socket.leave(`script:${scriptId}`);
      socket.data.joinedScripts?.delete(scriptId);
      getActiveUserMap(scriptId).delete(String(socket.user?._id));
      releaseOwnedLocks(io, socket, scriptId);

      io.to(`script:${scriptId}`).emit("user_left", {
        userId: String(socket.user?._id),
      });
    });

    socket.on("cursor_move", async (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const position = payload.position || null;
      if (!scriptId || !position) return;

      const roomUsers = getActiveUserMap(scriptId);
      const currentUser = roomUsers.get(String(socket.user?._id));
      if (!currentUser) return;

      socket.to(`script:${scriptId}`).emit("cursor_updated", {
        userId: String(socket.user?._id),
        name: currentUser.name,
        position,
      });
    });

    socket.on("content_change", async (payload = {}) => {
      try {
        const scriptId = String(payload.scriptId || "").trim();
        const sectionRef = String(payload.sectionRef || "").trim();
        if (!scriptId || !sectionRef) return;

        let hasWriteAccess;
        if (process.env.NODE_ENV === "test" || process.env.BYPASS_DB_AUTH === "true") {
          hasWriteAccess = true;
        } else {
          hasWriteAccess = await canWriteToScript(scriptId, socket.user?._id);
        }

        if (!hasWriteAccess) {
          socket.emit("permission_error", { message: "You do not have write access" });
          return;
        }

        const roomUsers = getActiveUserMap(scriptId);
        const currentUser = roomUsers.get(String(socket.user?._id));
        const lockKey = buildLockKey(scriptId, sectionRef);
        const existingLock = sectionLocks.get(lockKey);

        if (existingLock && String(existingLock.userId) !== String(socket.user?._id)) {
          socket.emit("section_locked", {
            sectionRef,
            lockedBy: getLockOwnerName(scriptId, sectionRef),
          });
          return;
        }

        if (!existingLock) {
          sectionLocks.set(lockKey, {
            scriptId,
            sectionRef,
            userId: String(socket.user?._id),
            name: currentUser?.name || "Collaborator",
          });
          socket.data.ownedLocks.add(lockKey);

          socket.emit("section_lock_acquired", { sectionRef });
          socket.to(`script:${scriptId}`).emit("section_locked", {
            sectionRef,
            lockedBy: currentUser?.name || "Collaborator",
          });
        }

        socket.to(`script:${scriptId}`).emit("content_updated", {
          userId: String(socket.user?._id),
          delta: payload.delta,
          sectionRef,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to process content change." });
      }
    });

    socket.on("typing_start", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sectionRef = String(payload.sectionRef || "").trim();
      if (!scriptId || !sectionRef) return;

      const currentUser = getActiveUserMap(scriptId).get(String(socket.user?._id));
      socket.to(`script:${scriptId}`).emit("user_typing", {
        userId: String(socket.user?._id),
        name: currentUser?.name || "Collaborator",
        sectionRef,
      });
    });

    socket.on("typing_stop", (payload = {}) => {
      const scriptId = String(payload.scriptId || "").trim();
      const sectionRef = String(payload.sectionRef || "").trim();
      if (!scriptId || !sectionRef) return;

      const lockKey = buildLockKey(scriptId, sectionRef);
      const existingLock = sectionLocks.get(lockKey);
      if (existingLock && String(existingLock.userId) === String(socket.user?._id)) {
        sectionLocks.delete(lockKey);
        socket.data.ownedLocks?.delete(lockKey);
        io.to(`script:${scriptId}`).emit("section_unlocked", { sectionRef });
      }

      socket.to(`script:${scriptId}`).emit("user_stopped_typing", {
        userId: String(socket.user?._id),
        sectionRef,
      });
    });

    socket.on("disconnect", () => {
      const joinedScripts = socket.data?.joinedScripts || new Set();
      [...joinedScripts].forEach((scriptId) => {
        getActiveUserMap(scriptId).delete(String(socket.user?._id));
        releaseOwnedLocks(io, socket, scriptId);
        io.to(`script:${scriptId}`).emit("user_left", {
          userId: String(socket.user?._id),
        });
      });
    });
  });
};
