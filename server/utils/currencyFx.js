// Single source of truth for currency math across the payment system. We support INR + USD; both are
// 2-decimal currencies so the subunit factor is 100 (paise / cents). Amounts are stored/entered in
// MAJOR units (rupees / dollars) and converted to minor units only when handed to Razorpay.

export const SUPPORTED_CURRENCIES = ["INR", "USD"];
export const DEFAULT_CURRENCY = "INR";
const SUBUNIT_FACTOR = 100; // INR & USD are both 2-decimal

// Fallback INR-per-USD rate used only if the live FX fetch fails. Keep it conservative (slightly high)
// so we never under-charge international buyers when the API is down.
const FALLBACK_INR_PER_USD = 88;
const FX_TTL_MS = 60 * 60 * 1000; // cache the live rate ~1h

let fxCache = { rate: 0, fetchedAt: 0 };

export const isSupportedCurrency = (cur) =>
  SUPPORTED_CURRENCIES.includes(String(cur || "").toUpperCase());

// Validate a requested currency against the whitelist, else fall back to the user's saved preference,
// else INR. NEVER trust a client-sent amount — only the currency code is taken from the client.
export const resolveCurrency = (bodyCurrency, userPreferred) => {
  const requested = String(bodyCurrency || "").toUpperCase();
  if (isSupportedCurrency(requested)) return requested;
  const pref = String(userPreferred || "").toUpperCase();
  if (isSupportedCurrency(pref)) return pref;
  return DEFAULT_CURRENCY;
};

// Major units → integer minor units for Razorpay (paise / cents).
export const toSubunits = (major, _currency = DEFAULT_CURRENCY) =>
  Math.round((Number(major) || 0) * SUBUNIT_FACTOR);

// Live INR-per-USD rate (base USD → rates.INR), cached ~1h, with a hardcoded fallback.
export const getUsdInrRate = async () => {
  const now = Date.now();
  if (fxCache.rate > 0 && now - fxCache.fetchedAt < FX_TTL_MS) return fxCache.rate;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.INR);
      if (Number.isFinite(rate) && rate > 0) {
        fxCache = { rate, fetchedAt: now };
        return rate;
      }
    }
  } catch {
    /* fall through to fallback */
  }
  // Cache the fallback briefly too, so we don't hammer a failing API on every request.
  fxCache = { rate: FALLBACK_INR_PER_USD, fetchedAt: now };
  return FALLBACK_INR_PER_USD;
};

/**
 * Convert an INR major amount into the target currency's major amount.
 * @returns {Promise<{ amount: number, fxRate: number }>} amount = target-currency major units;
 *   fxRate = INR-per-target-unit used (1 for INR, the live INR/USD rate for USD).
 */
export const convertInrToCurrency = async (inrMajor, currency) => {
  const cur = String(currency || "").toUpperCase();
  const inr = Number(inrMajor) || 0;
  if (cur === "INR" || !isSupportedCurrency(cur)) return { amount: inr, fxRate: 1 };
  const rate = await getUsdInrRate(); // INR per 1 USD
  const usd = Math.round((inr / rate) * 100) / 100; // 2-decimal
  return { amount: usd, fxRate: rate };
};
