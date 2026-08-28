/*
 * The authenticated project-detail DATA LAYER, shared by the desktop workbench and the native
 * mobile screen (D28).
 *
 * WHY IT IS SHARED
 * ----------------
 * Three URLs mount this surface — `/script/:id`, `/script/:projectHeading/:writerUsername` and the
 * root-level `/:projectHeading/:writerUsername` — and all three resolve to one payload contract:
 * `getScriptByPath` looks the path up and then calls `getScriptById` directly. There is one
 * endpoint choice, one canonicalization rule, one three-way failure split (blocked / not found /
 * unavailable) and one bookmark write. Copying those into a mobile screen would create a second
 * definition of "which URL do I call and what does a 403 mean here", which is the mistake §5.4
 * exists to prevent — and which the D25 inventory already flagged for this family in particular:
 * "the mobile presentation must consume that controller/model, not fork endpoint logic".
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * Purchase requests, reviews, contact reveals, meetings, exports, AI-trailer purchase and owner
 * edit/delete. They stay in `ScriptDetail.jsx` until the native screen actually grows them (D29),
 * because a "shared" module that only one platform calls is not shared, it is relocated.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "../../services/api";
import useScriptBookmark from "../../hooks/useScriptBookmark";
import { getScriptCanonicalPath } from "../../utils/scriptPath";

export const PROJECT_DETAIL_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  /** The server answered, and the answer is "not for you" — a plan/business-email gate, not a failure. */
  BLOCKED: "blocked",
  ERROR: "error",
});

/**
 * Which endpoint answers for this URL.
 *
 * The two-segment forms carry no id, so they resolve by path; `/script/:id` resolves by id. Both
 * segments are encoded because a project heading is writer-authored text.
 */
export const buildProjectDetailEndpoint = ({ id, projectHeading, writerUsername } = {}) => {
  if (projectHeading && writerUsername) {
    return `/scripts/path/${encodeURIComponent(projectHeading)}/${encodeURIComponent(writerUsername)}`;
  }
  return `/scripts/${id}`;
};

/**
 * Classify a failed detail load.
 *
 * The distinction that matters is BLOCKED vs ERROR: a 403 here is a product state with its own
 * screen (sign up with a business email, or buy the plan), while anything else is a failure the
 * viewer should be offered a retry for. Retrying a 403 forever is the failure mode this prevents.
 *
 * The message sniffing is inherited rather than invented — some of these responses arrive with a
 * non-403 status and only the sentence identifies them.
 */
export const readAccessFailure = (error) => {
  const status = error?.response?.status;
  const raw = String(error?.response?.data?.message || "");
  const message = raw.toLowerCase();
  const blocked = status === 403
    || message.includes("company email")
    || message.includes("purchase a plan")
    || message.includes("login with a company")
    || message.includes("business email");

  if (blocked) {
    return {
      blocked: true,
      message: raw || "You need a business email or a plan to access this.",
      requiresBusinessEmail: Boolean(error?.response?.data?.requiresBusinessEmail),
    };
  }

  return {
    blocked: false,
    message: raw || "Unable to load this project right now.",
    requiresBusinessEmail: false,
    notFound: status === 404,
  };
};

/**
 * The viewer's bookmark ids, from whichever shape the account carries.
 *
 * `favoriteScripts` is sometimes a list of ids and sometimes a list of populated documents,
 * depending on which endpoint last wrote the cached user.
 */
export const readBookmarkIds = (user) => (Array.isArray(user?.favoriteScripts)
  ? user.favoriteScripts.map((item) => (typeof item === "string" ? item : item?._id)).filter(Boolean)
  : []);

export const isProjectBookmarked = (user, scriptId) => (
  Boolean(scriptId) && readBookmarkIds(user).some((item) => String(item) === String(scriptId))
);

/**
 * Load one project, keep the URL canonical, and own its bookmark.
 *
 * @param {string}   args.pathname       the current path, so canonicalization can no-op when the
 *                                       URL is already canonical
 * @param {function} args.onCanonicalPath called with the server's canonical path when the current
 *                                       URL is an alias. Each platform navigates its own way; this
 *                                       module does not import a router.
 */
export function useProjectDetail({
  id,
  projectHeading,
  writerUsername,
  user,
  // No `setUser`: the bookmark writes the account through useScriptBookmark, which reads
  // AuthContext itself. A second write path is what this extraction removed.
  pathname = "",
  onCanonicalPath,
  enabled = true,
} = {}) {
  const [script, setScript] = useState(null);
  const [loadedStatus, setLoadedStatus] = useState(
    enabled ? PROJECT_DETAIL_STATUS.LOADING : PROJECT_DETAIL_STATUS.READY
  );
  const [loadedFailure, setLoadedFailure] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [retryNonce, setRetryNonce] = useState(0);
  // A URL with neither an id nor a complete heading/username pair cannot be loaded at all. That is
  // a property of the arguments, not a result of a request, so it is derived here rather than
  // written into state from inside the effect.
  const paramsMissing = !id && !(projectHeading && writerUsername);

  // Read through refs inside the effect so a changing callback or path cannot re-fire the load.
  // The load is keyed on the three route params and the viewer, and on nothing else — a caller
  // that passes an inline arrow for `onCanonicalPath` (which every caller does) would otherwise
  // re-request the project on every render.
  //
  // Synced in an effect rather than assigned during render: assigning is what the codebase does
  // elsewhere, but it is a render side effect and the lint rule is right to refuse it. The layout
  // effect runs before the load effect below on the same commit, so the values are current by the
  // time the load reads them.
  const canonicalRef = useRef(onCanonicalPath);
  const pathnameRef = useRef(pathname);
  useLayoutEffect(() => {
    canonicalRef.current = onCanonicalPath;
    pathnameRef.current = pathname;
  });

  const viewerId = String(user?._id || user?.id || "");

  useEffect(() => {
    if (!enabled || paramsMissing) return undefined;

    // Desktop had no cancellation here: changing the URL raced two loads and the slower one won.
    const controller = new AbortController();

    (async () => {
      try {
        // Inside the async body, not the effect body: a synchronous setState in an effect forces
        // a second render pass before the browser has painted the first.
        setLoadedStatus(PROJECT_DETAIL_STATUS.LOADING);
        setLoadedFailure(null);
        const endpoint = buildProjectDetailEndpoint({ id, projectHeading, writerUsername });
        const { data } = await api.get(endpoint, { signal: controller.signal });
        if (controller.signal.aborted) return;

        setScript(data);
        setLoadedStatus(PROJECT_DETAIL_STATUS.READY);

        const canonicalPath = getScriptCanonicalPath(data || {});
        if (canonicalRef.current && canonicalPath && canonicalPath !== pathnameRef.current) {
          canonicalRef.current?.(canonicalPath);
        }

        // Similar projects are a secondary shelf: they settle on their own and their failure is
        // never the detail screen's failure.
        if (data?._id) {
          api.get(`/scripts/${data._id}/similar`, { signal: controller.signal })
            .then((response) => {
              if (!controller.signal.aborted) setSimilar(Array.isArray(response.data) ? response.data : []);
            })
            .catch(() => null);
        }
      } catch (cause) {
        if (controller.signal.aborted || cause?.code === "ERR_CANCELED") return;
        const classified = readAccessFailure(cause);
        setScript(null);
        setSimilar([]);
        setLoadedFailure(classified);
        setLoadedStatus(classified.blocked ? PROJECT_DETAIL_STATUS.BLOCKED : PROJECT_DETAIL_STATUS.ERROR);
      }
    })();

    return () => controller.abort();
  }, [enabled, id, projectHeading, writerUsername, viewerId, retryNonce, paramsMissing]);

  const status = paramsMissing ? PROJECT_DETAIL_STATUS.ERROR : loadedStatus;
  const failure = paramsMissing
    ? { blocked: false, message: "This project link is incomplete.", notFound: true }
    : loadedFailure;

  /*
   * The bookmark is NOT reimplemented here.
   *
   * `hooks/useScriptBookmark` already calls itself "the one implementation of star this project",
   * and it already owns the optimistic AuthContext update, the `localStorage` write and the
   * `bookmarkUpdated` event other mounted surfaces listen for. `ScriptDetail.jsx` nevertheless
   * carried a third, hand-rolled copy of all three — so the way to give the native screen a
   * bookmark was to delete that copy, not to write a fourth one here.
   */
  const bookmark = useScriptBookmark(script);

  const reload = useCallback(() => setRetryNonce((value) => value + 1), []);

  /**
   * Refresh in place, without dropping the rendered project.
   *
   * The socket handlers and the evaluation poll need "the same screen, newer data" — a silent
   * refresh that flipped the screen back to LOADING would blank a project the viewer is reading.
   */
  const refresh = useCallback(async () => {
    try {
      const endpoint = buildProjectDetailEndpoint({ id, projectHeading, writerUsername });
      const { data } = await api.get(endpoint);
      setScript(data);
      return data;
    } catch {
      return null;
    }
  }, [id, projectHeading, writerUsername]);

  return {
    script,
    setScript,
    status,
    failure,
    similar,
    isBookmarked: bookmark.isBookmarked,
    canBookmark: bookmark.canBookmark,
    bookmarkPending: bookmark.pending,
    toggleBookmark: bookmark.toggleBookmark,
    reload,
    refresh,
  };
}
