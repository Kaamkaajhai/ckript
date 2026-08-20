/*
 * projectDetailModel — the native project-detail view model (D28).
 *
 * WHAT IS NOT HERE, ON PURPOSE
 * ----------------------------
 * Who the viewer is, what they may do, and how complete the project is. Those are
 * `getViewerCapabilities`, `deriveScriptJourney` and `getRecommendedAction` in
 * `pages/script-detail/scriptDetailModel.js`, which is already platform-neutral and is IMPORTED by
 * the screen — the same rule D27 applied to the broadsheet derivations. A second definition of
 * "is this viewer the owner" is how two platforms start disagreeing about who may read a
 * screenplay.
 *
 * The deal vocabulary is likewise imported from `scriptDealLabels.js` — see DEF-28 for what four
 * private copies of a closed enum cost.
 *
 * WHAT IS HERE
 * ------------
 * The shape of the phone screen: which sections exist, in what order, and what each one says in
 * words. The desktop workbench answers the same questions with an eight-tab rail and a two-column
 * grid; a phone answers them with one column of labelled sections, and the ORDER is the design —
 * a buyer scrolling this page needs the story, then whether they can read it, then whether to
 * believe the evaluation, then the terms. Anything the viewer cannot do yet is still stated, as
 * text, rather than hidden: "you have not been approved for this project" is information, and a
 * missing button is not.
 */
import { MIN_REVIEW_COMMENT } from "../../../../pages/script-detail/projectActions";
import {
  modificationLabel,
  negotiationLabel,
  paymentStructureLabel,
  rightsTypeLabel,
} from "../../../../pages/script-detail/scriptDealLabels";
import {
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../../../../utils/scriptCompletion";
import { formatScriptCredit } from "../../../../utils/writerCredits";

const text = (value) => String(value ?? "").trim();
const has = (value) => text(value).length > 0;

export const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCount = (value) => new Intl.NumberFormat(undefined, {
  notation: Number(value) >= 10000 ? "compact" : "standard",
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

/*
 * The sections, in reading order.
 *
 * `story` first because a buyer decides on the premise; `read` second because the next question is
 * always "can I actually read it"; `evidence` third because the scores only matter once the story
 * is interesting; `feedback` fourth because it is the human half of the same question and it is
 * where the viewer adds their own; `deal` fifth. `purchase` follows the terms, because asking to
 * buy is what a reader of the terms does next — and for the writer it is where the asks arrive.
 * `contact` is second to last and exists on every viewer's screen — for a viewer with no contact
 * entitlement it says so, which is the state the desktop page renders as an empty panel. `manage`
 * is owner-only and last: destructive controls do not belong above the thing they destroy.
 */
export const PROJECT_SECTIONS = Object.freeze([
  Object.freeze({ id: "story", title: "The story", icon: "menu_book" }),
  Object.freeze({ id: "read", title: "Read the screenplay", icon: "auto_stories" }),
  Object.freeze({ id: "evidence", title: "Evidence", icon: "verified" }),
  Object.freeze({ id: "feedback", title: "Ratings and reviews", icon: "reviews" }),
  Object.freeze({ id: "deal", title: "Deal terms", icon: "handshake" }),
  Object.freeze({ id: "purchase", title: "Buying this project", icon: "shopping_bag" }),
  Object.freeze({ id: "contact", title: "The writer", icon: "person" }),
  Object.freeze({ id: "manage", title: "Manage this project", icon: "settings" }),
]);

/**
 * One section by id, with an optional title override.
 *
 * The screen used to index this array by position, which was fine at five sections and a bug
 * waiting at eight — inserting `feedback` in the middle would have retitled every section after
 * it. The override exists because two sections are the same landmark with different meanings for
 * different viewers: `purchase` is "Buying this project" to a producer and "Purchase requests" to
 * the writer who receives them.
 */
export const getSection = (id, title = "") => {
  const found = PROJECT_SECTIONS.find((section) => section.id === id) || PROJECT_SECTIONS[0];
  return has(title) ? { ...found, title } : found;
};

/**
 * The project's own state, as a badge plus a sentence.
 *
 * Sold and on-hold come FIRST, ahead of the publication status, because they change what the page
 * is for: a sold project is a record, not an offer, and rendering "Published" over a sold
 * screenplay is the kind of true-but-misleading label that costs somebody a wasted enquiry.
 */
export const describeProjectStatus = (script = {}) => {
  if (script?.isSold || script?.holdStatus === "sold" || script?.transactionStatus === "sold_licensed") {
    return { id: "sold", label: "Sold", tone: "neutral", detail: "This project has been bought and is no longer available." };
  }
  if (text(script?.holdStatus) === "on_hold" || text(script?.holdStatus) === "held") {
    return { id: "held", label: "On hold", tone: "warning", detail: "An industry member holds an option on this project." };
  }

  const status = text(script?.status);
  if (status === "published") {
    return { id: "published", label: "Published", tone: "success", detail: "Live on the marketplace." };
  }
  if (status === "approved") {
    return { id: "approved", label: "Approved", tone: "success", detail: "Approved and awaiting publication." };
  }
  if (status === "pending_approval") {
    return {
      id: "pending",
      label: "In review",
      tone: "warning",
      detail: script?.approvalRequestType === "edit_submission"
        ? "An edit is awaiting admin approval. Editing is locked until it is reviewed."
        : "Awaiting admin approval.",
    };
  }
  if (status === "draft") {
    return { id: "draft", label: "Draft", tone: "neutral", detail: "Only you and your collaborators can see this project." };
  }
  if (status === "rejected") {
    return { id: "rejected", label: "Changes requested", tone: "danger", detail: "This submission was returned for changes." };
  }
  return { id: "unknown", label: "Unlisted", tone: "neutral", detail: "This project is not currently listed." };
};

/**
 * What the viewer can actually open, and — when the answer is "less than everything" — why.
 *
 * The `why` is the part the desktop page leaves to a lock icon. On a phone the reader is a
 * full-screen task, so being sent into it and finding eight pages is worse than being told first.
 */
export const describeReaderAccess = ({ script = {}, capabilities = {}, journey = {} } = {}) => {
  const previewAccess = script?.scriptPreviewAccess || {};
  const unit = text(previewAccess?.mode) === "episodes" ? "episodes" : "pages";
  const start = Number(previewAccess?.start || 0);
  const end = Number(previewAccess?.end || 0);
  const range = start && end
    ? (start === end ? `${unit === "episodes" ? "Episode" : "Page"} ${start}` : `${unit === "episodes" ? "Episodes" : "Pages"} ${start}–${end}`)
    : "";

  if (capabilities?.fullScript && journey?.hasFullSource) {
    return {
      mode: "full",
      canOpen: true,
      label: "Read the full screenplay",
      note: capabilities?.owner
        ? "Your own project — you are reading the working copy."
        : capabilities?.collaborator
          ? "You have collaborator access to this screenplay."
          : "You have full access to this screenplay.",
      range: "",
    };
  }

  if (journey?.hasPreviewSource) {
    return {
      mode: "preview",
      canOpen: true,
      label: "Read the preview",
      note: range
        ? `The writer has opened ${range.toLowerCase()} to everyone. The rest becomes readable after purchase.`
        : "The writer has opened a sample of this screenplay. The rest becomes readable after purchase.",
      range,
    };
  }

  return {
    mode: "none",
    canOpen: false,
    label: "Not readable yet",
    note: script?.viewableScript
      ? "The writer has enabled a preview but has not added its pages yet."
      : "The writer has not opened any part of this screenplay for reading.",
    range: "",
  };
};

/** The premise, as labelled facts rather than a paragraph a phone has to hyphenate. */
export const buildStoryFacts = (script = {}) => {
  const classification = script?.classification || {};
  const film = script?.filmDetails || {};
  const rows = [
    { key: "format", label: "Format", value: text(script?.format).replace(/_/g, " ") },
    { key: "genre", label: "Genre", value: text(classification?.primaryGenre || script?.primaryGenre || script?.genre) },
    { key: "secondary", label: "Second genre", value: text(classification?.secondaryGenre) },
    { key: "language", label: "Language", value: text(film?.filmLanguage || script?.language) },
    { key: "pages", label: "Length", value: Number(script?.pageCount || 0) > 0 ? `${formatCount(script.pageCount)} pages` : "" },
    { key: "budget", label: "Budget band", value: text(script?.budget) },
    /*
     * Only when the writer actually answered.
     *
     * `getScriptCompletionStatusLabel` defaults an unset status to "complete" — reasonable for a
     * badge beside a project the writer is editing, and wrong as a labelled FACT on a buyer's
     * screen, where "Completion: Complete" on a project whose writer never said so is a claim the
     * data does not support.
     */
    {
      key: "completion",
      label: "Completion",
      value: has(script?.scriptCompletion?.status)
        ? getScriptCompletionStatusLabel(script.scriptCompletion)
        : "",
    },
  ];
  return rows.filter((row) => has(row.value)).map((row) => ({ ...row, value: row.value }));
};

/**
 * The evaluation, with the count that qualifies it.
 *
 * A score with no sample size is the number most likely to be over-trusted on a small screen,
 * where the caveat under it is the first thing to be cut — so the caveat is part of the value.
 */
export const buildEvidence = (script = {}) => {
  const score = script?.scriptScore || {};
  const platform = script?.platformScore || {};
  const producer = script?.producerRating || {};
  const rows = [];

  if (Number(score?.overall || 0) > 0) {
    rows.push({
      key: "script-score",
      label: "Ckript evaluation",
      value: `${Math.round(Number(score.overall))}/100`,
      note: has(score?.feedback) ? "Includes written feedback." : "Automated evaluation.",
    });
  }
  if (Number(platform?.overall || 0) > 0) {
    rows.push({
      key: "platform-score",
      label: "Platform score",
      value: `${Math.round(Number(platform.overall))}/100`,
      note: "Derived from listing completeness and engagement.",
    });
  }
  if (Number(producer?.count || 0) > 0) {
    rows.push({
      key: "producer-rating",
      label: "Producer rating",
      value: `${Number(producer.average || 0).toFixed(1)}/5`,
      note: `${formatCount(producer.count)} ${Number(producer.count) === 1 ? "rating" : "ratings"}.`,
    });
  }
  if (Number(script?.reviewCount || 0) > 0) {
    rows.push({
      key: "reviews",
      label: "Reader reviews",
      value: formatCount(script.reviewCount),
      note: "Written by Ckript readers.",
    });
  }
  if (Number(script?.views || 0) > 0) {
    rows.push({ key: "views", label: "Views", value: formatCount(script.views), note: "Excluding the writer's own." });
  }

  return rows;
};

/** The terms, in the one shared vocabulary. Always five rows: "Not specified" is an answer. */
export const buildDealTerms = (script = {}) => {
  const rights = script?.rightsLicensing || {};
  const months = Number(rights?.timeBound?.licenseDurationMonths || 0);
  return [
    { key: "price", label: "Price", value: formatMoney(script?.price) },
    { key: "rights", label: "Rights", value: rightsTypeLabel(rights?.rightsType) },
    { key: "modification", label: "Modification", value: modificationLabel(rights?.modificationRights) },
    { key: "payment", label: "Payment", value: paymentStructureLabel(rights?.paymentStructure) },
    { key: "negotiation", label: "Negotiation", value: negotiationLabel(rights?.negotiationMode) },
    { key: "licence", label: "Licence term", value: months > 0 ? `${months} months` : "Perpetual" },
  ];
};

/**
 * Where the viewer stands in the transaction, in one sentence.
 *
 * This is the D28 boundary made visible: the buttons that ACT on a request land in D29, but the
 * viewer's actual standing is knowable now and is stated now. A screen that silently omits
 * "your request was approved — payment is due" is worse than one that states it without a button.
 */
export const describeTransactionStanding = ({ script = {}, capabilities = {} } = {}) => {
  if (capabilities?.owner) {
    const pending = Number(script?.pendingRequestsCount || 0);
    if (pending > 0) {
      return {
        id: "owner-pending",
        tone: "warning",
        headline: `${pending} purchase ${pending === 1 ? "request" : "requests"} waiting`,
        note: "Review them on a laptop to approve or decline.",
      };
    }
    return { id: "owner", tone: "neutral", headline: "You own this project", note: "Requests to buy it will appear here." };
  }

  if (capabilities?.buyer) {
    return { id: "bought", tone: "success", headline: "You have bought this project", note: "The full screenplay is unlocked for you." };
  }

  const request = script?.myPendingRequest || null;
  const requestStatus = text(request?.status);
  if (requestStatus === "approved") {
    return {
      id: "approved",
      tone: "success",
      headline: "Your purchase request was approved",
      note: "Continue to payment to unlock the full screenplay.",
    };
  }
  if (requestStatus === "pending") {
    return { id: "pending", tone: "warning", headline: "Your purchase request is with the writer", note: "You will be notified when they respond." };
  }

  if (capabilities?.canPurchase) {
    return { id: "open", tone: "neutral", headline: "Available to buy", note: "Request access to start a purchase." };
  }

  return {
    id: "not-eligible",
    tone: "neutral",
    headline: "Not available for purchase on this account",
    note: "Screenplay purchases are made by verified industry accounts.",
  };
};

/**
 * The writer's contact standing.
 *
 * The quota numbers come from the server's own `writerContactRevealStatus`, so the phone never
 * computes an entitlement the server did not grant — and it never shows a contact the payload did
 * not contain, which after DEF-26 is the only way a contact can arrive at all.
 *
 * D29 added the two arguments that make it usable AFTER a reveal: `revealed` is the contact the
 * reveal call just returned and `stats` the quota it just reported. Both take precedence over the
 * payload, because the payload was fetched before the reveal happened — re-reading the project to
 * learn what the reveal already told us would be a second round trip for an answer we hold.
 */
export const describeContactStanding = ({ script = {}, capabilities = {}, revealed = null, stats = null } = {}) => {
  const payloadReveal = script?.writerContactRevealStatus || null;
  const reveal = payloadReveal || stats
    ? { ...(payloadReveal || {}), ...(stats || {}), alreadyRevealed: Boolean(payloadReveal?.alreadyRevealed) || Boolean(revealed) }
    : null;
  const contact = revealed || script?.writerContact || null;
  const writerName = text(script?.creator?.name) || "the writer";

  if (capabilities?.owner) {
    return { id: "self", available: false, headline: "This is your project", note: "Industry members reveal your contact details from this page." };
  }
  if (!reveal) {
    return {
      id: "no-entitlement",
      available: false,
      headline: `Contact details for ${writerName} are not available on this account`,
      note: "A Film Industry Professional plan releases a set number of writer contacts each month.",
    };
  }
  if (reveal?.alreadyRevealed && contact) {
    return {
      id: "revealed",
      available: true,
      headline: `Contact details for ${writerName}`,
      note: "Already revealed — this does not spend another contact.",
      contact,
    };
  }
  if (reveal?.canReveal) {
    const remaining = Number(reveal?.remainingContacts || 0);
    return {
      id: "can-reveal",
      available: false,
      headline: `Reveal contact details for ${writerName}`,
      note: `${remaining} of ${Number(reveal?.contactsLimit || 0)} contacts left this month. Revealing spends one.`,
    };
  }
  return {
    id: "quota-spent",
    available: false,
    headline: "Contact quota reached for this month",
    note: `You have used all ${Number(reveal?.contactsLimit || 0)} writer contacts included in your plan.`,
  };
};

/**
 * Which editor owns this project.
 *
 * The same rule the desktop page applies: a project written in the editor (or one that has text
 * but no uploaded file) opens in the screenplay editor; an uploaded PDF opens in the upload flow.
 */
export const projectEditorPath = (script = {}) => {
  const id = text(script?._id);
  const editorAuthored = text(script?.projectSource) === "editor"
    || (!has(script?.fileUrl) && !script?.hasUploadedScriptFile && has(script?.textContent));
  return editorAuthored ? `/create-project/${id}` : `/upload?edit=${id}`;
};

/** The byline, credited writers first so a co-written project is attributed on the phone too. */
export const describeCredit = (script = {}) => (
  formatScriptCredit(script) || text(script?.creator?.name) || "Ckript writer"
);

/** The one-line completion progress, when the writer has said the project is unfinished. */
export const describeCompletionProgress = (script = {}) => getScriptCompletionProgressText(script?.scriptCompletion || {});

/**
 * The recommended action, turned into something the phone can actually do.
 *
 * `getRecommendedAction` returns an intent (`edit`, `payment`, `read`, `deal`, `evidence`,
 * `trailer`, `tools`). The intents this slice cannot honour natively are mapped to the section
 * that explains them rather than to a dead button — a "Manage project" control that does nothing
 * is a worse answer than a link to the terms.
 */
export const resolveRecommendedAction = ({ recommended = {}, reader = {}, script = {} } = {}) => {
  const id = text(recommended?.id);

  if (id === "read") {
    return reader?.canOpen
      ? { kind: "reader", label: reader.label }
      : { kind: "section", section: "read", label: "See why it is not readable yet" };
  }
  if (id === "payment") {
    return { kind: "link", to: `/script/${text(script?._id)}/pay`, label: "Continue to payment" };
  }
  /*
   * `trailer` is NOT "watch one".
   *
   * `getRecommendedAction` emits it from a single branch — an OWNER whose listing has reached the
   * discovery stage without a trailer — and the desktop label is "Complete the listing". Reading
   * the intent name instead of its branch produced a "Watch the trailer" button on a project that
   * by definition has no trailer, which the five-width sweep caught on the `bare` fixture.
   */
  if (id === "trailer") return { kind: "link", to: projectEditorPath(script), label: "Complete the listing" };
  if (id === "evidence") return { kind: "section", section: "evidence", label: "Review evaluation status" };
  if (id === "deal") return { kind: "section", section: "deal", label: "Review deal terms" };
  if (id === "edit") {
    // Both editors are already native (Phase 3), and the choice between them is the desktop
    // page's own rule: an editor-authored project opens in the screenplay editor, an uploaded PDF
    // in the upload flow. Copying the branch would let the two platforms send a writer to
    // different editors for the same project.
    return { kind: "link", to: projectEditorPath(script), label: "Complete project information" };
  }
  // "Manage project" has no native surface in this slice, so it points at the terms rather than
  // rendering a control that does nothing.
  if (id === "tools") return { kind: "section", section: "deal", label: "Review this project" };
  return { kind: "section", section: "story", label: recommended?.label || "Read the project" };
};

/* ────────────────────────────────────────────────────────────────────────────
 * D29 — the WRITE half.
 *
 * Every function below answers the same two questions for one action: may this viewer take it,
 * and if not, what is the true reason. The reason is never omitted and never softened into a
 * disabled control, because on a phone a greyed-out button with no explanation is a dead end the
 * viewer cannot inspect — there is no tooltip and no hover.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the viewer can do about BUYING this project, as one resolved action.
 *
 * The order of the branches is the order of the facts: a project that is gone cannot be bought by
 * anyone; a viewer who already owns it has nothing to ask for; an approved request is a bill, not
 * an invitation; and only then does "may this account buy at all" matter.
 */
export const describePurchaseAction = ({ script = {}, capabilities = {} } = {}) => {
  const id = text(script?._id);

  if (capabilities?.owner) {
    return { kind: "none", label: "", note: "Requests to buy this project arrive here." };
  }
  if (capabilities?.buyer) {
    return { kind: "none", label: "", note: "You have bought this project. The full screenplay is unlocked." };
  }
  if (script?.isSold || text(script?.transactionStatus) === "sold_licensed") {
    return { kind: "none", label: "", note: "This project has been sold and is no longer available." };
  }

  const request = script?.myPendingRequest || null;
  const status = text(request?.status);
  if (status === "approved") {
    return {
      kind: "payment",
      to: `/script/${id}/pay`,
      label: "Continue to payment",
      note: "The writer approved your request. Payment unlocks the full screenplay.",
    };
  }
  if (status === "pending") {
    return { kind: "none", label: "", note: "Your request is with the writer. You will be notified when they respond." };
  }
  if (status === "rejected") {
    return {
      kind: "none",
      label: "",
      note: has(request?.note)
        ? `The writer declined this request: "${text(request.note)}"`
        : "The writer declined this request.",
    };
  }

  if (capabilities?.canPurchase) {
    return {
      kind: "request",
      label: "Request purchase access",
      note: "The writer reviews every request before a sale can go ahead.",
    };
  }

  return {
    kind: "none",
    label: "",
    note: capabilities?.collaborator
      ? "You are a collaborator on this project, so you cannot also buy it."
      : "Screenplay purchases are made by verified industry accounts.",
  };
};

const REQUEST_STATUS_TONES = Object.freeze({
  pending: { label: "Awaiting your decision", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Declined", tone: "neutral" },
  expired: { label: "Expired unpaid", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
});

/**
 * One incoming purchase request, as a row the writer can decide on.
 *
 * `decidable` is the whole point: only a pending request has an approve/decline pair, and the
 * desktop page renders its buttons from the same fact. A row whose status changed under the
 * writer (someone paid, the approval expired) loses its buttons on the next poll rather than
 * offering a decision the server will refuse.
 */
export const describeRequestRow = (request = {}) => {
  const status = text(request?.status) || "pending";
  const known = REQUEST_STATUS_TONES[status] || { label: status.replace(/_/g, " "), tone: "neutral" };
  const investor = request?.investor || {};
  const paid = text(request?.paymentStatus) === "released";
  return {
    id: text(request?._id),
    name: text(investor?.name) || "An industry member",
    role: text(investor?.role),
    amount: formatMoney(request?.amount),
    note: text(request?.note),
    statusLabel: paid && status === "approved" ? "Paid" : known.label,
    tone: paid && status === "approved" ? "success" : known.tone,
    createdAt: request?.createdAt || null,
    decidable: status === "pending",
  };
};

/**
 * Which kind of feedback THIS viewer can leave, and whether they already have.
 *
 * Readers write reviews; industry accounts leave a producer rating. They are different tables
 * with different role gates on the server, and the phone must not offer the form the viewer's
 * account will be refused for. Both are refused entirely on an unpublished project, which is a
 * fact worth stating on a writer's own draft — otherwise the empty section reads as a bug.
 */
export const describeFeedbackStanding = ({ script = {}, capabilities = {}, myReview = null, myRating = null } = {}) => {
  const published = text(script?.status) === "published";

  if (capabilities?.owner) {
    return { mode: "none", canSubmit: false, headline: "Your own project", note: "You cannot review or rate your own project." };
  }
  if (!published) {
    return {
      mode: "none",
      canSubmit: false,
      headline: "Not open for feedback yet",
      note: "Only published projects can be reviewed or rated.",
    };
  }
  if (capabilities?.reader) {
    return myReview
      ? {
        mode: "review",
        canSubmit: false,
        existing: myReview,
        headline: "You reviewed this project",
        note: "Your review is public to the writer and to other members.",
        label: "Write a review",
      }
      : {
        mode: "review",
        canSubmit: true,
        existing: null,
        headline: "Write a review",
        note: `A rating and at least ${MIN_REVIEW_COMMENT} characters. Reader reviews are public.`,
        label: "Write a review",
      };
  }
  if (capabilities?.industry) {
    return {
      mode: "rating",
      canSubmit: true,
      existing: myRating,
      headline: myRating ? "Your producer rating" : "Rate this project",
      note: myRating
        ? "Rating again replaces the one you gave."
        : "Producer ratings are the industry credibility signal on this project. Notes are optional.",
      label: myRating ? "Change your rating" : "Rate this project",
    };
  }
  return {
    mode: "none",
    canSubmit: false,
    headline: "Reviews come from readers",
    note: "Reader accounts write reviews; industry accounts leave a producer rating.",
  };
};

/**
 * The state of a quota-bound writer action — message or meeting — in one shape.
 *
 * Both follow the identical rule: a plan grants N per billing cycle, doing it again with the SAME
 * writer costs nothing, and a viewer with no plan is not merely blocked but blocked for a reason
 * they can act on. Writing it once means the two can never drift apart in the copy, which on the
 * desktop page they already had ("message limit" against "scheduled meetings limit").
 */
const describeQuotaAction = ({ entitled, repeat, remaining, limit, labels }) => {
  if (!entitled) {
    return { id: "no-entitlement", canAct: false, label: labels.action, note: labels.upsell };
  }
  if (repeat) {
    return { id: "repeat", canAct: true, label: labels.repeatAction, note: labels.repeatNote };
  }
  if (Number(remaining) <= 0) {
    return {
      id: "quota-spent",
      canAct: false,
      label: labels.action,
      note: `You have used all ${Number(limit) || 0} ${labels.unit} included in your plan this month.`,
    };
  }
  return {
    id: "available",
    canAct: true,
    label: labels.action,
    note: `${Number(remaining)} of ${Number(limit) || 0} ${labels.unit} left this month. This uses one.`,
  };
};

export const describeMessageStanding = ({ script = {}, capabilities = {}, entitled = false, alreadyMessaged = false, remaining = 0, limit = 0 } = {}) => {
  if (capabilities?.owner) return { id: "self", canAct: false, label: "", note: "" };
  return describeQuotaAction({
    // An unlocked project is a completed purchase: the buyer talks to the writer for free.
    entitled: entitled || Boolean(script?.isUnlocked),
    repeat: alreadyMessaged || Boolean(script?.isUnlocked),
    remaining,
    limit,
    labels: {
      action: "Message the writer",
      repeatAction: "Open the conversation",
      repeatNote: "You have already opened a conversation with this writer.",
      upsell: "A Film Industry Professional plan includes direct messages to writers.",
      unit: "writer messages",
    },
  });
};

export const describeMeetingStanding = ({ capabilities = {}, entitled = false, alreadyScheduled = false, remaining = 0, limit = 0 } = {}) => {
  if (capabilities?.owner) return { id: "self", canAct: false, label: "", note: "" };
  return describeQuotaAction({
    entitled,
    repeat: alreadyScheduled,
    remaining,
    limit,
    labels: {
      action: "Request a meeting",
      repeatAction: "Request another meeting",
      repeatNote: "You have already met this writer, so another request costs nothing.",
      upsell: "A Film Industry Professional plan includes scheduled meetings with writers.",
      unit: "meetings",
    },
  });
};

/**
 * The owner's own controls, and the situations where one of them is honestly unavailable.
 *
 * Deleting is a SOFT delete on the server — the project leaves the listings and existing buyers
 * keep what they paid for — so the confirmation says that rather than "permanently". Promising a
 * permanent erase the server does not perform is the version of this dialog that lies.
 */
export const describeOwnerManage = ({ script = {}, capabilities = {} } = {}) => {
  if (!capabilities?.owner) return { visible: false };

  const editLocked = text(script?.status) === "pending_approval";
  const competitionLocked = Boolean(script?.competitionLocked);
  const sold = Boolean(script?.isSold) || text(script?.transactionStatus) === "sold_licensed";

  return {
    visible: true,
    canEdit: !editLocked,
    editPath: projectEditorPath(script),
    editNote: editLocked
      ? "Editing is locked while your submission is with an admin."
      : "Opens this project in the editor it was written in.",
    canDelete: !competitionLocked,
    deleteNote: competitionLocked
      ? "This project was entered into a competition and cannot be deleted."
      : sold
        ? "It will be removed from listings. The buyer keeps the access they paid for."
        : "It will be removed from listings and from your profile.",
    deleteConfirm: sold
      ? "This project has been sold. Removing it takes it out of the listings and off your profile; the buyer keeps the access they paid for. This cannot be undone from the app."
      : "This takes the project out of the listings and off your profile. Anyone who already bought it keeps their access. This cannot be undone from the app.",
  };
};

/**
 * The empty meeting draft.
 *
 * It lives with the view model rather than with the sheet for a mechanical reason and a real one:
 * a component file that also exports a helper breaks fast refresh, and the shape of a form the
 * SCREEN owns is the screen's model, not the sheet's.
 */
export const emptyMeetingDraft = (projectTitle = "") => ({
  title: has(projectTitle) ? `Ckript meeting: ${text(projectTitle)}` : "Ckript meeting",
  date: "",
  time: "",
  duration: "30",
  message: "",
  needsCalendar: false,
});
