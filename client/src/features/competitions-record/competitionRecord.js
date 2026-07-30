import { rewardLabel } from "../../components/competition/labels";

export const PAGE_SIZE = 4;

export const STATUS_LABELS = {
  registered: "Registered",
  writing: "Writing",
  submitted: "Submitted",
  ai_processed: "In judging",
  judged: "Complete",
};

export const HONOUR_AWARDS = new Set(["winner", "runner_up", "special"]);

const AWARD_LABELS = {
  winner: "Winner",
  runner_up: "Runner-Up",
  special: "Special Award",
  participant: "Participated",
};

export const FILTERS = {
  status: [
    { value: "all", label: "All" },
    { value: "writing", label: "Writing" },
    { value: "submitted", label: "Submitted" },
    { value: "ai_processed", label: "In judging" },
    { value: "judged", label: "Complete" },
    { value: "registered", label: "Registered" },
  ],
  award: [
    { value: "all", label: "All" },
    { value: "honours", label: "Honours" },
    { value: "participant", label: "Participated" },
    { value: "none", label: "No award" },
  ],
};

export const toYear = (item) => {
  const value = item?.competition?.dates?.startsAt || item?.entry?.createdAt;
  const year = value ? new Date(value).getFullYear() : NaN;
  return Number.isFinite(year) ? String(year) : "";
};

export const formatNumber = (value, fallback = "—") => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric.toLocaleString() : fallback;
};

export const formatDate = (value, withTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { day: "2-digit", month: "short", year: "numeric" });
};

export const getAwardLabel = (item) => {
  const { entry, competition, phase } = item || {};
  const award = entry?.result?.award || "none";
  if (award === "special") return entry?.result?.specialTitle || AWARD_LABELS.special;
  if (AWARD_LABELS[award]) return AWARD_LABELS[award];
  if (!competition?.resultsDeclaredAt && phase !== "results") return "Pending";
  return entry?.submittedAt ? "No award" : "Did not submit";
};

export const getRewardLabels = (entry) => (entry?.rewardsGranted || [])
  .map((reward) => rewardLabel(reward.type, { specialTitle: entry?.result?.specialTitle }))
  .filter(Boolean);

export const getScores = (entry) => {
  const evaluation = entry?.ai?.evaluation;
  if (!evaluation || typeof evaluation !== "object") return [];

  return [
    ["plot", "Plot"],
    ["characters", "Characters"],
    ["dialogue", "Dialogue"],
    ["pacing", "Pacing"],
    ["marketability", "Marketability"],
    ["overall", "Overall"],
  ].flatMap(([key, label]) => {
    const value = Number(evaluation[key]);
    return Number.isFinite(value)
      ? [{ key, label, value: Math.max(0, Math.min(100, value)) }]
      : [];
  });
};

export const getStats = (items = []) => items.reduce((stats, item) => {
  const award = item?.entry?.result?.award || "none";
  const pages = Number(item?.entry?.snapshot?.pageCount || 0);

  return {
    awards: stats.awards + (HONOUR_AWARDS.has(award) ? 1 : 0),
    pages: stats.pages + (Number.isFinite(pages) ? pages : 0),
    certificates: stats.certificates + (item?.entry?.status === "judged" ? 1 : 0),
  };
}, { awards: 0, pages: 0, certificates: 0 });

export const filterItems = (items = [], filters = {}) => {
  const query = String(filters.query || "").trim().toLowerCase();

  return items.filter((item) => {
    const { entry, competition } = item;
    const award = entry?.result?.award || "none";

    if (filters.status && filters.status !== "all" && entry?.status !== filters.status) return false;
    if (filters.award === "honours" && !HONOUR_AWARDS.has(award)) return false;
    if (filters.award === "participant" && award !== "participant") return false;
    if (filters.award === "none" && award !== "none") return false;
    if (filters.year && filters.year !== "all" && toYear(item) !== filters.year) return false;
    if (!query) return true;

    return [
      competition?.name,
      competition?.slug,
      entry?.snapshot?.title,
      entry?.eventId,
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
  });
};

export const getFilterCount = (items, type, value) => {
  if (value === "all") return items.length;
  if (type === "status") return items.filter((item) => item?.entry?.status === value).length;
  if (value === "honours") {
    return items.filter((item) => HONOUR_AWARDS.has(item?.entry?.result?.award || "none")).length;
  }
  return items.filter((item) => (item?.entry?.result?.award || "none") === value).length;
};
