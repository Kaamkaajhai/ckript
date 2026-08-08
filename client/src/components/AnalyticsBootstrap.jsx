import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useAnalyticsConsent } from "../tracking/useAnalyticsConsent";
import { useClickTracking } from "../tracking/useClickTracking";
import { usePageTracking } from "../tracking/usePageTracking";

const AnalyticsBootstrap = () => {
  const { user } = useContext(AuthContext);
  const enabled = useAnalyticsConsent();

  usePageTracking({ user: enabled ? user : null, enabled });
  useClickTracking({ user: enabled ? user : null, enabled });

  return null;
};

export default AnalyticsBootstrap;
