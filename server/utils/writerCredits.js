// Writer credits (server side). Display-only authorship attribution — see the `writers` field on
// the Script model. Never consult this for permissions, payouts or approval: `creator` remains the
// sole owner/payee/counterparty, and `collaborators` remains the access list.

export const CREDIT_TYPES = [
  "written_by",
  "screenplay_by",
  "story_by",
  "adapted_by",
  "additional_material",
];

const MAX_CREDITS = 20;

const idOf = (value) => String(value?._id || value?.id || value || "").trim();

/**
 * Sanitize a client-supplied credit list into storable subdocuments.
 * Drops unnamed rows, clamps the list, de-dupes, and re-numbers `order` from the incoming sequence
 * so credit order is always the array order the writer arranged in the UI.
 */
export const normalizeWriterCredits = (input) => {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of input) {
    const name = String(raw?.name || "").trim().slice(0, 120);
    if (!name) continue;

    const userId = idOf(raw?.userId);
    // De-dupe on the account when there is one, else on the display name.
    const key = userId ? `u:${userId}` : `n:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const creditType = CREDIT_TYPES.includes(raw?.creditType) ? raw.creditType : "written_by";
    out.push({
      userId: /^[a-fA-F0-9]{24}$/.test(userId) ? userId : null,
      name,
      creditType,
      order: out.length,
    });
    if (out.length >= MAX_CREDITS) break;
  }

  return out;
};

/**
 * Join credited names the way screen credits read: "A", "A & B", "A, B & C".
 * Mirrors formatWriterNames in client/src/utils/writerCredits.js — keep the two in step.
 */
export const formatWriterNames = (names = []) => {
  const list = names.map((n) => String(n || "").trim()).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
};

/**
 * The credit line for a script, in credit order. Falls back to the populated creator's name so
 * pre-credits scripts still render an author.
 */
export const formatScriptCredit = (script) => {
  const credits = (Array.isArray(script?.writers) ? script.writers : [])
    .filter((w) => String(w?.name || "").trim())
    .slice()
    .sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))
    .map((w) => String(w.name).trim());

  if (credits.length) return formatWriterNames(credits);
  return String(script?.creator?.name || "").trim();
};

/**
 * Append a credit if that person isn't already credited, seeding the owner first so an existing
 * script never ends up crediting a collaborator ahead of the writer who created it.
 * Returns true when the script's credits changed.
 */
export const addWriterCredit = (script, { userId, name, ownerName = "", creditType = "written_by" } = {}) => {
  const creditName = String(name || "").trim();
  if (!script || !creditName) return false;

  const current = Array.isArray(script.writers) ? script.writers : [];
  const newId = idOf(userId);

  const already = current.some((w) => (
    (newId && idOf(w.userId) === newId) ||
    String(w?.name || "").trim().toLowerCase() === creditName.toLowerCase()
  ));
  if (already) return false;

  const seeded = current.length === 0 && String(ownerName || "").trim()
    ? [{ userId: idOf(script.creator) || null, name: String(ownerName).trim(), creditType: "written_by", order: 0 }]
    : current;

  script.writers = normalizeWriterCredits([
    ...seeded,
    { userId: newId || null, name: creditName, creditType },
  ]);
  return true;
};
