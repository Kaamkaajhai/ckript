import { useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getProfileCanonicalPath } from "../../utils/profilePath";
import { buildMobileNav, resolveActiveTabKey } from "../navigation/mobileNav";

/*
 * useMobileNav — the one place mobile chrome asks "who is this and where are
 * they?". AppBar and NavBar both call it, so a screen never has to thread an
 * audience or an active-tab string through its props, and two pieces of chrome
 * can never disagree about which tab is current.
 *
 * `user` may be passed explicitly. That is not a convenience: the development
 * harness and the preview fixture mount deliberate, deterministic accounts, and
 * a hook that could only read the live AuthContext would render the signed-in
 * writer's bar in a fixture meant to show the producer's.
 *
 * The unread-messages badge is a PARAMETER, not something this hook fetches.
 * The count lives in `layouts/app-shell/hooks/useShellNotifications`, which owns
 * a socket and a 30s poll; standing a second copy of that session up here would
 * double the app's notification traffic for a phone that is already running the
 * first one. Wiring it is Phase 2's "wire real services" bullet, and until then
 * the badge is honestly absent rather than dishonestly zero-looking.
 */
export function useMobileNav({ user: userOverride, msgCount = 0 } = {}) {
  const auth = useContext(AuthContext);
  const user = userOverride ?? auth?.user ?? null;
  const { pathname } = useLocation();

  const profilePath = useMemo(
    () => getProfileCanonicalPath(user, { viewerId: user?._id, viewerRole: user?.role }),
    [user],
  );

  const nav = useMemo(
    () => buildMobileNav({ user, profilePath, msgCount }),
    [user, profilePath, msgCount],
  );

  const activeTabKey = useMemo(
    () => resolveActiveTabKey(nav.tabs, pathname),
    [nav.tabs, pathname],
  );

  return { ...nav, activeTabKey };
}

export default useMobileNav;
