import { useCallback, useEffect, useRef, useState } from "react";
import { createCollabSync, colorForUser } from "../services/collabSync";

const HEARTBEAT_MS = 15000;

// Live presence + scene locks for a script, on top of the CollabSync boundary (never raw
// sockets). Returns the people in the room, the lock map, and a setActiveScene fn the editor
// calls as the caret moves — which also auto-acquires the focused scene's lock and releases
// the previous one (one editor per scene, §4).
export default function useScenePresence({ scriptId, enabled, user, canEdit = true }) {
  const [people, setPeople] = useState([]);
  const [locks, setLocks] = useState({});            // sceneId -> { holderId, holderName, color }
  const [myLockedScene, setMyLockedScene] = useState(null);
  const [editRequest, setEditRequest] = useState(null); // { sceneId, byName } — someone wants your scene
  const [commentsVersion, setCommentsVersion] = useState(0); // bumps on remote comment changes → refetch

  const syncRef = useRef(null);
  const activeSceneRef = useRef(null);
  const heldSceneRef = useRef(null);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const myUserId = user?._id ? String(user._id) : null;

  useEffect(() => {
    if (!enabled || !scriptId) {
      setPeople([]); setLocks({}); setMyLockedScene(null); setEditRequest(null);
      return undefined;
    }

    const sync = createCollabSync({ enabled: true });
    syncRef.current = sync;
    activeSceneRef.current = null;
    heldSceneRef.current = null;

    const offPresence = sync.onPresence((list) => {
      setPeople((Array.isArray(list) ? list : []).map((p) => ({ ...p, color: colorForUser(p.userId) })));
    });
    const offLocks = sync.onLockChange((map) => {
      const enriched = {};
      for (const [sceneId, lock] of Object.entries(map || {})) {
        enriched[sceneId] = { ...lock, color: colorForUser(lock.holderId) };
      }
      setLocks(enriched);
      // If a lock we thought we held is gone (expired/stolen-by-nobody), drop our held flag.
      if (heldSceneRef.current && !(enriched[heldSceneRef.current]?.holderId === myUserId)) {
        heldSceneRef.current = null;
        setMyLockedScene(null);
      }
    });
    const offEditReq = sync.onEditRequested((payload) => {
      // Only surface if it's for a scene we currently hold.
      if (payload?.sceneId && payload.sceneId === heldSceneRef.current) {
        setEditRequest({ sceneId: payload.sceneId, byName: payload.byName || "Someone" });
      }
    });
    const offComments = sync.onCommentsChanged(() => setCommentsVersion((v) => v + 1));
    // On reconnect, re-acquire the scene we were editing (reconcile, don't duplicate).
    const offReconnect = sync.onReconnect(() => {
      const scene = heldSceneRef.current || activeSceneRef.current;
      if (scene && canEditRef.current) sync.requestLock(scene);
    });

    sync.join(scriptId, user || null);

    return () => {
      offPresence?.(); offLocks?.(); offEditReq?.(); offComments?.(); offReconnect?.();
      sync.destroy();
      syncRef.current = null;
      setPeople([]); setLocks({}); setMyLockedScene(null); setEditRequest(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId, enabled, myUserId]);

  // Heartbeat the scene we hold so the server-side expiry backstop doesn't reclaim it.
  useEffect(() => {
    const id = setInterval(() => {
      if (heldSceneRef.current) syncRef.current?.heartbeat(heldSceneRef.current);
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  // Caret moved to a (possibly new) scene: update presence, release the old lock, request the new.
  const setActiveScene = useCallback(async (sceneId) => {
    const sync = syncRef.current;
    if (!sync) return;
    if (activeSceneRef.current === sceneId) return;

    activeSceneRef.current = sceneId;
    sync.setActiveScene(sceneId);

    if (heldSceneRef.current && heldSceneRef.current !== sceneId) {
      sync.releaseLock(heldSceneRef.current);
      heldSceneRef.current = null;
      setMyLockedScene(null);
    }
    setEditRequest(null);

    // Only writers acquire locks. Commenters/viewers just broadcast presence.
    if (sceneId && canEditRef.current) {
      const res = await sync.requestLock(sceneId);
      if (res?.granted && activeSceneRef.current === sceneId) {
        heldSceneRef.current = sceneId;
        setMyLockedScene(sceneId);
      }
    }
  }, []);

  const requestEdit = useCallback((sceneId) => syncRef.current?.requestEdit(sceneId), []);

  // Holder releases the scene (e.g., after a "Request edit").
  const releaseHeld = useCallback(() => {
    const scene = heldSceneRef.current;
    if (scene) {
      syncRef.current?.releaseLock(scene);
      heldSceneRef.current = null;
      setMyLockedScene(null);
      setEditRequest(null);
    }
  }, []);

  const clearEditRequest = useCallback(() => setEditRequest(null), []);

  return { people, locks, myUserId, myLockedScene, setActiveScene, requestEdit, releaseHeld, editRequest, clearEditRequest, commentsVersion };
}
