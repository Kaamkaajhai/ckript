export const MANDATE_FORMATS = Object.freeze([
  "feature", "movie", "tv_1hour", "tv_halfhour", "limited_series", "tv_serial",
  "short", "web_series", "documentary", "anime", "cartoon", "drama_school",
  "micro_drama", "songs", "standup_comedy", "dialogues", "poet", "other",
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

const formatSet = new Set(MANDATE_FORMATS);
const genreMap = new Map(MANDATE_GENRES.map((value) => [value.toLowerCase(), value]));
const hookMap = new Map(MANDATE_HOOKS.map((value) => [value.toLowerCase(), value]));

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
  return formatSet.has(normalized) ? normalized : "";
};

const normalizeList = (values, normalizer) => Array.isArray(values)
  ? [...new Set(values.map(normalizer).filter(Boolean))]
  : [];

export function normalizeMandatesInput(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    formats: normalizeList(source.formats, normalizeMandateFormat),
    genres: normalizeList(source.genres, (item) => genreMap.get(String(item || "").trim().toLowerCase())),
    excludeGenres: normalizeList(source.excludeGenres, (item) => genreMap.get(String(item || "").trim().toLowerCase())),
    specificHooks: normalizeList(source.specificHooks, (item) => hookMap.get(String(item || "").trim().toLowerCase())),
  };
}
