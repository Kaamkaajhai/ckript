import { useCallback, useMemo, useRef, useState } from "react";
import useScenePresence from "../../../hooks/useScenePresence";
import useSceneComments from "../../../hooks/useSceneComments";
import { buildAnchor, resolveAnchor } from "../../../components/screenplay/commentAnchor";
import { getScenes, getSceneText, replaceSceneText, sceneIdAtLine } from "../../../components/screenplay/sceneIdentity";

/**
 * Owns the screenplay collaboration layer: live presence (who's here + which
 * scene), scene-anchored comments, and the derived presence/outline data the
 * UI renders. Wraps the useScenePresence + useSceneComments hooks and the
 * comment/caret action helpers, all keyed off a synchronous mirror of the
 * current Fountain text (screenplayValueRef) and the screenplay editor API.
 */
export function useScreenplayCollab({
  screenplayValue,
  setScreenplayValue,
  useScreenplayEditor,
  scriptId,
  user,
  canEditContent,
  screenplayApiRef,
  screenplayOutline,
  setError,
}) {
  const [focusedCommentId, setFocusedCommentId] = useState(null);

  // Synchronous mirror of the current Fountain text so the comment/caret callbacks
  // read the latest value without a stale closure. This render-phase ref write is
  // intentional (the callbacks below are memoized and must not re-create per keystroke).
  const screenplayValueRef = useRef(screenplayValue);
  // eslint-disable-next-line react-hooks/refs
  screenplayValueRef.current = screenplayValue;
  const presenceEnabled = useScreenplayEditor && Boolean(scriptId);

  // A co-writer's scene arrived — splice it into our copy. useScenePresence has already filtered out
  // our own echo and any scene we hold the lock on, so this can never overwrite what we're typing.
  const applyRemoteScene = useCallback(({ sceneId, text } = {}) => {
    const current = screenplayValueRef.current || "";
    const next = replaceSceneText(current, sceneId, text);
    if (next == null || next === current) return;
    // Keep the synchronous mirror in step so a save fired before re-render sends the merged text.
    screenplayValueRef.current = next;
    setScreenplayValue?.(next);
  }, [setScreenplayValue]);

  const {
    people: collabPeople,
    setActiveScene: collabSetActiveScene,
    locks: collabLocks,
    myUserId: collabMyUserId,
    myLockedScene: collabMyLockedScene,
    requestEdit: collabRequestEdit,
    releaseHeld: collabReleaseHeld,
    editRequest: collabEditRequest,
    clearEditRequest: collabClearEditRequest,
    commentsVersion: collabCommentsVersion,
    sendSceneContent,
  } = useScenePresence({
    scriptId,
    enabled: presenceEnabled,
    user,
    canEdit: canEditContent,
    onRemoteScene: applyRemoteScene,
  });

  // Local edit → stream the scene we hold to the other writers (throttled in the sync layer).
  const broadcastSceneEdit = useCallback((nextText) => {
    if (!presenceEnabled || !collabMyLockedScene) return;
    const sceneText = getSceneText(nextText, collabMyLockedScene);
    if (sceneText == null) return;
    sendSceneContent(collabMyLockedScene, sceneText);
  }, [presenceEnabled, collabMyLockedScene, sendSceneContent]);

  // Comments (Phase 3 — Slice 2); live-refreshes on the socket comment-change signal.
  const { comments: sceneComments, addComment: addSceneComment, setResolved: setCommentResolved, deleteComment: deleteSceneComment } =
    useSceneComments({ scriptId, enabled: presenceEnabled, refreshKey: collabCommentsVersion });

  // "Add comment" — anchor to either an explicit range (the inline line-comment composer passes the
  // clicked line's {from,to}) or, when none is given, the current editor selection (the rail flow).
  const handleAddComment = useCallback(async (body, range) => {
    const target = (range && Number.isFinite(range.from) && range.to > range.from)
      ? range
      : screenplayApiRef.current?.getSelection?.();
    if (!target || !(target.to > target.from)) { setError("Select some script text — or use the line comment icon — to comment on first."); return false; }
    const anchor = buildAnchor(screenplayValueRef.current, target.from, target.to);
    return addSceneComment({ anchor, body });
  }, [addSceneComment, screenplayApiRef, setError]);

  // Reply to a thread.
  const handleReplyComment = useCallback((parentId, body) => addSceneComment({ anchor: {}, body, parentId }), [addSceneComment]);

  // Click a comment in the rail → scroll to + flash its anchored text.
  const handleFocusComment = useCallback((comment) => {
    const r = comment?.anchor ? resolveAnchor(screenplayValueRef.current, comment.anchor) : null;
    if (r) screenplayApiRef.current?.scrollToRange?.(r.from, r.to);
    setFocusedCommentId(comment?._id || null);
  }, [screenplayApiRef]);

  // Is a comment's anchored text still present? (false → orphaned)
  const isCommentOrphaned = useCallback((comment) => {
    if (!comment?.anchor?.quote) return false;
    return resolveAnchor(screenplayValueRef.current, comment.anchor) == null;
  }, []);
  // As the caret moves, tell the sync layer which scene we're in (it debounces).
  const handleCaretLine = useCallback((line) => {
    collabSetActiveScene(sceneIdAtLine(screenplayValueRef.current, line));
  }, [collabSetActiveScene]);

  // Enrich presence for the UI: scene heading per person + people-by-scene for navigator dots.
  const presenceScenes = useMemo(() => getScenes(screenplayValue), [screenplayValue]);
  const peopleEnriched = useMemo(() => collabPeople.map((p) => {
    const scene = presenceScenes.find((s) => s.sceneId === p.activeSceneId);
    return { ...p, sceneHeading: scene ? scene.heading : "" };
  }), [collabPeople, presenceScenes]);
  const presenceBySceneId = useMemo(() => {
    const map = {};
    for (const p of collabPeople) {
      if (!p.activeSceneId) continue;
      (map[p.activeSceneId] = map[p.activeSceneId] || []).push(p);
    }
    return map;
  }, [collabPeople]);
  // Navigator outline with each scene's sceneId attached (for presence/lock dots).
  const outlineWithSceneIds = useMemo(() => {
    const resolve = (line) => {
      for (const s of presenceScenes) if (line >= s.startLine && line <= s.endLine) return s.sceneId;
      return presenceScenes[presenceScenes.length - 1]?.sceneId;
    };
    return screenplayOutline.map((item) => item.type === "scene" ? { ...item, sceneId: resolve(item.line) } : item);
  }, [screenplayOutline, presenceScenes]);

  return {
    screenplayValueRef,
    presenceEnabled,
    collabPeople,
    collabSetActiveScene,
    collabLocks,
    collabMyUserId,
    collabRequestEdit,
    collabReleaseHeld,
    collabEditRequest,
    collabClearEditRequest,
    collabCommentsVersion,
    collabMyLockedScene,
    broadcastSceneEdit,
    sceneComments,
    addSceneComment,
    setCommentResolved,
    deleteSceneComment,
    focusedCommentId,
    setFocusedCommentId,
    handleAddComment,
    handleReplyComment,
    handleFocusComment,
    isCommentOrphaned,
    handleCaretLine,
    presenceScenes,
    peopleEnriched,
    presenceBySceneId,
    outlineWithSceneIds,
  };
}
