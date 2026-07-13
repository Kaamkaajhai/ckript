import { SCRIPT_UPLOAD_TERMS_TEXT, SCRIPT_UPLOAD_TERMS_VERSION } from "../../constants/scriptUploadTerms";

/* Re-exported so every CreateProject module has a single import surface. */
export { SCRIPT_UPLOAD_TERMS_VERSION };

export const DRAFT_ENDPOINT = `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}/api/scripts/draft`;
export const LOCAL_WORKING_DRAFT_KEY = "create-project-working-draft-v1";

/* -- Format catalogs --------------------------------- */
export const filmFormats = [
  { value: "feature_film", label: "Feature Film", icon: "FILM" },
  { value: "short_film", label: "Short Film", icon: "SHORT" },
  { value: "web_series", label: "Web Series", icon: "SERIES" },
  { value: "tv_1hour", label: "TV Series (1 hr)", icon: "TV" },
  { value: "tv_halfhour", label: "TV Series (30 min)", icon: "TV" },
  { value: "limited_series", label: "Limited Series", icon: "SERIES" },
  { value: "documentary", label: "Documentary", icon: "DOC" },
  { value: "micro_drama", label: "Micro Drama", icon: "SHORT" },
];

export const publishingFormats = [
  { value: "fiction_novel", label: "Fiction Novel", icon: "DOC" },
  { value: "non_fiction", label: "Non-fiction", icon: "DOC" },
  { value: "novella", label: "Novella", icon: "DOC" },
  { value: "short_story_collection", label: "Short Story Collection", icon: "DOC" },
  { value: "poetry", label: "Poetry", icon: "DOC" },
];

export const styleOptions = [
  "Live Action",
  "Animation",
  "Anime",
  "Experimental"
];

export const allFormats = [...filmFormats, ...publishingFormats];

/* -- Classification vocabularies --------------------- */
export const genres = [
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi", "Fantasy",
  "Mystery", "Adventure", "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political", "Legal", "Medical",
  "Supernatural", "Psychological", "Noir", "Family", "Teen", "Satire", "Dark Comedy",
];
export const toneOptions = [
  "Dark", "Quirky", "Fast-Paced", "Slow-Burn", "Feel-Good", "Gritty", "Lighthearted",
  "Noir", "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense", "Edgy",
  "Heartwarming", "Cynical", "Hopeful", "Melancholic", "Surreal", "Cerebral",
];
export const themeOptions = [
  "Revenge", "Coming of Age", "AI", "Survival", "Redemption", "Love Triangle",
  "Betrayal", "Family Drama", "Social Justice", "Identity Crisis", "Power Struggle",
  "Forbidden Love", "Loss & Grief", "Ambition", "Good vs Evil", "Man vs Nature",
  "Isolation", "Corruption", "Second Chance", "Underdog Story",
];
export const settingOptions = [
  "New York", "Space", "High School", "Dystopia", "Isolated", "Los Angeles", "Urban",
  "Rural", "Suburban", "Historical", "Contemporary", "Post-Apocalyptic", "Small Town",
  "Big City", "Wilderness", "Ocean/Sea", "Desert", "Medieval", "Future",
];
export const ROLE_GENDER_OPTIONS = ["Any", "Female", "Male", "Non-binary", "Other"];

/* -- Pricing & upload limits ------------------------- */
export const SERVICE_PRICES = { hosting: 0, evaluation: 50, aiTrailer: 120, spotlight: 310 };
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
export const MAX_THUMBNAIL_SOURCE_SIZE = 25 * 1024 * 1024;
export const MAX_TRAILER_SIZE = 250 * 1024 * 1024;
export const MAX_CUSTOM_INVESTOR_TERMS_LENGTH = 3000;
export const MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH = 5000;

export const LEGAL_AGREEMENT = SCRIPT_UPLOAD_TERMS_TEXT;

/* -- Wizard steps ------------------------------------ */
export const STEPS = [
  { num: 1, label: "Write", shortLabel: "Write", desc: "Script content" },
  { num: 2, label: "Details", shortLabel: "Detail", desc: "Genre & media" },
  { num: 3, label: "Classify", shortLabel: "Class", desc: "Tones & themes" },
  { num: 4, label: "Film Info", shortLabel: "Film", desc: "Direction & language" },
  { num: 5, label: "Publish", shortLabel: "Pub", desc: "Pricing & services" },
];

/* -- Step 2 (Details) sub-steps ----------------------
   Details is a mini-wizard: one fitted panel at a time, paged by the shell's
   Back / Next footer, so the old single long scroll becomes a short guided flow.
   `industries` filters which panels apply to the film vs. publishing track; the
   list is derived per render from the active track (see index.jsx). `glyph` is a
   Material Symbols name, matching the icon vocabulary used across the editor. */
export const DETAILS_STEPS = [
  { key: "basics",   label: "Basics",   desc: "Format & billing",   glyph: "badge",         industries: ["film", "publishing"] },
  { key: "story",    label: "Story",    desc: "Logline & synopsis", glyph: "auto_stories",  industries: ["film", "publishing"] },
  { key: "cast",     label: "Cast",     desc: "Roles to fill",      glyph: "groups",        industries: ["film"] },
  { key: "market",   label: "Market",   desc: "Positioning",        glyph: "trending_up",   industries: ["publishing"] },
  { key: "progress", label: "Progress", desc: "How complete",       glyph: "checklist",     industries: ["film", "publishing"] },
  { key: "access",   label: "Access",   desc: "Viewable preview",   glyph: "visibility",    industries: ["film", "publishing"] },
  { key: "media",    label: "Media",    desc: "Cover & video",      glyph: "photo_library", industries: ["film", "publishing"] },
];

/* -- Prose editor palettes --------------------------- */
export const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Black", value: "#000000" },
  { label: "Slate", value: "#64748b" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
  { label: "White", value: "#ffffff" },
];

export const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Orange", value: "#fed7aa" },
];

/* Material Symbols glyph names for each screenplay element — matches the
   "Create Project.dc.html" insert bar (so the ported toolbar reads identically). */
export const CP_ELEMENT_GLYPH = {
  scene: "movie",
  action: "subject",
  character: "person",
  parenthetical: "data_object",
  dialogue: "forum",
  transition: "swap_horiz",
  shot: "videocam",
  act: "flag",
  endact: "flag_circle",
  sequence: "tag",
  lyrics: "music_note",
  dual: "view_column",
};

/* Ckript-red accent for the ported Step-1 editor (intentional in the new design). */
export const CP_ACCENT = "#E5261A";

export const CP_FILM_LANGUAGE_OPTIONS = [
  "Hindi", "English", "Hinglish", "Sindhi", "Urdu", "Tamil", "Telugu", "Marathi",
  "Bengali", "Kannada", "Malayalam", "Punjabi", "Gujarati", "Odia", "Other",
];

export const CP_SCRIPT_STYLE_OPTIONS = [
  { id: "Professional", desc: "Industry-standard structure", path: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { id: "Modern", desc: "Contemporary voice & fresh approach", path: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { id: "Clean", desc: "Minimal prose, tight & uncluttered", path: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  { id: "Concise", desc: "Every scene earns its place", path: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" },
  { id: "Commercial", desc: "Broad appeal, market-friendly", path: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
  { id: "Realistic", desc: "Grounded characters & authentic dialogue", path: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { id: "Poetic", desc: "Lyrical prose & metaphorical language", path: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
  { id: "Experimental", desc: "Non-linear, unconventional structure", path: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5" },
  { id: "Dialogue-Heavy", desc: "Character-driven through conversation", path: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" },
  { id: "Visual-Heavy", desc: "Scene-led, strong visual prose", path: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
];
