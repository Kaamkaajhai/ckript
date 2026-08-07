/*
 * writerRoster.js — every derivation behind /writers, as pure functions.
 *
 * WHY THE FACETS RUN HERE RATHER THAN ON THE SERVER
 * -------------------------------------------------
 * `getWriters` takes one `genre`, one `search` and one `sort`, and caps at 100.
 * The approved design asks for multi-select genre, credential and activity
 * facets, and for a live count beside each one. Neither is expressible against
 * that endpoint:
 *
 *   - multi-select genre would need an $in the query parameter cannot carry;
 *   - a count beside "Drama" cannot be honest if the server has already
 *     filtered the set the count is describing.
 *
 * So the page fetches on sort and search only, and every facet is applied here
 * over the returned rows. Counts are then exactly "how many of the writers on
 * this page match", which is what the UI says they are. It also means toggling
 * a facet costs nothing — no refetch, no spinner — which is most of what makes
 * this page feel like a workspace rather than a directory.
 *
 * The trade-off, stated so nobody rediscovers it as a bug: a genre filter now
 * narrows within the top 100 by the active sort, where the old page sent the
 * genre to the server and got the top 100 *of that genre*. Below ~100 writer
 * accounts the two are identical. Above it, the honest fix is a faceted
 * endpoint, not a cleverer client.
 */

/** The canonical genre list, unchanged from the page this replaces. */
export const GENRES = Object.freeze([
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
]);

export const CREDENTIALS = Object.freeze([
  { key: "wga", label: "WGA member" },
  { key: "swa", label: "SWA member" },
  { key: "repped", label: "Represented" },
]);

export const ACTIVITY = Object.freeze([
  { key: "published", label: "Has published scripts" },
  { key: "scored", label: "Has a scored script" },
]);

/*
 * The five sorts the endpoint implements. `reputation` is the server default
 * and has no column of its own — `reputation` is only added to the payload on
 * that one sort, so it cannot be a stable column — which is why it lives in the
 * "#" header rather than among the four metrics.
 */
export const SORTS = Object.freeze([
  { key: "reputation", label: "Reputation", column: "rank" },
  { key: "scripts", label: "Scripts", column: "scripts" },
  { key: "views", label: "Views", column: "views" },
  { key: "score", label: "AI score", column: "score" },
  { key: "followers", label: "Followers", column: "followers" },
]);

export const EMPTY_FACETS = Object.freeze({
  genres: [],
  credentials: [],
  activity: [],
  mandate: false,
});

const norm = (value) => String(value || "").trim().toLowerCase();

/* ── Field readers ─────────────────────────────────────────────────────────
 * One place that knows the shape of a writer row. Every one of these maps to a
 * field `getWriters` already returns; nothing is invented and nothing falls
 * back to unrelated content.
 */

export const getGenres = (writer) => {
  const genres = writer?.writerProfile?.genres;
  return Array.isArray(genres) ? genres.filter(Boolean) : [];
};

export const isWga = (writer) => Boolean(writer?.writerProfile?.wgaMember);
export const isSwa = (writer) => Boolean(writer?.writerProfile?.sgaMember);

export const isRepresented = (writer) => {
  const status = norm(writer?.writerProfile?.representationStatus);
  return Boolean(status) && status !== "unrepresented";
};

export const getScriptCount = (writer) => Number(writer?.scriptCount) || 0;
export const getViews = (writer) => Number(writer?.totalViews) || 0;
export const getFollowers = (writer) => Number(writer?.followerCount) || 0;

/** Rounded, because a score is presented as an integer everywhere else. */
export const getScore = (writer) => Math.round(Number(writer?.avgScore) || 0);

/*
 * The bio line, bound straight to `bio`. The page this replaces read
 * `writerProfile.location || bio || "Screenwriter"`, and `location` is not a
 * field on the schema — so the chain never resolved to anything but its own
 * second branch, while looking like it had a first one.
 */
export const getBioLine = (writer) => {
  const bio = String(writer?.bio || "").trim();
  return bio || "Screenwriter";
};

/** The badges a row shows, in a fixed order so rows stay comparable. */
export const getCredentialBadges = (writer) => {
  const badges = [];
  if (isWga(writer)) badges.push("WGA");
  if (isSwa(writer)) badges.push("SWA");
  if (isRepresented(writer)) badges.push("REPPED");
  return badges;
};

/* ── Formatting ────────────────────────────────────────────────────────── */

/** 128449 → "128.4K". Keeps the four metric columns a fixed width. */
export const formatCount = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return String(n);
};

/**
 * An unscored writer gets an em dash, never "0" — a zero in a score column
 * reads as a bad evaluation rather than the absence of one.
 */
export const formatScore = (writer) => {
  const score = getScore(writer);
  return score > 0 ? String(score) : "—";
};

/** The band a score value is coloured in. Null means "no colour, no claim". */
export const getScoreBand = (writer) => {
  const score = getScore(writer);
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  if (score > 0) return "low";
  return null;
};

export const getSortLabel = (key) =>
  (SORTS.find((s) => s.key === key) || SORTS[0]).label;

export const isSortKey = (key) => SORTS.some((s) => s.key === key);

/* ── Mandate ───────────────────────────────────────────────────────────────
 * Genre is the only axis where writer data and mandate data overlap: a mandate
 * also carries `formats` and `specificHooks`, and a writer profile has no
 * equivalent of either. So this is deliberately coarser than the script-level
 * matching on /featured, and the UI is worded as an overlap rather than a
 * score. Do not add a percentage to it.
 */
export const getMandate = (user) => {
  const raw = user?.industryProfile?.mandates || {};
  const genres = (Array.isArray(raw.genres) ? raw.genres : []).filter(Boolean);
  const excludeGenres = (Array.isArray(raw.excludeGenres) ? raw.excludeGenres : []).filter(Boolean);
  return {
    genres,
    excludeGenres,
    /* Only a genre mandate can be matched against a writer, so only a genre
     * mandate makes the facet meaningful — a formats-only mandate leaves it
     * hidden rather than showing a filter that can never match. */
    isSet: genres.length > 0,
    label: genres.length ? genres.slice(0, 3).join(" · ") : "No mandate set",
  };
};

/** Which of the viewer's mandate genres this writer writes. */
export const getMandateMatches = (writer, mandate) => {
  if (!mandate?.isSet) return [];
  const genres = getGenres(writer).map(norm);
  if (mandate.excludeGenres.some((g) => genres.includes(norm(g)))) return [];
  return mandate.genres.filter((g) => genres.includes(norm(g)));
};

export const matchesMandate = (writer, mandate) =>
  getMandateMatches(writer, mandate).length > 0;

/* ── Facets ────────────────────────────────────────────────────────────── */

const matchesGenres = (writer, selected) => {
  if (!selected.length) return true;
  const genres = getGenres(writer).map(norm);
  // OR within the facet: picking Thriller and Crime widens, it does not narrow.
  return selected.some((g) => genres.includes(norm(g)));
};

const matchesCredentials = (writer, selected) => {
  if (!selected.length) return true;
  return selected.some((key) => (
    (key === "wga" && isWga(writer))
    || (key === "swa" && isSwa(writer))
    || (key === "repped" && isRepresented(writer))
  ));
};

/*
 * Activity is AND, unlike the other two. "Has published scripts" and "has a
 * scored script" are cumulative conditions on the same writer, not alternative
 * kinds of writer, so ORing them would make ticking both widen the result —
 * the opposite of what the two labels say together.
 */
const matchesActivity = (writer, selected) => selected.every((key) => (
  (key === "published" && getScriptCount(writer) > 0)
  || (key === "scored" && getScore(writer) > 0)
));

export const filterWriters = (writers, { facets = EMPTY_FACETS, mandate } = {}) => {
  const list = Array.isArray(writers) ? writers : [];
  return list.filter((writer) => (
    matchesGenres(writer, facets.genres || [])
    && matchesCredentials(writer, facets.credentials || [])
    && matchesActivity(writer, facets.activity || [])
    && (!facets.mandate || matchesMandate(writer, mandate))
  ));
};

export const countActiveFacets = (facets = EMPTY_FACETS) =>
  (facets.genres?.length || 0)
  + (facets.credentials?.length || 0)
  + (facets.activity?.length || 0)
  + (facets.mandate ? 1 : 0);

/**
 * The number beside each facet option.
 *
 * Counted against the set filtered by *every other* facet, not by all of them —
 * so a count answers "how many more would this add", which is the question
 * someone reading a checkbox list is actually asking. Counting against the
 * fully-filtered set would show 0 beside every unticked option the moment one
 * was ticked, which is true and useless.
 */
export const buildFacetCounts = (writers, facets = EMPTY_FACETS, mandate) => {
  const without = (key) => filterWriters(writers, {
    facets: { ...EMPTY_FACETS, ...facets, [key]: key === "mandate" ? false : [] },
    mandate,
  });

  const genrePool = without("genres");
  const credentialPool = without("credentials");
  const activityPool = without("activity");
  const mandatePool = without("mandate");

  const genres = {};
  for (const genre of GENRES) {
    genres[genre] = genrePool.filter((w) => matchesGenres(w, [genre])).length;
  }

  const credentials = {};
  for (const { key } of CREDENTIALS) {
    credentials[key] = credentialPool.filter((w) => matchesCredentials(w, [key])).length;
  }

  const activity = {};
  for (const { key } of ACTIVITY) {
    activity[key] = activityPool.filter((w) => matchesActivity(w, [key])).length;
  }

  return {
    genres,
    credentials,
    activity,
    mandate: mandate?.isSet ? mandatePool.filter((w) => matchesMandate(w, mandate)).length : 0,
  };
};

/* ── Board figures ─────────────────────────────────────────────────────────
 * These describe the rows on screen and nothing wider, which is why the UI
 * labels them "this page". The old header presented the same three numbers as
 * though they described the platform.
 */
export const buildBoardStats = (writers) => {
  const list = Array.isArray(writers) ? writers : [];
  const scores = list.map(getScore).filter((s) => s > 0).sort((a, b) => a - b);

  let medianScore = 0;
  if (scores.length) {
    const mid = Math.floor(scores.length / 2);
    medianScore = scores.length % 2
      ? scores[mid]
      : Math.round((scores[mid - 1] + scores[mid]) / 2);
  }

  return {
    writers: list.length,
    scripts: list.reduce((total, w) => total + getScriptCount(w), 0),
    medianScore,
  };
};

/* ── Chips ─────────────────────────────────────────────────────────────────
 * A flat, removable read-out of everything narrowing the list. Present whenever
 * anything is active, not only when the result set is empty — clearing a filter
 * used to require filtering yourself down to nothing first.
 */
export const buildChips = (facets = EMPTY_FACETS, query = "") => {
  const chips = [];
  const trimmed = String(query || "").trim();
  if (trimmed) chips.push({ id: "q", kind: "query", label: `“${trimmed}”` });

  for (const genre of facets.genres || []) {
    chips.push({ id: `genre:${genre}`, kind: "genres", value: genre, label: genre });
  }
  for (const key of facets.credentials || []) {
    const found = CREDENTIALS.find((c) => c.key === key);
    if (found) chips.push({ id: `cred:${key}`, kind: "credentials", value: key, label: found.label });
  }
  for (const key of facets.activity || []) {
    const found = ACTIVITY.find((a) => a.key === key);
    if (found) chips.push({ id: `act:${key}`, kind: "activity", value: key, label: found.label });
  }
  if (facets.mandate) {
    chips.push({ id: "mandate", kind: "mandate", label: "Matches my mandate" });
  }
  return chips;
};

/* ── URL state ─────────────────────────────────────────────────────────────
 * A filtered roster should be a link you can send someone. Written with
 * `replace` by the page, so the back button leaves /writers rather than
 * stepping backwards through every checkbox that was ticked on the way in.
 */
export const readUrlState = (search = "") => {
  const params = new URLSearchParams(String(search || ""));
  const list = (key, allowed) => {
    const raw = params.get(key);
    if (!raw) return [];
    const wanted = raw.split(",").map((v) => v.trim()).filter(Boolean);
    // Only values this page knows about — an unknown one would filter
    // everything out with no visible chip explaining why.
    return allowed.filter((a) => wanted.some((w) => norm(w) === norm(a)));
  };

  const sort = params.get("sort");

  return {
    sort: isSortKey(sort) ? sort : "reputation",
    query: params.get("q") || "",
    facets: {
      genres: list("genre", GENRES),
      credentials: list("cred", CREDENTIALS.map((c) => c.key)),
      activity: list("activity", ACTIVITY.map((a) => a.key)),
      mandate: params.get("mandate") === "1",
    },
  };
};

export const writeUrlState = ({ sort, query, facets } = {}) => {
  const params = new URLSearchParams();
  if (sort && sort !== "reputation") params.set("sort", sort);
  const trimmed = String(query || "").trim();
  if (trimmed) params.set("q", trimmed);
  if (facets?.genres?.length) params.set("genre", facets.genres.join(","));
  if (facets?.credentials?.length) params.set("cred", facets.credentials.join(","));
  if (facets?.activity?.length) params.set("activity", facets.activity.join(","));
  if (facets?.mandate) params.set("mandate", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

/** The query string sent to `getWriters`. Sort and search only — see the file header. */
export const buildRequestParams = ({ sort, query } = {}) => {
  const params = new URLSearchParams({ sort: isSortKey(sort) ? sort : "reputation" });
  const trimmed = String(query || "").trim();
  if (trimmed) params.set("search", trimmed);
  return params.toString();
};

/*
 * The endpoint caps at 100 with no total, so "100 rows" is the only signal that
 * more exist. It is a signal, not a promise: exactly 100 writers in the
 * database would also produce it, which is why the note says "showing the top
 * 100" rather than "more writers exist".
 */
export const WRITER_CAP = 100;
export const isAtCap = (writers) => (Array.isArray(writers) ? writers.length : 0) >= WRITER_CAP;
