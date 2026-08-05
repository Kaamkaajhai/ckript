import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../AdminDashboard";

/**
 * Referral analytics.
 *
 * Reports only what is actually recorded. In particular there is no "clicks" or pre-signup funnel
 * here: a referral link that is never used leaves no trace in the system, so the funnel genuinely
 * starts at signup. "Conversion" is therefore signup → email verified, which is the step that
 * decides whether a referral counts toward a reward.
 */

const cls = {
  card: (dark) => `rounded-xl border p-5 ${dark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`,
  label: (dark) => `text-xs font-semibold uppercase tracking-wide ${dark ? "text-white/50" : "text-gray-500"}`,
  value: (dark) => `mt-1 text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`,
  body: (dark) => (dark ? "text-white/70" : "text-gray-600"),
  ghost: (dark) => `rounded-lg border px-4 py-2 text-sm font-medium ${dark ? "border-white/10 text-white/70 hover:bg-white/[0.06]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`,
};

export default function AdminReferrals({ isDark: dark = false }) {
  const [competitions, setCompetitions] = useState([]);
  const [competitionId, setCompetitionId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminApi.get("/admin/competitions")
      .then(({ data: payload }) => setCompetitions(payload.competitions || []))
      .catch(() => { /* the all-time view still works without the scope selector */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: payload } = await adminApi.get("/admin/referrals/analytics", {
        params: competitionId ? { competitionId } : {},
      });
      setData(payload);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load referral analytics.");
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => { load(); }, [load]);

  // Goes through adminApi rather than a bare <a href>: the admin token lives in sessionStorage and
  // is attached by an interceptor, so a plain link would hit the endpoint unauthenticated.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: blob } = await adminApi.get("/admin/referrals/analytics", {
        params: { ...(competitionId ? { competitionId } : {}), format: "csv" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Could not export the CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>Referrals</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            aria-label="Scope to a competition"
            className={`rounded-lg border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/[0.04] text-white" : "border-gray-300 bg-white text-gray-900"}`}
          >
            <option value="">All time (every competition)</option>
            {competitions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={exportCsv} disabled={exporting || !data} className={cls.ghost(dark)}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className={cls.body(dark)}>Loading…</p>
      ) : !data ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={cls.card(dark)}>
              <p className={cls.label(dark)}>Total referrals</p>
              <p className={cls.value(dark)}>{data.totalReferrals}</p>
              <p className={`mt-1 text-xs ${cls.body(dark)}`}>signed up through a link</p>
            </div>
            <div className={cls.card(dark)}>
              <p className={cls.label(dark)}>Qualified</p>
              <p className={cls.value(dark)}>{data.qualified}</p>
              <p className={`mt-1 text-xs ${cls.body(dark)}`}>verified their email</p>
            </div>
            <div className={cls.card(dark)}>
              <p className={cls.label(dark)}>Conversion</p>
              <p className={cls.value(dark)}>{data.conversionRate}%</p>
              <p className={`mt-1 text-xs ${cls.body(dark)}`}>signup → verified</p>
            </div>
            <div className={cls.card(dark)}>
              <p className={cls.label(dark)}>Rewards granted</p>
              <p className={cls.value(dark)}>
                {(data.rewardsDistributed || []).reduce((sum, r) => sum + r.count, 0)}
              </p>
              <p className={`mt-1 text-xs ${cls.body(dark)}`}>from the reward ledger</p>
            </div>
          </div>

          {data.rewardsDistributed?.length ? (
            <div className={`${cls.card(dark)} mt-5`}>
              <p className={cls.label(dark)}>By tier</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.rewardsDistributed.map((r) => (
                  <span key={r.tier} className={`rounded-full px-3 py-1 text-xs font-semibold ${dark ? "bg-white/10 text-white/80" : "bg-gray-100 text-gray-700"}`}>
                    {r.tier.replace(/_/g, " ")} × {r.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className={`mb-3 text-sm font-bold uppercase tracking-wide ${dark ? "text-white/70" : "text-gray-700"}`}>
              Top referrers
            </h3>
            {data.topReferrers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className={dark ? "text-white/50" : "text-gray-500"}>
                      {["Writer", "Referral code", "Referrals", "Qualified", "Reward Earned"].map((h) => (
                        <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferrers.map((r) => (
                      <tr key={String(r.userId)} className={`border-t ${dark ? "border-white/10" : "border-gray-200"}`}>
                        <td className="px-3 py-3">
                          <p className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{r.name}</p>
                          <p className={`text-xs ${cls.body(dark)}`}>{r.email}</p>
                        </td>
                        <td className={`px-3 py-3 font-mono text-xs ${cls.body(dark)}`}>{r.referralCode || "—"}</td>
                        <td className={`px-3 py-3 ${cls.body(dark)}`}>{r.referrals}</td>
                        <td className={`px-3 py-3 font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{r.qualified}</td>
                        <td className={`px-3 py-3 font-semibold ${dark ? "text-[#e79aa6]" : "text-[#a83a4d]"}`}>{r.earnedTier || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={cls.body(dark)}>Nobody has referred anyone yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
