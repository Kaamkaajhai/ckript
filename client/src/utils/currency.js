import api from "../services/api";

// Locale + default decimal places per supported currency. INR is conventionally shown with no paise
// on this platform; USD shows cents.
const CURRENCY_META = {
  INR: { locale: "en-IN", decimals: 0 },
  USD: { locale: "en-US", decimals: 2 },
};

const metaFor = (code) => CURRENCY_META[String(code || "INR").toUpperCase()] || CURRENCY_META.INR;

// Format a MAJOR-unit amount (rupees / dollars) in the given currency. Honors the currency arg (the old
// version ignored it and always rendered ₹).
export const formatCurrency = (amount, currencyCode = "INR", options = {}) => {
  const code = String(currencyCode || "INR").toUpperCase();
  const meta = metaFor(code);
  const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: options.minimumFractionDigits ?? meta.decimals,
    maximumFractionDigits: options.maximumFractionDigits ?? meta.decimals,
  }).format(numericAmount);
};

// Format a MINOR-unit amount (paise / cents), e.g. values from the plan price matrix.
export const formatSubunits = (minor, currencyCode = "INR", options = {}) =>
  formatCurrency((Number(minor) || 0) / 100, currencyCode, options);

// Platform-internal "credits" unit — unchanged, not a real currency.
export const formatCredits = (amount) => {
  const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `${numericAmount.toLocaleString("en-IN")} cr`;
};

// Suggest a checkout currency from the caller's IP (server reuses its IP→country lookup). Falls back to
// INR on any failure. The caller decides precedence (saved preference usually wins over detection).
export const detectUserCurrency = async () => {
  try {
    const { data } = await api.get("/geo/currency");
    const cur = String(data?.currency || "").toUpperCase();
    return cur === "USD" || cur === "INR" ? cur : "INR";
  } catch {
    return "INR";
  }
};
