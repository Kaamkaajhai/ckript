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

export const getContactsLimit = (user = {}) =>
  Number(user?.subscription?.contactsLimit || 10);

export const getRevealedContactsSinceActivation = (user = {}) => {
  const subscription = user?.subscription || {};
  const activatedAt = subscription?.accessActivatedAt
    ? new Date(subscription.accessActivatedAt).getTime()
    : 0;
  const revealedContacts = Array.isArray(subscription?.revealedContacts)
    ? subscription.revealedContacts
    : [];
  return revealedContacts.filter((entry) => {
    const revealedAt = entry?.revealedAt ? new Date(entry.revealedAt).getTime() : 0;
    return revealedAt >= activatedAt;
  });
};

export const getRevealedContactCount = (user = {}) =>
  getRevealedContactsSinceActivation(user).length;

export const hasRevealedContact = (user = {}, writerId = "") => {
  const wId = String(writerId || "");
  if (!wId) return false;
  return getRevealedContactsSinceActivation(user).some(
    (entry) => String(entry?.writerId || "") === wId
  );
};

export const hasReachedContactLimit = (user = {}) =>
  getRevealedContactCount(user) >= getContactsLimit(user);

export const getRemainingContacts = (user = {}) =>
  Math.max(0, getContactsLimit(user) - getRevealedContactCount(user));

// Message Writers Utilities
export const getMessageWritersLimit = (user = {}) =>
  Number(user?.subscription?.messageWritersLimit || 10);

export const getMessagedWritersSinceActivation = (user = {}) => {
  const subscription = user?.subscription || {};
  const activatedAt = subscription?.accessActivatedAt
    ? new Date(subscription.accessActivatedAt).getTime()
    : 0;
  const messagedWriters = Array.isArray(subscription?.messagedWriters)
    ? subscription.messagedWriters
    : [];
  return messagedWriters.filter((entry) => {
    const messagedAt = entry?.messagedAt ? new Date(entry.messagedAt).getTime() : 0;
    return messagedAt >= activatedAt;
  });
};

export const getMessagedWritersCount = (user = {}) =>
  getMessagedWritersSinceActivation(user).length;

export const hasMessagedWriter = (user = {}, writerId = "") => {
  const wId = String(writerId || "");
  if (!wId) return false;
  return getMessagedWritersSinceActivation(user).some(
    (entry) => String(entry?.writerId || "") === wId
  );
};

export const hasReachedMessageWritersLimit = (user = {}) =>
  getMessagedWritersCount(user) >= getMessageWritersLimit(user);

export const getRemainingMessageWriters = (user = {}) =>
  Math.max(0, getMessageWritersLimit(user) - getMessagedWritersCount(user));
