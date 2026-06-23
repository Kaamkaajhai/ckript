import { useEffect, useRef, useState, useContext } from "react";
import { io } from "socket.io-client";
import { getApiBaseUrl, isSocketSupported } from "../utils/apiOrigin";
import { AuthContext } from "../context/AuthContext";

const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");

export default function useCollabSocket(scriptId, enabled = true, options = {}) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [sectionLocks, setSectionLocks] = useState({});
  const socketRef = useRef(null);
  const callbacksRef = useRef(options);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!enabled || !scriptId || !user?.token || !isSocketSupported()) return undefined;

    const token = user.token;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_script", { scriptId });
    });

    socket.on("current_online_users", ({ users }) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socket.on("user_joined", (payload) => {
      setOnlineUsers((prev) => {
        const filtered = prev.filter((user) => user.userId !== payload.userId);
        return [...filtered, payload];
      });
    });

    socket.on("user_left", ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((user) => user.userId !== userId));
      setCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on("cursor_updated", ({ userId, name, position }) => {
      setCursors((prev) => ({ ...prev, [userId]: { name, position } }));
    });

    socket.on("section_locked", ({ sectionRef, lockedBy }) => {
      setSectionLocks((prev) => ({ ...prev, [sectionRef]: lockedBy }));
    });

    socket.on("section_unlocked", ({ sectionRef }) => {
      setSectionLocks((prev) => {
        const next = { ...prev };
        delete next[sectionRef];
        return next;
      });
    });

    socket.on("collaborator_removed", ({ userId }) => {
      const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?._id;
      if (currentUserId && currentUserId === userId) {
        window.location.href = `/script/${scriptId}`;
      }
    });

    socket.on("collab_membership_changed", (payload) => {
      callbacksRef.current?.onCollabMembershipChanged?.(payload);
    });

    socket.on("collab_request", (payload) => {
      callbacksRef.current?.onCollabRequest?.(payload);
    });

    socket.on("collab_request_responded", (payload) => {
      callbacksRef.current?.onCollabRequestResponded?.(payload);
    });

    socket.on("pr_raised", (payload) => {
      callbacksRef.current?.onPRRaised?.(payload);
    });

    socket.on("pr_updated", (payload) => {
      callbacksRef.current?.onPRUpdated?.(payload);
    });

    socket.on("pr_merged", (payload) => {
      callbacksRef.current?.onPRMerged?.(payload);
    });

    socket.on("pr_rejected", (payload) => {
      callbacksRef.current?.onPRRejected?.(payload);
    });

    socket.on("pr_reverted", (payload) => {
      callbacksRef.current?.onPRReverted?.(payload);
    });

    socket.on("editor_joined", (payload) => {
      callbacksRef.current?.onEditorJoined?.(payload);
    });

    socket.on("editor_left", (payload) => {
      callbacksRef.current?.onEditorLeft?.(payload);
    });

    return () => {
      socket.emit("leave_script", { scriptId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, scriptId]);

  return {
    onlineUsers,
    cursors,
    sectionLocks,
    emitCursorMove: (position) => socketRef.current?.emit("cursor_move", { scriptId, position }),
    emitContentChange: (delta, sectionRef) => socketRef.current?.emit("content_change", { scriptId, delta, sectionRef }),
    emitTypingStart: (sectionRef) => socketRef.current?.emit("typing_start", { scriptId, sectionRef }),
    emitTypingStop: (sectionRef) => socketRef.current?.emit("typing_stop", { scriptId, sectionRef }),
    emitEditorActive: (sId, name, avatar) => socketRef.current?.emit("editor_active", { scriptId: sId, name, avatar }),
    emitEditorInactive: (sId) => socketRef.current?.emit("editor_inactive", { scriptId: sId }),
  };
}
