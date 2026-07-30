/*
 * useShellIdentity — everything the chrome needs to render "who am I".
 *
 * The avatar URL normalisation below existed in THREE places, copy-pasted
 * verbatim: MainLayout, the dashboard shell, and components/Sidebar. All three
 * had to agree on how to turn a stored `profileImage` into a loadable URL
 * (Windows backslashes, absolute vs relative, the API origin, the trailing
 * "/api" that must be stripped), and any fix had to be made three times.
 *
 * It also owns the broken-image fallback, which the copies got subtly wrong:
 * two of them stored a boolean, so once an avatar failed the initials stuck even
 * after the user uploaded a new picture. Keying the failure to the URL means a
 * new URL is retried automatically.
 */
import { useCallback, useMemo, useState } from "react";
import { getProfileCanonicalPath } from "../../../utils/profilePath";

/*
 * The API origin without its "/api" suffix — uploads are served from the origin,
 * not from under the API prefix.
 */
const getUploadOrigin = () =>
  (import.meta.env.VITE_API_URL || "http://localhost:5002")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

/**
 * Turn whatever is stored on the user into a URL a browser can load.
 * Exported so tests can pin the behaviour without mounting a component.
 */
export const resolveAvatarUrl = (user) => {
  const raw = user?.profileImage || user?.profilePicture || "";
  if (typeof raw !== "string") return "";

  // Stored paths sometimes carry Windows separators from older uploads.
  const normalized = raw.trim().replace(/\\/g, "/");
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const origin = getUploadOrigin();
  return `${origin}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
};

/** "Ada Lovelace" → "AL". Falls back to "U" so the avatar is never blank. */
export const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.map((part) => part[0]).join("").toUpperCase().slice(0, 2);
};

/**
 * @param {Object} user  the authenticated user
 * @returns {{
 *   avatarUrl: string,
 *   avatarFailed: boolean,
 *   onAvatarError: () => void,
 *   initials: string,
 *   displayName: string,
 *   profilePath: string,
 * }}
 */
export function useShellIdentity(user) {
  /*
   * Remember WHICH url failed, not merely that one did. A boolean would keep
   * showing initials after the user replaces a broken picture, because nothing
   * ever resets it.
   */
  const [failedUrl, setFailedUrl] = useState("");

  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);

  const onAvatarError = useCallback(() => {
    setFailedUrl(avatarUrl);
  }, [avatarUrl]);

  const profilePath = useMemo(
    () => getProfileCanonicalPath(user, { viewerId: user?._id, viewerRole: user?.role }),
    [user],
  );

  return {
    avatarUrl,
    avatarFailed: Boolean(avatarUrl) && failedUrl === avatarUrl,
    onAvatarError,
    initials: getInitials(user?.name),
    displayName: user?.name || "User",
    profilePath,
  };
}

export default useShellIdentity;
