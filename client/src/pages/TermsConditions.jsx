import { Navigate, useLocation } from "react-router-dom";

export default function TermsConditions() {
  const location = useLocation();
  // Preserve any search params if needed, but since we unified, we just redirect.
  return <Navigate to={`/terms-of-service${location.search}`} replace />;
}

