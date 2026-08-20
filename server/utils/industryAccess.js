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

export const INDUSTRY_BUSINESS_EMAIL_REQUIRED_MESSAGE =
  "signup with a company email to access scripts and writer profiles or purchase a plan.";

export const FILM_PROFESSIONAL_ROLE_LIST = ["investor", "producer", "director", "industry", "professional"];

/*
 * The other side of the marketplace.
 *
 * "writer" and "creator" are the same account type under two names — the second is historical —
 * and three files had already written that pair out privately (`utils/profileCompletion.js`,
 * `utils/scriptLimits.js`, and every inline `["writer", "creator"]` in the controllers). They all
 * happen to agree today; DEF-28 is what it costs when four copies of a closed role vocabulary stop
 * agreeing. Named here, beside the industry list it is the counterpart to.
 */
export const WRITER_ROLE_LIST = ["writer", "creator"];

export const isWriterRole = (roleOrUser = "") => {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  return WRITER_ROLE_LIST.includes(String(role || "").trim().toLowerCase());
};

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

export const isIndustryProfessionalWithPersonalEmail = (user = {}) => false;

export const isEligibleForFipFreeTier = (user = {}) =>
  isFilmIndustryProfessionalRole(user) &&
  !isIndustryProfessionalWithPersonalEmail(user);

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

export const hasAnyFipAccess = (user = {}) =>
  hasActiveFilmIndustryProfessionalAccess(user) || isEligibleForFipFreeTier(user);

export const getCurrentBillingCycleStart = (user = {}) => {
  const subscription = user?.subscription || {};
  const activatedAt = subscription?.accessActivatedAt
    ? new Date(subscription.accessActivatedAt)
    : null;

  if (!activatedAt) return 0;

  const now = new Date();
  let cycleStart = new Date(activatedAt);

  while (true) {
    const nextCycle = new Date(cycleStart);
    nextCycle.setMonth(nextCycle.getMonth() + 1);
    if (nextCycle.getTime() > now.getTime()) {
      break;
    }
    cycleStart = nextCycle;
  }

  return cycleStart.getTime();
};

export const getContactsLimit = (user = {}) => {
  const plan = user?.subscription?.plan || "free";
  return plan === "free" ? 1 : Number(user?.subscription?.contactsLimit || 10);
};

export const getRevealedContactsSinceActivation = (user = {}) => {
  const subscription = user?.subscription || {};
  const cycleStart = getCurrentBillingCycleStart(user);
  const revealedContacts = Array.isArray(subscription?.revealedContacts)
    ? subscription.revealedContacts
    : [];
  return revealedContacts.filter((entry) => {
    const revealedAt = entry?.revealedAt ? new Date(entry.revealedAt).getTime() : 0;
    return revealedAt >= cycleStart;
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
export const getMessageWritersLimit = (user = {}) => {
  const plan = user?.subscription?.plan || "free";
  return plan === "free" ? 1 : Number(user?.subscription?.messageWritersLimit || 10);
};

export const getMessagedWritersSinceActivation = (user = {}) => {
  const subscription = user?.subscription || {};
  const cycleStart = getCurrentBillingCycleStart(user);
  const messagedWriters = Array.isArray(subscription?.messagedWriters)
    ? subscription.messagedWriters
    : [];
  return messagedWriters.filter((entry) => {
    const messagedAt = entry?.messagedAt ? new Date(entry.messagedAt).getTime() : 0;
    return messagedAt >= cycleStart;
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

// Scheduled Meetings Utilities
export const getMeetingsLimit = (user = {}) => {
  const plan = user?.subscription?.plan || "free";
  return plan === "free" ? 1 : Number(user?.subscription?.meetingsLimit || 10);
};

export const getScheduledMeetingsSinceActivation = (user = {}) => {
  const subscription = user?.subscription || {};
  const cycleStart = getCurrentBillingCycleStart(user);
  const scheduledMeetings = Array.isArray(subscription?.scheduledMeetings)
    ? subscription.scheduledMeetings
    : [];
  return scheduledMeetings.filter((entry) => {
    const scheduledAt = entry?.scheduledAt ? new Date(entry.scheduledAt).getTime() : 0;
    return scheduledAt >= cycleStart;
  });
};

export const getScheduledMeetingsCount = (user = {}) =>
  getScheduledMeetingsSinceActivation(user).length;

export const hasScheduledMeeting = (user = {}, writerId = "") => {
  const wId = String(writerId || "");
  if (!wId) return false;
  return getScheduledMeetingsSinceActivation(user).some(
    (entry) => String(entry?.writerId || "") === wId
  );
};

export const hasReachedMeetingsLimit = (user = {}) =>
  getScheduledMeetingsCount(user) >= getMeetingsLimit(user);

export const getRemainingMeetings = (user = {}) =>
  Math.max(0, getMeetingsLimit(user) - getScheduledMeetingsCount(user));
