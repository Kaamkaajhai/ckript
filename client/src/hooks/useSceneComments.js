import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

// Screenplay comments for a script. Fetches over REST; refetches whenever `refreshKey`
// changes (driven by the live "scene:comment:change" socket signal from useScenePresence),
// so a second user sees new comments/replies/resolves without reloading.
export default function useSceneComments({ scriptId, enabled, refreshKey }) {
  const [comments, setComments] = useState([]);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async () => {
    if (!enabled || !scriptId) return;
    try {
      const { data } = await api.get(`/scripts/${scriptId}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load comments.");
    }
  }, [scriptId, enabled]);

  useEffect(() => {
    if (!enabled || !scriptId) return undefined;
    // fetchComments is async — state is set after the await, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComments();
    return undefined;
  }, [fetchComments, refreshKey, enabled, scriptId]);

  const addComment = useCallback(async ({ anchor, body, parentId = null }) => {
    setError("");
    try {
      await api.post(`/scripts/${scriptId}/comments`, { anchor, body, parentId });
      await fetchComments();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not add comment.");
      return false;
    }
  }, [scriptId, fetchComments]);

  const setResolved = useCallback(async (commentId, resolved) => {
    try {
      await api.patch(`/scripts/${scriptId}/comments/${commentId}`, { resolved });
      await fetchComments();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update comment.");
    }
  }, [scriptId, fetchComments]);

  const deleteComment = useCallback(async (commentId) => {
    try {
      await api.delete(`/scripts/${scriptId}/comments/${commentId}`);
      await fetchComments();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete comment.");
    }
  }, [scriptId, fetchComments]);

  return { comments, error, addComment, setResolved, deleteComment, refetch: fetchComments };
}
