import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import ToastProvider from "./components/feedback/ToastProvider";
import Skeleton from "./components/Skeleton";
import MobileRoutes from "./routes/MobileRoutes";
import useClock from "./hooks/useClock";
import "./theme/tokens.css";
import "./theme/base.css";
import "./theme/primitives.css";
import "./MobileApp.css";

/*
 * MobileApp — the root of the separate mobile experience. It is mounted (by
 * App.jsx) only for a signed-in creator on a phone-sized viewport, and fully
 * replaces the desktop chrome with a native-feeling app shell:
 *
 *   • a full-viewport frame that owns its own scroll,
 *   • a brief load skeleton for a deliberate first paint,
 *   • the toast layer every screen raises transient messages through,
 *   • and the Dashboard — the one screen built for mobile so far.
 *
 * It derives display identity (initials / name) from the auth user and wires
 * the real logout, so nothing here is faked once mounted on a real account.
 */

function initialsFrom(user) {
  const source = user?.name || user?.fullName || user?.username || user?.email || "";
  const parts = String(source).trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "CK";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(user) {
  const source = user?.name || user?.fullName || user?.username || "";
  return String(source).trim().split(/\s+/)[0] || "";
}

export default function MobileApp({ preview = false, devScreen = null }) {
  const { user, logout } = useContext(AuthContext);
  const time = useClock();
  // A development harness is opened to be looked at, not to be introduced —
  // it skips the boot skeleton so a resize/reload lands straight on the work.
  const [booting, setBooting] = useState(!devScreen);

  const initials = useMemo(() => initialsFrom(user), [user]);
  const userName = useMemo(() => firstName(user), [user]);

  // Brief boot skeleton — long enough to read as an intentional load, short
  // enough to never feel like a stall.
  useEffect(() => {
    if (devScreen) return undefined;
    const t = setTimeout(() => setBooting(false), 650);
    return () => clearTimeout(t);
  }, [devScreen]);

  // Give the browser chrome (address bar / status bar) the app's dark nav
  // colour while mounted, then restore it on unmount for the desktop app.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content");
    if (meta) meta.setAttribute("content", "#0f0f0f");
    document.documentElement.classList.add("ckm-html-lock");
    return () => {
      if (meta && previous != null) meta.setAttribute("content", previous);
      document.documentElement.classList.remove("ckm-html-lock");
    };
  }, []);

  return (
    <div className="ckm">
      <div className="ckm-root">
        {/* One transient-message surface, app-wide. The dashboard-era
            DynamicIsland that used to sit beside this was retired on
            2026-08-07 with its last caller, `notify.desktopOnly()` — §2.8
            requires that call to be gone by completion, and §13 forbids two
            competing transient surfaces in the meantime. */}
        <ToastProvider>
          {booting ? (
            <Skeleton time={time} />
          ) : (
            <MobileRoutes
              time={time}
              initials={initials}
              userName={userName}
              onLogout={() => logout()}
              user={user}
              preview={preview}
              devScreen={devScreen}
            />
          )}
        </ToastProvider>
      </div>
    </div>
  );
}
