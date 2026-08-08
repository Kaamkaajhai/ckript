// Walked backwards from the end, not `/\/+$/`. That regex is quadratic on a hostile value: the
// engine tries every one of n slashes as a start position, matches the run to the end from each one,
// fails the "$" when a non-slash follows, and backtracks. The value here is a client-supplied Origin
// header, so a long enough run of slashes is a free CPU burn. This pass touches each character once.
const trimTrailingSlash = (value = "") => {
  const text = String(value || "");
  let end = text.length;
  while (end > 0 && text[end - 1] === "/") end -= 1;
  return text.slice(0, end);
};

const normalizeHeadingSegment = (value = "") =>
  String(value || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeUsernameSegment = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "");

const resolveClientBaseUrl = (req) => {
  const configured = trimTrailingSlash(process.env.CLIENT_URL || "");
  if (configured) return configured;

  const originHeader = trimTrailingSlash(req.get("origin") || "");
  if (originHeader) return originHeader;

  const host = req.get("host");
  if (host) {
    const protocol = req.protocol || "https";
    return `${protocol}://${host}`;
  }

  return "http://localhost:5173";
};

const getProfilePathByRole = (role, id, username = "") => {
  const normalizedRole = String(role || "").toLowerCase();
  const normalizedUsername = normalizeUsernameSegment(username);
  const profileId = String(id || "").trim();
  const profileKey = normalizedUsername || profileId;
  if (!profileKey) return "/";

  if (normalizedRole === "reader") return `/share/profile/${encodeURIComponent(profileKey)}`;

  return `/share/profile/${encodeURIComponent(profileKey)}`;
};

export const buildUserCanonicalPath = (user = {}) => {
  const username = normalizeUsernameSegment(user?.writerProfile?.username || user?.username || "");
  const userId = String(user?._id || user?.id || "").trim();

  if (username) {
    return `/${encodeURIComponent(username)}`;
  }

  return userId ? `/profile/${encodeURIComponent(userId)}` : "/profile";
};

export const buildScriptCanonicalPath = (script = {}) => {
  const scriptId = String(script?._id || script?.id || "").trim();
  const projectHeading = normalizeHeadingSegment(script?.title || script?.projectHeading || "");
  const writerUsername = normalizeUsernameSegment(
    script?.creator?.writerProfile?.username ||
      script?.creator?.username ||
      script?.writerUsername ||
      script?.creatorUsername ||
      ""
  );

  if (projectHeading && writerUsername) {
    return `/${encodeURIComponent(projectHeading)}/${encodeURIComponent(writerUsername)}`;
  }

  return scriptId ? `/script/${encodeURIComponent(scriptId)}` : "/script";
};

export const buildUserShareMeta = (req, user = {}) => {
  const baseUrl = resolveClientBaseUrl(req);
  const username = user?.writerProfile?.username || user?.username || "";
  const path = getProfilePathByRole(user.role, user._id, username);
  const url = `${baseUrl}${path}`;
  const name = user.name || "Ckript User";
  const roleLabel = String(user.role || "member").toLowerCase();

  return {
    url,
    title: `${name} | Ckript`,
    text: `Check out ${name}'s ${roleLabel} profile on Ckript.`,
  };
};

export const buildScriptShareMeta = (req, script = {}) => {
  const baseUrl = resolveClientBaseUrl(req);
  const scriptId = String(script._id || "").trim();
  const url = `${baseUrl}${scriptId ? `/share/project/${scriptId}` : "/"}`;
  const title = script.title || "Project";
  const genre = script.primaryGenre || script.genre;
  const logline = script.logline || script.synopsis || script.description || "Explore this project on Ckript.";

  return {
    url,
    title: `${title} | Ckript`,
    text: genre ? `${title} (${genre}) - ${logline}` : `${title} - ${logline}`,
  };
};
