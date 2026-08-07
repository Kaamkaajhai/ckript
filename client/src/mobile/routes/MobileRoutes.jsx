import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import MobileRouteBoundary from "../shell/MobileRouteBoundary";

const Dashboard = lazy(() => import("../screens/Dashboard"));
const PrimitiveGallery = lazy(() => import("../dev/PrimitiveGallery"));

/*
 * MobileRoutes lives inside the app's one existing BrowserRouter. Canonical
 * URLs select mobile screens exactly as they select desktop pages, so refresh,
 * deep links and browser history remain truthful. RootExperience only mounts
 * MobileApp for routes that the policy marks implemented.
 *
 * Every screen mounts through MobileRouteBoundary: one route-level pending
 * state while its chunk loads, and one recoverable failure surface if it
 * throws — a broken screen never blanks the app or leaks into the next URL.
 */
export default function MobileRoutes({
  time,
  initials,
  userName,
  onLogout,
  user,
  preview = false,
  devScreen = null,
}) {
  const dashboard = (
    <Dashboard
      time={time}
      initials={initials}
      userName={userName}
      onLogout={onLogout}
      user={user}
      preview={preview}
    />
  );

  // App.jsx's development-only routes already own their exact path, so a
  // nested <Routes> below them would never match. Render the requested dev
  // surface directly instead — production never reaches this branch.
  if (devScreen === "primitives") {
    return <MobileRouteBoundary><PrimitiveGallery /></MobileRouteBoundary>;
  }

  if (preview) {
    return <MobileRouteBoundary>{dashboard}</MobileRouteBoundary>;
  }

  return (
    <MobileRouteBoundary>
      <Routes>
        <Route path="/dashboard" element={dashboard} />
        {/* Defensive no-op: policy prevents this branch from mounting for an
            unfinished route, and it must never substitute Dashboard. */}
        <Route path="*" element={null} />
      </Routes>
    </MobileRouteBoundary>
  );
}
