/**
 * Competition rewards — what the platform GRANTS when results are declared, as configuration.
 *
 * Until this existed, the rewards were fixed in the declare handler (Gold 30 days for the winner,
 * Silver for the runner-up, a badge for a special award) while the prize lists an admin edited were
 * free text that only ever got displayed. The competition page promised whatever was typed; the
 * declare flow granted the same thing every time; the Hall of Fame then showed the real grants. This
 * module is the single definition all three read from:
 *
 *   - `resolveGrants(competition)`      what each placing gets — plan, days, featured, trailer, cash
 *   - `specialGrantFor(competition, t)` what a named special award carries beyond its badge
 *   - `composePrizeLines(competition)`  the sentences the public pages and the declare dialog show
 *
 * Badges are not configurable: a placing IS its badge. Cash is configurable but never paid by the
 * platform — it is recorded in the finance ledger as owed and worded on every surface as paid by
 * Ckript directly. A competition saved before this module existed has no `prizes.grants`, and
 * resolves to DEFAULT_GRANTS, which reproduce exactly what the old handler did — so declaring an
 * older competition grants what it always would have.
 */

export const PLANS = Object.freeze(["none", "silver", "gold"]);
export const CURRENCIES = Object.freeze(["INR", "USD"]);
export const PLACINGS = Object.freeze(["winner", "runnerUp", "secondRunnerUp"]);
export const MAX_PLAN_DAYS = 365;

export const PLACING_LABEL = Object.freeze({
  winner: "Winner",
  runnerUp: "Runner-Up",
  secondRunnerUp: "Second Runner-Up",
});

/** The award value stored on CompetitionEntry.result.award for each placing. */
export const PLACING_AWARD = Object.freeze({
  winner: "winner",
  runnerUp: "runner_up",
  secondRunnerUp: "second_runner_up",
});

/**
 * Reproduces the pre-configuration behaviour, field for field. Second runner-up was never a placing
 * before, so it starts DISABLED: a page must not promise a placing the admin never meant to award.
 * `enabled` is only consulted for that tier — the winner and runner-up are always available.
 */
export const DEFAULT_GRANTS = Object.freeze({
  winner: Object.freeze({ enabled: true, plan: "gold", planDays: 30, featured: true, aiTrailer: true, cashMinor: 0, cashCurrency: "INR" }),
  runnerUp: Object.freeze({ enabled: true, plan: "silver", planDays: 30, featured: true, aiTrailer: false, cashMinor: 0, cashCurrency: "INR" }),
  secondRunnerUp: Object.freeze({ enabled: false, plan: "silver", planDays: 14, featured: false, aiTrailer: false, cashMinor: 0, cashCurrency: "INR" }),
});

export const DEFAULT_SPECIAL_GRANT = Object.freeze({ plan: "none", planDays: 30, featured: false, cashMinor: 0, cashCurrency: "INR" });

/**
 * The free-text lines the platform used to SEED into every competition's prize lists. They described
 * the fixed grants of the time; now the grants describe themselves, so a seeded line that survived
 * in an older competition's extras would print the same reward twice. Recognised and dropped.
 */
export const LEGACY_SEEDED_LINES = Object.freeze(new Set([
  "Cash Prize",
  "Featured placement when you publish your script",
  "Gold Subscription (30 days)",
  "AI Trailer",
  "Winner Badge",
  "Silver Subscription (30 days)",
  "Runner-Up Badge",
  "Bronze Subscription (14 days)",
  "Honorable Mention Badge",
]));

const clampDays = (value, fallback) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_PLAN_DAYS, Math.max(1, n));
};

const toMinor = (value, fallback = 0) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const toCurrency = (value, fallback = "INR") => {
  const upper = String(value || "").trim().toUpperCase();
  return CURRENCIES.includes(upper) ? upper : fallback;
};

const toBool = (value, fallback) => (typeof value === "boolean" ? value : fallback);

/** One placing's grant, every field valid, unknown or missing fields taking the fallback's value. */
export const sanitizeGrant = (raw = {}, fallback = DEFAULT_GRANTS.winner) => {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: toBool(source.enabled, fallback.enabled ?? true),
    plan: PLANS.includes(source.plan) ? source.plan : fallback.plan,
    planDays: clampDays(source.planDays, fallback.planDays),
    featured: toBool(source.featured, fallback.featured),
    aiTrailer: toBool(source.aiTrailer, fallback.aiTrailer),
    cashMinor: toMinor(source.cashMinor, fallback.cashMinor),
    cashCurrency: toCurrency(source.cashCurrency, fallback.cashCurrency),
  };
};

export const sanitizeGrants = (raw = {}) =>
  Object.fromEntries(PLACINGS.map((placing) => [placing, sanitizeGrant(raw?.[placing], DEFAULT_GRANTS[placing])]));

/**
 * The special-award rows from the editor. A row keeps its title and description (the editor adds a
 * blank row on "Add award", and blanks are the admin's to finish or remove) and gains the optional
 * grant fields, each made valid.
 */
export const sanitizeSpecialAwards = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      plan: PLANS.includes(row.plan) ? row.plan : DEFAULT_SPECIAL_GRANT.plan,
      planDays: clampDays(row.planDays, DEFAULT_SPECIAL_GRANT.planDays),
      featured: toBool(row.featured, DEFAULT_SPECIAL_GRANT.featured),
      cashMinor: toMinor(row.cashMinor, DEFAULT_SPECIAL_GRANT.cashMinor),
      cashCurrency: toCurrency(row.cashCurrency, DEFAULT_SPECIAL_GRANT.cashCurrency),
    }));

/** What each placing gets for this competition. Absent config → the historical grants. */
export const resolveGrants = (competition) => sanitizeGrants(competition?.prizes?.grants);

/**
 * What a declared special award carries beyond its badge. Matched by title, case-insensitively,
 * against the awards configured on the competition; a title typed fresh at declare time — the
 * declare form allows that on purpose — carries the badge alone.
 */
export const specialGrantFor = (competition, title) => {
  const wanted = String(title || "").trim().toLowerCase();
  const rows = sanitizeSpecialAwards(competition?.prizes?.special);
  const match = wanted ? rows.find((row) => row.title.toLowerCase() === wanted) : null;
  return match
    ? { plan: match.plan, planDays: match.planDays, featured: match.featured, cashMinor: match.cashMinor, cashCurrency: match.cashCurrency }
    : { ...DEFAULT_SPECIAL_GRANT };
};

export const formatCash = (minor, currency = "INR") => {
  const amount = toMinor(minor) / 100;
  const upper = toCurrency(currency);
  const locale = upper === "INR" ? "en-IN" : "en-US";
  // Whole amounts print without decimals ("₹50,000"); anything else keeps both ("$99.50").
  const decimals = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: upper,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

const planLabel = (plan) => (plan === "gold" ? "Gold" : plan === "silver" ? "Silver" : "");

/**
 * The sentences a reader sees for one grant, in the order they are read: money, then the plan, then
 * the placements, then the badge. Every surface — competition page, entrant dashboard, mobile, the
 * declare confirmation — prints these, so the promise and the grant cannot drift apart again.
 */
export const grantLines = (grant, { badgeLabel = "" } = {}) => {
  const g = sanitizeGrant(grant, { ...DEFAULT_SPECIAL_GRANT, enabled: true, aiTrailer: false });
  const lines = [];
  if (g.cashMinor > 0) lines.push(`${formatCash(g.cashMinor, g.cashCurrency)} cash prize, paid directly by Ckript`);
  if (g.plan !== "none") lines.push(`${planLabel(g.plan)} plan for ${g.planDays} day${g.planDays === 1 ? "" : "s"}`);
  if (g.featured) lines.push("Featured placement when you publish your script");
  if (g.aiTrailer) lines.push("AI trailer for your script");
  if (badgeLabel) lines.push(`${badgeLabel} badge`);
  return lines;
};

/**
 * Everything the public pages print, per placing and per special award: the platform's grants
 * first, then whatever the admin typed as extras (producer meetings, a masterclass — things the
 * platform does not deliver and so cannot promise on its own). A disabled placing prints nothing:
 * the tier does not exist for that competition.
 */
export const composePrizeLines = (competition) => {
  const grants = resolveGrants(competition);
  const extras = competition?.prizes || {};
  const extraLines = (placing) =>
    (Array.isArray(extras[placing]) ? extras[placing] : [])
      .map((s) => String(s || "").trim())
      .filter((s) => s && !LEGACY_SEEDED_LINES.has(s));
  const lines = (placing) =>
    (placing !== "secondRunnerUp" || grants[placing].enabled)
      ? [...grantLines(grants[placing], { badgeLabel: PLACING_LABEL[placing] }), ...extraLines(placing)]
      : [];
  return {
    winner: lines("winner"),
    runnerUp: lines("runnerUp"),
    secondRunnerUp: lines("secondRunnerUp"),
    special: sanitizeSpecialAwards(extras.special).map((row) => ({
      title: row.title,
      description: row.description,
      lines: grantLines(row, { badgeLabel: row.title || "Special award" }),
    })),
  };
};
