import {
  buildCharacterReport,
  buildSceneReport,
} from "../../../components/screenplay/screenplayReports";

export const REPORT_TAB = Object.freeze({
  SCENES: "scenes",
  CHARACTERS: "characters",
});

export const REPORT_SORT_OPTIONS = Object.freeze({
  [REPORT_TAB.SCENES]: Object.freeze([
    { value: "number:asc", label: "Script order" },
    { value: "page:asc", label: "Page, first to last" },
    { value: "elements:desc", label: "Length, longest first" },
    { value: "words:desc", label: "Words, most first" },
  ]),
  [REPORT_TAB.CHARACTERS]: Object.freeze([
    { value: "lines:desc", label: "Lines, most first" },
    { value: "scenes:desc", label: "Scenes, most first" },
    { value: "name:asc", label: "Name, A to Z" },
    { value: "first:asc", label: "First appearance" },
  ]),
});

export const DEFAULT_REPORT_SORT = Object.freeze({
  [REPORT_TAB.SCENES]: REPORT_SORT_OPTIONS[REPORT_TAB.SCENES][0].value,
  [REPORT_TAB.CHARACTERS]: REPORT_SORT_OPTIONS[REPORT_TAB.CHARACTERS][0].value,
});

export const buildReports = (value = "") => ({
  [REPORT_TAB.SCENES]: buildSceneReport(value),
  [REPORT_TAB.CHARACTERS]: buildCharacterReport(value),
});

/* Stable sorting matters here: two characters with three lines each should not
   jump around between renders. The report builders already return a meaningful
   source order, which is the tie-breaker this decorated sort preserves. */
export const sortReportRows = (rows = [], order = "") => {
  const [column, direction = "asc"] = String(order).split(":");
  const multiplier = direction === "desc" ? -1 : 1;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = left.row[column];
      const b = right.row[column];
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a ?? "").localeCompare(String(b ?? ""));
      return comparison ? comparison * multiplier : left.index - right.index;
    })
    .map(({ row }) => row);
};
