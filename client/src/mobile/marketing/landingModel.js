import { getAudience, isKnownRole, AUDIENCE } from "../../layouts/app-shell/shellPolicy";
import { getDefaultAuthenticatedPath } from "../../routing/audienceTransitions";

const normalizeRole = (user) => String(user?.role || "").trim().toLowerCase();

export function landingAccountPath(user) {
  return user ? getDefaultAuthenticatedPath(user) : "";
}

export function landingDiscoveryPath(user) {
  if (!user) return "";
  const role = normalizeRole(user);
  if (!isKnownRole(role) || role === "finance") return getDefaultAuthenticatedPath(user);

  switch (getAudience(role)) {
    case AUDIENCE.READER:
      return "/reader/search";
    case AUDIENCE.ADMIN:
      return "/admin";
    case AUDIENCE.WRITER:
    case AUDIENCE.INDUSTRY:
    default:
      return "/featured";
  }
}

export function landingWriterPath(user) {
  if (!user) return "";
  return getAudience(normalizeRole(user)) === AUDIENCE.WRITER
    ? "/new-project"
    : getDefaultAuthenticatedPath(user);
}

export function landingActionLabels(user) {
  if (!user) {
    return {
      account: "Sign in",
      discovery: "Browse scripts",
      writer: "Start with your script",
    };
  }

  return {
    account: "Open app",
    discovery: getAudience(normalizeRole(user)) === AUDIENCE.READER ? "Discover stories" : "See featured scripts",
    writer: getAudience(normalizeRole(user)) === AUDIENCE.WRITER ? "Create a project" : "Open your workspace",
  };
}
