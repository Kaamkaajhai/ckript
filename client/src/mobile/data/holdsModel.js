/*
 * Ckript Mobile — offers and holds model
 * ------------------------------------------------------------------
 * Pure derivation from `GET /scripts/holds` to the shape `screens/Holds.jsx`
 * renders. No React, no fetching — everything is a function of its arguments,
 * including the clock, so every time-dependent rule can be tested at a chosen
 * instant instead of being trusted.
 *
 * The payload (read from `server/controllers/scriptController.js` getMyHolds,
 * not inferred from client code — plan §4.1):
 *
 *   ScriptOption[]        sorted createdAt desc, scoped to { holder: me }
 *     _id, fee, platformCut, creatorPayout
 *     startDate, endDate, createdAt, updatedAt
 *     status: "active" | "expired" | "converted" | "cancelled"
 *     convertedToSale: boolean
 *     script (populated: title genre coverImage creator price trailerThumbnail)
 *       creator (populated: name profileImage)
 *
 * THREE TRAPS IN THAT PAYLOAD, each of which produces a plausible-looking lie
 * if taken at face value. They are the reason this file exists.
 *
 * 1. `status` IS NOT THE TRUTH ABOUT TIME.
 *    `holdScript` writes `status: "active"` with `endDate = now + 30 days`, and
 *    nothing in the server ever sweeps it — there is no cron, no TTL index and
 *    no code path anywhere that writes `status: "expired"`. A hold that lapsed
 *    six months ago is still literally `"active"` in the database. So expiry is
 *    derived from `endDate` against the clock, and `status` is read only as the
 *    DEAL state (did it convert, was it released), never as the TIME state.
 *
 * 2. `script` CAN BE NULL.
 *    Mongoose `populate` yields null for a deleted or missing document, and
 *    deletion is a real handled state in this system — `holdScript` has its own
 *    410 branch for `script.isDeleted`. A holder who paid for a hold on a script
 *    the writer then deleted still has the ScriptOption row. Every field is read
 *    through a null-safe path and the row renders as an explicit "no longer
 *    available" state rather than throwing on `hold.script.title`.
 *
 * 3. `convertedToSale` AND `status: "converted"` ARE WRITTEN BY DIFFERENT PATHS
 *    and are not guaranteed to agree. `getInvestorDashboard` (dashboardController
 *    .js:344) already counts a deal converted when EITHER is true. This follows
 *    that precedent rather than inventing a third rule for the same question.
 */

import { getScriptCanonicalPath } from "../../utils/scriptPath";

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * How close to `endDate` a live hold has to be before it is called out. Seven
 * days is the server's own idea of "soon": `hold_expiring` is a declared
 * Notification type, and a 30-day option makes a week the last useful window in
 * which a holder can still act (extend, convert, or let it go).
 */
export const EXPIRING_SOON_DAYS = 7;

/** Deal states that mean the option is no longer open, whatever the clock says. */
const CLOSED_STATUSES = new Set(["cancelled", "expired", "converted"]);

export const HOLD_GROUP = Object.freeze({
  EXPIRING: "expiring",
  ACTIVE: "active",
  CLOSED: "closed",
});

/*
 * Group order is fixed and never sorted by count — the same WCAG 3.2.3 reasoning
 * the tab bar follows (plan §8.2). What changes between visits is which groups
 * have rows, never where a group sits.
 */
const GROUP_ORDER = [HOLD_GROUP.EXPIRING, HOLD_GROUP.ACTIVE, HOLD_GROUP.CLOSED];

const GROUP_LABELS = Object.freeze({
  [HOLD_GROUP.EXPIRING]: "Expiring soon",
  [HOLD_GROUP.ACTIVE]: "Active holds",
  [HOLD_GROUP.CLOSED]: "Closed",
});

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

/**
 * Whole days from `now` until `endDate`, rounded UP.
 *
 * Rounding up is the honest direction: with 3 hours left, "1 day left" is true
 * and "0 days left" reads as already gone. A hold that has lapsed returns a
 * negative number, and 0 is unreachable for a live hold — which is what lets the
 * screen say "Last day" without a separate flag.
 */
export const daysUntil = (endDate, now = new Date()) => {
  const end = toDate(endDate);
  if (!end) return null;
  return Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
};

/**
 * Why a hold is closed — or null if it is still open.
 *
 * Order matters. A converted option is a SALE, and that stays the headline even
 * if the option window has since passed; being told a script you bought
 * "lapsed" would be false. Release is next, because a holder who released early
 * should not be shown as having run out of time. Only then does the clock apply.
 */
export const closedReasonFor = (hold, now = new Date()) => {
  const status = String(hold?.status || "").toLowerCase();

  if (status === "converted" || hold?.convertedToSale === true) return "converted";
  if (status === "cancelled") return "released";
  if (status === "expired") return "lapsed";

  const left = daysUntil(hold?.endDate, now);
  // Trap 1: the row can still say "active" long after this is true.
  if (left !== null && left <= 0) return "lapsed";

  return null;
};

/* Tones are Badge's own vocabulary (neutral/accent/success/warning/danger), so
   a tone here is a value the component already renders rather than a synonym
   this file would have to translate at the call site. */
const CLOSED_COPY = Object.freeze({
  converted: { label: "Bought", tone: "success" },
  released: { label: "Released", tone: "neutral" },
  // Warning, not danger: a lapsed option is an opportunity gone, not an error
  // the viewer must fix. Danger is reserved for destructive and failed states.
  lapsed: { label: "Lapsed", tone: "warning" },
});

/**
 * Map one ScriptOption to the row the screen renders.
 *
 * @param {Object} hold  raw ScriptOption from GET /scripts/holds
 * @param {Date}   now   injected so expiry is testable at a chosen instant
 */
export function buildHoldRow(hold, now = new Date()) {
  const script = hold?.script || null;
  // Trap 2. A row whose script is gone still has a real fee, real dates and a
  // real receipt; it is a hold the viewer paid for, so it is shown, not hidden.
  const isMissingScript = !script;

  const closedReason = closedReasonFor(hold, now);
  const daysLeft = daysUntil(hold?.endDate, now);

  const group = closedReason
    ? HOLD_GROUP.CLOSED
    : (daysLeft !== null && daysLeft <= EXPIRING_SOON_DAYS ? HOLD_GROUP.EXPIRING : HOLD_GROUP.ACTIVE);

  return {
    id: String(hold?._id || hold?.id || ""),

    // getMyHolds populates the creator with `name profileImage` only — no
    // username — so the canonical two-segment URL is not derivable here and
    // this resolves to /script/<id>. That is a real declared route
    // (mobileRouteManifest "project-detail-id"), not a dead link.
    title: script?.title || (isMissingScript ? "Project no longer available" : "Untitled project"),
    path: isMissingScript ? null : getScriptCanonicalPath(script),
    genre: script?.genre || "",
    cover: script?.coverImage || script?.trailerThumbnail || "",
    isMissingScript,

    writerName: script?.creator?.name || "",
    writerImage: script?.creator?.profileImage || "",

    fee: toAmount(hold?.fee),
    platformCut: toAmount(hold?.platformCut),
    creatorPayout: toAmount(hold?.creatorPayout),
    // `price` is the script's outright sale price, not the hold fee. It is what
    // converting this option would cost, so it is only meaningful while open.
    salePrice: toAmount(script?.price),

    startDate: toDate(hold?.startDate) || toDate(hold?.createdAt),
    endDate: toDate(hold?.endDate),
    daysLeft,

    group,
    closedReason,
    closedLabel: closedReason ? CLOSED_COPY[closedReason].label : null,
    closedTone: closedReason ? CLOSED_COPY[closedReason].tone : null,
    isOpen: !closedReason,

    // Kept verbatim for the receipt line; never used to decide time state.
    rawStatus: String(hold?.status || "").toLowerCase(),
    paymentId: hold?.paymentId || "",
  };
}

/**
 * The screen's whole view model.
 *
 * @param {Array}  holds  raw GET /scripts/holds response
 * @param {Object} options
 * @param {Date}   options.now  injected clock (see daysUntil)
 */
export function buildHoldsModel(holds, { now = new Date() } = {}) {
  const rows = (Array.isArray(holds) ? holds : []).map((hold) => buildHoldRow(hold, now));

  const buckets = {
    [HOLD_GROUP.EXPIRING]: [],
    [HOLD_GROUP.ACTIVE]: [],
    [HOLD_GROUP.CLOSED]: [],
  };
  rows.forEach((row) => { buckets[row.group].push(row); });

  /*
   * Within a group, soonest deadline first — that is the order in which the
   * viewer has to act, and it is the only ordering on this screen that is not
   * simply the server's. Closed rows have no deadline worth racing, so they keep
   * the server's newest-first order.
   */
  buckets[HOLD_GROUP.EXPIRING].sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
  buckets[HOLD_GROUP.ACTIVE].sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

  const open = [...buckets[HOLD_GROUP.EXPIRING], ...buckets[HOLD_GROUP.ACTIVE]];

  return {
    groups: GROUP_ORDER
      .map((key) => ({ key, label: GROUP_LABELS[key], rows: buckets[key] }))
      .filter((group) => group.rows.length > 0),

    total: rows.length,
    isEmpty: rows.length === 0,

    summary: {
      openCount: open.length,
      expiringCount: buckets[HOLD_GROUP.EXPIRING].length,
      // What is currently committed to live options. Closed rows are excluded:
      // a released or lapsed option is money spent, not money held.
      committed: open.reduce((sum, row) => sum + row.fee, 0),
      convertedCount: buckets[HOLD_GROUP.CLOSED].filter((row) => row.closedReason === "converted").length,
    },
  };
}

export default buildHoldsModel;
