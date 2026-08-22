import api from "../../services/api";

export const MANDATES_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
  SAVING: "saving",
});

export const FORMAT_OPTIONS = Object.freeze([
  { value: "feature", label: "Feature Film" },
  { value: "movie", label: "Movie" },
  { value: "tv_1hour", label: "TV Pilot (1-Hour)" },
  { value: "tv_halfhour", label: "TV Pilot (Half-Hour)" },
  { value: "limited_series", label: "Limited Series" },
  { value: "tv_serial", label: "TV Serial" },
  { value: "short", label: "Short Film" },
  { value: "web_series", label: "Web Series" },
  { value: "documentary", label: "Documentary" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "drama_school", label: "Drama School" },
  { value: "micro_drama", label: "Micro Drama" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
]);

export const MANDATE_GENRES = Object.freeze([
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "Film Noir", "History",
  "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi", "Short",
  "Sport", "Superhero", "Thriller", "War", "Western",
]);

export const MANDATE_HOOKS = Object.freeze([
  "Diverse Voices", "Female Lead", "LGBTQ+ Themes", "True Story",
  "Book Adaptation", "International Setting", "Period Piece", "Franchise Potential",
]);

export const emptyMandates = () => ({
  formats: [],
  genres: [],
  excludeGenres: [],
  specificHooks: [],
});

const formatValues = new Set(FORMAT_OPTIONS.map(({ value }) => value));
const canonicalGenres = new Map(MANDATE_GENRES.map((value) => [value.toLowerCase(), value]));
const canonicalHooks = new Map(MANDATE_HOOKS.map((value) => [value.toLowerCase(), value]));

export const normalizeMandateFormat = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  const aliases = {
    feature_film: "feature", "feature film": "feature", "tv pilot": "tv_1hour",
    "tv series": "tv_serial", "short film": "short", "web series": "web_series",
    "limited series": "limited_series", "drama school": "drama_school",
    "micro drama": "micro_drama", "standup comedy": "standup_comedy",
  };
  let normalized = aliases[raw] || raw.replace(/[\s-]+/g, "_");
  if (raw.includes("tv pilot") && (raw.includes("30") || raw.includes("half"))) normalized = "tv_halfhour";
  else if (raw.includes("tv pilot") || raw.includes("tv 1-hour")) normalized = "tv_1hour";
  else if (raw.includes("standup") || raw.includes("stand-up")) normalized = "standup_comedy";
  else if (raw.includes("dialogue")) normalized = "dialogues";
  else if (raw.includes("poet") || raw.includes("poetry")) normalized = "poet";
  return formatValues.has(normalized) ? normalized : "";
};

const normalizeList = (values, normalizer) => Array.isArray(values)
  ? [...new Set(values.map(normalizer).filter(Boolean))]
  : [];

export function normalizeMandates(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    formats: normalizeList(source.formats, normalizeMandateFormat),
    genres: normalizeList(source.genres, (item) => canonicalGenres.get(String(item || "").trim().toLowerCase())),
    excludeGenres: normalizeList(source.excludeGenres, (item) => canonicalGenres.get(String(item || "").trim().toLowerCase())),
    specificHooks: normalizeList(source.specificHooks, (item) => canonicalHooks.get(String(item || "").trim().toLowerCase())),
  };
}

export function toggleMandateValue(mandates, field, value) {
  const current = normalizeMandates(mandates);
  const selected = current[field]?.includes(value);
  const next = { ...current, [field]: selected
    ? current[field].filter((item) => item !== value)
    : [...current[field], value] };
  if (!selected && field === "genres") next.excludeGenres = next.excludeGenres.filter((item) => item !== value);
  if (!selected && field === "excludeGenres") next.genres = next.genres.filter((item) => item !== value);
  return next;
}

export async function loadMandates({ signal, client = api } = {}) {
  const { data } = await client.get("/users/me", { signal });
  return normalizeMandates(data?.industryProfile?.mandates);
}

export async function saveMandates(mandates, { signal, client = api } = {}) {
  const payload = normalizeMandates(mandates);
  const { data } = await client.put("/onboarding/mandates", { mandates: payload }, { signal });
  return normalizeMandates(data?.mandates || payload);
}
