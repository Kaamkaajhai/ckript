import { describe, expect, it } from "vitest";
import {
  buildBoardStats,
  buildCapital,
  buildDealRows,
  buildGenreBars,
  buildLedgerCsv,
  buildMandateGroups,
  buildQuotas,
  buildScoreIndex,
  filterDeals,
  formatShortInr,
  getConversionRate,
  getDealBucket,
  presentDeal,
  presentTransaction,
  sortDeals,
} from "./producerLedger";

const option = (overrides = {}) => ({
  _id: "opt1",
  fee: 450000,
  status: "active",
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-07-31T00:00:00.000Z",
  daysRemaining: 12,
  script: { _id: "s1", title: "The Kollam Ledger", genre: "Crime", contentType: "feature", creator: { _id: "w1", name: "Meera Raghavan" } },
  ...overrides,
});

const request = (overrides = {}) => ({
  _id: "req1",
  amount: 260000,
  status: "pending",
  createdAt: "2026-07-10T00:00:00.000Z",
  script: { _id: "s2", title: "Bhavnagar Blues", genre: "Drama" },
  writer: { _id: "w2", name: "Sanjana Pillai" },
  ...overrides,
});

describe("buildDealRows", () => {
  it("puts options and purchase requests in one list", () => {
    const rows = buildDealRows({ recentDeals: [option()], purchaseRequests: [request()] });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "option", title: "The Kollam Ledger", fee: 450000 });
    expect(rows[1]).toMatchObject({ kind: "request", title: "Bhavnagar Blues", fee: 260000 });
  });

  /*
   * The regression this guards: /dashboard/investor returns the AI score on
   * `activeHolds[].script` but NOT on `recentDeals[].script`, so without the
   * merge every live option printed a marker with no score.
   */
  it("takes the AI score for a live option from the richer activeHolds projection", () => {
    const [row] = buildDealRows({
      recentDeals: [option()],
      activeHolds: [{ _id: "opt1", script: { ...option().script, scriptScore: { overall: 91 }, logline: "A ledger-keeper." } }],
    });

    expect(row.score).toBe(91);
    expect(row.logline).toBe("A ledger-keeper.");
  });

  it("only lets a live option be released and an approved request be downloaded", () => {
    const rows = buildDealRows({
      recentDeals: [option(), option({ _id: "opt2", status: "expired" })],
      purchaseRequests: [request(), request({ _id: "req2", status: "approved" })],
    });

    expect(rows.map((row) => row.canRelease)).toEqual([true, false, false, false]);
    expect(rows.map((row) => row.canDownloadPdf)).toEqual([false, false, false, true]);
  });

  /*
   * /scripts/purchase-requests/mine populates its script with only
   * `title price thumbnailUrl creator` — no AI score. The row borrows the score
   * the same script already carries elsewhere in the payload rather than
   * printing a dash next to a script the page demonstrably knows the score of.
   */
  it("borrows a request's AI score from the rest of the payload", () => {
    const index = buildScoreIndex({
      matchedScripts: [{ _id: "s2", scriptScore: { overall: 79 }, logline: "A shipbreaker's daughter." }],
    });
    const [row] = buildDealRows({ purchaseRequests: [request()], scoreIndex: index });

    expect(row.score).toBe(79);
    expect(row.logline).toBe("A shipbreaker's daughter.");
  });

  it("still shows no score when the payload has none for that script", () => {
    const [row] = buildDealRows({ purchaseRequests: [request()], scoreIndex: buildScoreIndex({}) });
    expect(row.score).toBeNull();
    expect(presentDeal(row).marker).toBe("—");
  });

  it("survives a deal whose script was deleted", () => {
    const [row] = buildDealRows({ recentDeals: [option({ script: null })] });

    expect(row.title).toBe("Untitled project");
    expect(row.scriptId).toBe("");
    expect(row.score).toBeNull();
  });
});

describe("filters and sorting", () => {
  it("maps every status onto one of the four buckets", () => {
    expect(getDealBucket({ status: "pending" })).toBe("requests");
    expect(getDealBucket({ status: "approved" })).toBe("requests");
    expect(getDealBucket({ status: "active" })).toBe("active");
    expect(getDealBucket({ status: "converted" })).toBe("closed");
    expect(getDealBucket({ status: "expired" })).toBe("past");
    expect(getDealBucket({ status: "rejected" })).toBe("past");
  });

  it("shows everything when no filter is on", () => {
    const rows = buildDealRows({ recentDeals: [option()], purchaseRequests: [request()] });
    expect(filterDeals(rows, [])).toHaveLength(2);
    expect(filterDeals(rows, ["requests"])).toHaveLength(1);
  });

  /*
   * An expired option has `daysRemaining: null` and a converted one has none
   * either — sorting them by raw deadline floated settled deals to the top as
   * if they were the most urgent thing on the page.
   */
  it("sorts settled deals below live ones on the deadline sort", () => {
    const rows = [
      { title: "Expired", status: "expired", daysRemaining: null, fee: 10, score: 10 },
      { title: "Urgent", status: "active", daysRemaining: 2, fee: 20, score: 20 },
      { title: "Later", status: "active", daysRemaining: 20, fee: 30, score: 30 },
    ];

    expect(sortDeals(rows, "days").map((row) => row.title)).toEqual(["Urgent", "Later", "Expired"]);
  });

  it("sorts unscored deals last on the score sort", () => {
    const rows = [
      { title: "None", score: null, status: "active", fee: 1 },
      { title: "High", score: 90, status: "active", fee: 1 },
    ];
    expect(sortDeals(rows, "score").map((row) => row.title)).toEqual(["High", "None"]);
  });
});

describe("presentDeal", () => {
  it("replaces the status with a countdown in an option's last three days", () => {
    const [row] = buildDealRows({ recentDeals: [option({ daysRemaining: 2 })] });
    const view = presentDeal(row);

    expect(view.urgent).toBe(true);
    expect(view.tone).toBe("danger");
    expect(view.statusLabel).toBe("2 days left");
  });

  it("keeps the status label when the deadline is comfortable", () => {
    const [row] = buildDealRows({ recentDeals: [option({ daysRemaining: 12 })] });
    expect(presentDeal(row).statusLabel).toBe("Active option");
  });

  it("prints an em dash rather than a zero when there is no AI score", () => {
    const [row] = buildDealRows({ recentDeals: [option()] });
    expect(presentDeal(row).marker).toBe("—");
  });
});

describe("figures", () => {
  it("shortens money to the Indian scale", () => {
    expect(formatShortInr(1840000)).toBe("₹18.4L");
    expect(formatShortInr(24000000)).toBe("₹2.40Cr");
    expect(formatShortInr(4500)).toBe("₹4,500");
  });

  /* A producer on day one has no conversion rate; they do not have a 0.0%. */
  it("returns no conversion rate when nothing has been read", () => {
    expect(getConversionRate({ totalViewed: 0, scriptsPurchased: 0 })).toBeNull();
    expect(getConversionRate({ totalViewed: 100, scriptsPurchased: 4 })).toBe("4.0%");
  });

  it("builds the five-figure board from real stats", () => {
    const deals = buildDealRows({ recentDeals: [option()], purchaseRequests: [request()] });
    const board = buildBoardStats({
      stats: { totalViewed: 148, avgViewedScore: 74, scriptsPurchased: 4, successfulProjects: 3, totalInvested: 1840000 },
      deals,
      walletBalance: 260000,
    });

    expect(board.map((cell) => cell.value))
      .toEqual(["148", "1", "4", "₹18.4L", "2.7%"]);
    expect(board[1].sub).toBe("1 request pending");
  });

  /*
   * "Scripts read 0" after a failed fetch is a lie a producer would act on. The
   * cells that come only from /dashboard/investor go blank; the two that do not
   * (live options, the wallet) stay live.
   */
  it("dashes the stats-only cells when the deal-flow endpoint failed", () => {
    const deals = buildDealRows({ purchaseRequests: [request()] });
    const board = buildBoardStats({ stats: {}, deals, walletBalance: 260000, statsKnown: false });

    expect(board.map((cell) => cell.value)).toEqual(["—", "0", "—", "—", "—"]);
    expect(board[1].sub).toBe("1 request pending");
    expect(board[3].sub).toBe("₹2.6L in wallet");
  });

  it("does not divide by zero when no capital has moved", () => {
    expect(buildCapital({ stats: {}, walletBalance: 0 }).deployedPct).toBe("0%");
  });
});

describe("brief and quotas", () => {
  it("marks exclusions in the danger tone and omits empty groups", () => {
    const groups = buildMandateGroups({ genres: ["Crime"], formats: [], exclusions: ["Horror"] });

    expect(groups.map((group) => group.label)).toEqual(["Genres", "Hooks · exclusions"]);
    expect(groups[1].items[0]).toEqual({ text: "✕ Horror", tone: "danger" });
  });

  it("meters each quota against the subscription's own limit, not a constant", () => {
    const [contacts] = buildQuotas({
      contacts: { used: 5, limit: 25 },
      messages: { used: 0, limit: 10 },
      meetings: { used: 0, limit: 10 },
    });

    expect(contacts.value).toBe("5 / 25");
    expect(contacts.pct).toBe("20%");
    expect(contacts.blocked).toBe(false);
  });

  it("flags a quota as blocked once it is spent", () => {
    const [contacts] = buildQuotas({ contacts: { used: 10, limit: 10 } });
    expect(contacts.blocked).toBe(true);
  });
});

describe("market and money", () => {
  it("counts genre bars from the matched scripts, biggest first", () => {
    const bars = buildGenreBars([
      { genre: "Crime" }, { genre: "Crime" }, { genre: "Drama" }, { genre: null },
    ]);

    expect(bars).toEqual([
      { name: "Crime", count: 2, pct: "100%" },
      { name: "Drama", count: 1, pct: "50%" },
    ]);
  });

  it("signs a credit and a debit differently", () => {
    expect(presentTransaction({ type: "credit", amount: 500, status: "completed" }))
      .toMatchObject({ amount: "+₹500", isCredit: true, tone: "sage" });
    expect(presentTransaction({ type: "payment", amount: 500, status: "failed" }))
      .toMatchObject({ amount: "−₹500", isCredit: false, tone: "danger" });
  });

  it("escapes quotes when exporting the ledger", () => {
    const csv = buildLedgerCsv([{ ...buildDealRows({ recentDeals: [option()] })[0], title: 'The "Kollam" Ledger' }]);

    expect(csv.split("\r\n")[0]).toContain('"Title"');
    expect(csv).toContain('"The ""Kollam"" Ledger"');
  });
});
