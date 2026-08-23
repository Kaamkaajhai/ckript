import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RouteFallback from "../components/skeleton/RouteFallback";
import { resolveAudienceRouteAccess } from "./audienceTransitions";

export default function AudienceTransitionBoundary({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const access = resolveAudienceRouteAccess({
    pathname: location.pathname,
    user,
    authLoading: loading,
  });

  if (access.status === "loading") {
    return <RouteFallback label="Restoring your workspace…" />;
  }

  if (access.status === "audience-forbidden") {
    return (
      <Navigate
        to={access.redirectTo}
        replace
        state={{ audienceRedirectFrom: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
}
