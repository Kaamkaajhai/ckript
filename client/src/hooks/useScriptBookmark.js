import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

/*
 * useScriptBookmark — the one implementation of "star this project".
 *
 * Extracted from components/ProjectCard so the investor desk's lead story and
 * shelf cards toggle favourites through exactly the same call, the same
 * optimistic AuthContext update and the same `bookmarkUpdated` event other
 * surfaces already listen for, instead of a second copy that can drift.
 *
 * A member cannot bookmark their own project, and a signed-out visitor cannot
 * bookmark at all — `canBookmark` reports that so callers can hide the control.
 */
const toId = (item) => (typeof item === "string" ? item : item?._id);

export const useScriptBookmark = (project) => {
  const { user, setUser } = useContext(AuthContext);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pending, setPending] = useState(false);

  const scriptId = project?._id;
  const canBookmark = Boolean(user?._id && scriptId && project?.creator?._id !== user._id);

  useEffect(() => {
    const ids = user?.favoriteScripts;
    if (!scriptId || !Array.isArray(ids)) {
      setIsBookmarked(false);
      return;
    }
    setIsBookmarked(ids.some((item) => toId(item) === scriptId));
  }, [user?.favoriteScripts, scriptId]);

  const toggleBookmark = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canBookmark || pending) return;

    setPending(true);
    try {
      const { data } = await api.post(`/scripts/${scriptId}/favorite`);
      const nextFavorited = Boolean(data?.favorited);
      setIsBookmarked(nextFavorited);

      setUser((prev) => {
        if (!prev) return prev;
        const currentIds = Array.isArray(prev.favoriteScripts)
          ? prev.favoriteScripts.map(toId).filter(Boolean)
          : [];
        const updatedIds = nextFavorited
          ? Array.from(new Set([...currentIds, scriptId]))
          : currentIds.filter((item) => item !== scriptId);
        const updatedUser = { ...prev, favoriteScripts: updatedIds };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });

      window.dispatchEvent(new CustomEvent("bookmarkUpdated", {
        detail: { scriptId, bookmarked: nextFavorited },
      }));
    } catch {
      // A failed toggle leaves the previous state showing rather than lying
      // about a save that did not happen.
    } finally {
      setPending(false);
    }
  }, [canBookmark, pending, scriptId, setUser]);

  return { isBookmarked, canBookmark, pending, toggleBookmark };
};

export default useScriptBookmark;
