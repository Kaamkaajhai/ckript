// Static plan prices in MINOR units (paise for INR, cents for USD), keyed by currency. This is the
// single server-side source of truth for subscription pricing — order creation reads amounts from
// here (never from the client). Scripts are NOT here: their price is the writer's INR value converted
// live via currencyFx at order time.
//
// INR amounts mirror the historical *_MODEL.amount constants. USD amounts are set per-plan (FIP = $24
// per product spec). CONFIRM the USD silver/gold amounts before going live.
export const PLAN_PRICES = {
  film_industry_professional: { INR: 199900, USD: 2500 }, // ₹1999 / $25
  writer_silver: { INR: 39900, USD: 500 },                // ₹399  / $5  (confirm)
  writer_gold: { INR: 69900, USD: 900 },                  // ₹699  / $9  (confirm)
};

// Map a writer plan tier to its PLAN_PRICES key.
export const WRITER_PLAN_KEY = { silver: "writer_silver", gold: "writer_gold" };

export const getPlanAmount = (planKey, currency) => {
  const row = PLAN_PRICES[planKey];
  if (!row) return null;
  return row[String(currency || "INR").toUpperCase()] ?? row.INR;
};
