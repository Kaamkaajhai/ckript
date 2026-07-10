/* Format → content-type mapping, page-count expectations, and the on-screen
   page geometry for the screenplay sheet view. All pure data / pure functions. */

export const CONTENT_TYPE_BY_FORMAT = {
  feature_film: "movie",
  short_film: "short_film",
  web_series: "web_series",
  tv_1hour: "tv_series",
  tv_halfhour: "tv_series",
  limited_series: "tv_series",
  documentary: "documentary",
  micro_drama: "micro_drama",
  fiction_novel: "book",
  non_fiction: "book",
  novella: "book",
  short_story_collection: "book",
  poetry: "book",
};

export const getContentTypeFromFormat = (format) => CONTENT_TYPE_BY_FORMAT[format] || "movie";

// Page geometry for the screenplay sheet view. PAGE_CONTENT_H is the on-screen height of one page's
// text area (kept in sync with the editor's --sp-page-height, which drives the REAL === page-break
// spacers). PAGE_MARGIN_Y is the top/bottom paper margin so text never touches the sheet edge.
export const PAGE_CONTENT_H = 1056;
export const PAGE_MARGIN_Y = 56;

/* -- Format-aware page ranges (industry standards) -- */
export const FORMAT_PAGE_RANGES = {
  feature: { min: 70, max: 180, typical: "90-120", label: "Feature Film", wordsPerPage: 250 },
  tv_1hour: { min: 45, max: 75, typical: "50-65", label: "TV 1-Hour", wordsPerPage: 250 },
  tv_halfhour: { min: 22, max: 45, typical: "25-35", label: "TV Half-Hour", wordsPerPage: 250 },
  short: { min: 1, max: 40, typical: "5-25", label: "Short Film", wordsPerPage: 250 },
  limited_series: { min: 45, max: 75, typical: "50-65", label: "Limited Series", wordsPerPage: 250 },
  documentary: { min: 60, max: 120, typical: "70-100", label: "Documentary", wordsPerPage: 250 },
  web_series: { min: 20, max: 80, typical: "25-45", label: "Web Series", wordsPerPage: 250 },
  drama_school: { min: 10, max: 60, typical: "15-35", label: "Drama School", wordsPerPage: 250 },
  micro_drama: { min: 1, max: 15, typical: "3-10", label: "Micro Drama", wordsPerPage: 250 },
  anime: { min: 18, max: 65, typical: "22-45", label: "Anime", wordsPerPage: 250 },
  movie: { min: 70, max: 180, typical: "90-120", label: "Movie", wordsPerPage: 250 },
  tv_serial: { min: 18, max: 50, typical: "20-35", label: "TV Serial", wordsPerPage: 250 },
  cartoon: { min: 7, max: 45, typical: "10-25", label: "Cartoon", wordsPerPage: 250 },
  songs: { min: 1, max: 30, typical: "2-10", label: "Songs", wordsPerPage: 250 },
  standup_comedy: { min: 3, max: 50, typical: "8-20", label: "Standup Comedy", wordsPerPage: 250 },
  dialogues: { min: 1, max: 80, typical: "5-25", label: "Dialogues", wordsPerPage: 250 },
  poet: { min: 1, max: 60, typical: "3-20", label: "Poet", wordsPerPage: 250 },
  other: { min: 1, max: 250, typical: "Varies", label: "Other", wordsPerPage: 250 },
};
