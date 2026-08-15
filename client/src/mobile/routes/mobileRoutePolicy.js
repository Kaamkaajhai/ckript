import { matchPath } from "react-router-dom";
import { getAudience } from "../../layouts/app-shell/shellPolicy";
import {
  MOBILE_ROUTE_DISPOSITIONS,
  MOBILE_ROUTE_DISPOSITION,
} from "./mobileRouteManifest";

export const MOBILE_EXPERIENCE = Object.freeze({
  MOBILE: "mobile",
  DESKTOP: "desktop",
});

const desktopDecision = (route, reason, disposition = route?.disposition) => ({
  experience: MOBILE_EXPERIENCE.DESKTOP,
  routeId: route?.id ?? null,
  screenId: null,
  disposition: disposition ?? null,
  reason,
});

export function findMobileRoute(pathname = "") {
  const normalizedPath = String(pathname || "/").split(/[?#]/, 1)[0] || "/";
  return MOBILE_ROUTE_DISPOSITIONS.find(({ pattern }) => (
    matchPath({ path: pattern, end: true, caseSensitive: false }, normalizedPath)
  )) ?? null;
}

/**
 * Decide whether the current canonical URL may replace the existing route tree
 * with a native-style mobile screen. A non-mobile decision always means
 * "render children" in RootExperience; it is never a redirect or dashboard
 * fallback.
 */
/**
 * Whether a route's declared query exclusion applies to the current URL.
 *
 * A route can be implemented for mobile in general and deliberately NOT
 * implemented for one entry mode — `/create-project?ctx=competition` replaces
 * the whole publish wizard with a competition deadline bar and a one-way
 * Submit, neither of which is ported. Without this the mobile screen would load
 * and a competition writer would have no way to submit their entry: worse than
 * the desktop page, not merely different from it.
 *
 * It lives in the manifest rather than inside the screen because the manifest is
 * the file that answers "what does mobile cover?", and an exception hidden in a
 * component is an exception nobody finds.
 */
function isQueryExcluded(route, search) {
  if (!route?.excludeQuery) return false;
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  return Object.entries(route.excludeQuery).every(([key, value]) => params.get(key) === value);
}

export function resolveMobileExperience({
  isMobile = false,
  authLoading = false,
  user = null,
  pathname = "/",
  search = "",
  isDev = false,
} = {}) {
  const route = findMobileRoute(pathname);

  if (!route) return desktopDecision(null, "unregistered-route", null);
  if (!isMobile) return desktopDecision(route, "viewport");
  if (authLoading) return desktopDecision(route, "auth-loading");

  if (route.disposition === MOBILE_ROUTE_DISPOSITION.DEV_ONLY) {
    // Development fixtures are ordinary App.jsx routes that mount MobileApp
    // with their own deterministic context. RootExperience must not intercept
    // them or it would replace that fixture context with the live account.
    return desktopDecision(route, isDev ? "dev-route-owned" : "dev-only");
  }

  if (
    route.disposition !== MOBILE_ROUTE_DISPOSITION.SCREEN
    && route.disposition !== MOBILE_ROUTE_DISPOSITION.SHARED_PUBLIC_SCREEN
  ) {
    return desktopDecision(route, route.disposition);
  }

  if (isQueryExcluded(route, search)) {
    return desktopDecision(route, route.excludeReason || "query-excluded", route.fallbackDisposition);
  }

  if (route.protection === "authenticated" && !user) {
    return desktopDecision(route, "authentication-required", route.fallbackDisposition);
  }

  const audience = getAudience(user?.role);
  if (route.audiences?.length && !route.audiences.includes(audience)) {
    return desktopDecision(route, "audience-not-implemented", route.fallbackDisposition);
  }

  return {
    experience: MOBILE_EXPERIENCE.MOBILE,
    routeId: route.id,
    screenId: route.screenId,
    disposition: route.disposition,
    reason: "implemented-screen",
  };
}
