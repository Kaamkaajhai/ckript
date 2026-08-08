import { describe, it, expect } from "vitest";
import {
  buildHoldsModel,
  buildHoldRow,
  closedReasonFor,
  daysUntil,
  HOLD_GROUP,
  EXPIRING_SOON_DAYS,
} from "./holdsModel";

/*
 * The fixtures below are the shape `server/controllers/scriptController.js`
 * getMyHolds actually returns, transcribed field-for-field from the controller
 * and the ScriptOption schema — NOT from any client code.
 *
 * That distinction is the reason this file exists. The 2026-08-07 dashboard
 * audit found review cards rendering 0/100 for every script because the client
 * read `score`/`summary` while the server sent `rating`/`overall`, and no test
 * caught it: every fixture had been copied from the client, so every fixture
 * agreed with the bug.
 */

// A fixed instant, so nothing here depends on when the suite runs.
const NOW = new Date("2026-08-08T12:00:00.000Z");
const daysFromNow = (days) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const hold = (overrides = {}) => ({
  _id: "opt1",
  fee: 200,
  platformCut: 20,
  creatorPayout: 180,
  startDate: daysFromNow(-10),
  endDate: daysFromNow(20),
  createdAt: daysFromNow(-10),
  status: "active",
  convertedToSale: false,
  paymentId: "pay_1",
  orderId: "order_1",
  script: {
    _id: "s1",
    title: "The Last Scene",
    genre: "Drama",
    coverImage: "/uploads/cover.jpg",
    price: 25000,
    trailerThumbnail: "",
    creator: { _id: "u1", name: "Ada Okafor", profileImage: "/uploads/ada.jpg" },
  },
  ...overrides,
});

describe("daysUntil", () => {
  it("rounds up, so a hold with hours left still reads as a day", () => {
    // 3 hours is not "0 days left" — that reads as already gone.
    expect(daysUntil(new Date(NOW.getTime() + 3 * 60 * 60 * 1000), NOW)).toBe(1);
  });

  it("returns a negative number for a lapsed hold rather than clamping", () => {
    expect(daysUntil(daysFromNow(-5), NOW)).toBe(-5);
  });

  it("returns null for a missing or unparseable end date", () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not a date", NOW)).toBeNull();
  });
});

describe("closedReasonFor — trap 1: status is not the truth about time", () => {
  /*
   * holdScript writes status:"active" and nothing in the server ever sweeps it.
   * There is no cron, no TTL index, and no code path anywhere that writes
   * status:"expired". A hold that ran out months ago is still literally
   * "active" in the database.
   */
  it("calls a still-'active' hold lapsed once its endDate has passed", () => {
    const stale = hold({ status: "active", endDate: daysFromNow(-60) });
    expect(closedReasonFor(stale, NOW)).toBe("lapsed");
    expect(buildHoldRow(stale, NOW).group).toBe(HOLD_GROUP.CLOSED);
    expect(buildHoldRow(stale, NOW).closedLabel).toBe("Lapsed");
  });

  it("leaves a genuinely live hold open", () => {
    expect(closedReasonFor(hold(), NOW)).toBeNull();
    expect(buildHoldRow(hold(), NOW).isOpen).toBe(true);
  });

  it("keeps 'Bought' as the headline even after the option window passed", () => {
    // Being told a script you actually bought has "lapsed" would be false.
    const bought = hold({ status: "converted", endDate: daysFromNow(-30) });
    expect(closedReasonFor(bought, NOW)).toBe("converted");
    expect(buildHoldRow(bought, NOW).closedLabel).toBe("Bought");
  });

  it("does not tell someone who released early that they ran out of time", () => {
    const released = hold({ status: "cancelled", endDate: daysFromNow(-1) });
    expect(closedReasonFor(released, NOW)).toBe("released");
  });
});

describe("closedReasonFor — trap 3: convertedToSale and status disagree", () => {
  /*
   * The two are written by different code paths. getInvestorDashboard:344
   * already counts a deal converted when EITHER is true; this follows that
   * precedent rather than inventing a third rule for the same question.
   */
  it("treats convertedToSale:true as converted even while status says active", () => {
    expect(closedReasonFor(hold({ status: "active", convertedToSale: true }), NOW)).toBe("converted");
  });

  it("treats status:converted as converted even while convertedToSale is false", () => {
    expect(closedReasonFor(hold({ status: "converted", convertedToSale: false }), NOW)).toBe("converted");
  });
});

describe("buildHoldRow — trap 2: script can be null", () => {
  /*
   * Mongoose populate yields null for a deleted document, and deletion is a
   * real handled state here — holdScript has its own 410 branch for
   * script.isDeleted. The holder still paid for this option.
   */
  const orphan = hold({ script: null });

  it("does not throw on a hold whose script was deleted", () => {
    expect(() => buildHoldRow(orphan, NOW)).not.toThrow();
  });

  it("labels it explicitly rather than rendering an untitled row", () => {
    const row = buildHoldRow(orphan, NOW);
    expect(row.isMissingScript).toBe(true);
    expect(row.title).toBe("Project no longer available");
  });

  it("gives it no destination, because a link to nowhere is worse than none", () => {
    expect(buildHoldRow(orphan, NOW).path).toBeNull();
  });

  it("keeps the money, which is still real", () => {
    const row = buildHoldRow(orphan, NOW);
    expect(row.fee).toBe(200);
    expect(row.creatorPayout).toBe(180);
  });
});

describe("buildHoldRow — destination", () => {
  it("falls back to /script/<id>, since getMyHolds does not populate a username", () => {
    /*
     * The controller selects `name profileImage` on the creator — no username —
     * so the canonical two-segment URL is not derivable. /script/:id is a real
     * declared route ("project-detail-id" in the manifest), not a dead link.
     */
    expect(buildHoldRow(hold(), NOW).path).toBe("/script/s1");
  });

  it("coerces a non-numeric fee to 0 rather than rendering ₹NaN", () => {
    expect(buildHoldRow(hold({ fee: undefined }), NOW).fee).toBe(0);
    expect(buildHoldRow(hold({ fee: "" }), NOW).fee).toBe(0);
  });
});

describe("buildHoldsModel — grouping", () => {
  it("puts a hold inside the expiring window in Expiring, not Active", () => {
    const model = buildHoldsModel([hold({ endDate: daysFromNow(EXPIRING_SOON_DAYS - 1) })], { now: NOW });
    expect(model.groups[0].key).toBe(HOLD_GROUP.EXPIRING);
  });

  it("treats the boundary day itself as expiring", () => {
    const model = buildHoldsModel([hold({ endDate: daysFromNow(EXPIRING_SOON_DAYS) })], { now: NOW });
    expect(model.groups[0].key).toBe(HOLD_GROUP.EXPIRING);
  });

  it("keeps a comfortable hold in Active", () => {
    const model = buildHoldsModel([hold({ endDate: daysFromNow(20) })], { now: NOW });
    expect(model.groups[0].key).toBe(HOLD_GROUP.ACTIVE);
  });

  it("orders groups Expiring → Active → Closed regardless of payload order", () => {
    const model = buildHoldsModel([
      hold({ _id: "closed", status: "cancelled" }),
      hold({ _id: "active", endDate: daysFromNow(25) }),
      hold({ _id: "soon", endDate: daysFromNow(2) }),
    ], { now: NOW });

    expect(model.groups.map((g) => g.key)).toEqual([
      HOLD_GROUP.EXPIRING, HOLD_GROUP.ACTIVE, HOLD_GROUP.CLOSED,
    ]);
  });

  it("omits empty groups instead of rendering an empty heading", () => {
    const model = buildHoldsModel([hold()], { now: NOW });
    expect(model.groups).toHaveLength(1);
  });

  it("sorts open rows by soonest deadline — the order the viewer must act in", () => {
    const model = buildHoldsModel([
      hold({ _id: "later", endDate: daysFromNow(6) }),
      hold({ _id: "sooner", endDate: daysFromNow(1) }),
      hold({ _id: "middle", endDate: daysFromNow(3) }),
    ], { now: NOW });

    expect(model.groups[0].rows.map((r) => r.id)).toEqual(["sooner", "middle", "later"]);
  });
});

describe("buildHoldsModel — summary", () => {
  it("counts only open holds and commits only their money", () => {
    /*
     * A released or lapsed option is money already spent, not money currently
     * committed — including it would overstate the viewer's exposure.
     */
    const model = buildHoldsModel([
      hold({ _id: "a", fee: 200, endDate: daysFromNow(20) }),
      hold({ _id: "b", fee: 500, endDate: daysFromNow(3) }),
      hold({ _id: "c", fee: 900, status: "cancelled" }),
      hold({ _id: "d", fee: 700, status: "active", endDate: daysFromNow(-40) }),
    ], { now: NOW });

    expect(model.summary.openCount).toBe(2);
    expect(model.summary.expiringCount).toBe(1);
    expect(model.summary.committed).toBe(700);
  });

  it("counts conversions from either signal", () => {
    const model = buildHoldsModel([
      hold({ _id: "a", status: "converted" }),
      hold({ _id: "b", status: "active", convertedToSale: true, endDate: daysFromNow(-1) }),
    ], { now: NOW });

    expect(model.summary.convertedCount).toBe(2);
  });
});

describe("buildHoldsModel — degenerate input", () => {
  it("reports empty for an empty list", () => {
    const model = buildHoldsModel([], { now: NOW });
    expect(model.isEmpty).toBe(true);
    expect(model.groups).toHaveLength(0);
  });

  it("survives a non-array body, which a proxy or error page can substitute", () => {
    expect(buildHoldsModel(null, { now: NOW }).isEmpty).toBe(true);
    expect(buildHoldsModel({ message: "Unauthorized" }, { now: NOW }).isEmpty).toBe(true);
  });

  it("does not drop a hold that has no end date at all", () => {
    const model = buildHoldsModel([hold({ endDate: null })], { now: NOW });
    expect(model.total).toBe(1);
    // No deadline is not a lapse; it stays open with a null countdown so the
    // screen can say "No end date" rather than inventing one.
    expect(model.groups[0].rows[0].isOpen).toBe(true);
    expect(model.groups[0].rows[0].daysLeft).toBeNull();
  });
});
