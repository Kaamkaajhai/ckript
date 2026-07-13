/*
 * Ckript Mobile — dashboard data
 * ------------------------------------------------------------------
 * A faithful port of the mock data + derivation logic from the hi-fi
 * wireframe's <script data-dc-script> Component. Kept as pure data/helpers
 * (no React) so screens stay declarative and this can later be swapped for
 * a real API response with the same shape.
 */

/* ---- score → verdict/grade/colour helpers (verbatim from the reference) ---- */

const clamp = (n) => Math.max(8, Math.min(99, Math.round(n)));

export const verdictFor = (s) => {
  if (s >= 85) return { label: "Excellent", col: "var(--ckm-accent)", bg: "var(--ckm-accent-soft)" };
  if (s >= 70) return { label: "Good", col: "var(--ckm-accent)", bg: "var(--ckm-accent-soft)" };
  if (s >= 55) return { label: "Fair", col: "var(--ckm-gold)", bg: "#fbf3e2" };
  return { label: "Needs work", col: "var(--ckm-red)", bg: "var(--ckm-red-bg)" };
};

const gradeFor = (s) => (s >= 85 ? "Grade A" : s >= 75 ? "Grade B" : s >= 65 ? "Grade C" : "Grade D");

const platColorFor = (s) => {
  if (s >= 75) return { col: "var(--ckm-green)", bg: "var(--ckm-green-bg)" };
  if (s >= 65) return { col: "var(--ckm-gold)", bg: "#fbf3e2" };
  return { col: "var(--ckm-red)", bg: "var(--ckm-red-bg)" };
};

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
  const v = verdictFor(score);
  return { id, title, score, excerpt, verdict: v.label, vcol: v.col, vbg: v.bg, bars: aiBars(score) };
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
  const p = platColorFor(score);
  return { id, title, score, grade: gradeFor(score), gcol: p.col, gbg: p.bg, feedback, bars: platBars(score) };
});

export const PAGE_SIZE = 5; // "View more" increment on the review lists

/* ---- Overview ---- */

export const OVERVIEW = {
  profileCompletion: 55,
  hero: {
    title: "Your Stories in Motion",
    body: "Track scripts, trailer engagement & producer interest — all in one place.",
  },
  glance: [
    { icon: "visibility", label: "Profile Views", value: "2.3k", note: "▲ 12% this week", tone: "up" },
    { icon: "payments", label: "Earnings", value: "₹8.4k", note: "▲ ₹1.2k", tone: "up" },
    { icon: "lock_open", label: "Unlocks", value: "146", note: "across 4 scripts", tone: "muted" },
    { icon: "movie", label: "AI Trailers", value: "9", note: "2 rendering", tone: "muted" },
  ],
  avgScore: { value: 74, out: 100, note: "across 3 analyses" },
  biggestMover: { title: "The Last Scene", note: "▲ 1.4k views · 7d" },
  topScripts: [
    { rank: 1, title: "The Last Scene", meta: "Drama · Feature", views: "4.1k" },
    { rank: 2, title: "Nocturne", meta: "Thriller · Short", views: "3.2k" },
    { rank: 3, title: "Driftwood", meta: "Drama · Feature", views: "2.1k" },
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
  details: [
    { icon: "schedule", label: "Avg watch time", value: "1:48" },
    { icon: "bookmark", label: "Saves", value: "312" },
  ],
};

/* ---- Projects ---- */

export const PROJECTS = {
  total: 12,
  pendingApproval: 2,
  featured: [
    {
      id: "the-last-scene",
      title: "The Last Scene",
      author: "Arshad R.",
      date: "Feb 12, 2026",
      logline: "A grieving editor splices one last reel to say goodbye.",
      status: { label: "Published", dot: "var(--ckm-live)" },
      score: 84,
      tags: [
        { label: "Complete", tone: "green" },
        { label: "Drama", tone: "neutral" },
        { label: "Feature Film", tone: "neutral" },
      ],
      views: "4.1k",
      rating: "4.6",
      price: "₹1,499",
      cover: "hero",
    },
    {
      id: "ember-and-ash",
      title: "Ember & Ash",
      author: "Arshad R.",
      date: "Mar 03, 2026",
      logline: "A widow returns to the coast where the fire began.",
      status: { label: "In Review", dot: "#f5a623" },
      tags: [
        { label: "In Progress · 60%", tone: "gold" },
        { label: "Thriller", tone: "neutral" },
      ],
      publicNote: "Not yet public",
      price: "Free",
      cover: "placeholder",
    },
  ],
  collaborations: [
    {
      id: "halcyon-days",
      title: "Halcyon Days",
      by: "Shared by Meera K. · Co-writer",
      status: "Open",
      swatch: "linear-gradient(135deg,#e6efe4,#c9ddc4)",
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
  ["Ember & Ash", null, "review", "in review"],
  ["Paper Boats", 81, "published", "980 views"],
  ["Saltwater", 90, "published", "3.4k views"],
  ["Understudy", 75, "published", "1.1k views"],
  ["Cinders", 65, "draft", "not published"],
  ["Nightjar", 84, "review", "in review"],
  ["Second Takes", 67, "published", "760 views"],
];

const SWATCHES = [
  "linear-gradient(135deg,#dce9f8,#b5d0ef)",
  "linear-gradient(135deg,#f0e5d6,#e0cdb2)",
  "linear-gradient(135deg,#e6efe4,#c9ddc4)",
  "linear-gradient(135deg,#f2dede,#e6bcbc)",
];

export const ALL_PROJECTS = ALL_RAW.map(([title, score, state, meta], id) => ({
  id,
  title,
  score,
  state, // published | draft | rejected | review
  meta,
  swatch: SWATCHES[id % SWATCHES.length],
}));

export const ALL_PROJECTS_PAGE_SIZE = 9;

/* ---- Notifications ---- */

export const NOTIFICATIONS = [
  {
    id: "n1",
    icon: "favorite",
    unread: true,
    html: "<b>Meera K.</b> liked <b>“Nocturne”</b>",
    time: "2m ago",
  },
  {
    id: "n2",
    icon: "person_add",
    unread: false,
    html: "<b>A. Producer</b> started following you",
    time: "1h ago",
  },
  {
    id: "n3",
    icon: "movie",
    unread: false,
    html: "Your AI trailer is ready",
    time: "3h ago",
  },
];

/* The transient toast from the reference (screen 04) — surfaced once on load. */
export const WELCOME_TOAST = {
  icon: "star",
  html: "<b>Analyst</b> scored “The Last Scene” 78/100",
  time: "just now",
};

/* ---- Account menu ---- */

export const ACCOUNT_MENU = [
  { id: "profile", icon: "person", label: "Profile" },
  { id: "contact", icon: "mail", label: "Contact" },
  { id: "terms", icon: "description", label: "T & C" },
  { id: "privacy", icon: "shield", label: "Privacy" },
];

/* ---- Hand-authored AI detail (The Last Scene) from the reference sheet.
   Other scripts derive their detail from their own bars/verdict. ---- */

export const AI_DETAIL_OVERRIDES = {
  "The Last Scene": {
    quote: "A confident, cinematic voice with a devastating final act — tighten the middle and this sings.",
    facets: [
      { label: "Structure", value: "Excellent" },
      { label: "Dialogue", value: "Strong" },
      { label: "Pacing", value: "Good" },
    ],
    strengths: ["Distinct narrative voice", "Emotionally resonant climax"],
    improve: ["Sagging second act", "Underused antagonist"],
    audience: 'Festival-circuit drama; fans of <i>Aftersun</i> & <i>The Father</i>.',
  },
};

/* Derive a full detail object for any AI review (falls back to computed
   facet words + bar-ranked strengths/improvements when no override exists). */
const facetWord = (v) =>
  v >= 85 ? "Excellent" : v >= 72 ? "Strong" : v >= 60 ? "Good" : v >= 48 ? "Fair" : "Weak";

export function aiDetailFor(review) {
  const override = AI_DETAIL_OVERRIDES[review.title];
  if (override) return { ...override, score: review.score, verdict: review.verdict, vcol: review.vcol };

  const ranked = [...review.bars].sort((a, b) => b.val - a.val);
  return {
    score: review.score,
    verdict: review.verdict,
    vcol: review.vcol,
    quote: review.excerpt,
    facets: review.bars.slice(0, 3).map((b) => ({ label: b.label, value: facetWord(b.val) })),
    strengths: ranked.slice(0, 2).map((b) => `${b.label} lands with confidence`),
    improve: ranked.slice(-2).map((b) => `${b.label} needs another pass`),
    audience: "Matched to readers of comparable titles in this genre.",
  };
}
