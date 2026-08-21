/*
 * The privacy boundary of the AUTHENTICATED project-detail response
 * (`GET /scripts/:id` and, through it, `GET /scripts/path/:heading/:writer`).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * That handler builds its response as `{ ...script.toObject(), … }` and then overrides individual
 * fields. A spread is an allow-everything default: a field is private only if somebody remembered
 * to name it below the spread. Two of them were not remembered, and this module is where that
 * question now has one answer that a test can read.
 *
 * It is deliberately NOT a projection. The handler saves the loaded document (spotlight
 * auto-sync, PDF text hydration), and saving a document with unselected paths is how a partial
 * write happens — the same reason `getScripts`' find branch strips after `toObject()` rather than
 * selecting. So the body fields are loaded and then withheld here, at serialization time.
 *
 * Sibling contract: `scriptListPaging.js` owns the same boundary for LIST responses (DEF-21),
 * where no viewer is ever entitled to a body and the fields are excluded outright. Here the
 * viewer may be entitled, so each field is gated rather than dropped.
 */

/**
 * The fields on the `creator` populate that this response is allowed to carry.
 *
 * DEF-26: `email` and `phone` used to be here. Releasing a writer's contact details is the job of
 * the `writerContact` / `writerContactRevealStatus` block, which requires an active Film Industry
 * Professional plan and spends one of the viewer's monthly contact reveals. Populating the same
 * two fields onto `creator` handed them to every authenticated viewer for free, so the quota could
 * be skipped by reading the response body instead of pressing the button. Nothing in the client
 * reads `creator.email` or `creator.phone`.
 */
export const SCRIPT_DETAIL_CREATOR_SELECT =
  "name profileImage role bio followers username writerProfile.username writerProfile.links";

/**
 * Every field of the detail response that carries the screenplay itself, or a way to fetch it.
 *
 * DEF-25: `fullContent` and `textContent` were gated from the day this endpoint shipped;
 * `fountainContent` and `fileUrl` were not, and both defeat that gate:
 *
 *   • `fountainContent` is the schema's own "canonical Fountain markup … source of truth when
 *     present". The client reader PREFERS it over `textContent`, so on an editor-authored project
 *     the two existing lines were gating the fallback while shipping the original.
 *   • `fileUrl` is the private storage URL of the uploaded PDF — not a copy of the body, but a
 *     direct route to it that bypasses every check this server makes.
 */
export const SCRIPT_DETAIL_BODY_FIELDS = Object.freeze([
  "fullContent",
  "textContent",
  "fountainContent",
  "fileUrl",
]);

/**
 * Resolve the body fields for one viewer.
 *
 * @param {object}  args.script             the loaded script document (or a plain object)
 * @param {boolean} args.canViewFullScript  the handler's own entitlement decision — owner, admin,
 *                                          buyer, or accepted collaborator with read permission
 * @returns {object} the exact keys to spread below `...script.toObject()`
 *
 * `hasUploadedScriptFile` exists because withholding `fileUrl` also withheld the answer to a
 * question that is not private: does a stored PDF exist at all? The reader needs it to choose
 * between pointing at the authenticated PDF proxy and rendering structured pages, and inferring it
 * from the presence of a secret is what made the secret load-bearing in the first place.
 */
export const buildScriptDetailBodyAccess = ({ script = {}, canViewFullScript = false } = {}) => {
  const entitled = Boolean(canViewFullScript);
  const gated = {};
  for (const field of SCRIPT_DETAIL_BODY_FIELDS) {
    gated[field] = entitled ? (script?.[field] ?? null) : null;
  }
  return {
    ...gated,
    hasUploadedScriptFile: Boolean(String(script?.fileUrl || "").trim()),
  };
};
