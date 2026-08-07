import { useEffect, useState } from "react";
import { hasConsent } from "./storage";

/*
 * Live tracking-consent state. Consent can change at any moment — the banner
 * updates it in this tab (`ckript-consent-updated`) and another tab updates it
 * through `storage` — so every tracker must react rather than read once at
 * mount. Extracted from AnalyticsBootstrap so the mobile trackers observe
 * exactly the same signal instead of sampling consent on their own.
 */
export const useAnalyticsConsent = () => {
  const [enabled, setEnabled] = useState(() => hasConsent());

  useEffect(() => {
    const onConsentChange = () => setEnabled(hasConsent());

    window.addEventListener("ckript-consent-updated", onConsentChange);
    window.addEventListener("storage", onConsentChange);

    return () => {
      window.removeEventListener("ckript-consent-updated", onConsentChange);
      window.removeEventListener("storage", onConsentChange);
    };
  }, []);

  return enabled;
};

export default useAnalyticsConsent;
