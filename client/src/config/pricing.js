// Client mirror of the server plan price matrix (server/config/pricing.js), in MINOR units (paise /
// cents). Single source for displaying plan prices — replaces the duplicated WRITER_TIERS (hook) and
// WRITER_PLANS/FIP (PricingModal) hardcodes. The server is still authoritative at order time; this is
// display only and must be kept in sync with the server matrix.
export const PLAN_PRICES = {
  film_industry_professional: { INR: 199900, USD: 2500 },
  writer_silver: { INR: 39900, USD: 500 },
  writer_gold: { INR: 69900, USD: 900 },
};

export const WRITER_PLAN_KEY = { silver: "writer_silver", gold: "writer_gold" };

// Minor-unit price for a plan in the active currency (falls back to INR if the currency is missing).
export const getPlanPrice = (planKey, currency = "INR") => {
  const row = PLAN_PRICES[planKey];
  if (!row) return 0;
  return row[String(currency || "INR").toUpperCase()] ?? row.INR;
};
