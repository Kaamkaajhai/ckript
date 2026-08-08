/*
 * Ckript Mobile — dashboard data
 * ------------------------------------------------------------------
 * DEVELOPMENT FIXTURE ONLY. Nothing in this file reaches a signed-in user.
 *
 * As of 2026-08-07 (plan §11 Phase 2) the production dashboard builds every
 * section from `data/dashboardModel.js` against the real payloads. What is left
 * here exists to give `/__mobile-preview` a stable, offline, non-expiring
 * fixture to render the same components against — the plan blesses that
 * fixture, and it is the reason the shapes below must keep matching the model's
 * output exactly.
 *
 * Removed with the same change: NOTIFICATIONS (three invented rows that the
 * live bell was seeded from, and counted), WELCOME_TOAST, ACCOUNT_MENU and
 * AI_DETAIL_OVERRIDES.
 */

/* ---- score → verdict/grade/colour helpers (verbatim from the reference) ---- */

import { verdictForRating, gradeForOverall } from "./dashboardModel";

const clamp = (n) => Math.max(8, Math.min(99, Math.round(n)));

/* The fixture reuses the production bands so the preview cannot drift from
   what a real account sees. */
export const verdictFor = verdictForRating;

const aiBars = (s) =>
  ["Structure", "Dialogue", "Pacing", "Originality"].map((label, i) => {
    const v = clamp(s + [6, -7, -12, 10][i]);
    return { label, val: v, w: `${v}%` };
  });

const platBars = (s) =>
  ["Main Content", "Trailer", "Title", "Synopsis"].map((label, i) => {
    const v = clamp(s + [4, -8, 8, -4][i]);
    return { label, val: v, w: `${v}%` };
  });

/* ---- Reviews · AI analyses (13) ---- */

const AI_RAW = [
  ["The Last Scene", 78, "A confident, cinematic voice with a devastating final act."],
  ["Nocturne", 86, "Taut and atmospheric — the dread builds beautifully."],
  ["Ember & Ash", 64, "Vivid imagery, but the stakes stay muddy too long."],
  ["Driftwood", 72, "Warm, unhurried character work anchors the drift."],
  ["Halcyon Days", 58, "Nostalgic tone lands; structure needs tightening."],
  ["Verge", 49, "Bold premise undercut by an unfocused midsection."],
  ["Paper Boats", 81, "Delicate and precise — a quietly moving short."],
  ["The Quiet Hour", 69, "Strong mood, though the ending arrives abruptly."],
  ["Saltwater", 90, "Assured, cinematic, and emotionally exact."],
  ["Understudy", 75, "Sharp dialogue carries a familiar backstage arc."],
  ["Cinders", 61, "Promising world; pacing sags in the second act."],
  ["Nightjar", 84, "Lean thriller mechanics with a memorable hook."],
  ["Second Takes", 67, "Charming meta-comedy that overstays its welcome."],
];

export const AI_REVIEWS = AI_RAW.map(([title, score, excerpt], id) => {
  const v = verdictForRating(score);
  return {
    id: String(id),
    title,
    score,
    excerpt,
    verdict: v.label,
    vcol: v.col,
    vbg: v.bg,
    bars: aiBars(score),
  };
});

/* ---- Reviews · Platform insights (9) ---- */

const PLAT_RAW = [
  ["The Last Scene", 74, "Strong central premise and title. Trailer pacing lags in the second half — recut to land the hook sooner."],
  ["Nocturne", 82, "Excellent synopsis and cover. Consider a punchier one-line logline for discovery."],
  ["Driftwood", 68, "Solid content; trailer under-sells the emotional core. Re-cut recommended."],
  ["Halcyon Days", 63, "Title reads generic against comparables. Metadata needs stronger genre tags."],
  ["Saltwater", 88, "Platform-ready. Feature candidate for the drama collection."],
  ["Verge", 57, "Premise intriguing but synopsis is unclear. Tighten before public listing."],
  ["Understudy", 71, "Good trailer, competent title. Add supporting stills to the gallery."],
  ["Paper Boats", 79, "Clean, cohesive package. Minor caption fixes on the trailer."],
  ["Cinders", 65, "Content passes review; consider a stronger closing beat in the trailer."],
];

export const PLATFORM_REVIEWS = PLAT_RAW.map(([title, score, feedback], id) => {
  const g = gradeForOverall(score);
  return {
    id: String(id),
    title,
    score,
    grade: `Grade ${g.letter}`,
    gcol: g.col,
    gbg: g.bg,
    feedback,
    bars: platBars(score),
  };
});

export const PAGE_SIZE = 5; // "View more" increment on the review lists

/* ---- Overview ---- */

export const OVERVIEW = {
  profileCompletion: 55,
  analyticsLocked: false,
  hero: {
    title: "Your Stories in Motion",
    body: "Track scripts, trailer engagement & producer interest — all in one place.",
  },
  glance: [
    { icon: "visibility", label: "Profile Views", value: "2,340", note: "", tone: "muted" },
    { icon: "payments", label: "Earnings", value: "₹8,400", note: "", tone: "muted" },
    { icon: "lock_open", label: "Unlocks", value: "146", note: "", tone: "muted" },
    { icon: "movie", label: "AI Trailers", value: "9", note: "", tone: "muted" },
  ],
  avgScore: { value: 74, out: 100, note: "Across all reviewed scripts" },
  biggestMover: { title: "The Last Scene", note: "4,100 views", href: "/the-last-scene/arshad" },
  topScripts: [
    { rank: 1, id: "p1", href: "/the-last-scene/arshad", title: "The Last Scene", meta: "Drama · Feature Film", views: "4,100" },
    { rank: 2, id: "p2", href: "/nocturne/arshad", title: "Nocturne", meta: "Thriller · Short Film", views: "3,200" },
    { rank: 3, id: "p3", href: "/driftwood/arshad", title: "Driftwood", meta: "Drama · Feature Film", views: "2,100" },
  ],
};

/* ---- Performance ---- */

export const PERFORMANCE = {
  stats: [
    { label: "Total Views", value: "12.4k" },
    { label: "Top Script", value: "4.1k", sub: "The Last Scene" },
    { label: "Avg / Script", value: "980" },
  ],
  chart: {
    yAxis: ["4.1k", "3.1k", "2.1k", "1k", "0"],
    bars: [
      { label: "Last Scene", h: 100, accent: true },
      { label: "Nocturne", h: 74, opacity: 0.88 },
      { label: "Ember", h: 58, opacity: 0.76 },
      { label: "Driftwood", h: 44, opacity: 0.64 },
      { label: "Halcyon", h: 31, opacity: 0.52 },
      { label: "Verge", h: 19, opacity: 0.4 },
    ],
  },
};

/* ---- Projects ---- */

export const PROJECTS = {
  total: 12,
  pendingApproval: 2,
  rejectedCount: 1,
  featured: [
    {
      id: "p1",
      href: "/the-last-scene/arshad",
      title: "The Last Scene",
      author: "Arshad R.",
      date: "Feb 12, 2026",
      logline: "A grieving editor splices one last reel to say goodbye.",
      status: { label: "Published", dot: "var(--ckm-live)" },
      score: 84,
      tags: [
        { label: "Drama", tone: "neutral" },
        { label: "Feature Film", tone: "neutral" },
      ],
      views: "4,100",
      coverImage: null,
      publicNote: "4,100 views",
      price: 1499,
      shareText: "A grieving editor splices one last reel to say goodbye.",
    },
    {
      id: "p2",
      href: "/ember-and-ash/arshad",
      title: "Ember & Ash",
      author: "Arshad R.",
      date: "Mar 03, 2026",
      logline: "A widow returns to the coast where the fire began.",
      status: { label: "In Review", dot: "var(--ckm-gold)" },
      score: null,
      tags: [{ label: "Thriller", tone: "neutral" }],
      views: "0",
      coverImage: null,
      publicNote: "Not yet public",
      price: null,
      shareText: "A widow returns to the coast where the fire began.",
    },
  ],
  collaborations: [
    {
      id: "c1",
      href: "/halcyon-days/meera",
      title: "Halcyon Days",
      by: "Shared by Meera K.",
      status: "Published",
      role: "Co-writer",
    },
  ],
};

/* ---- All Projects sheet (paginated · 9 / page). Built from the known
   catalogue so pagination is real rather than decorative. ---- */

const ALL_RAW = [
  ["Nocturne", 76, "published", "2.1k views"],
  ["Driftwood", 69, "published", "1.4k views"],
  ["Halcyon Days", null, "draft", "not published"],
  ["Verge", null, "rejected", "see feedback"],
  ["The Last Scene", 84, "published", "4.1k views"],
  ["Ember & Ash", null, "pending_approval", "in review"],
  ["Paper Boats", 81, "published", "980 views"],
  ["Saltwater", 90, "published", "3.4k views"],
  ["Understudy", 75, "published", "1.1k views"],
  ["Cinders", 65, "draft", "not published"],
  ["Nightjar", 84, "pending_approval", "in review"],
  ["Second Takes", 67, "published", "760 views"],
];

export const ALL_PROJECTS = ALL_RAW.map(([title, score, state, meta], id) => ({
  id: String(id),
  href: `/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/arshad`,
  title,
  score,
  state, // published | draft | rejected | pending_approval
  meta,
}));

export const ALL_PROJECTS_PAGE_SIZE = 9;

/* ---- AI detail ---------------------------------------------------------
   Production reviews carry their own `detail`, built by `data/dashboardModel.js`
   from the strengths / weaknesses / improvements / audienceFit / comparables
   the model actually wrote. The derivation below exists only for the fixture
   reviews in this file, which have no such fields — it is why it is here, in
   the fixture module, and not in the model. */

const facetWord = (v) =>
  v >= 85 ? "Excellent" : v >= 72 ? "Strong" : v >= 60 ? "Good" : v >= 48 ? "Fair" : "Weak";

export function aiDetailFor(review) {
  // The real path: the mapping already built this from the payload.
  if (review?.detail) return review.detail;

  const ranked = [...(review?.bars || [])].sort((a, b) => b.val - a.val);
  return {
    score: review.score,
    verdict: review.verdict,
    vcol: review.vcol,
    quote: review.excerpt,
    facets: (review.bars || []).slice(0, 3).map((b) => ({ label: b.label, value: facetWord(b.val) })),
    strengths: ranked.slice(0, 2).map((b) => `${b.label} lands with confidence`),
    improve: ranked.slice(-2).map((b) => `${b.label} needs another pass`),
    recommendations: [],
    audienceFit: "Matched to readers of comparable titles in this genre.",
    comparables: "",
  };
}

/*
 * Stable, development-only visual fixture used by /__mobile-preview. Keeping
 * it beside the source mock data means the preview exercises the real mobile
 * dashboard component without calling authenticated APIs or expiring the
 * browser session. Production Dashboard instances never opt into this value.
 */
export const DASHBOARD_PREVIEW_DATA = Object.freeze({
  overview: OVERVIEW,
  performance: PERFORMANCE,
  projects: PROJECTS,
  allProjects: ALL_PROJECTS,
  aiReviews: AI_REVIEWS,
  platformReviews: PLATFORM_REVIEWS,
});
