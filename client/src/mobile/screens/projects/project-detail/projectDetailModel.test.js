import { describe, expect, it } from "vitest";
import {
  PROJECT_SECTIONS,
  buildDealTerms,
  buildEvidence,
  buildStoryFacts,
  describeContactStanding,
  describeFeedbackStanding,
  describeMeetingStanding,
  describeMessageStanding,
  describeOwnerManage,
  describeProjectStatus,
  describePurchaseAction,
  describeRequestRow,
  describeReaderAccess,
  describeTransactionStanding,
  formatMoney,
  getSection,
  projectEditorPath,
  resolveRecommendedAction,
} from "./projectDetailModel";

const termFor = (script, key) => buildDealTerms(script).find((term) => term.key === key)?.value;

describe("project status", () => {
  it("reports sold and on-hold ahead of the publication status", () => {
    // A sold project is a record, not an offer. Reading `status: published` off a sold screenplay
    // is true and misleading, which is the combination this ordering exists to prevent.
    expect(describeProjectStatus({ status: "published", isSold: true }).label).toBe("Sold");
    expect(describeProjectStatus({ status: "published", holdStatus: "sold" }).label).toBe("Sold");
    expect(describeProjectStatus({ status: "published", holdStatus: "on_hold" }).label).toBe("On hold");
    expect(describeProjectStatus({ status: "published" }).label).toBe("Published");
  });

  it("explains a locked edit submission rather than just saying 'in review'", () => {
    const state = describeProjectStatus({ status: "pending_approval", approvalRequestType: "edit_submission" });
    expect(state.label).toBe("In review");
    expect(state.detail).toContain("Editing is locked");
  });

  it("never returns a state without a word for it", () => {
    for (const status of ["", "published", "approved", "draft", "rejected", "pending_approval", "nonsense"]) {
      const state = describeProjectStatus({ status });
      expect(state.label.length).toBeGreaterThan(0);
      expect(state.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("reader access", () => {
  const journeyFull = { hasFullSource: true, hasPreviewSource: true };
  const journeyPreview = { hasFullSource: false, hasPreviewSource: true };

  it("opens the full screenplay for an entitled viewer and says why they have it", () => {
    const owner = describeReaderAccess({ script: {}, capabilities: { fullScript: true, owner: true }, journey: journeyFull });
    expect(owner.mode).toBe("full");
    expect(owner.canOpen).toBe(true);
    expect(owner.note).toContain("Your own project");

    const collaborator = describeReaderAccess({
      script: {}, capabilities: { fullScript: true, collaborator: true }, journey: journeyFull,
    });
    expect(collaborator.note).toContain("collaborator");
  });

  it("states the preview WINDOW before sending anyone into the reader", () => {
    const access = describeReaderAccess({
      script: { scriptPreviewAccess: { mode: "pages", start: 1, end: 8 } },
      capabilities: {},
      journey: journeyPreview,
    });
    expect(access.mode).toBe("preview");
    expect(access.range).toBe("Pages 1–8");
    expect(access.note).toContain("pages 1–8");
    expect(access.note).toContain("after purchase");
  });

  it("uses the episode vocabulary when the writer measured the preview in episodes", () => {
    const access = describeReaderAccess({
      script: { scriptPreviewAccess: { mode: "episodes", start: 2, end: 2 } },
      capabilities: {},
      journey: journeyPreview,
    });
    expect(access.range).toBe("Episode 2");
  });

  it("distinguishes 'no preview configured' from 'preview configured but empty'", () => {
    const none = describeReaderAccess({ script: { viewableScript: false }, capabilities: {}, journey: {} });
    expect(none.canOpen).toBe(false);
    expect(none.note).toContain("has not opened");

    const empty = describeReaderAccess({ script: { viewableScript: true }, capabilities: {}, journey: {} });
    expect(empty.canOpen).toBe(false);
    expect(empty.note).toContain("has not added its pages");
  });
});

describe("deal terms", () => {
  it("labels every value of the negotiation enum, including the one DEF-28 dropped", () => {
    expect(termFor({ rightsLicensing: { negotiationMode: "ckript_not_involved" } }, "negotiation"))
      .toBe("Ckript not involved");
    expect(termFor({ rightsLicensing: { negotiationMode: "fixed_terms_non_negotiable" } }, "negotiation"))
      .toBe("Fixed terms (non-negotiable)");
  });

  it("answers 'Not specified' rather than rendering a raw enum key", () => {
    const terms = buildDealTerms({});
    expect(terms.find((term) => term.key === "rights").value).toBe("Not specified");
    expect(terms.every((term) => !/_/.test(term.value))).toBe(true);
  });

  it("calls a licence with no duration perpetual, and prices a free project 'Free'", () => {
    expect(termFor({}, "licence")).toBe("Perpetual");
    expect(termFor({ rightsLicensing: { timeBound: { licenseDurationMonths: 24 } } }, "licence")).toBe("24 months");
    expect(termFor({ price: 0 }, "price")).toBe("Free");
    expect(formatMoney(240000)).toContain("2,40,000");
  });
});

describe("evidence", () => {
  it("qualifies every number with what produced it", () => {
    const rows = buildEvidence({
      scriptScore: { overall: 94, feedback: "Strong." },
      platformScore: { overall: 81 },
      producerRating: { average: 4.4, count: 9 },
      reviewCount: 12,
      views: 18420,
    });
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.note && row.note.length > 0)).toBe(true);
    expect(rows.find((row) => row.key === "producer-rating").note).toContain("9 ratings");
  });

  it("omits a metric rather than showing a zero that reads like a bad score", () => {
    expect(buildEvidence({ scriptScore: { overall: 0 }, reviewCount: 0, views: 0 })).toHaveLength(0);
  });

  it("says 'rating' for a single producer rating", () => {
    const rows = buildEvidence({ producerRating: { average: 5, count: 1 } });
    expect(rows[0].note).toContain("1 rating.");
  });
});

describe("story facts", () => {
  it("drops the facts the writer has not supplied instead of rendering blanks", () => {
    const facts = buildStoryFacts({ format: "feature_film", classification: { primaryGenre: "Drama" } });
    expect(facts.map((fact) => fact.key)).toEqual(["format", "genre"]);
    expect(facts[0].value).toBe("feature film");
  });

  it("does not claim a project is complete because the writer never answered", () => {
    // getScriptCompletionStatusLabel defaults an unset status to "complete". As a badge that is
    // harmless; as a labelled fact on a buyer's screen it is an assertion nobody made.
    expect(buildStoryFacts({}).some((fact) => fact.key === "completion")).toBe(false);
    expect(buildStoryFacts({ scriptCompletion: { status: "ongoing" } })
      .find((fact) => fact.key === "completion").value.length).toBeGreaterThan(0);
  });
});

describe("transaction standing", () => {
  it("states an approved request and what happens next, with no button in this slice", () => {
    const standing = describeTransactionStanding({
      script: { myPendingRequest: { status: "approved" } },
      capabilities: {},
    });
    expect(standing.headline).toContain("approved");
    expect(standing.note).toContain("payment");
  });

  it("tells an owner how many requests are waiting", () => {
    expect(describeTransactionStanding({ script: { pendingRequestsCount: 2 }, capabilities: { owner: true } }).headline)
      .toContain("2 purchase requests");
    expect(describeTransactionStanding({ script: { pendingRequestsCount: 1 }, capabilities: { owner: true } }).headline)
      .toContain("1 purchase request waiting");
  });

  it("has a sentence for every viewer, including one who cannot buy at all", () => {
    for (const [script, capabilities] of [
      [{}, { owner: true }], [{}, { buyer: true }], [{}, { canPurchase: true }],
      [{ myPendingRequest: { status: "pending" } }, {}], [{}, {}],
    ]) {
      const standing = describeTransactionStanding({ script, capabilities });
      expect(standing.headline.length).toBeGreaterThan(0);
      expect(standing.note.length).toBeGreaterThan(0);
    }
  });
});

describe("contact standing", () => {
  it("never claims a contact the payload does not carry", () => {
    // After DEF-26 the writer's email and phone reach the client only through `writerContact`,
    // which the server fills only for a viewer who has spent a reveal. A screen that read
    // `creator.email` would have shown a contact nobody paid for.
    const revealed = describeContactStanding({
      script: {
        writerContactRevealStatus: { alreadyRevealed: true },
        writerContact: { email: "mira@example.com" },
        creator: { name: "Mira Sen", email: "leak@example.com" },
      },
      capabilities: {},
    });
    expect(revealed.available).toBe(true);
    expect(revealed.contact.email).toBe("mira@example.com");

    const notRevealed = describeContactStanding({
      script: {
        writerContactRevealStatus: { canReveal: true, remainingContacts: 11, contactsLimit: 15 },
        creator: { name: "Mira Sen", email: "leak@example.com" },
      },
      capabilities: {},
    });
    expect(notRevealed.available).toBe(false);
    expect(notRevealed.contact).toBeUndefined();
    expect(JSON.stringify(notRevealed)).not.toContain("leak@example.com");
  });

  it("states the quota in numbers the server supplied, not ones it computed", () => {
    const standing = describeContactStanding({
      script: { writerContactRevealStatus: { canReveal: true, remainingContacts: 11, contactsLimit: 15 }, creator: { name: "Mira" } },
      capabilities: {},
    });
    expect(standing.note).toContain("11 of 15");

    const spent = describeContactStanding({
      script: { writerContactRevealStatus: { canReveal: false, contactsLimit: 15 }, creator: { name: "Mira" } },
      capabilities: {},
    });
    expect(spent.id).toBe("quota-spent");
    expect(spent.headline).toContain("quota reached");
  });

  it("says nothing about revealing to the writer's own eyes", () => {
    expect(describeContactStanding({ script: {}, capabilities: { owner: true } }).id).toBe("self");
  });
});

describe("the recommended action", () => {
  const reader = { canOpen: true, label: "Read the preview" };

  it("opens the reader when there is something to read, and explains when there is not", () => {
    expect(resolveRecommendedAction({ recommended: { id: "read" }, reader, script: {} }))
      .toMatchObject({ kind: "reader", label: "Read the preview" });

    expect(resolveRecommendedAction({ recommended: { id: "read" }, reader: { canOpen: false }, script: {} }))
      .toMatchObject({ kind: "section", section: "read" });
  });

  it("sends an approved buyer to payment", () => {
    expect(resolveRecommendedAction({ recommended: { id: "payment" }, reader, script: { _id: "p1" } }))
      .toMatchObject({ kind: "link", to: "/script/p1/pay" });
  });

  it("sends a writer to the editor that owns their project, not to a fixed one", () => {
    expect(projectEditorPath({ _id: "p1", projectSource: "editor" })).toBe("/create-project/p1");
    expect(projectEditorPath({ _id: "p1", textContent: "FADE IN" })).toBe("/create-project/p1");
    expect(projectEditorPath({ _id: "p1", hasUploadedScriptFile: true })).toBe("/upload?edit=p1");
    expect(resolveRecommendedAction({ recommended: { id: "edit" }, reader, script: { _id: "p1", projectSource: "editor" } }))
      .toMatchObject({ kind: "link", to: "/create-project/p1" });
  });

  it("never offers to play a trailer that does not exist", () => {
    // `trailer` is emitted only for an owner whose listing has no trailer yet, so it means "add
    // one", not "watch one". Found by the five-width sweep on a project with no trailer at all.
    const action = resolveRecommendedAction({
      recommended: { id: "trailer" }, reader, script: { _id: "p1", projectSource: "editor" },
    });
    expect(action.kind).toBe("link");
    expect(action.to).toBe("/create-project/p1");
    expect(action.label).toBe("Complete the listing");
  });

  it("always resolves to something the screen can actually do", () => {
    const kinds = new Set(["reader", "trailer", "link", "section"]);
    for (const id of ["read", "payment", "trailer", "evidence", "deal", "edit", "tools", "", "unknown-intent"]) {
      const action = resolveRecommendedAction({ recommended: { id, label: "Fallback" }, reader, script: { _id: "p1" } });
      expect(kinds.has(action.kind)).toBe(true);
      expect(action.label.length).toBeGreaterThan(0);
      if (action.kind === "section") {
        expect(PROJECT_SECTIONS.some((section) => section.id === action.section)).toBe(true);
      }
    }
  });
});

/* ── D29: the write half ────────────────────────────────────────────────── */

describe("what the viewer can do about buying", () => {
  const producer = { canPurchase: true };

  it("puts the facts in the order they overrule each other", () => {
    // Gone beats everything; owning it beats being able to buy it; an approved request is a bill
    // rather than an invitation.
    expect(describePurchaseAction({ script: { isSold: true }, capabilities: producer }).kind).toBe("none");
    expect(describePurchaseAction({ script: {}, capabilities: { ...producer, buyer: true } }).kind).toBe("none");
    expect(describePurchaseAction({
      script: { _id: "p1", myPendingRequest: { status: "approved" } },
      capabilities: producer,
    })).toMatchObject({ kind: "payment", to: "/script/p1/pay" });
    expect(describePurchaseAction({ script: {}, capabilities: producer }).kind).toBe("request");
  });

  it("says why there is no control, in every case where there is none", () => {
    for (const [script, capabilities] of [
      [{ isSold: true }, producer],
      [{}, { owner: true }],
      [{}, { buyer: true }],
      [{}, { collaborator: true }],
      [{}, {}],
      [{ myPendingRequest: { status: "pending" } }, producer],
      [{ myPendingRequest: { status: "rejected" } }, producer],
    ]) {
      const action = describePurchaseAction({ script, capabilities });
      expect(action.kind).toBe("none");
      expect(action.note.length).toBeGreaterThan(0);
    }
  });

  it("quotes the writer's reason when they gave one", () => {
    const action = describePurchaseAction({
      script: { myPendingRequest: { status: "rejected", note: "Optioned elsewhere." } },
      capabilities: producer,
    });
    expect(action.note).toContain("Optioned elsewhere.");
  });
});

describe("one incoming request", () => {
  it("offers a decision only on a request that is still open", () => {
    expect(describeRequestRow({ _id: "r1", status: "pending" }).decidable).toBe(true);
    for (const status of ["approved", "rejected", "expired", "cancelled"]) {
      expect(describeRequestRow({ _id: "r1", status }).decidable, status).toBe(false);
    }
  });

  it("says 'Paid' rather than 'Approved' once the money has moved", () => {
    const row = describeRequestRow({ _id: "r1", status: "approved", paymentStatus: "released" });
    expect(row.statusLabel).toBe("Paid");
    expect(row.tone).toBe("success");
  });

  it("names an unpopulated buyer rather than rendering an empty row", () => {
    expect(describeRequestRow({ _id: "r1", status: "pending" }).name).toBe("An industry member");
  });
});

describe("who may leave what kind of feedback", () => {
  const published = { status: "published" };

  it("offers a reader the review form and an industry account the rating", () => {
    expect(describeFeedbackStanding({ script: published, capabilities: { reader: true } })).toMatchObject({
      mode: "review", canSubmit: true,
    });
    expect(describeFeedbackStanding({ script: published, capabilities: { industry: true } })).toMatchObject({
      mode: "rating", canSubmit: true,
    });
  });

  it("never offers a form the server would refuse", () => {
    // Reviews are reader-only, ratings are industry-only, both are refused on the owner's own
    // project and on anything unpublished. A form that posts into a 403 is worse than no form.
    expect(describeFeedbackStanding({ script: published, capabilities: { owner: true } }).canSubmit).toBe(false);
    expect(describeFeedbackStanding({ script: { status: "draft" }, capabilities: { reader: true } }).canSubmit).toBe(false);
    expect(describeFeedbackStanding({ script: published, capabilities: {} }).canSubmit).toBe(false);
  });

  it("tells a reader who already reviewed that they did, instead of offering a second one", () => {
    const standing = describeFeedbackStanding({
      script: published,
      capabilities: { reader: true },
      myReview: { rating: 4, comment: "Strong second act." },
    });
    expect(standing.canSubmit).toBe(false);
    expect(standing.existing.rating).toBe(4);
  });

  it("lets a producer replace a rating, and says that is what will happen", () => {
    const standing = describeFeedbackStanding({
      script: published,
      capabilities: { industry: true },
      myRating: { rating: 3 },
    });
    expect(standing.canSubmit).toBe(true);
    expect(standing.note).toContain("replaces");
  });
});

describe("the quota-bound writer actions", () => {
  it("distinguishes no plan from a spent quota, because only one of them can be fixed by waiting", () => {
    expect(describeMessageStanding({ capabilities: {}, entitled: false }).id).toBe("no-entitlement");
    expect(describeMessageStanding({ capabilities: {}, entitled: true, remaining: 0, limit: 10 }).id).toBe("quota-spent");
    expect(describeMessageStanding({ capabilities: {}, entitled: true, remaining: 3, limit: 10 }).id).toBe("available");
  });

  it("charges nothing for a writer already spoken to", () => {
    const repeat = describeMessageStanding({ capabilities: {}, entitled: true, alreadyMessaged: true, remaining: 0, limit: 10 });
    expect(repeat.canAct).toBe(true);
    expect(repeat.id).toBe("repeat");
  });

  it("treats a completed purchase as its own entitlement to talk to the writer", () => {
    const buyer = describeMessageStanding({ script: { isUnlocked: true }, capabilities: {}, entitled: false });
    expect(buyer.canAct).toBe(true);
  });

  it("counts meetings by the same rule and in the same words", () => {
    expect(describeMeetingStanding({ capabilities: {}, entitled: true, remaining: 0, limit: 4 }).note).toContain("all 4");
    expect(describeMeetingStanding({ capabilities: {}, entitled: true, remaining: 2, limit: 4 }).note).toContain("2 of 4");
    expect(describeMeetingStanding({ capabilities: { owner: true } }).canAct).toBe(false);
  });
});

describe("the owner's own controls", () => {
  it("exists for nobody else", () => {
    expect(describeOwnerManage({ script: {}, capabilities: {} }).visible).toBe(false);
  });

  it("locks editing while an admin holds the submission, and says so", () => {
    const manage = describeOwnerManage({ script: { status: "pending_approval" }, capabilities: { owner: true } });
    expect(manage.canEdit).toBe(false);
    expect(manage.editNote).toContain("admin");
  });

  it("refuses to offer a delete the server will refuse", () => {
    const locked = describeOwnerManage({ script: { competitionLocked: true }, capabilities: { owner: true } });
    expect(locked.canDelete).toBe(false);
    expect(locked.deleteNote).toContain("competition");
  });

  it("promises a removal, not an erasure, because the server soft-deletes", () => {
    const manage = describeOwnerManage({ script: {}, capabilities: { owner: true } });
    expect(manage.deleteConfirm).not.toContain("permanent");
    expect(manage.deleteConfirm).toContain("already bought it keeps their access");

    const sold = describeOwnerManage({ script: { isSold: true }, capabilities: { owner: true } });
    expect(sold.deleteConfirm).toContain("buyer keeps the access they paid for");
  });
});

describe("the section registry", () => {
  it("is addressed by id, so inserting a section cannot retitle its neighbours", () => {
    expect(getSection("deal").title).toBe("Deal terms");
    expect(getSection("purchase", "Purchase requests").title).toBe("Purchase requests");
    // An unknown id still yields a renderable section rather than undefined.
    expect(getSection("nope").id).toBe("story");
  });
});

describe("the contact standing after a reveal", () => {
  it("prefers what the reveal just returned over the payload it was fetched before", () => {
    const standing = describeContactStanding({
      script: { creator: { name: "Mira" }, writerContactRevealStatus: { canReveal: true, alreadyRevealed: false, remainingContacts: 3, contactsLimit: 10 } },
      capabilities: {},
      revealed: { email: "mira@example.com" },
      stats: { remainingContacts: 2, contactsLimit: 10 },
    });
    expect(standing.id).toBe("revealed");
    expect(standing.contact.email).toBe("mira@example.com");
  });
});
