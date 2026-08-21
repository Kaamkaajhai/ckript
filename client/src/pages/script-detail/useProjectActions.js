/*
 * useProjectActions — the state around the project-detail WRITES (D29).
 *
 * `projectActions.js` is what each write IS; this is what the screen has to REMEMBER about it:
 * which control is busy, which request row is mid-decision, what the server last said about a
 * quota, and when a list has to be re-read because a write changed it.
 *
 * It is one hook rather than five because the writes are not independent of each other. Approving
 * a request changes the project (so the detail payload must be re-read) AND the request list AND
 * the badge count. Submitting a review changes the project's aggregate rating and the review list.
 * Revealing a contact changes the cached ACCOUNT, not the project. A screen that wires five hooks
 * together gets those fan-outs wrong in a different way on each platform, which is precisely what
 * D28 removed from the read path.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It never navigates and never renders. `messageWriter` returns the path to go to; `remove`
 * returns success and lets the caller decide where the viewer lands. A hook that imported a
 * router would be a hook only one platform could use.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  approvePurchaseRequest,
  consumeMessageSlot,
  deleteProject,
  fetchProducerRatings,
  fetchProjectPurchaseRequests,
  fetchProjectReviews,
  messageThreadPath,
  rejectPurchaseRequest,
  requestPurchase,
  revealWriterContact,
  scheduleMeeting,
  submitProducerRating,
  submitProjectReview,
} from "./projectActions";

/** How often the writer's own request list re-reads itself while the screen is open. */
export const REQUEST_POLL_MS = 15000;

const noop = () => {};

/**
 * Is the tab actually being looked at?
 *
 * The desktop page polled its request list every 15 seconds forever, including in a background
 * tab and on a dead connection — 240 authenticated requests an hour from a page nobody is looking
 * at. Both platforms now poll only while the document is visible, which on a phone also means
 * "not backgrounded", where the cost is a radio wake-up rather than a request.
 */
const documentVisible = () => (typeof document === "undefined" ? true : document.visibilityState !== "hidden");

export function useProjectActions({
  script = null,
  user = null,
  setUser = null,
  /** `useProjectDetail().refresh` — re-reads the project in place, without blanking the screen. */
  refresh = null,
  /** How this platform tells the viewer what happened: (message, "success" | "error") => void. */
  notify = noop,
  enabled = true,
} = {}) {
  const scriptId = String(script?._id || "");
  const writerId = String(script?.creator?._id || "");
  const isOwner = Boolean(script?.isCreator);

  const refreshRef = useRef(refresh);
  const notifyRef = useRef(notify);
  useEffect(() => {
    refreshRef.current = refresh;
    notifyRef.current = notify;
  });

  const announce = useCallback((message, type = "success") => {
    if (message) notifyRef.current?.(message, type);
  }, []);
  const reloadProject = useCallback(async () => {
    await refreshRef.current?.();
  }, []);

  /* ── Buyer: request purchase ─────────────────────────────────────────────── */

  const [requestPending, setRequestPending] = useState(false);

  const submitPurchaseRequest = useCallback(async (note = "") => {
    if (!scriptId) return false;
    setRequestPending(true);
    try {
      const result = await requestPurchase({ scriptId, note });
      if (!result.ok) {
        announce(result.message, "error");
        return false;
      }
      await reloadProject();
      announce("Purchase request sent to the writer.", "success");
      return true;
    } finally {
      setRequestPending(false);
    }
  }, [scriptId, announce, reloadProject]);

  /* ── Owner: the requests waiting on this project ─────────────────────────── */

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

  const loadRequests = useCallback(async ({ quiet = true } = {}) => {
    if (!scriptId || !isOwner) return;
    if (!quiet) setRequestsLoading(true);
    const result = await fetchProjectPurchaseRequests({ scriptId });
    if (result.ok) setRequests(result.data);
    else if (!quiet) announce(result.message, "error");
    if (!quiet) setRequestsLoading(false);
  }, [scriptId, isOwner, announce]);

  useEffect(() => {
    if (!enabled || !scriptId || !isOwner) {
      setRequests([]);
      return undefined;
    }

    let cancelled = false;
    const read = async () => {
      const result = await fetchProjectPurchaseRequests({ scriptId });
      if (!cancelled && result.ok) setRequests(result.data);
    };

    setRequestsLoading(true);
    read().finally(() => { if (!cancelled) setRequestsLoading(false); });

    const timer = setInterval(() => { if (documentVisible()) read(); }, REQUEST_POLL_MS);
    // A tab that comes back to the front has missed however many polls it was hidden for; read
    // once immediately rather than making the writer wait out the remainder of an interval.
    const onVisible = () => { if (documentVisible()) read(); };
    document?.addEventListener?.("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document?.removeEventListener?.("visibilitychange", onVisible);
    };
  }, [enabled, scriptId, isOwner]);

  const decide = useCallback(async (requestId, decision, { note = "", quiet = false } = {}) => {
    if (!requestId) return false;
    setDecidingId(requestId);
    try {
      const result = decision === "approve"
        ? await approvePurchaseRequest({ requestId })
        : await rejectPurchaseRequest({ requestId, note });

      if (!result.ok) {
        if (!quiet) announce(result.message, "error");
        // A 409 means the request already moved. Re-reading is the only useful response — the
        // writer is looking at a row that no longer says what it says.
        if (result.flags?.conflict) {
          await reloadProject();
          await loadRequests();
        }
        return false;
      }

      await reloadProject();
      await loadRequests();
      // `quiet` is for an approval the viewer did not press — the desktop page approves in the
      // background when a buyer's payment lands — where a success toast would announce something
      // nobody did.
      if (!quiet) {
        announce(
          decision === "approve"
            ? "Request approved. The buyer was asked to complete payment."
            : "Purchase request declined.",
          "success",
        );
      }
      return true;
    } finally {
      setDecidingId(null);
    }
  }, [announce, reloadProject, loadRequests]);

  const approveRequest = useCallback(
    (requestId, { quiet = false } = {}) => decide(requestId, "approve", { quiet }),
    [decide],
  );
  const rejectRequest = useCallback((requestId, note = "") => decide(requestId, "reject", { note }), [decide]);

  const pendingRequestCount = useMemo(() => Math.max(
    Number(script?.pendingRequestsCount || 0),
    requests.filter((row) => String(row?.status || "") === "pending").length,
  ), [script?.pendingRequestsCount, requests]);

  /* ── Reader reviews ──────────────────────────────────────────────────────── */

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [myReview, setMyReview] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadReviews = useCallback(async ({ page = 1 } = {}) => {
    if (!scriptId) return;
    setReviewsLoading(true);
    const result = await fetchProjectReviews({ scriptId, page });
    if (result.ok) {
      setReviews(result.data.reviews);
      setReviewsPage(result.data.page);
      setReviewsTotalPages(result.data.totalPages);
      setReviewsTotal(result.data.total);
      setMyReview(result.data.myReview);
    } else {
      setReviews([]);
      setReviewsPage(1);
      setReviewsTotalPages(1);
      setReviewsTotal(0);
      setMyReview(null);
    }
    setReviewsLoading(false);
  }, [scriptId]);

  const submitReview = useCallback(async ({ rating, comment } = {}) => {
    setReviewSubmitting(true);
    try {
      const result = await submitProjectReview({ scriptId, rating, comment });
      if (!result.ok) {
        announce(result.message, "error");
        return false;
      }
      await Promise.all([reloadProject(), loadReviews({ page: 1 })]);
      announce("Review submitted.", "success");
      return true;
    } finally {
      setReviewSubmitting(false);
    }
  }, [scriptId, announce, reloadProject, loadReviews]);

  /* ── Producer rating ─────────────────────────────────────────────────────── */

  const [ratings, setRatings] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const loadRatings = useCallback(async () => {
    if (!scriptId) return;
    setRatingsLoading(true);
    const result = await fetchProducerRatings({ scriptId });
    if (result.ok) {
      setRatings(result.data.ratings);
      setMyRating(result.data.myRating);
    } else {
      setRatings([]);
      setMyRating(null);
    }
    setRatingsLoading(false);
  }, [scriptId]);

  const submitRating = useCallback(async ({ rating, review = "" } = {}) => {
    setRatingSubmitting(true);
    try {
      const result = await submitProducerRating({ scriptId, rating, review });
      if (!result.ok) {
        announce(result.message, "error");
        return null;
      }
      // The response carries the saved rating and the new aggregate, so the screen updates from
      // what the server stored rather than from what was typed.
      if (result.data?.rating) setMyRating(result.data.rating);
      await Promise.all([reloadProject(), loadRatings()]);
      announce("Your rating was recorded.", "success");
      return result.data;
    } finally {
      setRatingSubmitting(false);
    }
  }, [scriptId, announce, reloadProject, loadRatings]);

  /* ── Contact, messaging, meetings ────────────────────────────────────────── */

  const [revealPending, setRevealPending] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [revealedContact, setRevealedContact] = useState(null);
  const [revealStats, setRevealStats] = useState(null);
  const [messagePending, setMessagePending] = useState(false);
  const [meetingStats, setMeetingStats] = useState(null);

  // A different project by a different writer is a different reveal. Without this, walking from
  // one project to another kept the first writer's phone number on screen.
  useEffect(() => {
    setRevealedContact(null);
    setRevealStats(null);
    setRevealError("");
  }, [writerId]);

  const revealContact = useCallback(async () => {
    if (!writerId || revealPending) return false;
    setRevealError("");
    setRevealPending(true);
    try {
      const result = await revealWriterContact({ writerId });
      if (!result.ok) {
        setRevealError(result.message);
        return false;
      }
      setRevealedContact(result.data.contact);
      setRevealStats({
        contactsUsed: result.data.contactsUsed,
        contactsLimit: result.data.contactsLimit,
        remainingContacts: result.data.remainingContacts,
      });
      // Only a reveal that actually SPENT a contact is written into the cached account. Recording
      // an already-revealed writer a second time would inflate the used count on every re-open.
      if (!result.data.alreadyRevealed && setUser) {
        setUser((prev) => (prev ? {
          ...prev,
          subscription: {
            ...(prev.subscription || {}),
            revealedContacts: [
              ...(Array.isArray(prev.subscription?.revealedContacts) ? prev.subscription.revealedContacts : []),
              { writerId, revealedAt: new Date().toISOString() },
            ],
          },
        } : prev));
      }
      return true;
    } finally {
      setRevealPending(false);
    }
  }, [writerId, revealPending, setUser]);

  /**
   * Open a conversation with the writer, spending a slot only if this is the first one.
   *
   * Returns the path to navigate to, or "" when the slot could not be spent — so a viewer over
   * their limit is never dropped into a thread they were not entitled to open.
   */
  const messageWriter = useCallback(async () => {
    if (!writerId) return "";
    const path = messageThreadPath({ writerId, writerName: script?.creator?.name });
    const alreadyMessaged = Array.isArray(user?.subscription?.messagedWriters)
      && user.subscription.messagedWriters.some((entry) => String(entry?.writerId || "") === writerId);
    if (script?.isUnlocked || alreadyMessaged) return path;

    setMessagePending(true);
    try {
      const result = await consumeMessageSlot({ writerId });
      if (!result.ok) {
        setRevealError(result.message);
        announce(result.message, "error");
        return "";
      }
      if (setUser) {
        setUser((prev) => (prev ? {
          ...prev,
          subscription: {
            ...(prev.subscription || {}),
            messagedWriters: [
              ...(Array.isArray(prev.subscription?.messagedWriters) ? prev.subscription.messagedWriters : []),
              { writerId, messagedAt: new Date().toISOString() },
            ],
          },
        } : prev));
      }
      return path;
    } finally {
      setMessagePending(false);
    }
  }, [writerId, script?.isUnlocked, script?.creator?.name, user, setUser, announce]);

  const [meetingPending, setMeetingPending] = useState(false);

  const requestMeeting = useCallback(async (draft = {}) => {
    setMeetingPending(true);
    try {
      const result = await scheduleMeeting({ ...draft, writerId, scriptId });
      if (!result.ok) return result;
      if (result.data?.remainingMeetings !== undefined) {
        setMeetingStats({
          meetingsUsed: result.data.meetingsUsed,
          meetingsLimit: result.data.meetingsLimit,
          remainingMeetings: result.data.remainingMeetings,
        });
      }
      announce("Meeting requested. The writer was invited.", "success");
      return result;
    } finally {
      setMeetingPending(false);
    }
  }, [writerId, scriptId, announce]);

  /* ── Owner: delete ───────────────────────────────────────────────────────── */

  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const remove = useCallback(async () => {
    if (!scriptId) return false;
    setDeleteError("");
    setDeletePending(true);
    const result = await deleteProject({ scriptId });
    if (!result.ok) {
      setDeleteError(result.message);
      setDeletePending(false);
      return false;
    }
    // Deliberately left pending: the caller navigates away on success, and re-enabling the button
    // under a screen that is being torn down invites a second DELETE.
    return true;
  }, [scriptId]);

  return {
    // purchase
    submitPurchaseRequest,
    requestPending,
    requests,
    requestsLoading,
    decidingId,
    approveRequest,
    rejectRequest,
    loadRequests,
    pendingRequestCount,
    // reviews
    reviews,
    reviewsLoading,
    reviewsPage,
    reviewsTotalPages,
    reviewsTotal,
    myReview,
    reviewSubmitting,
    loadReviews,
    submitReview,
    // producer rating
    ratings,
    myRating,
    ratingsLoading,
    loadRatings,
    submitRating,
    ratingSubmitting,
    // contact
    revealContact,
    revealPending,
    revealError,
    setRevealError,
    revealedContact,
    revealStats,
    messageWriter,
    messagePending,
    requestMeeting,
    meetingPending,
    meetingStats,
    setMeetingStats,
    // delete
    remove,
    deletePending,
    deleteError,
  };
}

export default useProjectActions;
