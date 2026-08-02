/*
 * investorDesk.js — the pure part of the investor desk.
 *
 * Everything here derives display values from the payload the app already
 * returns (`GET /scripts/investor-home` → services/recommendationService
 * .buildInvestorFeed, and `GET /users/me`). No fixtures, no invented metrics:
 * if a number cannot be computed from real data it is returned as null and the
 * page omits the cell rather than printing a placeholder.
 */

/* ── Time / identity ─────────────────────────────────────────────────────── */

export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/* The masthead dateline. Matches the design's "Friday, 27 March 2026". */
export const formatDateline = (date = new Date()) =>
  date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/*
 * The desk belongs to whoever is signed in. `reader` reaches /home through the
 * same route, so the eyebrow names their workspace rather than assuming an
 * investor. Mirrors the label the previous InvestorHome printed.
 */
export const getWorkspaceLabel = (role) => {
  const value = String(role || "").toLowerCase();
  if (value === "reader") return "Reader desk";
  if (value === "actor") return "Casting desk";
  return "Investor desk";
};

export const getFirstName = (user) =>
  String(user?.name || "").trim().split(/\s+/)[0] || "there";

/* ── Project field readers ───────────────────────────────────────────────── */

const FORMAT_LABEL = {
  feature: "Feature Film",
  movie: "Movie",
  short: "Short Film",
  tv_1hour: "TV 1-Hour",
  tv_halfhour: "TV Half-Hour",
  tv_pilot: "TV Pilot",
  tv_serial: "TV Serial",
  tv_series: "TV Series",
  limited_series: "Limited Series",
  fiction_novel: "Fiction Novel",
  webseries: "Web Series",
  web_series: "Web Series",
  documentary: "Documentary",
  drama_school: "Drama School",
  micro_drama: "Micro Drama",
  anime: "Anime",
  cartoon: "Cartoon",
  songs: "Songs",
  standup_comedy: "Standup Comedy",
  dialogues: "Dialogues",
  poet: "Poet",
  other: "Other",
};

export const getFormatLabel = (project) => {
  const raw = project?.format || project?.contentType || "";
  if (raw === "other") return project?.formatOther || FORMAT_LABEL.other;
  return FORMAT_LABEL[raw] || raw || "";
};

export const getGenreLabel = (project) =>
  project?.primaryGenre || project?.genre || project?.classification?.primaryGenre || "";

/*
 * The same score ProjectCard prints — platform first, AI second. `null` means
 * the project has not been scored, and every caller renders nothing for it
 * instead of substituting a number.
 */
export const getScore = (project) =>
  project?.platformScore?.overall ?? project?.scriptScore?.overall ?? null;

export const isPublishedProject = (project) =>
  project?.status === "published" || project?.status === "approved";

export const getPublishedAt = (project) =>
  (isPublishedProject(project) ? project?.publishedAt || project?.createdAt : project?.createdAt) || null;

export const hasVerifiedBadge = (project) => Boolean(
  project?.verifiedBadge
  || project?.promotion?.spotlightActive
  || Number(project?.billing?.spotlightCreditsSpent || 0) > 0
  || Number(project?.billing?.spotlightCreditsChargedAtUpload || 0) > 0
  || Number(project?.promotion?.totalSpotlightCreditsSpent || 0) > 0
  || Boolean(project?.promotion?.lastSpotlightPurchaseAt),
);

/*
 * The ask. Same precedence ProjectCard uses (sold → held → priced → free) so a
 * project reads identically on the desk and on its card.
 */
export const getAsk = (project) => {
  if (project?.isSold) return { kind: "sold", text: "Sold" };
  if (project?.holdStatus === "held") return { kind: "hold", text: "On hold" };
  if (project?.premium && project?.price) return { kind: "money", value: project.price };
  return { kind: "free", text: "Free" };
};

/* ── Number / date formatting ────────────────────────────────────────────── */

export const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatCompactCount = (value) => {
  const n = Number(value || 0);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
};

export const formatRating = (value) => {
  const n = Number(value || 0);
  return n > 0 ? n.toFixed(1) : "—";
};

export const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/* ── The standing brief ──────────────────────────────────────────────────── */

/*
 * The brief meter reports how much of the mandate the member has actually
 * filled in — the four facets MandatesPage writes plus the investment range
 * collected at onboarding. It is a real completeness reading of real stored
 * preferences, not a fabricated "60%".
 */
export const BRIEF_FACETS = [
  { key: "genres", label: "Focus genres" },
  { key: "formats", label: "Formats" },
  { key: "excludeGenres", label: "Exclusions" },
  { key: "specificHooks", label: "Hooks" },
  { key: "investmentRange", label: "Budget" },
];

export const getBriefCompletion = (profile) => {
  const mandates = profile?.industryProfile?.mandates || {};
  const filled = BRIEF_FACETS.map(({ key, label }) => {
    const value = key === "investmentRange"
      ? profile?.industryProfile?.investmentRange
      : mandates[key];
    const set = Array.isArray(value) ? value.length > 0 : Boolean(value);
    return { key, label, set };
  });

  const setCount = filled.filter((facet) => facet.set).length;
  return {
    facets: filled,
    setCount,
    total: BRIEF_FACETS.length,
    percent: Math.round((setCount / BRIEF_FACETS.length) * 100),
  };
};

/* ── Match reasons ───────────────────────────────────────────────────────── */

const REASON_COPY = {
  interestMatch: {
    on: "Matches the genres, formats and budget tiers in your brief",
    off: "Nothing in your brief matches this project directly",
  },
  behaviorMatch: {
    on: "Close to what you have been reading and saving",
    off: "Outside your recent reading and saving pattern",
  },
  popularity: {
    on: "Reads, views and ratings are lifting it on the platform",
    off: "Little platform traction so far",
  },
  recency: {
    on: "Published recently",
    off: "An older listing in the catalogue",
  },
};

/*
 * `_scoreBreakdown` is returned per project by buildInvestorFeed — four 0..1
 * components of the ranking. "Why it matched" reads them back rather than
 * guessing at a reason.
 */
export const getMatchReasons = (project) => {
  const breakdown = project?._scoreBreakdown;
  if (!breakdown) return [];
  return Object.keys(REASON_COPY)
    .filter((key) => typeof breakdown[key] === "number")
    .map((key) => {
      const value = breakdown[key];
      const met = value >= 0.2;
      return {
        key,
        met,
        percent: Math.round(Math.max(0, Math.min(1, value)) * 100),
        text: met ? REASON_COPY[key].on : REASON_COPY[key].off,
      };
    });
};

/* ── Sorting ─────────────────────────────────────────────────────────────── */

export const SORT_OPTIONS = [
  { value: "match", label: "Match score" },
  { value: "new", label: "Newest" },
  { value: "reads", label: "Most read" },
  { value: "rating", label: "Highest rated" },
  { value: "price", label: "Ask price" },
];

const askAmount = (project) => {
  const ask = getAsk(project);
  return ask.kind === "money" ? Number(ask.value || 0) : 0;
};

/*
 * Stable sort: the feed already arrives ranked, so equal keys must keep the
 * server's order rather than being reshuffled by the comparator.
 */
export const sortProjects = (projects = [], key = "match") => {
  const compare = {
    match: () => 0,
    new: (a, b) => new Date(getPublishedAt(b) || 0) - new Date(getPublishedAt(a) || 0),
    reads: (a, b) => Number(b?.readsCount || 0) - Number(a?.readsCount || 0),
    rating: (a, b) => Number(b?.rating || 0) - Number(a?.rating || 0),
    price: (a, b) => askAmount(b) - askAmount(a),
  }[key] || (() => 0);

  return projects
    .map((project, index) => ({ project, index }))
    .sort((a, b) => compare(a.project, b.project) || (a.index - b.index))
    .map((entry) => entry.project);
};

/* ── Shelves ─────────────────────────────────────────────────────────────── */

/* Material Symbols the shell already loads, one per genre so shelves read
   apart at a glance the way the design's do. */
const GENRE_ICON = {
  thriller: "local_fire_department",
  crime: "gavel",
  mystery: "search",
  drama: "theater_comedy",
  comedy: "sentiment_very_satisfied",
  action: "bolt",
  adventure: "explore",
  horror: "dark_mode",
  romance: "favorite",
  "sci-fi": "rocket_launch",
  fantasy: "auto_fix_high",
  documentary: "videocam",
  historical: "history_edu",
  animation: "animation",
  anime: "animation",
  war: "military_tech",
  family: "family_restroom",
  musical: "music_note",
  western: "landscape",
  biography: "menu_book",
  sports: "sports_soccer",
};

const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth"];

/*
 * The feed's four lists become the page's shelves. genreSections keep their
 * server order (they are already ranked by the brief); `trending` is the
 * personalised remainder the previous page called "Matched For You".
 */
export const buildShelves = (feed) => {
  const shelves = (feed?.genreSections || [])
    .filter((section) => (section?.scripts || []).length > 0)
    .map((section, index) => ({
      id: `genre:${section.genre}`,
      icon: GENRE_ICON[String(section.genre || "").toLowerCase()] || "movie",
      title: section.genre,
      caption: index === 0
        ? "your first-ranked genre"
        : `ranked ${ORDINAL[index] || `${index + 1}th`} in your brief`,
      items: section.scripts || [],
      searchTerm: section.genre,
    }));

  const matched = feed?.trending || [];
  if (matched.length > 0) {
    shelves.push({
      id: "matched",
      icon: "auto_awesome",
      title: "Matched for you",
      caption: "profile, genres and activity",
      items: matched,
      searchTerm: "",
    });
  }

  return shelves;
};

/* Every project the page is showing, de-duplicated — used for the stat band. */
export const collectFeedProjects = (feed) => {
  const seen = new Set();
  const all = [];
  const push = (list) => {
    (list || []).forEach((project) => {
      const id = project?._id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      all.push(project);
    });
  };
  (feed?.genreSections || []).forEach((section) => push(section?.scripts));
  push(feed?.trending);
  return all;
};

export const getAverageScore = (projects = []) => {
  const scores = projects.map(getScore).filter((score) => typeof score === "number");
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

export const countBookmarks = (profile) => {
  const ids = profile?.favoriteScripts;
  return Array.isArray(ids) ? ids.length : 0;
};
