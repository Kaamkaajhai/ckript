const normalizeOrigin = (value = "") => String(value).replace(/\/api\/?$/, "").replace(/\/$/, "");

export const getApiOrigin = () => {
  const envOrigin = normalizeOrigin(import.meta.env.VITE_API_URL || "");
  if (envOrigin) return envOrigin;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000";
    }
  }

  return "";
};

export const getApiBaseUrl = () => {
  const origin = getApiOrigin();
  return origin ? `${origin}/api` : "/api";
};

export const isSocketSupported = () => {
  const origin = getApiOrigin();
  // Vercel serverless functions do not natively support WebSockets
  if (origin.includes("vercel.app")) return false;
  return true;
};

