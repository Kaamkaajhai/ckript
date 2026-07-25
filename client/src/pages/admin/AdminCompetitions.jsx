import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../AdminDashboard";
import ScreenplayReadOnly from "../../components/ScreenplayReadOnly";
import TagSelect from "../../components/TagSelect";
import { genres as GENRE_OPTIONS } from "../CreateProject/constants";

/**
 * Competition administration: create and schedule a challenge, publish it, review entries, and
 * declare results.
 *
 * Kept entirely in this file so AdminDashboard only gains a tab entry and one switch case.
 */

const PHASE_LABELS = {
  announced: "Announced",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  live: "Live",
  judging: "Judging",
  results: "Results declared",
};

const EMPTY_FORM = {
  name: "",
  dates: { regOpensAt: "", regClosesAt: "", startsAt: "", endsAt: "", resultsAt: "" },
  overview: "",
  eligibility: "",
  format: "Any format written in the Ckript editor",
  visibility: "public",
  bannerUrl: "",
  prizePool: "",
  referralTiers: [],
  theme: { title: "", brief: "", allowedGenres: [], guidelines: "" },
  prizes: { winner: [], runnerUp: [], special: [] },
  rules: [""],
  faq: [],
  judges: [],
  sponsors: [],
  communityLinks: [],
  resources: [],
};

// <input type="datetime-local"> speaks local wall-clock time with no zone; the API speaks ISO UTC.
const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : "");

const cls = {
  card: (dark) => `rounded-xl border p-5 ${dark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`,
  input: (dark) => `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#D14D37] ${dark ? "border-white/10 bg-white/[0.04] text-white" : "border-gray-300 bg-white text-gray-900"}`,
  label: (dark) => `block text-xs font-semibold uppercase tracking-wide ${dark ? "text-white/50" : "text-gray-500"}`,
  primary: "rounded-lg bg-[#D14D37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8402d] disabled:cursor-not-allowed disabled:bg-gray-400",
  ghost: (dark) => `rounded-lg border px-4 py-2 text-sm font-medium ${dark ? "border-white/10 text-white/70 hover:bg-white/[0.06]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`,
  heading: (dark) => `text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`,
  body: (dark) => (dark ? "text-white/70" : "text-gray-600"),
};

// A repeater over a list of plain strings (prize lines, rules).
const StringRows = ({ dark, values = [], onChange, placeholder }) => (
  <div className="space-y-2">
    {values.map((value, i) => (
      <div key={i} className="flex gap-2">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
          className={cls.input(dark)}
        />
        <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className={cls.ghost(dark)}>×</button>
      </div>
    ))}
    <button type="button" onClick={() => onChange([...values, ""])} className={cls.ghost(dark)}>+ Add</button>
  </div>
);

// A repeater over a list of objects with fixed text fields (faq, judges, sponsors, links).
const ObjectRows = ({ dark, values = [], fields, onChange }) => (
  <div className="space-y-3">
    {values.map((row, i) => (
      <div key={i} className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <input
            key={field.key}
            value={row[field.key] || ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(values.map((r, j) => (j === i ? { ...r, [field.key]: e.target.value } : r)))}
            className={`${cls.input(dark)} ${field.wide ? "flex-[2_1_240px]" : "flex-1 min-w-[140px]"}`}
          />
        ))}
        <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className={cls.ghost(dark)}>×</button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange([...values, Object.fromEntries(fields.map((f) => [f.key, ""]))])}
      className={cls.ghost(dark)}
    >
      + Add
    </button>
  </div>
);

// MUST stay at module scope. Defined inside CompetitionEditor's body it was a brand-new component
// type on every render, so React tore down and remounted every field on each keystroke — the input
// kept the character but lost the cursor, making the form unusable one letter at a time.
const Group = ({ dark, title, children }) => (
  <div className={`${cls.card(dark)} mt-4`}>
    <h3 className={`mb-3 text-sm font-bold uppercase tracking-wide ${dark ? "text-white/70" : "text-gray-700"}`}>{title}</h3>
    {children}
  </div>
);

const PhasePill = ({ phase, lifecycle }) => (
  <span className="inline-flex items-center gap-2">
    <span className="rounded-full bg-[#D14D37]/10 px-2.5 py-1 text-[11px] font-bold text-[#D14D37]">
      {PHASE_LABELS[phase] || phase}
    </span>
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-700 dark:bg-white/10 dark:text-white/70">
      {lifecycle}
    </span>
  </span>
);

export default function AdminCompetitions({ isDark: dark = false }) {
  const [view, setView] = useState({ mode: "list", id: null });
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const flash = (message) => { setNotice(message); setTimeout(() => setNotice(""), 4000); };

  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/competitions");
      setCompetitions(data.competitions || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load competitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCompetitions(); }, [loadCompetitions]);

  // ── List ──────────────────────────────────────────────────────────────────
  if (view.mode === "list") {
    return (
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className={cls.heading(dark)}>Competitions</h2>
          <button type="button" onClick={() => setView({ mode: "edit", id: null })} className={cls.primary}>
            New Competition
          </button>
        </div>

        {notice ? <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className={cls.body(dark)}>Loading…</p>
        ) : competitions.length === 0 ? (
          <div className={cls.card(dark)}>
            <p className={cls.body(dark)}>No competitions yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((competition) => (
              <div key={competition._id} className={`${cls.card(dark)} flex flex-wrap items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <p className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{competition.name}</p>
                  <p className={`mt-1 text-xs ${cls.body(dark)}`}>
                    {competition.dates?.startsAt ? new Date(competition.dates.startsAt).toLocaleString() : "No start date"}
                    {" · "}{competition.entryCount} registered · {competition.submittedCount} submitted
                  </p>
                  <div className="mt-2"><PhasePill phase={competition.phase} lifecycle={competition.lifecycle} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setView({ mode: "edit", id: competition._id })} className={cls.ghost(dark)}>Edit</button>
                  <button type="button" onClick={() => setView({ mode: "entries", id: competition._id })} className={cls.ghost(dark)}>Entries</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view.mode === "edit") {
    return (
      <CompetitionEditor
        dark={dark}
        competitionId={view.id}
        competitions={competitions}
        onBack={() => { setView({ mode: "list" }); loadCompetitions(); }}
        onSaved={flash}
      />
    );
  }

  return (
    <CompetitionEntries
      dark={dark}
      competitionId={view.id}
      onBack={() => { setView({ mode: "list" }); loadCompetitions(); }}
      onDeclared={flash}
    />
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────

function CompetitionEditor({ dark, competitionId, competitions, onBack, onSaved }) {
  const existing = useMemo(
    () => competitions.find((c) => c._id === competitionId) || null,
    [competitions, competitionId],
  );

  const [form, setForm] = useState(() => {
    if (!existing) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      ...existing,
      dates: {
        regOpensAt: toLocalInput(existing.dates?.regOpensAt),
        regClosesAt: toLocalInput(existing.dates?.regClosesAt),
        startsAt: toLocalInput(existing.dates?.startsAt),
        endsAt: toLocalInput(existing.dates?.endsAt),
        resultsAt: toLocalInput(existing.dates?.resultsAt),
      },
      theme: { ...EMPTY_FORM.theme, ...(existing.theme || {}) },
      prizes: { winner: [], runnerUp: [], special: [], ...(existing.prizes || {}) },
      visibility: existing.visibility || "public",
      bannerUrl: existing.bannerUrl || "",
      prizePool: existing.prizePool || "",
      referralTiers: existing.referralTiers || [],
      rules: existing.rules?.length ? existing.rules : [""],
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setDate = (key, value) => setForm((prev) => ({ ...prev, dates: { ...prev.dates, [key]: value } }));
  const setTheme = (key, value) => setForm((prev) => ({ ...prev, theme: { ...prev.theme, [key]: value } }));
  const setPrize = (key, value) => setForm((prev) => ({ ...prev, prizes: { ...prev.prizes, [key]: value } }));

  const payload = () => ({
    name: form.name,
    dates: Object.fromEntries(Object.entries(form.dates).map(([k, v]) => [k, fromLocalInput(v)]).filter(([, v]) => v)),
    overview: form.overview,
    eligibility: form.eligibility,
    format: form.format,
    visibility: form.visibility,
    bannerUrl: form.bannerUrl,
    prizePool: form.prizePool,
    // Empty rows are dropped; an empty list means "use the platform defaults".
    referralTiers: (form.referralTiers || []).filter((t) => Number(t.count) > 0 && String(t.id || "").trim()),
    theme: form.theme,
    prizes: form.prizes,
    rules: form.rules.filter((r) => r.trim()),
    faq: form.faq,
    judges: form.judges,
    sponsors: form.sponsors,
    communityLinks: form.communityLinks,
    resources: form.resources,
  });

  const run = async (fn, successMessage) => {
    setSaving(true);
    setError("");
    try {
      await fn();
      onSaved(successMessage);
      onBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const save = () => run(async () => {
    if (competitionId) await adminApi.put(`/admin/competitions/${competitionId}`, payload());
    else await adminApi.post("/admin/competitions", payload());
  }, competitionId ? "Competition updated." : "Competition created.");

  const publish = () => {
    if (!window.confirm("Publish this competition? It becomes visible to everyone and registration follows the schedule.")) return;
    run(async () => {
      await adminApi.put(`/admin/competitions/${competitionId}`, payload());
      await adminApi.post(`/admin/competitions/${competitionId}/publish`);
    }, "Competition published.");
  };

  const archive = () => {
    if (!window.confirm("Archive this competition? It disappears from the public page.")) return;
    run(() => adminApi.post(`/admin/competitions/${competitionId}/archive`), "Competition archived.");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={cls.heading(dark)}>{competitionId ? "Edit competition" : "New competition"}</h2>
        <button type="button" onClick={onBack} className={cls.ghost(dark)}>← Back</button>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <Group dark={dark} title="Basics">
        <label className={cls.label(dark)}>Name</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Overview</label>
        <textarea rows={4} value={form.overview} onChange={(e) => set("overview", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Eligibility</label>
        <input value={form.eligibility} onChange={(e) => set("eligibility", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Format</label>
        <input value={form.format} onChange={(e) => set("format", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Banner image URL</label>
        <input value={form.bannerUrl} onChange={(e) => set("bannerUrl", e.target.value)} placeholder="https://…"
          className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Prize pool</label>
        <input value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)}
          placeholder="e.g. ₹50,000 + Gold subscriptions" className={`${cls.input(dark)} mt-1`} />
        <p className={`mt-1 text-xs ${cls.body(dark)}`}>Shown on the Hall of Fame. Free text — any currency, cash or not.</p>

        <label className={`${cls.label(dark)} mt-4`}>Visibility</label>
        <select value={form.visibility} onChange={(e) => set("visibility", e.target.value)} className={`${cls.input(dark)} mt-1`}>
          <option value="public">Public — listed everywhere</option>
          <option value="hidden">Hidden — reachable by direct link only</option>
        </select>
        <p className={`mt-1 text-xs ${cls.body(dark)}`}>
          Hidden competitions never appear on the public challenge page or in the Hall of Fame, but run
          normally for anyone who has the link. Use for internal betas, university or sponsor-only events.
        </p>
      </Group>

      <Group dark={dark} title="Schedule">
        <p className={`mb-3 text-xs ${cls.body(dark)}`}>
          Entered in your local time. Phases derive from these — correcting a date updates every screen instantly.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["regOpensAt", "Registration opens"],
            ["regClosesAt", "Registration closes"],
            ["startsAt", "Competition starts"],
            ["endsAt", "Submission deadline"],
            ["resultsAt", "Results (planned)"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className={cls.label(dark)}>{label}</label>
              <input
                type="datetime-local"
                value={form.dates[key]}
                onChange={(e) => setDate(key, e.target.value)}
                className={`${cls.input(dark)} mt-1`}
              />
            </div>
          ))}
        </div>
      </Group>

      <Group dark={dark} title="Theme (hidden from writers until the competition goes live)">
        <label className={cls.label(dark)}>Theme title</label>
        <input value={form.theme.title} onChange={(e) => setTheme("title", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Brief</label>
        <textarea rows={4} value={form.theme.brief} onChange={(e) => setTheme("brief", e.target.value)} className={`${cls.input(dark)} mt-1`} />

        <label className={`${cls.label(dark)} mt-4`}>Allowed genres</label>
        <div className="mt-2">
          <TagSelect
            options={GENRE_OPTIONS}
            value={form.theme.allowedGenres}
            onChange={(v) => setTheme("allowedGenres", v)}
            multiple
            dark={dark}
            ariaLabel="Allowed genres"
          />
        </div>

        <label className={`${cls.label(dark)} mt-4`}>Guidelines</label>
        <textarea rows={3} value={form.theme.guidelines} onChange={(e) => setTheme("guidelines", e.target.value)} className={`${cls.input(dark)} mt-1`} />
      </Group>

      <Group dark={dark} title="Prizes">
        <label className={cls.label(dark)}>Winner</label>
        <div className="mt-2"><StringRows dark={dark} values={form.prizes.winner} onChange={(v) => setPrize("winner", v)} placeholder="e.g. Gold Subscription (30 days)" /></div>

        <label className={`${cls.label(dark)} mt-5`}>Runner-Up</label>
        <div className="mt-2"><StringRows dark={dark} values={form.prizes.runnerUp} onChange={(v) => setPrize("runnerUp", v)} placeholder="e.g. Silver Subscription (30 days)" /></div>

        <label className={`${cls.label(dark)} mt-5`}>Special awards</label>
        <div className="mt-2">
          <ObjectRows
            dark={dark}
            values={form.prizes.special}
            onChange={(v) => setPrize("special", v)}
            fields={[{ key: "title", placeholder: "Award title" }, { key: "description", placeholder: "Description", wide: true }]}
          />
        </div>
      </Group>

      <Group dark={dark} title="Referral rewards">
        <p className={`mb-3 text-xs ${cls.body(dark)}`}>
          Writers who bring other writers in earn these. Leave empty to use the platform defaults
          (3 → Challenge Advocate, 5 → +15 days Silver, 10 → +30 days Silver). The ID becomes the
          reward's permanent key — changing it after results are declared will not re-grant anything.
        </p>
        <ObjectRows
          dark={dark}
          values={form.referralTiers}
          onChange={(v) => set("referralTiers", v)}
          fields={[
            { key: "count", placeholder: "Referrals needed" },
            { key: "id", placeholder: "Reward ID (e.g. challenge_referral_gold)", wide: true },
            { key: "label", placeholder: "Label" },
            { key: "days", placeholder: "Silver days (0 = badge only)" },
          ]}
        />
      </Group>

      <Group dark={dark} title="Rules">
        <StringRows dark={dark} values={form.rules} onChange={(v) => set("rules", v)} placeholder="Rule text" />
      </Group>

      <Group dark={dark} title="FAQ">
        <ObjectRows dark={dark} values={form.faq} onChange={(v) => set("faq", v)}
          fields={[{ key: "q", placeholder: "Question" }, { key: "a", placeholder: "Answer", wide: true }]} />
      </Group>

      <Group dark={dark} title="Judges">
        <ObjectRows dark={dark} values={form.judges} onChange={(v) => set("judges", v)}
          fields={[{ key: "name", placeholder: "Name" }, { key: "title", placeholder: "Title" }, { key: "photoUrl", placeholder: "Photo URL" }, { key: "bio", placeholder: "Short bio", wide: true }]} />
      </Group>

      <Group dark={dark} title="Sponsors">
        <ObjectRows dark={dark} values={form.sponsors} onChange={(v) => set("sponsors", v)}
          fields={[{ key: "name", placeholder: "Name" }, { key: "logoUrl", placeholder: "Logo URL" }, { key: "url", placeholder: "Link" }, { key: "tier", placeholder: "Tier (e.g. Gold)" }]} />
      </Group>

      <Group dark={dark} title="Community links">
        <ObjectRows dark={dark} values={form.communityLinks} onChange={(v) => set("communityLinks", v)}
          fields={[{ key: "label", placeholder: "Label" }, { key: "url", placeholder: "URL", wide: true }]} />
      </Group>

      <Group dark={dark} title="Resources">
        <ObjectRows dark={dark} values={form.resources} onChange={(v) => set("resources", v)}
          fields={[{ key: "label", placeholder: "Label" }, { key: "url", placeholder: "URL", wide: true }]} />
      </Group>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={saving} className={cls.primary}>
          {saving ? "Saving…" : "Save"}
        </button>
        {competitionId && existing?.lifecycle !== "published" ? (
          <button type="button" onClick={publish} disabled={saving} className={cls.ghost(dark)}>Save & Publish</button>
        ) : null}
        {competitionId && existing?.lifecycle !== "archived" ? (
          <button type="button" onClick={archive} disabled={saving} className={cls.ghost(dark)}>Archive</button>
        ) : null}
      </div>
    </div>
  );
}

// ── Entries + declare results ───────────────────────────────────────────────

function CompetitionEntries({ dark, competitionId, onBack, onDeclared }) {
  const [state, setState] = useState({ entries: [], phase: null, competition: null, loading: true });
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [retrying, setRetrying] = useState("");

  const [winnerEntryId, setWinnerEntryId] = useState("");
  const [runnerUpEntryId, setRunnerUpEntryId] = useState("");
  const [specialAwards, setSpecialAwards] = useState([]);
  const [declaring, setDeclaring] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get(`/admin/competitions/${competitionId}/entries`);
      setState({ entries: data.entries || [], phase: data.phase, competition: data.competition, loading: false });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load entries.");
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [competitionId]);

  useEffect(() => { load(); }, [load]);

  const submitted = state.entries.filter((e) => ["submitted", "ai_processed", "judged"].includes(e.status));
  const declared = Boolean(state.competition?.resultsDeclaredAt);

  const retryAI = async (entryId) => {
    setRetrying(entryId);
    try {
      await adminApi.post(`/admin/competitions/${competitionId}/entries/${entryId}/retry-ai`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Retry failed.");
    } finally {
      setRetrying("");
    }
  };

  const declare = async () => {
    const winner = submitted.find((e) => e._id === winnerEntryId);
    const runnerUp = submitted.find((e) => e._id === runnerUpEntryId);
    const summary = [
      `Winner: ${winner?.userId?.name || "—"} — Gold subscription (30 days), winner badge, featured script, AI trailer`,
      runnerUp ? `Runner-Up: ${runnerUp.userId?.name} — Silver subscription (30 days), runner-up badge, featured script` : null,
      ...specialAwards.map((a) => {
        const entry = submitted.find((e) => e._id === a.entryId);
        return `Special "${a.title}": ${entry?.userId?.name || "—"} — special badge`;
      }),
      `Everyone else who submitted (${Math.max(0, submitted.length - 1 - (runnerUp ? 1 : 0) - specialAwards.length)}) — participant badge`,
    ].filter(Boolean).join("\n");

    if (!window.confirm(`Declare results?\n\n${summary}\n\nThis cannot be undone.`)) return;

    setDeclaring(true);
    setError("");
    try {
      const { data } = await adminApi.post(`/admin/competitions/${competitionId}/results`, {
        winnerEntryId,
        runnerUpEntryId: runnerUpEntryId || undefined,
        specialAwards: specialAwards.filter((a) => a.entryId && a.title),
      });
      onDeclared(`Results declared — ${data.counts.winners} winner, ${data.counts.runnerUp} runner-up, ${data.counts.special} special, ${data.counts.participants} participants.`);
      onBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to declare results.");
    } finally {
      setDeclaring(false);
    }
  };

  const entryOptions = submitted.map((e) => (
    <option key={e._id} value={e._id}>{e.userId?.name || "Unknown"} — {e.snapshot?.title || "Untitled"} ({e.eventId})</option>
  ));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={cls.heading(dark)}>{state.competition?.name || "Entries"}</h2>
          <p className={`mt-1 text-xs ${cls.body(dark)}`}>
            {state.entries.length} registered · {submitted.length} submitted · {PHASE_LABELS[state.phase] || state.phase}
          </p>
        </div>
        <button type="button" onClick={onBack} className={cls.ghost(dark)}>← Back</button>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      {state.phase === "judging" && !declared ? (
        <div className={`${cls.card(dark)} mb-5 border-[#D14D37]/40`}>
          <h3 className={`${cls.heading(dark)} text-base`}>Declare results</h3>
          <p className={`mt-1 text-xs ${cls.body(dark)}`}>Rewards are granted automatically and cannot be taken back.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={cls.label(dark)}>Winner (required)</label>
              <select value={winnerEntryId} onChange={(e) => setWinnerEntryId(e.target.value)} className={`${cls.input(dark)} mt-1`}>
                <option value="">Select an entry…</option>
                {entryOptions}
              </select>
            </div>
            <div>
              <label className={cls.label(dark)}>Runner-Up (optional)</label>
              <select value={runnerUpEntryId} onChange={(e) => setRunnerUpEntryId(e.target.value)} className={`${cls.input(dark)} mt-1`}>
                <option value="">None</option>
                {entryOptions}
              </select>
            </div>
          </div>

          <label className={`${cls.label(dark)} mt-5`}>Special awards</label>
          <div className="mt-2 space-y-2">
            {specialAwards.map((award, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <select
                  value={award.entryId}
                  onChange={(e) => setSpecialAwards(specialAwards.map((a, j) => (j === i ? { ...a, entryId: e.target.value } : a)))}
                  className={`${cls.input(dark)} flex-1 min-w-[200px]`}
                >
                  <option value="">Select an entry…</option>
                  {entryOptions}
                </select>
                <input
                  value={award.title}
                  placeholder="Award title"
                  onChange={(e) => setSpecialAwards(specialAwards.map((a, j) => (j === i ? { ...a, title: e.target.value } : a)))}
                  className={`${cls.input(dark)} flex-1 min-w-[160px]`}
                />
                <button type="button" onClick={() => setSpecialAwards(specialAwards.filter((_, j) => j !== i))} className={cls.ghost(dark)}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => setSpecialAwards([...specialAwards, { entryId: "", title: "" }])} className={cls.ghost(dark)}>+ Add special award</button>
          </div>

          <button type="button" onClick={declare} disabled={!winnerEntryId || declaring} className={`${cls.primary} mt-5`}>
            {declaring ? "Declaring…" : "Declare results"}
          </button>
        </div>
      ) : null}

      {declared ? (
        <div className={`${cls.card(dark)} mb-5`}>
          <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
            Results declared {new Date(state.competition.resultsDeclaredAt).toLocaleString()}
          </p>
        </div>
      ) : null}

      {state.loading ? (
        <p className={cls.body(dark)}>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className={dark ? "text-white/50" : "text-gray-500"}>
                {["Writer", "Event ID", "Status", "Submitted", "Pages / Words", "AI", "Result", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.entries.map((entry) => (
                <tr key={entry._id} className={`border-t ${dark ? "border-white/10" : "border-gray-200"}`}>
                  <td className="px-3 py-3">
                    <p className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>{entry.userId?.name || "—"}</p>
                    <p className={`text-xs ${cls.body(dark)}`}>{entry.userId?.email}</p>
                  </td>
                  <td className={`px-3 py-3 font-mono text-xs ${cls.body(dark)}`}>{entry.eventId}</td>
                  <td className={`px-3 py-3 ${cls.body(dark)}`}>{entry.status}</td>
                  <td className={`px-3 py-3 text-xs ${cls.body(dark)}`}>
                    {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "—"}
                  </td>
                  <td className={`px-3 py-3 text-xs ${cls.body(dark)}`}>
                    {entry.snapshot?.pageCount || 0} / {entry.snapshot?.wordCount || 0}
                  </td>
                  <td className="px-3 py-3 max-w-[280px]">
                    {entry.ai?.error ? (
                      <div>
                        <p className="text-xs text-red-500">{entry.ai.error}</p>
                        <button
                          type="button"
                          onClick={() => retryAI(entry._id)}
                          disabled={retrying === entry._id}
                          className="mt-1 text-xs font-semibold text-[#D14D37] hover:underline"
                        >
                          {retrying === entry._id ? "Retrying…" : "Retry AI"}
                        </button>
                      </div>
                    ) : entry.ai?.logline ? (
                      <div>
                        <p className={`text-xs ${cls.body(dark)} ${expanded[entry._id] ? "" : "line-clamp-2"}`}>{entry.ai.logline}</p>
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [entry._id]: !prev[entry._id] }))}
                          className="mt-1 text-xs font-medium text-[#D14D37] hover:underline"
                        >
                          {expanded[entry._id] ? "Less" : "More"}
                        </button>
                        {entry.ai.evaluation?.overall ? (
                          <p className={`mt-1 text-xs font-semibold ${dark ? "text-white/70" : "text-gray-700"}`}>
                            Score {entry.ai.evaluation.overall}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className={`text-xs ${cls.body(dark)}`}>—</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-xs ${cls.body(dark)}`}>
                    {entry.result?.specialTitle || entry.result?.award || "—"}
                  </td>
                  <td className="px-3 py-3">
                    {entry.snapshot?.fountainContent || entry.snapshot?.textContent ? (
                      <button type="button" onClick={() => setSnapshot(entry)} className={cls.ghost(dark)}>View</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {snapshot ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onMouseDown={() => setSnapshot(null)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl ${dark ? "bg-[#141414]" : "bg-white"}`}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${dark ? "border-white/10" : "border-gray-200"}`}>
              <div>
                <p className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>{snapshot.snapshot?.title || "Untitled"}</p>
                <p className={`text-xs ${cls.body(dark)}`}>{snapshot.userId?.name} · {snapshot.eventId}</p>
              </div>
              <button type="button" onClick={() => setSnapshot(null)} className={cls.ghost(dark)}>Close</button>
            </div>
            <div className="overflow-y-auto p-5">
              <ScreenplayReadOnly
                text={snapshot.snapshot?.fountainContent || snapshot.snapshot?.textContent || ""}
                dark={dark}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
