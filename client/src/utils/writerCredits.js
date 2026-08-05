// Writer credits — the ONE place that turns a script's credit list into display text.
//
// Credits are display-only attribution (see `writers` on the Script model). They are distinct from
// `creator` (owner / payee / counterparty) and from `collaborators` (who can access the script), so
// nothing here should ever be used for a permission or payment decision.

export const CREDIT_TYPES = [
  { value: "written_by", label: "Written by" },
  { value: "screenplay_by", label: "Screenplay by" },
  { value: "story_by", label: "Story by" },
  { value: "adapted_by", label: "Adapted by" },
  { value: "additional_material", label: "Additional material by" },
];

export const CREDIT_TYPE_LABELS = CREDIT_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});

export const getCreditTypeLabel = (value) => CREDIT_TYPE_LABELS[value] || "Written by";

const idOf = (value) => String(value?._id || value?.id || value || "");

/**
 * The script's credited writers, in credit order.
 *
 * Falls back to the owner when no credits have been set — every existing script predates this
 * field, so callers can rely on getting at least one name rather than branching everywhere.
 */
export const getScriptWriters = (script) => {
  const list = Array.isArray(script?.writers) ? script.writers : [];
  const credited = list
    .filter((w) => String(w?.name || "").trim())
    .slice()
    .sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))
    .map((w) => ({
      id: idOf(w.userId) || null,
      name: String(w.name).trim(),
      creditType: w.creditType || "written_by",
      // Profile linking only works for credits attached to a real account.
      profile: w.userId && typeof w.userId === "object" ? w.userId : null,
    }));

  if (credited.length) return credited;

  const creator = script?.creator;
  const ownerName = String(creator?.name || "").trim();
  if (!ownerName) return [];
  return [{ id: idOf(creator), name: ownerName, creditType: "written_by", profile: creator }];
};

/**
 * Join names the way screen credits read: "A", "A & B", "A, B & C".
 * `max` collapses a long list to "A, B & 3 others" so cards don't blow their layout.
 */
export const formatWriterNames = (names = [], { max = 0 } = {}) => {
  const list = names.map((n) => String(n || "").trim()).filter(Boolean);
  if (!list.length) return "";
  if (max > 0 && list.length > max) {
    const shown = list.slice(0, max).join(", ");
    return `${shown} & ${list.length - max} other${list.length - max === 1 ? "" : "s"}`;
  }
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
};

/** One-line credit for cards, list rows and share metadata. */
export const formatScriptCredit = (script, options) =>
  formatWriterNames(getScriptWriters(script).map((w) => w.name), options);

/** True when the script has more than one credited writer (drives "Writers" vs "Writer" labels). */
export const hasMultipleWriters = (script) => getScriptWriters(script).length > 1;

/** Group credits by type so a detail page can render "Written by …" / "Story by …" blocks. */
export const groupWriterCredits = (script) => {
  const groups = new Map();
  for (const writer of getScriptWriters(script)) {
    if (!groups.has(writer.creditType)) groups.set(writer.creditType, []);
    groups.get(writer.creditType).push(writer);
  }
  return [...groups.entries()].map(([creditType, writers]) => ({
    creditType,
    label: getCreditTypeLabel(creditType),
    writers,
  }));
};
