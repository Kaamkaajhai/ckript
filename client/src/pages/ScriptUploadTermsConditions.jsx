import { Navigate, useLocation } from "react-router-dom";

export default function ScriptUploadTermsConditions() {
  const location = useLocation();
  return <Navigate to={`/terms-of-service${location.search}`} replace />;
}
