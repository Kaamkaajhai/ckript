import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.appId
    && firebaseConfig.measurementId
);

let analyticsPromise = null;

const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const getAnalyticsInstance = async () => {
  if (isLocalhost) return null;
  if (!hasFirebaseConfig || typeof window === "undefined") return null;
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    try {
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const analytics = getAnalytics(app);
      
      // Force analytics to initialize safely in the background
      // If it fails (e.g. invalid API key), we catch the unhandled rejection
      // so it doesn't crash React or Vite's error overlay.
      return analytics;
    } catch (error) {
      console.warn("Firebase tracking initialization failed:", error);
      return null;
    }
  })();

  // Attach a catch handler to the promise itself to prevent unhandled rejections
  analyticsPromise.catch(() => null);

  return analyticsPromise;
};

const sanitizeEventName = (name) => {
  const normalized = String(name || "custom_event")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  return normalized || "custom_event";
};

const sanitizeParams = (params = {}) => {
  const output = {};

  Object.entries(params).forEach(([key, value]) => {
    const safeKey = String(key || "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
    if (!safeKey) return;

    if (value === undefined || value === null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[safeKey] = typeof value === "string" ? value.slice(0, 100) : value;
      return;
    }

    output[safeKey] = JSON.stringify(value).slice(0, 100);
  });

  return output;
};

export const trackFirebaseEvent = async (eventName, params = {}) => {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return false;

  try {
    logEvent(analytics, sanitizeEventName(eventName), sanitizeParams(params));
    return true;
  } catch {
    return false;
  }
};

export const getFirebaseTrackingStatus = () => ({
  enabled: hasFirebaseConfig,
  projectId: firebaseConfig.projectId || "",
});
