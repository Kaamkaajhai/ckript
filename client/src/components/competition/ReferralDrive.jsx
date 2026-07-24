import { useEffect, useState } from "react";
import { Copy, Check, Gift, Users, Info } from "lucide-react";
import api from "../../services/api";
import SocialShareButton from "../SocialShareButton";

/**
 * The competition referral drive.
 *
 * Two honesty constraints shape what this shows:
 *
 *  1. There are TWO real states, not four. A referred account is either `qualified` (it verified its
 *     email — this is what counts toward a tier) or `registered` (signed up, not yet verified). A
 *     click that never became a signup leaves no trace anywhere in the system, so a "pending" count
 *     would always read zero; it is not invented here.
 *  2. Rewards shown are badges and subscription days — the grants that actually persist. The legacy
 *     credit bonus writes to a field that is not on the User schema and is silently discarded, so
 *     presenting a credit balance here would be presenting a number that does not exist.
 */

const STATUS_STYLES = {
  qualified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  registered: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const STATUS_LABELS = {
  qualified: "Qualified",
  registered: "Awaiting verification",
};

const RULES = [
  "Only completed registrations count — the writer has to verify their email.",
  "Referring yourself doesn't count.",
  "If someone already has a referrer, a second code is ignored.",
  "Rewards are specific to this competition and are granted when results are announced.",
];

const ReferralDrive = ({ competitionId, referrals: initialProgress, referralCode: initialCode, competitionName = "" }) => {
  const [progress, setProgress] = useState(initialProgress || null);
  const [code, setCode] = useState(initialCode || "");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // The dashboard already has progress from /me; this fills in the history table, which is the one
  // thing that payload doesn't carry.
  useEffect(() => {
    if (!competitionId) return undefined;
    let alive = true;
    api.get(`/competitions/${competitionId}/referrals`)
      .then(({ data }) => {
        if (!alive) return;
        setProgress(data.progress || null);
        setHistory(data.referrals || []);
        if (data.referralCode) setCode(data.referralCode);
      })
      .catch(() => { /* progress from /me still renders; the table just stays empty */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [competitionId]);

  if (!progress) return null;

  const link = code ? `${window.location.origin}/${code}` : "";
  const { count = 0, awaitingVerification = 0, earned, next, tiers = [] } = progress;
  const target = next?.at || tiers[tiers.length - 1]?.at || 1;
  const pct = Math.min(100, Math.round((count / target) * 100));

  const share = {
    url: link,
    title: competitionName ? `${competitionName} | Ckript` : "Ckript Global Script Challenge",
    text: competitionName
      ? `I'm writing a script in 48 hours for the ${competitionName}. Come and write one too —`
      : "I'm writing a script in 48 hours for the Ckript Global Script Challenge. Come and write one too —",
  };

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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-700">
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
          {/* Reuses the app-wide share control — WhatsApp / LinkedIn / X / Facebook / Email already. */}
          <SocialShareButton
            share={share}
            buttonLabel="Share"
            className="shrink-0 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-[#D14D37] hover:text-[#D14D37] dark:border-gray-600 dark:text-gray-200"
          />
        </div>
      ) : null}

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <strong className="text-2xl font-bold text-gray-900 dark:text-white">{count}</strong>
            <span className="ml-1.5">{count === 1 ? "writer qualified" : "writers qualified"}</span>
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
        {awaitingVerification > 0 ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {awaitingVerification} more {awaitingVerification === 1 ? "writer has" : "writers have"} signed up but
            {" "}{awaitingVerification === 1 ? "hasn't" : "haven't"} verified their email yet.
          </p>
        ) : null}
      </div>

      {/* Rewards */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rewards</h3>
        <ul className="mt-2 space-y-2">
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
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            You've earned <strong>{earned.label}</strong>. It's granted when results are announced.
          </p>
        ) : null}
      </div>

      {/* History */}
      {history.length ? (
        <div className="mt-6">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Who you've brought in
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[380px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Writer</th>
                  <th className="py-2 pr-3 font-semibold">Joined</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2.5 pr-3 text-gray-900 dark:text-white">
                      {row.name}
                      {row.username ? <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">@{row.username}</span> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">
                      {row.registeredAt ? new Date(row.registeredAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : loaded ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Nobody has joined through your link yet.
        </p>
      ) : null}

      {/* Rules */}
      <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/40">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Info className="h-3.5 w-3.5" aria-hidden="true" /> How it works
        </h3>
        <ul className="mt-2 space-y-1">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="text-gray-400">•</span>{rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ReferralDrive;
