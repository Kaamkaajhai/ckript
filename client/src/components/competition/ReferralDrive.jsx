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

// A referral that qualified is DONE, so it reads in ink; one still awaiting verification is simply
// not there yet and stays in the chip's own muted voice. Neither is live, so neither takes the accent.
const STATUS_STYLES = {
  qualified: { color: "var(--ckc-ink)" },
  registered: undefined,
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
    <div className="ckc-card ckc-card-pad">
      <div className="flex items-center gap-2">
        {/* The icon is ornament, not state — the accent is spent on the tier being worked toward. */}
        <Gift className="h-5 w-5" style={{ color: "var(--ckc-muted)" }} aria-hidden="true" />
        <h2 className="ckc-title ckc-h3">Bring other writers in</h2>
      </div>
      <p className="mt-2" style={{ fontSize: 14, color: "var(--ckc-muted)" }}>
        Share your link. Writers who join and verify their email during this challenge count toward
        your rewards.
      </p>

      {link ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className="flex min-w-[240px] flex-1 items-center gap-2 px-4 py-2.5"
            style={{ background: "var(--ckc-cream)", border: "1px solid var(--ckc-rule)", borderRadius: 3 }}
          >
            {/* A referral link is a reference string, so it keeps the monospace voice. */}
            <span
              className="min-w-0 flex-1 truncate"
              style={{ fontFamily: "var(--ckc-mono)", fontSize: 13, color: "var(--ckc-ink)" }}
            >
              {link}
            </span>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="shrink-0 hover:opacity-70"
              style={{ color: "var(--ckc-muted)" }}
              aria-label="Copy referral link"
            >
              {/* Copied is a thing DONE, so the tick reads in ink like every other completed marker. */}
              {copied ? <Check className="h-4 w-4" style={{ color: "var(--ckc-ink)" }} /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {/* Reuses the app-wide share control — WhatsApp / LinkedIn / X / Facebook / Email already. */}
          <SocialShareButton
            share={share}
            buttonLabel="Share"
            className="ckc-btn ckc-btn-quiet shrink-0"
          />
        </div>
      ) : null}

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p>
            {/* A count is a figure, set like the Stat numerals: display serif, tabular, in ink. */}
            <strong
              style={{
                fontFamily: "var(--ckc-display)",
                fontWeight: 400,
                fontSize: "2rem",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                color: "var(--ckc-ink)",
              }}
            >
              {count}
            </strong>
            <span className="ckc-meta ml-1.5">{count === 1 ? "writer qualified" : "writers qualified"}</span>
          </p>
          {next ? (
            // The tier being worked toward is the current one, and it is the only thing here that
            // earns the accent.
            <p className="ckc-meta">
              {next.needed} more for <strong style={{ fontWeight: 500, color: "var(--ckc-accent-text)" }}>{next.label}</strong>
            </p>
          ) : (
            <p className="ckc-meta" style={{ color: "var(--ckc-ink)" }}>Top tier reached</p>
          )}
        </div>
        {/* Ground and fill follow the journey strip: what is already done reads in ink on the hairline. */}
        <div className="mt-2 h-2" style={{ background: "var(--ckc-rule)", borderRadius: 2 }}>
          <div className="h-2 transition-all" style={{ width: `${pct}%`, background: "var(--ckc-ink)", borderRadius: 2 }} />
        </div>
        {awaitingVerification > 0 ? (
          <p className="mt-2" style={{ fontSize: 13, color: "var(--ckc-muted)" }}>
            {awaitingVerification} more {awaitingVerification === 1 ? "writer has" : "writers have"} signed up but
            {" "}{awaitingVerification === 1 ? "hasn't" : "haven't"} verified their email yet.
          </p>
        ) : null}
      </div>

      {/* Rewards */}
      <div className="mt-6">
        <h3 className="ckc-meta">Rewards</h3>
        <ul className="mt-2 space-y-2">
          {tiers.map((tier) => {
            const reached = count >= tier.at;
            // Three states, one hue each: reached is done and reads in ink, the tier you are working
            // toward is current and takes the accent, everything past that stays muted.
            const current = !reached && next?.at === tier.at;
            return (
              <li key={tier.id} className="flex items-center gap-2 text-sm">
                {reached
                  ? <Check className="h-4 w-4 shrink-0" style={{ color: "var(--ckc-ink)" }} aria-hidden="true" />
                  : <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ border: `1px solid ${current ? "var(--ckc-accent)" : "var(--ckc-faint)"}` }}
                    />}
                <span
                  style={
                    reached
                      ? { fontWeight: 500, color: "var(--ckc-ink)" }
                      : current
                        ? { fontWeight: 500, color: "var(--ckc-accent-text)" }
                        : { color: "var(--ckc-muted)" }
                  }
                >
                  {tier.at} writers — {tier.label}
                  {tier.days > 0 ? ` · +${tier.days} days Silver` : ""}
                </span>
              </li>
            );
          })}
        </ul>
        {earned ? (
          <p
            className="mt-3 px-3 py-2"
            style={{
              background: "var(--ckc-cream)",
              border: "1px solid var(--ckc-rule)",
              borderRadius: 3,
              fontSize: 14,
              color: "var(--ckc-body)",
            }}
          >
            You've earned <strong style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{earned.label}</strong>. It's granted when results are announced.
          </p>
        ) : null}
      </div>

      {/* History */}
      {history.length ? (
        <div className="mt-6">
          <h3 className="ckc-meta flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Who you've brought in
          </h3>
          {/* The table is wider than a phone, so it scrolls in its own container, never the page. */}
          <div className="mt-2 ckc-scroll-x">
            <table className="w-full min-w-[380px] text-left text-sm">
              <thead>
                <tr>
                  <th className="ckc-meta py-2 pr-3">Writer</th>
                  <th className="ckc-meta py-2 pr-3">Joined</th>
                  <th className="ckc-meta py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--ckc-rule)" }}>
                    <td className="py-2.5 pr-3" style={{ color: "var(--ckc-ink)" }}>
                      {row.name}
                      {/* A handle keeps the monospace voice but not the uppercasing — @Ada is not @ADA. */}
                      {row.username ? (
                        <span
                          className="ml-1"
                          style={{ fontFamily: "var(--ckc-mono)", fontSize: 11, color: "var(--ckc-muted)" }}
                        >
                          @{row.username}
                        </span>
                      ) : null}
                    </td>
                    <td className="ckc-meta py-2.5 pr-3" style={{ letterSpacing: "0.06em" }}>
                      {row.registeredAt ? new Date(row.registeredAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="py-2.5">
                      <span className="ckc-chip" style={STATUS_STYLES[row.status]}>
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
        <p className="mt-6" style={{ fontSize: 14, color: "var(--ckc-muted)" }}>
          Nobody has joined through your link yet.
        </p>
      ) : null}

      {/* Rules */}
      <div
        className="mt-6 p-4"
        style={{ background: "var(--ckc-cream)", border: "1px solid var(--ckc-rule)", borderRadius: 3 }}
      >
        <h3 className="ckc-meta flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" aria-hidden="true" /> How it works
        </h3>
        <ul className="mt-2 space-y-1">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-2" style={{ fontSize: 13, color: "var(--ckc-body)" }}>
              {/* Decorative, never read — the one place the faint tone belongs. */}
              <span style={{ color: "var(--ckc-faint)" }}>•</span>{rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ReferralDrive;
