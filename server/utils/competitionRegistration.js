const text = (value, max = 300) => String(value ?? "").trim().slice(0, max);

export const DEFAULT_COMPETITION_ENTRY_FEE = Object.freeze({
  INR: 9800,
  USD: 200,
});

export const COMPETITION_REGISTRATION_MODE = Object.freeze({
  FREE: "free",
  PAID: "paid",
});

export const competitionRegistrationMode = (competition = {}) => (
  competition?.entryFee?.mode === COMPETITION_REGISTRATION_MODE.FREE
    ? COMPETITION_REGISTRATION_MODE.FREE
    : COMPETITION_REGISTRATION_MODE.PAID
);

export const competitionRegistrationCharge = (competition = {}, requestedCurrency = "INR") => {
  const currency = String(requestedCurrency || "INR").toUpperCase() === "USD" ? "USD" : "INR";
  const configured = Number(competition?.entryFee?.[currency === "USD" ? "usdMinor" : "inrMinor"]);
  const amountMinor = Number.isFinite(configured) && configured > 0
    ? Math.round(configured)
    : DEFAULT_COMPETITION_ENTRY_FEE[currency];
  return { currency, amountMinor, amountMajor: amountMinor / 100 };
};

const accepted = (value) => value === true || String(value).toLowerCase() === "true";

/**
 * The registration answers that survive every admission path.
 *
 * Payment, free registration and an approved third-party claim must create the same entry. Keeping
 * their cleaning here prevents one path accepting an answer another path could never persist.
 */
export const normalizeCompetitionRegistration = (body = {}, { isKnownCountry } = {}) => {
  const country = text(body.country, 80);
  const language = text(body.language, 60);
  const rawGenres = Array.isArray(body.genres) ? body.genres : (body.genres ? [body.genres] : []);
  const genres = [...new Set(rawGenres.map((genre) => text(genre, 40)).filter(Boolean))];
  const experienceLevel = text(body.experienceLevel, 20).toLowerCase();
  const portfolioUrl = text(body.portfolioUrl, 300);

  if (typeof isKnownCountry === "function" && !isKnownCountry(country)) {
    return { ok: false, message: "Select a country from the list." };
  }
  if (!language) return { ok: false, message: "Preferred language is required." };
  if (genres.length < 1 || genres.length > 3) return { ok: false, message: "Select 1 to 3 genres." };
  if (!["beginner", "intermediate", "professional"].includes(experienceLevel)) {
    return { ok: false, message: "Select a valid experience level." };
  }
  if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) {
    return { ok: false, message: "Portfolio link must start with http:// or https://" };
  }
  if (!accepted(body.acceptRules)) {
    return { ok: false, message: "You must accept the competition rules." };
  }
  if (!accepted(body.acceptCopyright)) {
    return { ok: false, message: "You must accept the copyright policy." };
  }

  return {
    ok: true,
    registration: { country, language, genres, experienceLevel, portfolioUrl },
  };
};

export const registrationOrderStanding = ({ order, intent, competitionId, userId } = {}) => {
  if (!order || !intent?.orderId) return { ok: false, message: "Payment order could not be found." };
  if (String(order.id || "") !== String(intent.orderId)) {
    return { ok: false, message: "This payment does not belong to this registration." };
  }

  const notes = order.notes || {};
  const bound = notes.purpose === "competition_registration"
    && String(notes.competitionId) === String(competitionId)
    && String(notes.userId) === String(userId);
  if (!bound) return { ok: false, message: "This payment does not belong to this registration." };

  const currency = String(order.currency || "").toUpperCase();
  if (currency !== intent.currency
    || Number(order.amount) !== Number(intent.amountMinor)) {
    return { ok: false, message: "The amount paid does not match the entry fee." };
  }
  if (order.status !== "paid") {
    return { ok: false, pending: true, message: "The payment has not been captured yet." };
  }
  const amountPaid = Number(order.amount_paid || 0);
  if (amountPaid !== Number(intent.amountMinor)) {
    return { ok: false, message: "The amount paid does not match the entry fee." };
  }

  return { ok: true, currency, amountMinor: amountPaid, amountMajor: amountPaid / 100 };
};
