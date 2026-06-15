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
