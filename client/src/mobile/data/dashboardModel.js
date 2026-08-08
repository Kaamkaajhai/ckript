/*
 * Ckript Mobile — dashboard model
 * ------------------------------------------------------------------
 * Pure derivation from the three real dashboard payloads to the shapes the
 * mobile sections render. No React, no fetching: everything here is a function
 * of its arguments, so the mapping can be tested against the server's actual
 * field names instead of against a screenshot.
 *
 * Why this file exists (plan §11 Phase 2, 2026-08-07 audit)
 * --------------------------------------------------------
 * The mapping this replaces read `review.score` and `review.summary` for AI
 * analyses and `review.score` for platform reviews. The server sends `rating`
 * and `overall` (see `server/controllers/dashboardController.js`). Neither
 * `score` nor `summary` has ever existed on either payload, so every review
 * card rendered 0/100 with four identical empty bars and a hardcoded sentence.
 * That is worse than a visible placeholder, because it reads as real data about
 * a real script. Reading the payload shape out of the controller — rather than
 * inferring it from the old client code — is what caught it.
 *
 * The thresholds and labels below are deliberately the desktop ones
 * (`pages/Dashboard.jsx` `aiScoreColor` and `AdminReviewCard`), so a script
 * cannot be "Excellent" on one platform and "Good" on the other.
 */
import { getFormatLabel, getGenreLabel, getScore } from "../../features/investor-desk/investorDesk";
import { getScriptCanonicalPath } from "../../utils/scriptPath";

/* The five dimensions the platform score is made of, with desktop's labels. */
const PLATFORM_DIMENSIONS = [
  { key: "content", label: "Main Content" },
  { key: "trailer", label: "Trailer" },
  { key: "title", label: "Title" },
  { key: "synopsis", label: "Synopsis" },
  { key: "tags", label: "Tag & Meta" },
];

/* `plot` → `Plot`, `marketability` → `Marketability`. The AI score keys are
 * single words today, but splitting on _ keeps this honest if that changes. */
const humanizeScoreKey = (key) =>
  String(key || "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/* Desktop's `aiScoreColor`, verbatim thresholds. */
export const verdictForRating = (rating) => {
  if (rating >= 80) return { label: "Excellent", col: "var(--ckm-accent)", bg: "var(--ckm-accent-soft)" };
  if (rating >= 60) return { label: "Good", col: "var(--ckm-gold)", bg: "var(--ckm-gold-bg)" };
  return { label: "Needs Work", col: "var(--ckm-text-3)", bg: "var(--ckm-bg-soft)" };
};

/* Desktop's `AdminReviewCard` grade bands, verbatim. */
export const gradeForOverall = (overall) => {
  if (overall >= 85) return { letter: "A", col: "var(--ckm-accent)", bg: "var(--ckm-accent-soft)" };
  if (overall >= 70) return { letter: "B", col: "var(--ckm-green)", bg: "var(--ckm-green-bg)" };
  if (overall >= 55) return { letter: "C", col: "var(--ckm-info)", bg: "var(--ckm-info-bg)" };
  if (overall >= 40) return { letter: "D", col: "var(--ckm-gold)", bg: "var(--ckm-gold-bg)" };
  return { letter: "F", col: "var(--ckm-red)", bg: "var(--ckm-red-bg)" };
};

/* Desktop's `AiReviewDetail` word for a single dimension score. */
const facetWord = (value) =>
  value >= 80 ? "Excellent" : value >= 65 ? "Strong" : value >= 50 ? "Good" : "Developing";

/* ---- Reviews ------------------------------------------------------------ */

/**
 * Map one `/dashboard/reviews` → `ai[]` entry.
 *
 * The bars come from the `scores` object the server actually sends
 * (plot/characters/dialogue/pacing/marketability), not from four fixed labels
 * with the overall rating repeated into each of them.
 */
export function mapAiReview(review, index = 0) {
  const score = clampPercent(review?.rating);
  const verdict = verdictForRating(score);

  const bars = Object.entries(review?.scores || {})
    // A dimension the model did not score is absent, not zero — showing it as a
    // 0% bar would claim the script failed that criterion.
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const val = clampPercent(value);
      return { label: humanizeScoreKey(key), val, w: `${val}%` };
    });

  return {
    id: String(review?.scriptId || index),
    scriptId: review?.scriptId || null,
    title: review?.scriptTitle || "Untitled",
    score,
    excerpt: review?.feedback || "",
    verdict: verdict.label,
    vcol: verdict.col,
    vbg: verdict.bg,
    bars,
    detail: {
      score,
      verdict: verdict.label,
      vcol: verdict.col,
      quote: review?.feedback || "",
      facets: bars.map((bar) => ({ label: bar.label, value: facetWord(bar.val) })),
      strengths: review?.strengths || [],
      improve: review?.weaknesses || [],
      recommendations: review?.improvements || [],
      audienceFit: review?.audienceFit || "",
      comparables: review?.comparables || "",
    },
  };
}

/**
 * Map one `/dashboard/reviews` → `adminScores[]` entry.
 *
 * Five dimensions, matching desktop, rather than one bar labelled
 * "Main Content" carrying the overall score.
 */
export function mapPlatformReview(review, index = 0) {
  const score = clampPercent(review?.overall);
  const grade = gradeForOverall(score);

  return {
    id: String(review?.scriptId || index),
    scriptId: review?.scriptId || null,
    title: review?.scriptTitle || "Untitled",
    score,
    grade: `Grade ${grade.letter}`,
    gcol: grade.col,
    gbg: grade.bg,
    feedback: review?.feedback || "",
    scoredAt: review?.scoredAt || null,
    bars: PLATFORM_DIMENSIONS
      .filter(({ key }) => review?.[key] != null)
      .map(({ key, label }) => {
        const val = clampPercent(review[key]);
        return { label, val, w: `${val}%` };
      }),
  };
}

/* ---- Projects ----------------------------------------------------------- */

const STATUS_PRESENTATION = {
  published: { label: "Published", dot: "var(--ckm-live)" },
  approved: { label: "Published", dot: "var(--ckm-live)" },
  pending_approval: { label: "In Review", dot: "var(--ckm-gold)" },
  rejected: { label: "Not approved", dot: "var(--ckm-red)" },
  draft: { label: "Draft", dot: "var(--ckm-muted-2)" },
};

export const statusPresentation = (status) =>
  STATUS_PRESENTATION[status] || { label: status || "Draft", dot: "var(--ckm-muted-2)" };

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatDate = (value) => {
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "";
  return new Date(stamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/**
 * One project card. `score` is the real merged score — `platformScore.overall`
 * falling back to `scriptScore.overall`, the same precedence the desktop
 * ProjectCard uses — rather than the `null` with a "would need to merge with
 * reviews" comment this replaces. Both fields are already on `/scripts/mine`.
 */
export function mapProjectCard(script, { user } = {}) {
  const status = statusPresentation(script?.status);
  const genre = getGenreLabel(script);
  const format = getFormatLabel(script);
  const published = script?.status === "published" || script?.status === "approved";

  return {
    id: script?._id,
    href: getScriptCanonicalPath(script),
    title: script?.title || "Untitled",
    author: script?.creator?.name || user?.name || "Unknown",
    date: formatDate(script?.publishedAt || script?.createdAt),
    logline: script?.logline || script?.synopsis || "No logline provided",
    status,
    score: getScore(script),
    tags: [genre, format].filter(Boolean).map((label) => ({ label, tone: "neutral" })),
    views: formatCount(script?.views),
    coverImage: script?.coverImage || null,
    // Only a published project has a public view count to show; anything else
    // gets the honest reason it has none.
    publicNote: published ? `${formatCount(script?.views)} views` : "Not yet public",
    price: script?.premium ? script?.price : null,
    shareText: script?.logline || script?.synopsis || "",
  };
}

/* ---- Whole model -------------------------------------------------------- */

const DEFAULT_STATS = Object.freeze({
  totalEarnings: 0, totalUnlocks: 0, totalViews: 0,
  profileViews: 0, trailersGenerated: 0, avgScore: null, plan: "free",
});

/**
 * Build every section's props from the three raw payloads.
 *
 * @param {Object}   input
 * @param {Array}    input.scripts  `/scripts/mine?includeCollaborations=1`
 * @param {Object}   input.stats    `/dashboard` → `stats`
 * @param {Object}   input.reviews  `/dashboard/reviews`
 * @param {Object}   input.user     the authenticated user
 */
export function buildDashboardModel({ scripts = [], stats = null, reviews = null, user = null } = {}) {
  const all = Array.isArray(scripts) ? scripts : [];
  const rawStats = stats || DEFAULT_STATS;

  const myScripts = all.filter((s) => !s?.isCollaborator);
  const sharedScripts = all.filter((s) => s?.isCollaborator);
  const published = myScripts.filter((s) => s?.status === "published" || s?.status === "approved");
  const pending = myScripts.filter((s) => s?.status === "pending_approval");
  const rejected = myScripts.filter((s) => s?.status === "rejected");

  const totalViews = published.reduce((sum, s) => sum + (s?.views || 0), 0);
  const topScript = published.length
    ? published.reduce((a, b) => ((a?.views || 0) >= (b?.views || 0) ? a : b))
    : null;
  const avgViews = published.length ? Math.round(totalViews / published.length) : 0;

  const byViews = [...published].sort((a, b) => (b?.views || 0) - (a?.views || 0));
  const topRailScripts = byViews.slice(0, 4);

  /*
   * `profileCompletion` is either a number or `{ percentage }` depending on
   * which endpoint last wrote it, so both are handled rather than assuming.
   */
  const rawCompletion = user?.profileCompletion;
  const profileCompletion = Math.round(
    (typeof rawCompletion === "object" ? rawCompletion?.percentage : rawCompletion) || 0
  );

  const overview = {
    profileCompletion,
    // A free writer's analytics come back as `null`, not 0 — the difference
    // between "nobody looked" and "we are not telling you" is worth keeping.
    analyticsLocked: Boolean(rawStats.isAnalyticsLocked),
    hero: {
      title: "Your Stories in Motion",
      body: "Track scripts, trailer engagement & producer interest — all in one place.",
    },
    glance: [
      { icon: "visibility", label: "Profile Views", value: rawStats.profileViews ?? rawStats.totalViews, locked: rawStats.profileViews == null && rawStats.totalViews == null },
      { icon: "payments", label: "Earnings", value: rawStats.totalEarnings || 0, prefix: "₹" },
      { icon: "lock_open", label: "Unlocks", value: rawStats.totalUnlocks || 0 },
      { icon: "movie", label: "AI Trailers", value: rawStats.trailersGenerated || 0 },
    ].map((cell) => ({
      ...cell,
      value: cell.locked ? "—" : `${cell.prefix || ""}${formatCount(cell.value)}`,
      note: "",
      tone: "muted",
    })),
    avgScore: {
      value: rawStats.avgScore != null ? rawStats.avgScore : "—",
      out: 100,
      note: "Across all reviewed scripts",
    },
    biggestMover: topRailScripts[0]
      ? {
        title: topRailScripts[0].title,
        note: `${formatCount(topRailScripts[0].views)} views`,
        href: getScriptCanonicalPath(topRailScripts[0]),
      }
      : null,
    topScripts: topRailScripts.map((s, i) => ({
      rank: i + 1,
      id: s._id,
      href: getScriptCanonicalPath(s),
      title: s.title,
      meta: [getGenreLabel(s), getFormatLabel(s)].filter(Boolean).join(" · "),
      views: formatCount(s.views),
    })),
  };

  const barData = byViews.slice(0, 6);
  const maxV = Math.max(...barData.map((b) => b?.views || 0), 1);
  const performance = {
    stats: [
      { label: "Total Views", value: formatCount(totalViews) },
      { label: "Top Script", value: formatCount(topScript?.views), sub: topScript?.title },
      { label: "Avg / Script", value: formatCount(avgViews) },
    ],
    chart: {
      yAxis: [maxV, Math.round(maxV * 0.75), Math.round(maxV * 0.5), Math.round(maxV * 0.25), 0]
        .map((v) => formatCount(v)),
      bars: barData.map((b, i) => ({
        label: b.title?.length > 10 ? `${b.title.slice(0, 10)}…` : (b.title || "Untitled"),
        h: Math.max(1.5, ((b.views || 0) / maxV) * 100),
        accent: i === 0,
        opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.12),
      })),
    },
  };

  const projects = {
    total: myScripts.length,
    pendingApproval: pending.length,
    rejectedCount: rejected.length,
    featured: myScripts.map((s) => mapProjectCard(s, { user })),
    collaborations: sharedScripts.map((s) => ({
      id: s._id,
      href: getScriptCanonicalPath(s),
      title: s.title,
      by: `Shared by ${s?.creator?.name || "Unknown"}`,
      status: statusPresentation(s?.status).label,
      role: s?.collaboratorRole || null,
    })),
  };

  const allProjects = myScripts.map((s) => ({
    id: s._id,
    href: getScriptCanonicalPath(s),
    title: s.title,
    score: getScore(s),
    state: s.status,
    meta: (s.status === "published" || s.status === "approved")
      ? `${formatCount(s.views)} views`
      : statusPresentation(s.status).label,
    coverImage: s.coverImage || null,
  }));

  return {
    overview,
    performance,
    projects,
    allProjects,
    aiReviews: (reviews?.ai || []).map(mapAiReview),
    platformReviews: (reviews?.adminScores || []).map(mapPlatformReview),
  };
}

export default buildDashboardModel;
