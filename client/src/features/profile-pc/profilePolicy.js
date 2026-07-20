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

/**
 * The viewer's role controls which existing application chrome surrounds a
 * profile, but every profile uses an edge-to-edge content mount. The viewed
 * user's role controls the profile presentation inside that mount.
 */
export const getAuthenticatedProfileShell = (viewerRole) => (
  isWriterProfileRole(viewerRole)
    ? { layout: "dashboard", contentVariant: "fill" }
    : { layout: "main", contentVariant: "full" }
);

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
