const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();

const normalizeId = (value = "") => String(value || "").trim();

export const isWriterProfileRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "writer" || normalizedRole === "creator";
};

export const isSameProfile = (viewer, profile) => {
  const viewerId = normalizeId(viewer?._id || viewer?.id);
  const profileId = normalizeId(profile?._id || profile?.id);
  return Boolean(viewerId && profileId && viewerId === profileId);
};

export const getSharedProfileExperience = (viewer) => (
  normalizeId(viewer?._id || viewer?.id) ? "authenticated" : "public"
);

/*
 * `getAuthenticatedProfileShell` used to live here. It has been removed rather
 * than kept, because it decided which application chrome wraps a profile and
 * that decision now belongs to layouts/app-shell/shellPolicy — the one place
 * that maps every role in the User model.
 *
 * Keeping it would have been worse than deleting it: it answered "producer" with
 * `{ layout: "main" }`, which stopped being true the moment the industry
 * audience moved onto the app shell. Two sources of truth that disagree is the
 * exact failure this refactor set out to remove.
 *
 * What stays here is genuinely about profiles: `isWriterProfileRole` decides how
 * the profile CONTENT is presented (whose profile is being viewed), which is a
 * different question from which chrome surrounds it (who is viewing).
 */

export const createLatestProfileRequestCoordinator = () => {
  let sequence = 0;
  let activeController = null;

  return {
    begin() {
      activeController?.abort();
      activeController = new AbortController();
      sequence += 1;
      return { requestId: sequence, controller: activeController };
    },
    isCurrent(requestId) {
      return requestId === sequence;
    },
    finish(requestId) {
      if (requestId === sequence) activeController = null;
    },
    cancel() {
      activeController?.abort();
      activeController = null;
      sequence += 1;
    },
  };
};
