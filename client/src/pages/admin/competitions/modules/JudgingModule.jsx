import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Lock, Save } from "lucide-react";
import { adminApi } from "../../dashboardShared";

/**
 * Scoring criteria and award categories for the invited judge panel.
 *
 * NOT the same thing as the "Judging Panel" tab beside it. That one edits `judges[]` — public
 * marketing copy with photos, bios and IMDb links, rendered on the competition landing page. This
 * one configures what real judge accounts actually score against.
 *
 * THE ONE WAY THIS MODULE DIFFERS FROM EVERY OTHER ONE: it does not use the `({data, onChange})`
 * contract and it has its own Save button.
 *
 * The editor's global Save spreads the whole competition object into a PUT, and the server's
 * CONTENT_FIELDS whitelist silently drops anything not listed — `judging` is deliberately not
 * listed. If it were, a tab opened before the rubric was written would blank it on the next save of
 * any unrelated field, after judges had already scored against it. So the rubric goes through
 * PUT /admin/competitions/:id/judging, which refuses once judging has locked.
 *
 * Weights are relative and do not have to total 100. The server normalises them (w/Σw), because an
 * admin typing 3 / 2 / 1 means something perfectly clear and should not have to do the arithmetic.
 */

const blankCriterion = () => ({ key: "", label: "", description: "", weight: 1 });
const blankAward = () => ({ key: "", label: "", description: "" });

/** Datetime-local wants "YYYY-MM-DDTHH:mm" with no zone; the API speaks ISO. */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function Rows({ title, hint, rows, onChange, withWeight, addLabel, disabled }) {
  const set = (index, patch) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#111]">{title}</h2>
          <p className="text-sm text-[#666] mt-1">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...rows, withWeight ? blankCriterion() : blankAward()])}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#111] border border-[#ddd] rounded-lg hover:bg-[#f6f4f2] transition-colors disabled:opacity-40"
        >
          <Plus size={15} /> {addLabel}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[#888] py-6 text-center border border-dashed border-[#e2e2e2] rounded-xl">
          Nothing yet. {addLabel} to begin.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-[#faf9f8] border border-[#eee]">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={row.label || ""}
                  onChange={(e) => set(i, { label: e.target.value })}
                  disabled={disabled}
                  placeholder={withWeight ? "Structure" : "Best Dialogue"}
                  className="w-full px-3 py-2 text-sm font-semibold border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233] disabled:bg-[#f0efee]"
                />
                <input
                  type="text"
                  value={row.description || ""}
                  onChange={(e) => set(i, { description: e.target.value })}
                  disabled={disabled}
                  placeholder="What a judge should be weighing (optional)"
                  className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233] disabled:bg-[#f0efee]"
                />
              </div>

              {withWeight ? (
                <div className="w-24">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#888] mb-1">Weight</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.weight ?? 0}
                    onChange={(e) => set(i, { weight: e.target.value })}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233] disabled:bg-[#f0efee]"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label={`Remove ${row.label || "row"}`}
                className="mt-6 p-2 text-[#9a2f22] hover:bg-[#fbeeec] rounded-lg transition-colors disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JudgingModule({ competitionId }) {
  const [criteria, setCriteria] = useState([]);
  const [awards, setAwards] = useState([]);
  const [scale, setScale] = useState(10);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState(null);
  const [panel, setPanel] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(competitionId) && competitionId !== "new");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });

  const isNew = !competitionId || competitionId === "new";

  // Refetching is a counter the effect depends on, so the cleanup flag lives in the effect body
  // where it actually works — a cleanup returned from an async function is a promise React discards.
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    adminApi
      .get(`/admin/competitions/${competitionId}/judging`)
      .then(({ data }) => {
        if (cancelled) return;
        const j = data.judging || {};
        setCriteria(j.criteria || []);
        setAwards(j.awards || []);
        setScale(j.scale || 10);
        setOpensAt(toLocalInput(j.opensAt));
        setClosesAt(toLocalInput(j.closesAt));
        setLocked(Boolean(data.locked));
        setLockedAt(j.lockedAt || null);
        setPanel(data.panel || []);
      })
      .catch((err) => {
        if (!cancelled) setMessage({ tone: "error", text: err?.response?.data?.message || "Could not load the judging setup." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [competitionId, isNew, tick]);

  const save = async () => {
    setSaving(true);
    setMessage({ tone: "", text: "" });
    try {
      await adminApi.put(`/admin/competitions/${competitionId}/judging`, {
        criteria,
        awards,
        scale: Number(scale) || 10,
        opensAt: opensAt || null,
        closesAt: closesAt || null,
      });
      setMessage({ tone: "ok", text: "Judging setup saved." });
      load();
    } catch (err) {
      setMessage({ tone: "error", text: err?.response?.data?.message || "Could not save the judging setup." });
    } finally {
      setSaving(false);
    }
  };

  const unlock = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.post(`/admin/competitions/${competitionId}/judging/unlock`);
      setMessage({
        tone: "ok",
        text: `Judging reopened. ${data.affectedScores || 0} submitted score(s) were cast against the previous rubric and are now flagged as such.`,
      });
      load();
    } catch (err) {
      setMessage({ tone: "error", text: err?.response?.data?.message || "Could not reopen judging." });
    } finally {
      setSaving(false);
    }
  };

  if (isNew) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <h2 className="text-xl font-serif font-bold text-[#111]">Judging &amp; Scoring</h2>
        <p className="text-sm text-[#666] mt-2">
          Save this competition first — the judging rubric is stored against it, and it needs an id to attach to.
        </p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-sm text-[#666]">Loading judging setup…</div>;

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Judging &amp; Scoring</h2>
            <p className="text-sm text-[#666] mt-1 max-w-[62ch]">
              What the invited panel scores against. Judges see entries anonymously — an entry code, the
              title and the script, never the writer. This is separate from the public “Judging Panel”
              tab, which is marketing copy.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || locked}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#111] hover:bg-[#333] rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            <Save size={15} /> {saving ? "Saving…" : "Save judging setup"}
          </button>
        </div>

        {/* Said explicitly, because every other tab in this editor is saved by the global button and
            an admin would reasonably assume this one is too. */}
        <p className="text-xs text-[#888] mt-3">
          This section has its own Save — the editor's main Save button does not write it.
        </p>

        {message.text ? (
          <p className={`mt-4 text-sm px-4 py-3 rounded-lg ${message.tone === "error" ? "bg-[#fbeeec] text-[#9a2f22] border border-[#eccbc5]" : "bg-[#eaf3ee] text-[#1f6b4a] border border-[#c3ddd0]"}`}>
            {message.text}
          </p>
        ) : null}

        {locked ? (
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-[#f8f0e4] border border-[#e5d3b6]">
            <Lock size={16} className="text-[#8a5a1c] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#8a5a1c]">Rubric frozen</p>
              <p className="text-sm text-[#8a5a1c] mt-1">
                A judge submitted a score{lockedAt ? ` on ${new Date(lockedAt).toLocaleString()}` : ""}. Changing a
                weight now would silently restate what they already decided. Reopening bumps the rubric version so
                earlier scores stay identifiable.
              </p>
              <button
                type="button"
                onClick={unlock}
                disabled={saving}
                className="mt-3 px-4 py-1.5 text-sm font-semibold text-[#8a5a1c] border border-[#e5d3b6] rounded-lg hover:bg-[#f3e8d6] transition-colors disabled:opacity-40"
              >
                Reopen judging
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#888] mb-1.5">Marks per criterion</label>
            <input
              type="number" min={2} max={100} value={scale} disabled={locked}
              onChange={(e) => setScale(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233] disabled:bg-[#f0efee]"
            />
            <p className="text-xs text-[#888] mt-1">Judges score 0–{scale || 10} on each.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#888] mb-1.5">Judging opens</label>
            <input
              type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233]"
            />
            <p className="text-xs text-[#888] mt-1">Optional. Defaults to when submissions close.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-[#888] mb-1.5">Judging closes</label>
            <input
              type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a2233]"
            />
            <p className="text-xs text-[#888] mt-1">Optional. Otherwise it runs until results are declared.</p>
          </div>
        </div>

        {panel.length ? (
          <div className="mt-6 pt-6 border-t border-[#eee]">
            <h3 className="text-sm font-bold text-[#111] mb-3">Panel</h3>
            <div className="flex flex-wrap gap-2">
              {panel.filter((p) => p.status === "active").map((p) => (
                <span key={String(p.judgeId)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full bg-[#faf9f8] border border-[#eee]">
                  {p.name}
                  <b className="text-[#666] font-semibold">{p.submittedCount} scored</b>
                </span>
              ))}
            </div>
            <p className="text-xs text-[#888] mt-2">Add and remove judges in Admin → Judges.</p>
          </div>
        ) : (
          <p className="mt-6 pt-6 border-t border-[#eee] text-sm text-[#888]">
            No judges assigned yet. Create them in Admin → Judges, then assign them to this competition.
          </p>
        )}
      </div>

      <Rows
        title="Scoring criteria"
        hint={
          criteria.length
            ? `Weights are relative — they do not have to add up to 100. Currently ${totalWeight} across ${criteria.length} criteria.`
            : "What each judge marks. Weights are relative, so 3 / 2 / 1 works exactly as you would expect."
        }
        rows={criteria}
        onChange={setCriteria}
        withWeight
        addLabel="Add criterion"
        disabled={locked}
      />

      <Rows
        title="Special award categories"
        hint="Judges can nominate one entry per category, with a reason. You see the tally when you declare results."
        rows={awards}
        onChange={setAwards}
        addLabel="Add category"
        disabled={false}
      />
    </div>
  );
}
