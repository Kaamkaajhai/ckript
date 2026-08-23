import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { isFilmIndustryProfessionalRole } from "../utils/industryAccess";

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
export const SCRIPT_BOOKMARK_SOURCE = Object.freeze({
  FAVORITES: "favorites",
  WATCHLIST: "watchlist",
});

const toId = (item) => String(typeof item === "string" ? item : item?._id || "");

export const getScriptBookmarkSource = (user) => isFilmIndustryProfessionalRole(user)
  ? SCRIPT_BOOKMARK_SOURCE.WATCHLIST
  : SCRIPT_BOOKMARK_SOURCE.FAVORITES;

export const readScriptBookmarkIds = (user, source = getScriptBookmarkSource(user)) => {
  const items = source === SCRIPT_BOOKMARK_SOURCE.WATCHLIST
    ? user?.industryProfile?.savedScripts
    : user?.favoriteScripts;
  return Array.isArray(items) ? items.map(toId).filter(Boolean) : [];
};

export const updateScriptBookmarkViewer = (user, scriptId, bookmarked, source) => {
  if (!user) return user;
  const id = String(scriptId || "");
  const currentIds = readScriptBookmarkIds(user, source);
  const nextIds = bookmarked
    ? Array.from(new Set([...currentIds, id])).filter(Boolean)
    : currentIds.filter((item) => item !== id);
  if (source === SCRIPT_BOOKMARK_SOURCE.WATCHLIST) {
    return {
      ...user,
      industryProfile: { ...(user.industryProfile || {}), savedScripts: nextIds },
    };
  }
  return { ...user, favoriteScripts: nextIds };
};

export async function requestScriptBookmark({ scriptId, bookmarked, source }) {
  if (source === SCRIPT_BOOKMARK_SOURCE.WATCHLIST) {
    const operation = bookmarked ? "remove" : "add";
    const { data } = await api.post(`/users/watchlist/${operation}`, { scriptId });
    return Boolean(data?.saved);
  }
  const { data } = await api.post(`/scripts/${scriptId}/favorite`);
  return Boolean(data?.favorited);
}

export const useScriptBookmark = (project) => {
  const { user, setUser } = useContext(AuthContext);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pending, setPending] = useState(false);

  const scriptId = project?._id;
  const source = getScriptBookmarkSource(user);
  const savedItems = source === SCRIPT_BOOKMARK_SOURCE.WATCHLIST
    ? user?.industryProfile?.savedScripts
    : user?.favoriteScripts;
  const canBookmark = Boolean(user?._id && scriptId && project?.creator?._id !== user._id);

  useEffect(() => {
    if (!scriptId || !Array.isArray(savedItems)) {
      setIsBookmarked(false);
      return;
    }
    setIsBookmarked(savedItems.some((item) => toId(item) === String(scriptId)));
  }, [savedItems, scriptId]);

  const toggleBookmark = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canBookmark || pending) return;

    setPending(true);
    try {
      const nextBookmarked = await requestScriptBookmark({ scriptId, bookmarked: isBookmarked, source });
      setIsBookmarked(nextBookmarked);

      setUser((prev) => {
        const updatedUser = updateScriptBookmarkViewer(prev, scriptId, nextBookmarked, source);
        try { localStorage.setItem("user", JSON.stringify(updatedUser)); } catch { /* memory state remains authoritative */ }
        return updatedUser;
      });

      window.dispatchEvent(new CustomEvent("bookmarkUpdated", {
        detail: { scriptId, bookmarked: nextBookmarked, source },
      }));
    } catch {
      // A failed toggle leaves the previous state showing rather than lying
      // about a save that did not happen.
    } finally {
      setPending(false);
    }
  }, [canBookmark, isBookmarked, pending, scriptId, setUser, source]);

  return { isBookmarked, canBookmark, pending, toggleBookmark };
};

export default useScriptBookmark;
