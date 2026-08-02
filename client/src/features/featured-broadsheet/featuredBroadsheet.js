/*
 * featuredBroadsheet.js — every derivation the /featured broadsheet performs.
 *
 * Pure functions over the script documents /scripts/featured and /scripts
 * already return, plus the viewer's own `industryProfile.mandates`. No React,
 * no fetching, no formatting decisions hidden inside JSX — so the labels the
 * page renders can be unit tested without mounting anything.
 *
 * WHY A SEPARATE MODULE
 * ---------------------
 * The design leans on derived language: "Spotlight · ends in 19 days", "Shown
 * first because it matches your mandate", "Partial · 3 of 10". Those sentences
 * are business rules about spotlight windows, mandate fit and score provenance
 * — not presentation — and getting them wrong is how a page starts lying about
 * paid placement. They live here, next to their tests.
 */

/* ── Filter vocabularies ───────────────────────────────────────────────────
 * These mirror the values the API accepts. GENRES and BUDGETS match the Script
 * model's own enums; CONTENT_TYPES is the model's `contentType` enum in the
 * order the previous page listed it, so a returning user finds the same chips.
 */
export const GENRES = [
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
];

export const CONTENT_TYPES = [
  { key: "movie", label: "Movie" },
  { key: "tv_series", label: "TV Series" },
  { key: "short_film", label: "Short Film" },
  { key: "web_series", label: "Web Series" },
  { key: "documentary", label: "Documentary" },
  { key: "micro_drama", label: "Micro Drama" },
  { key: "anime", label: "Anime" },
  { key: "book", label: "Book" },
  { key: "startup", label: "Startup" },
  { key: "songs", label: "Songs" },
  { key: "standup_comedy", label: "Standup Comedy" },
  { key: "dialogues", label: "Dialogues" },
  { key: "poet", label: "Poet" },
];

export const BUDGETS = [
  { key: "micro", label: "Micro" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "blockbuster", label: "Blockbuster" },
];

export const SORT_OPTIONS = [
  { key: "engagement", label: "Trending" },
  { key: "price_high", label: "Highest Paid" },
  { key: "views", label: "Most Viewed" },
  { key: "score", label: "Top Rated" },
  { key: "createdAt", label: "Newest" },
  { key: "price_low", label: "Price: Low → High" },
];

export const PREMIUM_OPTIONS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free Only" },
  { key: "premium", label: "Premium Only" },
];

/*
 * "Only show" toggles. Each one filters on a field the document already
 * carries, so none of them needs a new query parameter — `mandate` is the only
 * one that depends on the viewer, and it degrades to a no-op when the viewer
 * has not set a mandate (see applyOnlyFilters).
 */
export const ONLY_OPTIONS = [
  { key: "spotlight", label: "Spotlight active" },
  { key: "verified", label: "Verified" },
  { key: "trailer", label: "Has trailer" },
  { key: "evaluated", label: "Evaluated" },
  { key: "mandate", label: "Matches mandate" },
];

export const EMPTY_FILTERS = Object.freeze({
  genres: [], types: [], budgets: [], premium: "all", only: [],
});

/* ── Small formatters ──────────────────────────────────────────────────────── */

/** 12412 → "12.4k". Matches the design's compact metric column. */
export const formatCount = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000) {
    const k = n / 1000;
    // 12.0k reads as a rounding artefact; 12k is what the design shows.
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(n);
};

export const getContentTypeLabel = (key) =>
  CONTENT_TYPES.find((t) => t.key === key)?.label
  || String(key || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  || "—";

export const getBudgetLabel = (key) =>
  BUDGETS.find((b) => b.key === key)?.label || "—";

export const getSortLabel = (key) =>
  (SORT_OPTIONS.find((s) => s.key === key) || SORT_OPTIONS[0]).label;

/**
 * The score the page ranks and displays. `scriptScore` is the AI evaluation the
 * writer paid for; `platformScore` is the admin's. The former is what the rest
 * of the product surfaces, so it wins, with the admin score as the fallback
 * rather than a second number competing with it.
 */
export const getScore = (script) =>
  Number(script?.scriptScore?.overall)
  || Number(script?.platformScore?.overall)
  || 0;

export const getViews = (script) => Number(script?.views) || 0;

/** `readsCount` is the counter the model increments; analytics.reads mirrors it. */
export const getReads = (script) =>
  Number(script?.readsCount) || Number(script?.analytics?.reads) || 0;

export const getPriceLabel = (script) =>
  script?.premium ? `$${Number(script?.price) || 0}` : "Free";

/** A script with no ratings yet shows an em dash, never "0.0". */
export const getRatingLabel = (script) => {
  const rating = Number(script?.rating) || 0;
  return rating > 0 ? `★ ${rating.toFixed(1)}` : "—";
};

export const getLoglineLabel = (script) =>
  script?.logline
  || script?.synopsis
  || script?.description
  || "No logline supplied — open the details for the synopsis.";

export const getCreatorName = (script) => script?.creator?.name || "Unknown writer";

export const getFormatLabel = (script) =>
  script?.format || getContentTypeLabel(script?.contentType);

export const getMetaLine = (script) =>
  [getCreatorName(script), script?.genre, getFormatLabel(script)]
    .filter(Boolean)
    .join(" · ");

/**
 * "Complete" / "Partial · 3 of 10", straight off scriptCompletion. The design
 * shows this next to page count, and it is the one field that tells a producer
 * whether they are looking at a finished screenplay.
 */
export const getCompletionLabel = (script) => {
  const completion = script?.scriptCompletion;
  const status = completion?.status || "complete";
  const done = Number(completion?.completedParts) || 0;
  const total = Number(completion?.totalParts) || 0;
  if (status === "complete") return "Complete";
  const word = status === "ongoing" ? "Ongoing" : "Partial";
  return total > 0 ? `${word} · ${done} of ${total}` : word;
};

/* ── Spotlight ─────────────────────────────────────────────────────────────
 * A spotlight is paid placement with a real end date. Everything the page says
 * about it is derived from promotion.spotlightEndAt so the copy cannot outlive
 * the purchase.
 */

export const isSpotlightActive = (script, now = new Date()) => {
  if (!script?.promotion?.spotlightActive) return false;
  const endAt = script?.promotion?.spotlightEndAt;
  // An active flag with no end date is an open-ended placement, not an expired one.
  if (!endAt) return true;
  return new Date(endAt).getTime() >= now.getTime();
};

export const getSpotlightDaysLeft = (script, now = new Date()) => {
  const endAt = script?.promotion?.spotlightEndAt;
  if (!endAt) return 0;
  const ms = new Date(endAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000);
};

/**
 * The badge on a spotlight card. `isTop` is reserved for the first slot in the
 * lead rotation, which is the placement writers actually pay the premium for.
 */
export const getSpotlightLabel = (script, { isTop = false, now = new Date() } = {}) => {
  if (!isSpotlightActive(script, now)) return "";
  const days = getSpotlightDaysLeft(script, now);
  const prefix = isTop ? "Top spotlight" : "Spotlight";
  if (!days) return prefix;
  return `${prefix} · ends in ${days} ${days === 1 ? "day" : "days"}`;
};

/* ── Mandate ───────────────────────────────────────────────────────────────
 * The viewer's standing brief, stored on the user as
 * industryProfile.mandates {formats, genres, excludeGenres, specificHooks} and
 * edited at /mandates. Shelf 03 groups by it; the "Matches mandate" toggle
 * filters by it. A viewer who has set nothing has no mandate, and every
 * mandate-shaped surface hides rather than inventing a default brief.
 */

export const getMandate = (user) => {
  const raw = user?.industryProfile?.mandates || {};
  const genres = (raw.genres || []).filter(Boolean);
  const formats = (raw.formats || []).filter(Boolean);
  const excludeGenres = (raw.excludeGenres || []).filter(Boolean);
  const hooks = (raw.specificHooks || []).filter(Boolean);
  const isSet = genres.length > 0 || formats.length > 0 || hooks.length > 0;

  const parts = [];
  if (genres.length) parts.push(genres.slice(0, 2).join(" · "));
  if (formats.length) parts.push(formats.slice(0, 2).join(" · "));
  if (hooks.length) parts.push(hooks.slice(0, 1).join(""));

  return {
    genres, formats, excludeGenres, hooks, isSet,
    label: isSet ? parts.join(" · ") : "No mandate set",
  };
};

const norm = (value) => String(value || "").trim().toLowerCase();

/**
 * Which mandate conditions a script satisfies. An excluded genre is
 * disqualifying — it returns no matches at all rather than matching on format,
 * because "I do not want horror" outranks "I want features".
 */
export const getMandateMatches = (script, mandate) => {
  if (!mandate?.isSet || !script) return [];
  const genre = norm(script.genre);
  if (mandate.excludeGenres.some((g) => norm(g) === genre)) return [];

  const matches = [];
  if (mandate.genres.some((g) => norm(g) === genre)) matches.push("Genre match");

  const format = norm(getFormatLabel(script));
  const type = norm(script.contentType);
  const typeLabel = norm(getContentTypeLabel(script.contentType));
  if (mandate.formats.some((f) => {
    const target = norm(f);
    return target === format || target === type || target === typeLabel;
  })) matches.push("Format match");

  return matches;
};

/** Shelf 03's threshold: two or more conditions, so a lone genre hit is not "a match". */
export const matchesMandate = (script, mandate) =>
  getMandateMatches(script, mandate).length >= 2;

export const getMatchLine = (script, mandate) => {
  if (!mandate?.isSet) return "No mandate set";
  const matches = getMandateMatches(script, mandate);
  return matches.length ? matches.join(" · ") : "Outside your mandate";
};

/* ── Score breakdown and paid services ─────────────────────────────────────── */

/**
 * Sub-scores, shown only when the evaluation actually produced them. The design
 * draws four bars; the model stores five, so pacing is included when scored and
 * simply absent otherwise rather than drawn at zero.
 */
export const getCraftRows = (script) => {
  const score = script?.scriptScore || {};
  return [
    { key: "plot", label: "Plot" },
    { key: "characters", label: "Character" },
    { key: "dialogue", label: "Dialogue" },
    { key: "pacing", label: "Pacing" },
    { key: "marketability", label: "Marketability" },
  ]
    .map(({ key, label }) => ({ label, value: Number(score[key]) || 0 }))
    .filter((row) => row.value > 0)
    .map((row) => ({ ...row, bar: `${Math.min(100, row.value)}%` }));
};

export const hasEvaluation = (script) =>
  Boolean(script?.scriptScore?.overall) || script?.evaluationStatus === "completed";

/**
 * "Why this is featured" — the services the writer actually bought, read off
 * the same `services` flags the featured ranking itself sorts on.
 */
export const getServiceRows = (script, now = new Date()) => {
  const services = script?.services || {};
  const rows = [];
  if (script?.verifiedBadge) rows.push("Verified badge");
  if (services.aiTrailer) rows.push("AI trailer");
  if (services.evaluation || script?.evaluationStatus === "completed") rows.push("Full evaluation");
  if (isSpotlightActive(script, now)) {
    const days = getSpotlightDaysLeft(script, now);
    rows.push(days ? `Spotlight · ${days} ${days === 1 ? "day" : "days"} remaining` : "Spotlight placement");
  }
  if (script?.isFeatured && !rows.length) rows.push("Editorially featured");
  return rows;
};

export const hasTrailer = (script) =>
  Boolean(script?.trailerUrl || script?.uploadedTrailerUrl);

/* ── Ranking ───────────────────────────────────────────────────────────────── */

/**
 * The number the active sort is ranking on. Engagement weights reads over
 * views because a read is a far stronger signal of interest than an impression
 * — the same weighting the server's own trendScore uses.
 */
export const getMetric = (script, sort) => {
  if (sort === "views") return getViews(script);
  if (sort === "score") return getScore(script);
  if (sort === "price_high" || sort === "price_low") return Number(script?.price) || 0;
  if (sort === "createdAt") return new Date(script?.publishedAt || script?.createdAt || 0).getTime();
  return getViews(script) + getReads(script) * 2;
};

export const sortScripts = (list, sort) => {
  const items = [...(list || [])];
  if (sort === "price_low") return items.sort((a, b) => getMetric(a, sort) - getMetric(b, sort));
  return items.sort((a, b) => getMetric(b, sort) - getMetric(a, sort));
};

/** Bar width relative to the strongest item on screen, floored so a bar is always visible. */
export const getBarWidth = (script, sort, max) => {
  const value = getMetric(script, sort);
  if (!max || max <= 0) return "6%";
  return `${Math.max(6, Math.min(100, Math.round((value / max) * 100)))}%`;
};

export const getMaxMetric = (list, sort) =>
  (list || []).reduce((max, script) => Math.max(max, getMetric(script, sort)), 0);

/* ── Filtering ─────────────────────────────────────────────────────────────
 * Genre / type / budget / premium are also sent to the API, which is what
 * narrows the fetch. Re-applying them here keeps the three shelves consistent
 * with each other when a response is still in flight, and it is the only way
 * the in-page search and the "only show" toggles can filter at all — neither
 * has a query parameter behind it.
 */

const applyOnlyFilters = (list, only, mandate, now) => {
  let out = list;
  if (only.includes("spotlight")) out = out.filter((s) => isSpotlightActive(s, now));
  if (only.includes("verified")) out = out.filter((s) => Boolean(s.verifiedBadge));
  if (only.includes("trailer")) out = out.filter((s) => hasTrailer(s));
  if (only.includes("evaluated")) out = out.filter((s) => hasEvaluation(s));
  // Without a mandate on file this toggle has nothing to test, so it passes
  // everything through rather than silently emptying the page.
  if (only.includes("mandate") && mandate?.isSet) {
    out = out.filter((s) => matchesMandate(s, mandate));
  }
  return out;
};

export const filterScripts = (list, { query = "", filters = EMPTY_FILTERS, mandate, now = new Date() } = {}) => {
  const f = { ...EMPTY_FILTERS, ...filters };
  let out = [...(list || [])];

  const q = query.trim().toLowerCase();
  if (q) {
    out = out.filter((s) => [s.title, getCreatorName(s), s.genre, s.logline, s.synopsis]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q));
  }

  if (f.genres.length) out = out.filter((s) => f.genres.includes(s.genre));
  if (f.types.length) out = out.filter((s) => f.types.includes(s.contentType));
  if (f.budgets.length) out = out.filter((s) => f.budgets.includes(s.budget));
  if (f.premium === "free") out = out.filter((s) => !s.premium);
  if (f.premium === "premium") out = out.filter((s) => Boolean(s.premium));

  return applyOnlyFilters(out, f.only, mandate, now);
};

export const countActiveFilters = (filters = EMPTY_FILTERS) => {
  const f = { ...EMPTY_FILTERS, ...filters };
  return f.genres.length + f.types.length + f.budgets.length + f.only.length
    + (f.premium === "all" ? 0 : 1);
};

/** The dismissible chips under the toolbar. Each carries what to remove. */
export const buildChipRow = (filters = EMPTY_FILTERS) => {
  const f = { ...EMPTY_FILTERS, ...filters };
  const chips = [];
  f.genres.forEach((g) => chips.push({ id: `genre:${g}`, label: g, kind: "genres", value: g }));
  f.types.forEach((t) => chips.push({ id: `type:${t}`, label: getContentTypeLabel(t), kind: "types", value: t }));
  f.budgets.forEach((b) => chips.push({ id: `budget:${b}`, label: `${getBudgetLabel(b)} budget`, kind: "budgets", value: b }));
  f.only.forEach((o) => chips.push({
    id: `only:${o}`,
    label: ONLY_OPTIONS.find((x) => x.key === o)?.label || o,
    kind: "only",
    value: o,
  }));
  if (f.premium !== "all") {
    chips.push({
      id: `premium:${f.premium}`,
      label: PREMIUM_OPTIONS.find((x) => x.key === f.premium)?.label || f.premium,
      kind: "premium",
      value: "all",
    });
  }
  return chips;
};

/** The query string the list fetch uses. Only parameters the API understands. */
export const buildQueryParams = ({ sort = "engagement", filters = EMPTY_FILTERS } = {}) => {
  const f = { ...EMPTY_FILTERS, ...filters };
  const params = new URLSearchParams();
  params.append("sort", sort);
  // The API takes one value per facet; the drawer allows several, so the
  // request fetches the first and the rest narrow client-side.
  if (f.genres.length === 1) params.append("genre", f.genres[0]);
  if (f.types.length === 1) params.append("contentType", f.types[0]);
  if (f.budgets.length === 1) params.append("budget", f.budgets[0]);
  if (f.premium === "premium") params.append("premium", "true");
  else if (f.premium === "free") params.append("premium", "false");
  return params.toString();
};

/* ── The lead's explanation ────────────────────────────────────────────────
 * The design's defining line: the editorial lead says WHY it leads. Order
 * matters — mandate fit is the strongest reason, paid placement the next, and
 * raw performance the fallback.
 */
export const getWhyLead = (script, { mandate, sort = "engagement", now = new Date() } = {}) => {
  const matches = getMandateMatches(script, mandate);
  if (matches.length >= 2) {
    return `Shown first because it matches your mandate — ${matches.join(" · ")}.`;
  }

  const partial = matches.length
    ? `${matches[0]} only — a partial mandate fit.`
    : (mandate?.isSet ? "Outside your mandate." : "");

  if (isSpotlightActive(script, now)) {
    const days = getSpotlightDaysLeft(script, now);
    const window = days
      ? `this spotlight runs another ${days} ${days === 1 ? "day" : "days"}`
      : "this spotlight is running now";
    return `Leading on paid placement — ${window}. ${partial}`.trim();
  }

  const basis = sort === "score" ? "score" : "engagement";
  return `Leading on ${basis} — ${formatCount(getViews(script))} views and a ${getScore(script)}/100 platform score. ${partial}`.trim();
};
