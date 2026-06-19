export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "zoho.com",
  "zohomail.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "rediffmail.com",
  "fastmail.com",
  "tutanota.com",
  "hey.com",
]);

export const FILM_PROFESSIONAL_ROLE_LIST = ["investor", "producer", "director", "industry", "professional"];

export const getEmailDomain = (email = "") => {
  const normalized = String(email || "").trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(atIndex + 1) : "";
};

export const isFreeEmailDomain = (emailOrDomain = "") => {
  const raw = String(emailOrDomain || "").trim().toLowerCase();
  const domain = raw.includes("@") ? getEmailDomain(raw) : raw;
  return FREE_EMAIL_DOMAINS.has(domain);
};

export const hasBusinessEmail = (email = "") => {
  const domain = getEmailDomain(email);
  return Boolean(domain && !isFreeEmailDomain(domain));
};

export const isFilmIndustryProfessionalRole = (user = {}) =>
  FILM_PROFESSIONAL_ROLE_LIST.includes(String(user?.role || "").trim().toLowerCase());

export const hasActiveFilmIndustryProfessionalAccess = (user = {}) => {
  const subscription = user?.subscription || {};
  const accessTier = String(subscription?.accessTier || "").trim().toLowerCase();
  const accessStatus = String(subscription?.accessStatus || "").trim().toLowerCase();
  if (accessTier !== "film_industry_professional" || accessStatus !== "active") {
    return false;
  }

  const accessExpiry = subscription?.accessExpiresAt || subscription?.expiresAt;
  if (!accessExpiry) return true;

  const expiryTime = new Date(accessExpiry).getTime();
  return Number.isFinite(expiryTime) && expiryTime > Date.now();
};
