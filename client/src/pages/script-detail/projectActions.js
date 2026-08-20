/*
 * projectActions — every WRITE the authenticated project-detail surface can make (D29).
 *
 * WHY THIS EXISTS SEPARATELY FROM `useProjectDetail`
 * -------------------------------------------------
 * D28 shared the READ: one endpoint choice, one canonicalization rule, one failure split. The
 * writes are the other half of the same contract and they arrived with the same risk — nine
 * endpoints, each with a role gate, a quota rule and a set of refusal messages that mean different
 * things ("already approved, pay now" is not the same as "you already asked"). A mobile copy of
 * those rules is how two platforms start disagreeing about whether a producer may still request a
 * project.
 *
 * These functions are deliberately NOT hooks and hold NO state. Each takes plain arguments, makes
 * one request, and returns the same envelope:
 *
 *     { ok: true,  data }                    the server accepted it
 *     { ok: false, message, status, flags }  it did not, and `message` is showable as-is
 *
 * The envelope is what lets the two platforms present the SAME refusal differently — desktop as a
 * notice strip, mobile as a toast or inline error — without either of them re-deriving what the
 * refusal was. `flags` carries the machine-readable extras the server sends alongside the
 * sentence (`limitReached`, `needsCalendar`, `requiresUpgrade`, `optedOut`), because a UI that has
 * to regex-match an error message is a UI that breaks when copy is edited.
 *
 * Validation that the server also performs is repeated here ONLY where the server's refusal would
 * cost a round trip for something the form already knows (an empty rating, a two-character
 * review). It is never the only check: `assertReview` mirrors `reviewController`, it does not
 * replace it.
 */
import api from "../../services/api";

const text = (value) => String(value ?? "").trim();

/** The default a buyer sends when they press "Request purchase" without writing anything. */
export const DEFAULT_PURCHASE_NOTE = "I reviewed the project and would like to request purchase access.";

/** A review must say something. Five characters is the desktop rule and the one users know. */
export const MIN_REVIEW_COMMENT = 5;

export const ok = (data = null) => ({ ok: true, data });

/**
 * Turn any thrown request into the refusal envelope.
 *
 * `fallback` is used only when the server sent no sentence of its own — never in place of one.
 * A server that explains itself ("You already have a pending purchase request for this script")
 * is more useful than any message this layer could invent.
 */
export const fail = (cause, fallback = "Something went wrong. Try again.") => {
  const response = cause?.response;
  const data = response?.data || {};
  return {
    ok: false,
    status: response?.status || 0,
    message: text(data.message) || fallback,
    flags: {
      limitReached: Boolean(data.limitReached),
      needsCalendar: Boolean(data.needsCalendar) || response?.status === 428,
      requiresUpgrade: Boolean(data.requiresUpgrade),
      optedOut: Boolean(data.optedOut),
      // 409 on approve means the request moved underneath us (someone else approved, or it
      // expired). The caller must reload rather than retry, so it is a flag and not a sentence.
      conflict: response?.status === 409,
    },
  };
};

/* ── Purchase requests ─────────────────────────────────────────────────────── */

/** The buyer asks the writer for purchase access. */
export async function requestPurchase({ scriptId, note = "" } = {}) {
  if (!text(scriptId)) return { ok: false, status: 0, message: "This project cannot be requested.", flags: {} };
  try {
    const { data } = await api.post("/scripts/purchase-request", {
      scriptId,
      note: text(note) || DEFAULT_PURCHASE_NOTE,
    });
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to submit purchase request.");
  }
}

/**
 * The writer's own requests, narrowed to one project and newest first.
 *
 * The endpoint answers with EVERY request across all of the writer's projects — there is no
 * per-script route — so the narrowing is the client's job and is done in exactly one place. The
 * populated `script` arrives as either a document or a bare id depending on the request's age,
 * which is why both shapes are read.
 */
export async function fetchProjectPurchaseRequests({ scriptId } = {}) {
  if (!text(scriptId)) return ok([]);
  try {
    const { data } = await api.get("/scripts/purchase-requests/mine");
    const wanted = String(scriptId);
    const rows = (Array.isArray(data) ? data : [])
      .filter((row) => String(row?.script?._id || row?.script || "") === wanted)
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    return ok(rows);
  } catch (cause) {
    return fail(cause, "Could not load purchase requests.");
  }
}

export async function approvePurchaseRequest({ requestId } = {}) {
  if (!text(requestId)) return { ok: false, status: 0, message: "That request is no longer available.", flags: {} };
  try {
    const { data } = await api.put(`/scripts/purchase-request/${requestId}/approve`);
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to approve request.");
  }
}

export async function rejectPurchaseRequest({ requestId, note = "" } = {}) {
  if (!text(requestId)) return { ok: false, status: 0, message: "That request is no longer available.", flags: {} };
  try {
    const { data } = await api.put(`/scripts/purchase-request/${requestId}/reject`, { note: text(note) });
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to decline request.");
  }
}

/* ── Reader reviews ────────────────────────────────────────────────────────── */

/**
 * The form's own check, in the same words on both platforms.
 *
 * Returns "" when the draft is submittable. The rating comes first because a review with a
 * paragraph and no stars is the common miss, and telling the user about the comment length first
 * would send them to fix the wrong field.
 */
export const assertReview = ({ rating, comment } = {}) => {
  if (!Number(rating)) return "Choose a rating before submitting.";
  if (text(comment).length < MIN_REVIEW_COMMENT) return `Write at least ${MIN_REVIEW_COMMENT} characters.`;
  return "";
};

export async function fetchProjectReviews({ scriptId, page = 1, limit = 8 } = {}) {
  if (!text(scriptId)) return ok({ reviews: [], page: 1, totalPages: 1, total: 0, myReview: null });
  try {
    const { data } = await api.get(`/reviews/${scriptId}?page=${page}&limit=${limit}`);
    return ok({
      reviews: Array.isArray(data?.reviews) ? data.reviews : [],
      page: Number(data?.page || page),
      totalPages: Number(data?.totalPages || 1),
      total: Number(data?.total || 0),
      myReview: data?.myReview || null,
    });
  } catch (cause) {
    return fail(cause, "Could not load reviews.");
  }
}

export async function submitProjectReview({ scriptId, rating, comment } = {}) {
  const invalid = assertReview({ rating, comment });
  if (invalid) return { ok: false, status: 0, message: invalid, flags: {} };
  try {
    const { data } = await api.post("/reviews", { script: scriptId, rating: Number(rating), comment: text(comment) });
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to submit review.");
  }
}

/* ── Producer ratings ──────────────────────────────────────────────────────── */

/**
 * The industry credibility signal — a different table, a different role gate and a different
 * shape from a reader review, which is why it is not folded into the review call. The comment is
 * optional here: a producer's 4/5 with no words is still a signal, a reader's is not.
 */
export async function submitProducerRating({ scriptId, rating, review = "" } = {}) {
  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return { ok: false, status: 0, message: "Choose a rating from 1 to 5.", flags: {} };
  }
  try {
    const { data } = await api.post("/producer-ratings", { script: scriptId, rating: score, review: text(review) });
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to submit rating.");
  }
}

export async function fetchProducerRatings({ scriptId, page = 1, limit = 10 } = {}) {
  if (!text(scriptId)) return ok({ ratings: [], myRating: null, aggregate: { average: 0, count: 0 }, canRate: false });
  try {
    const { data } = await api.get(`/producer-ratings/${scriptId}?page=${page}&limit=${limit}`);
    return ok({
      ratings: Array.isArray(data?.ratings) ? data.ratings : [],
      myRating: data?.myRating || null,
      aggregate: data?.aggregate || { average: 0, count: 0 },
      canRate: Boolean(data?.canRate),
      page: Number(data?.page || page),
      totalPages: Number(data?.totalPages || 1),
      total: Number(data?.total || 0),
    });
  } catch (cause) {
    return fail(cause, "Could not load producer ratings.");
  }
}

/* ── Writer contact, messaging and meetings ────────────────────────────────── */

/**
 * Spend one contact from the plan's monthly allowance — or, if this writer was already revealed,
 * spend nothing and re-read the details.
 *
 * Which of the two happened is the server's answer (`alreadyRevealed`), not a guess from the
 * cached account, so a second phone cannot be told "one contact spent" for a reveal that cost
 * nothing.
 */
export async function revealWriterContact({ writerId } = {}) {
  if (!text(writerId)) return { ok: false, status: 0, message: "This writer cannot be contacted.", flags: {} };
  try {
    const { data } = await api.post(`/payment/reveal-contact/${writerId}`);
    return ok({
      contact: data?.contact || null,
      alreadyRevealed: Boolean(data?.alreadyRevealed),
      contactsUsed: data?.contactsUsed,
      contactsLimit: data?.contactsLimit,
      remainingContacts: data?.remainingContacts,
    });
  } catch (cause) {
    return fail(cause, "Failed to reveal contact.");
  }
}

/** Spend one "message a writer" slot. Messaging an already-messaged writer costs nothing. */
export async function consumeMessageSlot({ writerId } = {}) {
  if (!text(writerId)) return { ok: false, status: 0, message: "This writer cannot be messaged.", flags: {} };
  try {
    const { data } = await api.post(`/payment/message-writer/${writerId}`);
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to start this conversation.");
  }
}

/** Where a conversation with this writer lives, with the name the thread list needs. */
export const messageThreadPath = ({ writerId, writerName = "Writer" } = {}) => (
  `/messages?recipientId=${encodeURIComponent(text(writerId))}&recipientName=${encodeURIComponent(text(writerName) || "Writer")}`
);

/** The producer's own IANA zone — Google localizes the invite per attendee from it. */
export const detectTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const assertMeeting = ({ title, date, time, duration } = {}) => {
  if (!text(title)) return "Give the meeting a title.";
  if (!text(date)) return "Choose a date.";
  if (!text(time)) return "Choose a time.";
  if (!Number(duration)) return "Choose how long it should run.";
  return "";
};

/**
 * Ask for a meeting. A 428 (or `needsCalendar`) is NOT a failure of the form — it means the
 * producer's Google Calendar is not connected, or its token died, and the only way forward is the
 * connect flow. The flag carries that so neither platform has to read the sentence.
 */
export async function scheduleMeeting({ writerId, scriptId, title, date, time, duration = 30, message = "", timeZone } = {}) {
  const invalid = assertMeeting({ title, date, time, duration });
  if (invalid) return { ok: false, status: 0, message: invalid, flags: {} };
  try {
    const { data } = await api.post("/meetings", {
      writerId,
      scriptId,
      title: text(title),
      scheduledDate: text(date),
      scheduledTime: text(time),
      duration: parseInt(duration, 10),
      timeZone: text(timeZone) || detectTimeZone(),
      message: text(message),
    });
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to request meeting.");
  }
}

/**
 * Start connecting Google Calendar.
 *
 * This returns a URL rather than navigating: the consent page is a full-page redirect away from
 * the app, and where the user should land on the way back differs per platform. Deciding that
 * here would put `window.location` in a module both platforms import.
 */
export async function requestCalendarConnectUrl({ returnTo = "" } = {}) {
  try {
    const { data } = await api.post("/google-calendar/auth-url", { returnTo });
    const url = text(data?.url);
    if (!url) return { ok: false, status: 0, message: "Google Calendar is not available right now.", flags: {} };
    return ok({ url });
  } catch (cause) {
    return fail(cause, "Couldn't start the Google Calendar connection.");
  }
}

/* ── Owner destructive action ──────────────────────────────────────────────── */

/**
 * Delete the project.
 *
 * The `scriptDeleted` event is part of the contract, not a nicety: the dashboard, the profile and
 * any open list listen for it, and a delete that skips it leaves a tile pointing at a project that
 * is gone. Dispatching it here means neither platform can forget.
 */
export async function deleteProject({ scriptId } = {}) {
  if (!text(scriptId)) return { ok: false, status: 0, message: "This project cannot be deleted.", flags: {} };
  try {
    const { data } = await api.delete(`/scripts/${scriptId}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scriptDeleted", { detail: { id: scriptId } }));
    }
    return ok(data);
  } catch (cause) {
    return fail(cause, "Failed to delete this project.");
  }
}
