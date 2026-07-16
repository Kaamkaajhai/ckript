import { useCurrency } from "../context/CurrencyContext";

// Compact INR/USD switch. Persists the choice (localStorage + profile when logged in) so prices across
// the app render in the chosen currency.
const CurrencyToggle = ({ dark = false, className = "" }) => {
  const { currency, setCurrency } = useCurrency() || {};
  if (!setCurrency) return null;

  const opts = ["INR", "USD"];
  return (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 ${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${className}`.trim()}
      role="group"
      aria-label="Display currency"
    >
      {opts.map((c) => {
        const active = currency === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              active
                ? dark
                  ? "bg-[#1e3a5f] text-white shadow-sm"
                  : "bg-white text-gray-900 shadow-sm"
                : dark
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {c === "INR" ? "₹ INR" : "$ USD"}
          </button>
        );
      })}
    </div>
  );
};

export default CurrencyToggle;
