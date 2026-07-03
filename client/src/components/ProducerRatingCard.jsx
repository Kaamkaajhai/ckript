import { useEffect, useState, useCallback, useRef } from "react";
import api from "../services/api";

// Producer ratings — an industry-credibility signal shown to EVERY viewer of a script. Producers /
// directors / industry professionals can rate a published script (1–5 stars + an optional note); anyone
// viewing sees the aggregate and the individual endorsements. Self-contained: fetches its own data.
const resolveAvatar = (url) => {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const roleLabel = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "producer") return "Producer";
  if (r === "director") return "Director";
  if (r === "investor") return "Investor";
  if (r === "professional" || r === "industry") return "Industry Professional";
  return role || "";
};

// A row of 5 stars. Interactive when `onSelect` is given.
function Stars({ value = 0, onSelect, size = 18 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type={onSelect ? "button" : undefined}
          disabled={!onSelect}
          onMouseEnter={onSelect ? () => setHover(n) : undefined}
          onClick={onSelect ? () => onSelect(n) : undefined}
          className={`${onSelect ? "cursor-pointer" : "cursor-default"} leading-none transition-transform ${onSelect && hover >= n ? "scale-110" : ""}`}
          style={{ fontSize: size, color: n <= shown ? "#f59e0b" : "#cbd5e1", background: "none", border: "none", padding: 0 }}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProducerRatingCard({ script, user, dark = false, onAggregate }) {
  const scriptId = script?._id;
  const creatorId = script?.creator?._id || script?.creator;
  const isOwner = Boolean(user?._id && creatorId && String(creatorId) === String(user._id));

  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [aggregate, setAggregate] = useState(script?.producerRating || { average: 0, count: 0 });
  const [serverCanRate, setServerCanRate] = useState(false);
  const [form, setForm] = useState({ rating: 0, review: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Keep the (usually inline, unstable) onAggregate callback in a ref so `load` can depend ONLY on
  // scriptId. Otherwise load → setScript → re-render → new onAggregate → new load → effect re-fires:
  // an infinite fetch/re-render loop that also kept resetting the form (the "not working" bug).
  const onAggRef = useRef(onAggregate);
  onAggRef.current = onAggregate;

  const load = useCallback(async () => {
    if (!scriptId) return;
    try {
      const { data } = await api.get(`/producer-ratings/${scriptId}`);
      setRatings(Array.isArray(data.ratings) ? data.ratings : []);
      setMyRating(data.myRating || null);
      setAggregate(data.aggregate || { average: 0, count: 0 });
      setServerCanRate(Boolean(data.canRate));
      if (data.myRating) setForm({ rating: data.myRating.rating, review: data.myRating.review || "" });
      onAggRef.current?.(data.aggregate || { average: 0, count: 0 });
    } catch {
      /* leave the initial aggregate from the script payload */
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => { load(); }, [load]);

  const canRate = serverCanRate && !isOwner && script?.status === "published";

  const submit = async () => {
    if (!form.rating) { setError("Pick a star rating first."); return; }
    setBusy(true); setError("");
    try {
      await api.post("/producer-ratings", { script: scriptId, rating: form.rating, review: form.review.trim() });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not submit your rating.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!myRating?._id) return;
    setBusy(true); setError("");
    try {
      await api.delete(`/producer-ratings/${myRating._id}`);
      setForm({ rating: 0, review: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not remove your rating.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  const hasRatings = (aggregate?.count || 0) > 0;
  // Nothing to show and viewer can't rate → render nothing (keeps the page clean).
  if (!hasRatings && !canRate) return null;

  const card = dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200";
  const title = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-neutral-400" : "text-gray-500";
  const subtle = dark ? "text-neutral-500" : "text-gray-400";
  const field = dark ? "bg-[#0a1220] border-white/[0.08] text-white placeholder:text-neutral-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400";

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${card}`}>
      {/* Header + aggregate */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className={`text-[15px] font-bold ${title}`}>Producer Ratings</h3>
          </div>
          <p className={`text-[12px] mt-0.5 ${muted}`}>Verified industry professionals vouching for this script.</p>
        </div>
        {hasRatings && (
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-2xl font-extrabold text-emerald-500 tabular-nums leading-none">{Number(aggregate.average).toFixed(1)}</span>
              <Stars value={Math.round(aggregate.average)} size={16} />
            </div>
            <p className={`text-[11px] font-semibold mt-0.5 ${subtle}`}>{aggregate.count} producer{aggregate.count === 1 ? "" : "s"}</p>
          </div>
        )}
      </div>

      {/* Rate control (producers only) */}
      {canRate && (
        <div className={`mt-4 rounded-xl border p-4 ${dark ? "border-white/[0.08] bg-[#0a1220]" : "border-gray-200 bg-gray-50/70"}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${subtle}`}>{myRating ? "Your rating" : "Rate this script"}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Stars value={form.rating} onSelect={(n) => setForm((f) => ({ ...f, rating: n }))} size={26} />
            {form.rating > 0 && <span className={`text-sm font-semibold ${title}`}>{form.rating}/5</span>}
          </div>
          <textarea
            value={form.review}
            onChange={(e) => setForm((f) => ({ ...f, review: e.target.value.slice(0, 2000) }))}
            placeholder="Optional: a short note on why (adds weight to your endorsement)…"
            rows={2}
            className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y ${field}`}
          />
          {error && <p className="mt-2 text-[12px] font-semibold text-red-500">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !form.rating}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Saving…" : myRating ? "Update rating" : "Submit rating"}
            </button>
            {myRating && (
              <button type="button" onClick={remove} disabled={busy}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition disabled:opacity-40 ${dark ? "border-white/[0.1] text-neutral-400 hover:bg-white/[0.05]" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Individual endorsements — visible to everyone */}
      {hasRatings && (
        <ul className="mt-4 space-y-3">
          {ratings.map((r) => {
            const p = r.producer || {};
            const avatar = resolveAvatar(p.profileImage);
            return (
              <li key={r._id} className={`flex items-start gap-3 pt-3 border-t ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                {avatar ? (
                  <img src={avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${dark ? "bg-[#1c2a3a] text-neutral-300" : "bg-emerald-50 text-emerald-700"}`}>
                    {(p.name || "P").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold truncate ${title}`}>{p.name || "Producer"}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>{roleLabel(p.role)}</span>
                    {p.companyName && <span className={`text-[11px] ${subtle}`}>· {p.companyName}</span>}
                  </div>
                  <div className="mt-0.5"><Stars value={r.rating} size={13} /></div>
                  {r.review && <p className={`mt-1 text-[13px] leading-snug ${muted}`}>{r.review}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!hasRatings && canRate && (
        <p className={`mt-4 text-[13px] ${muted}`}>No producer ratings yet — be the first to endorse this script.</p>
      )}
    </div>
  );
}
