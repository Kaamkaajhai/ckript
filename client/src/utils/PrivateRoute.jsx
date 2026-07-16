import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const FORCE_DEFAULT_REDIRECT_KEY = "auth:force-default-redirect";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const destination = `${location.pathname}${location.search}${location.hash}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eef0f3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#111111] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // If this is an explicit logout, redirect to login without saving the current page.
    // Do NOT remove the key here — let Login.jsx consume it so it can skip the redirect.
    if (typeof window !== "undefined" && sessionStorage.getItem(FORCE_DEFAULT_REDIRECT_KEY) === "1") {
      return <Navigate to="/" replace />;
    }

    const pathname = String(location.pathname || "");
    const profileMatch = pathname.match(/^\/profile\/([^/?#]+)/i);
    if (profileMatch?.[1]) {
      return <Navigate to={`/share/profile/${profileMatch[1]}${location.search}${location.hash}`} replace />;
    }

    // Only convert old ID-based script links (/script/:id) to public share links.
    // Canonical script paths (/:projectHeading/:writerUsername) must go to login.
    const legacyScriptMatch = pathname.match(/^\/script\/([a-f0-9]{24})$/i);
    if (legacyScriptMatch?.[1]) {
      return <Navigate to={`/share/project/${legacyScriptMatch[1]}${location.search}${location.hash}`} replace />;
    }
  }

  return user ? children : <Navigate to="/" replace state={{ from: destination }} />;
};

export default PrivateRoute;
