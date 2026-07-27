export const SITE_URL = "https://ckript.com";

export const BRAND_NAME = "Ckript";

export const defaultSeo = {
  title: "Ckript - AI Script Discovery, Screenplay Analysis & Film Funding",
  description:
    "Discover scripts, generate AI concept trailers, connect with producers and investors using Ckript's AI-powered entertainment marketplace.",
  keywords: [
    "Ckript",
    "script marketplace",
    "screenplay analysis",
    "AI script analysis",
    "AI concept trailer",
    "film funding",
    "script discovery",
    "screenplay submission",
    "script pitching",
    "AI filmmaking",
    "entertainment technology",
    "film investors",
    "producers",
    "screenwriters",
  ],
  image: `${SITE_URL}/ckript-logo-landscape-nobg.png`,
  themeColor: "#0B0A06",
  locale: "en_US",
};

export const socialProfiles = [
  "https://ckript.com",
];

const viteEnv = import.meta.env || {};

export const searchVerification = {
  google: viteEnv.VITE_GOOGLE_SITE_VERIFICATION || "",
  bing: viteEnv.VITE_BING_SITE_VERIFICATION || "",
};
