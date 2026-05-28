let _env;
try {
  _env = import.meta.env || process.env;
} catch (e) {
  _env = process.env;
}

export const SITE_URL = (_env.VITE_SITE_URL || _env.SITE_URL || "https://ckript.com").replace(/\/$/, "");

export const appMeta = {
  appName: "Ckript",
  favicon: "/favicon.png",
  appleIcon: "/apple-touch-icon.png",
  manifest: "/site.webmanifest",
  themeColor: "#0f172a",
};

export const defaultSeo = {
  title: "Ckript – AI Script Discovery, Screenplay Analysis & Film Funding",
  description:
    "Discover scripts, generate AI concept trailers, connect with producers & investors using Ckript's AI-powered entertainment marketplace.",
  keywords: [
    "script",
    "screenplay",
    "AI trailer",
    "screenplay analysis",
    "script marketplace",
    "film funding",
    "filmmaking",
  ],
  image: `${SITE_URL}/ckript-logo-landscape-nobg.png`,
};

export const socialProfile = {
  twitterHandle: "@ckript",
  facebookAppId: "",
};

export const verificationTokens = {
  google: _env.VITE_GOOGLE_VERIFICATION || _env.GOOGLE_VERIFICATION || "",
  bing: _env.VITE_BING_VERIFICATION || _env.BING_VERIFICATION || "",
  yandex: _env.VITE_YANDEX_VERIFICATION || _env.YANDEX_VERIFICATION || "",
};

export const orgInfo = {
  name: "Ckript",
  url: SITE_URL,
  logo: `${SITE_URL}/ckript-logo-no-bg.png`,
  sameAs: [
    "https://twitter.com/ckript",
    "https://www.facebook.com/ckript",
    "https://www.linkedin.com/company/ckript",
  ],
};

export default defaultSeo;

// Localization settings — support adding more locales via VITE_SITE_LOCALES (comma-separated)
export const locales = ((_env.VITE_SITE_LOCALES || "en").split(",").map((s) => s.trim()).filter(Boolean)) || ["en"];
export const defaultLocale = (_env.VITE_DEFAULT_LOCALE || locales[0]) || "en";
