const VALID_SCRIPT_COMPLETION_STATUSES = new Set(["complete", "partial", "ongoing"]);

const STATUS_LABELS = {
  complete: "Complete",
  partial: "Partial",
  ongoing: "Ongoing",
};

export const SCRIPT_COMPLETION_OPTIONS = [
  {
    value: "complete",
    label: "Full script completed",
    helper: "The story is finished and no more chapters or parts are pending.",
  },
  {
    value: "partial",
    label: "Partially completed",
    helper: "Only part of the script is ready right now.",
  },
  {
    value: "ongoing",
    label: "Ongoing / more coming",
    helper: "You plan to add more chapters, episodes, or parts later.",
  },
];

const coerceNonNegativeInteger = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
};

const getRawCompletionSource = (source = {}) => (
  source?.scriptCompletion && typeof source.scriptCompletion === "object"
    ? source.scriptCompletion
    : source
);

export const normalizeScriptCompletion = (source = {}) => {
  const raw = getRawCompletionSource(source);
  const status = VALID_SCRIPT_COMPLETION_STATUSES.has(raw?.status) ? raw.status : "complete";
  let completedParts = coerceNonNegativeInteger(raw?.completedParts);
  let totalParts = coerceNonNegativeInteger(raw?.totalParts);

  if (totalParts > 0 && completedParts > totalParts) {
    completedParts = totalParts;
  }

  if (status === "complete") {
    if (totalParts > 0 && completedParts === 0) {
      completedParts = totalParts;
    } else if (completedParts > 0 && totalParts === 0) {
      totalParts = completedParts;
    }
  }

  return {
    status,
    completedParts,
    totalParts,
    futurePlans: String(raw?.futurePlans || "").trim(),
  };
};

export const createScriptCompletionFormState = (source = {}) => {
  const normalized = normalizeScriptCompletion(source);
  return {
    completionStatus: normalized.status,
    completedParts: normalized.completedParts > 0 ? String(normalized.completedParts) : "",
    totalParts: normalized.totalParts > 0 ? String(normalized.totalParts) : "",
    futurePlans: normalized.futurePlans,
  };
};

export const buildScriptCompletionPayload = (formState = {}) => normalizeScriptCompletion({
  status: formState?.completionStatus,
  completedParts: formState?.completedParts,
  totalParts: formState?.totalParts,
  futurePlans: formState?.futurePlans,
});

export const getScriptCompletionValidationMessage = (formState = {}) => {
  const completedRaw = String(formState?.completedParts ?? "").trim();
  const totalRaw = String(formState?.totalParts ?? "").trim();

  if (completedRaw) {
    const completedNum = Number(completedRaw);
    if (!Number.isInteger(completedNum) || completedNum < 0) {
      return "Completed chapters/parts must be a whole number.";
    }
  }

  if (totalRaw) {
    const totalNum = Number(totalRaw);
    if (!Number.isInteger(totalNum) || totalNum < 0) {
      return "Total planned chapters/parts must be a whole number.";
    }
  }

  if (completedRaw && totalRaw) {
    const completedNum = Number(completedRaw);
    const totalNum = Number(totalRaw);
    if (completedNum > totalNum) {
      return "Completed chapters/parts cannot be greater than the total planned parts.";
    }
  }

  return "";
};

export const getScriptCompletionStatusLabel = (source = {}) => {
  const normalized = normalizeScriptCompletion(source);
  return STATUS_LABELS[normalized.status] || STATUS_LABELS.complete;
};

export const getScriptCompletionProgressText = (source = {}) => {
  const normalized = normalizeScriptCompletion(source);

  if (normalized.completedParts > 0 && normalized.totalParts > 0) {
    return `${normalized.completedParts}/${normalized.totalParts} parts`;
  }

  if (normalized.totalParts > 0) {
    return `${normalized.totalParts} planned parts`;
  }

  if (normalized.completedParts > 0) {
    return `${normalized.completedParts} parts done`;
  }

  return "";
};

export const getScriptCompletionSummary = (source = {}) => {
  const label = getScriptCompletionStatusLabel(source);
  const progress = getScriptCompletionProgressText(source);
  return progress ? `${label} · ${progress}` : label;
};

export const getScriptCompletionFuturePlans = (source = {}) => normalizeScriptCompletion(source).futurePlans;

export const getScriptCompletionBadgeClasses = (source = {}, dark = false) => {
  const { status } = normalizeScriptCompletion(source);

  if (status === "ongoing") {
    return dark
      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
      : "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "partial") {
    return dark
      ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
      : "bg-sky-50 text-sky-700 border border-sky-200";
  }

  return dark
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
    : "bg-emerald-50 text-emerald-700 border border-emerald-200";
};
