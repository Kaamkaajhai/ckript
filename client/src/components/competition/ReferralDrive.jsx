import { useState } from "react";
import { Copy, Check, Gift } from "lucide-react";

/**
 * The competition referral drive.
 *
 * Only referrals recorded inside the competition window and belonging to a VERIFIED account count —
 * the server decides both, this just renders what it reports.
 */
const ReferralDrive = ({ referrals, referralCode }) => {
  const [copied, setCopied] = useState(false);
  if (!referrals) return null;

  const link = referralCode ? `${window.location.origin}/${referralCode}` : "";
  const { count = 0, earned, next, tiers = [] } = referrals;
  const target = next?.at || tiers[tiers.length - 1]?.at || 1;
  const pct = Math.min(100, Math.round((count / target) * 100));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-[#D14D37]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bring other writers in</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Share your link. Writers who join and verify their email during this challenge count toward
        your rewards.
      </p>

      {link ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-700">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-gray-800 dark:text-gray-100">{link}</span>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="shrink-0 text-gray-500 hover:text-[#D14D37]"
            aria-label="Copy referral link"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <strong className="text-2xl font-bold text-gray-900 dark:text-white">{count}</strong>
            <span className="ml-1.5">{count === 1 ? "writer joined" : "writers joined"}</span>
          </p>
          {next ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {next.needed} more for <strong className="text-gray-700 dark:text-gray-200">{next.label}</strong>
            </p>
          ) : (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Top tier reached</p>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-2 rounded-full bg-[#D14D37] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {tiers.map((tier) => {
          const reached = count >= tier.at;
          return (
            <li key={tier.id} className="flex items-center gap-2 text-sm">
              {reached
                ? <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                : <span className="h-4 w-4 shrink-0 rounded-full border border-gray-300 dark:border-gray-600" />}
              <span className={reached ? "font-medium text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                {tier.at} writers — {tier.label}
                {tier.days > 0 ? ` · +${tier.days} days Silver` : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {earned ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          You've earned <strong>{earned.label}</strong>. It's granted when results are announced.
        </p>
      ) : null}
    </div>
  );
};

export default ReferralDrive;
