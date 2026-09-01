import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Check, Loader2 } from "lucide-react";
import { adminApi } from "../../dashboardShared";

/**
 * Who reads what.
 *
 * A panel seat says a judge works on this competition; this says which SCRIPTS they are responsible
 * for. Without it, five judges each read all forty entries — the duplicated effort the panel exists
 * to avoid — and every score is an opinion of everything rather than a deliberate allocation.
 *
 * A grid, because the question is genuinely two-dimensional and an admin needs to see coverage at a
 * glance: an entry nobody is reading, or a judge carrying twice everyone else's load, are both
 * obvious in a matrix and invisible in a list of per-entry dropdowns.
 *
 * Changes are staged and saved together. Each checkbox firing its own request would mean "give these
 * ten scripts to these three judges" is thirty round trips and thirty chances to end up half applied.
 */

/** `${entryId}:${judgeId}` — one flat key rather than nested maps, so a cell is a single lookup. */
const pairKey = (entryId, judgeId) => `${entryId}:${judgeId}`;

export default function JudgeAssignmentMatrix({ competitionId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });

  // What is currently ticked, including unsaved edits. Seeded from the server, then owned locally
  // until save — so a mis-click is undone by unticking rather than by a second round trip.
  const [checked, setChecked] = useState(() => new Set());
  const [saved, setSaved] = useState(() => new Set());
  const [locked, setLocked] = useState(() => new Set());

  /*
   * Refetching is a counter the effect depends on, not a function that fetches.
   *
   * Same shape JudgesSection uses, and for two reasons: a cleanup returned from an async function is
   * a promise React discards, so the cancel flag has to live in the effect body to work at all; and
   * calling a fetcher that setStates directly from an effect is what react-hooks/set-state-in-effect
   * exists to stop.
   */
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .get(`/admin/competitions/${competitionId}/assignments`)
      .then(({ data: res }) => {
        if (cancelled) return;
        const live = new Set(res.assignments.map((a) => pairKey(a.entryId, a.judgeId)));
        setData(res);
        setSaved(live);
        setChecked(new Set(live));
        // A pair whose judge has already submitted cannot be taken back here — their score would
        // keep counting while the entry vanished from their queue. The server refuses it too; this
        // just stops the admin discovering that only after pressing Save.
        setLocked(new Set(res.assignments.filter((a) => a.scored).map((a) => pairKey(a.entryId, a.judgeId))));
      })
      .catch((err) => {
        if (!cancelled) setMessage({ tone: "error", text: err?.response?.data?.message || "Could not load assignments." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [competitionId, tick]);

  const toggle = (entryId, judgeId) => {
    const key = pairKey(entryId, judgeId);
    if (locked.has(key)) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Give one judge every entry, or take back everything of theirs that is not already scored. */
  const toggleColumn = (judgeId, on) => {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const entry of data.entries) {
        const key = pairKey(entry._id, judgeId);
        if (locked.has(key)) continue;
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const dirty = useMemo(() => {
    const assign = [];
    const unassign = [];
    for (const key of checked) if (!saved.has(key)) assign.push(key);
    for (const key of saved) if (!checked.has(key)) unassign.push(key);
    return { assign, unassign, count: assign.length + unassign.length };
  }, [checked, saved]);

  const save = async () => {
    if (!dirty.count) return;
    setSaving(true);
    setMessage({ tone: "", text: "" });
    const split = (keys) => keys.map((k) => {
      const [entryId, judgeId] = k.split(":");
      return { entryId, judgeId };
    });
    try {
      const { data: res } = await adminApi.put(`/admin/competitions/${competitionId}/assignments`, {
        assign: split(dirty.assign),
        unassign: split(dirty.unassign),
      });
      // Reload rather than assuming the local state won: the server may have kept assignments it
      // refused to remove, and showing them as gone would be a lie the next reload corrects.
      load();
      setMessage({
        tone: res.blocked ? "warn" : "ok",
        text: res.message || `Saved — ${res.assigned} assigned, ${res.removed} removed.`,
      });
    } catch (err) {
      setMessage({ tone: "error", text: err?.response?.data?.message || "Could not save the assignments." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-[#666]">Loading assignments…</div>;

  if (!data) {
    return <p className="text-sm text-[#9a2f22]">{message.text || "Could not load assignments."}</p>;
  }

  const { entries, judges } = data;

  if (!judges.length) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <h2 className="text-xl font-serif font-bold text-[#111]">Script assignments</h2>
        <p className="text-sm text-[#666] mt-2 max-w-[62ch]">
          No judges are on this panel yet. Add them under Admin → Judges, then come back to choose
          which scripts each one reads.
        </p>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <h2 className="text-xl font-serif font-bold text-[#111]">Script assignments</h2>
        <p className="text-sm text-[#666] mt-2 max-w-[62ch]">
          No submitted entries yet. Once writers submit, assign their scripts to judges here.
        </p>
      </div>
    );
  }

  const perJudge = (judgeId) => data.entries.filter((e) => checked.has(pairKey(e._id, judgeId))).length;
  const perEntry = (entryId) => judges.filter((j) => checked.has(pairKey(entryId, j._id))).length;
  const unread = entries.filter((e) => perEntry(e._id) === 0).length;

  return (
    <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#111] flex items-center gap-2">
            <Users size={18} /> Script assignments
          </h2>
          <p className="text-sm text-[#666] mt-1 max-w-[68ch]">
            A judge sees only the scripts ticked for them. Assign the same script to several judges to
            get more than one opinion on it.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty.count}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#111] hover:bg-[#333] rounded-lg shadow-md transition-all disabled:opacity-40"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {dirty.count ? `Save ${dirty.count} change${dirty.count === 1 ? "" : "s"}` : "Saved"}
        </button>
      </div>

      {/* The number that matters most: an entry nobody was given is one nobody will score, and it
          would otherwise only surface as a gap in the results table weeks later. */}
      {unread ? (
        <p className="mt-3 text-sm px-4 py-3 rounded-lg bg-[#f8f0e4] border border-[#e5d3b6] text-[#8a5a1c]">
          {unread} {unread === 1 ? "entry has" : "entries have"} no judge assigned and will not be scored by anyone.
        </p>
      ) : null}

      {message.text ? (
        <p className={`mt-3 text-sm px-4 py-3 rounded-lg ${
          message.tone === "error" ? "bg-[#fbeeec] text-[#9a2f22] border border-[#eccbc5]"
            : message.tone === "warn" ? "bg-[#f8f0e4] text-[#8a5a1c] border border-[#e5d3b6]"
              : "bg-[#eaf3ee] text-[#1f6b4a] border border-[#c3ddd0]"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white py-2 pr-4 text-[11px] font-bold uppercase tracking-wide text-[#888]">
                Entry
              </th>
              {judges.map((j) => (
                <th key={j._id} className="py-2 px-2 text-center align-bottom min-w-[110px]">
                  <span className="block text-xs font-semibold text-[#111] truncate max-w-[110px]" title={j.email}>{j.name}</span>
                  <span className="block text-[11px] text-[#888] tabular-nums">{perJudge(j._id)} script{perJudge(j._id) === 1 ? "" : "s"}</span>
                  <button
                    type="button"
                    onClick={() => toggleColumn(j._id, perJudge(j._id) < entries.length)}
                    className="mt-1 text-[11px] underline text-[#666] hover:text-[#111]"
                  >
                    {perJudge(j._id) < entries.length ? "All" : "None"}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const count = perEntry(entry._id);
              return (
                <tr key={entry._id} className="border-t border-[#eee]">
                  <td className="sticky left-0 bg-white py-2 pr-4">
                    <span className="font-mono text-xs text-[#888]">{entry.eventId}</span>
                    <span className="ml-2 text-[#111]">{entry.title || "Untitled"}</span>
                    <span className={`ml-2 text-[11px] ${count ? "text-[#888]" : "text-[#9a2f22] font-semibold"}`}>
                      {count ? `${count} judge${count === 1 ? "" : "s"}` : "unassigned"}
                    </span>
                  </td>
                  {judges.map((j) => {
                    const key = pairKey(entry._id, j._id);
                    const isLocked = locked.has(key);
                    return (
                      <td key={j._id} className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked.has(key)}
                          disabled={isLocked}
                          onChange={() => toggle(entry._id, j._id)}
                          aria-label={`Assign ${entry.eventId} to ${j.name}`}
                          title={isLocked ? "This judge has already submitted a score — void it before unassigning." : ""}
                          className="h-4 w-4 accent-[#111] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#888] mt-4">
        A greyed tick means that judge has already submitted a score for the entry. Void the score
        first if you need to take it back — otherwise it would keep counting toward the result while
        the script disappeared from their queue.
      </p>
    </div>
  );
}
