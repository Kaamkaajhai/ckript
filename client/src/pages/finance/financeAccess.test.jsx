// @vitest-environment happy-dom
//
// The contract of the payments move.
//
// Payments left the admin console for /finance, where ONE page serves two audiences: an accountant
// with the finance role reads every figure and can change nothing, while an admin gets the same page
// plus the controls that used to live in /admin. The `actions` prop is the whole mechanism, so these
// tests assert it from both sides — a regression that leaked a control to a read-only viewer would
// otherwise be invisible until an accountant clicked it.
//
// The server is the real boundary (reads are financeOnly, controls stay adminOnly); this file covers
// the half that decides what a viewer is shown.
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { PremiumTable, WriterPlansTable, BankReviewsTable, PaymentsTable, ChallengesTable } =
  await import("./FinanceSections.jsx");
const { ADMIN_NAV_GROUPS } = await import("../admin/shell/adminNavGroups.js");
const { TABS } = await import("../admin/dashboardShared.jsx");

let root;
let host;

const render = (element) => {
  act(() => root.render(element));
  return host.textContent || "";
};

const buttonLabels = () =>
  Array.from(host.querySelectorAll("button")).map((b) => (b.textContent || "").trim());

/** Rows shaped like the API returns them, trimmed to the fields the tables actually read. */
const USER = {
  _id: "u1",
  name: "Rhea Kapoor",
  email: "rhea@example.com",
  subscription: { plan: "gold", accessActivatedAt: "2026-01-05", accessExpiresAt: "2027-01-05" },
};
const REVIEW = { _id: "r1", user: { name: "Rhea Kapoor", email: "rhea@example.com" }, status: "pending", createdAt: "2026-02-01" };

const base = { total: 1, loading: false, error: "", onRetry: () => {} };

// Every control the moved sections used to expose. A finance viewer must see none of them.
const CONTROLS = ["Remove premium", "Grant gold", "Remove", "Approve", "Reject", "Unblock"];

const ACTIONS = {
  busy: "",
  removePremium: () => {},
  grantWriterPlan: () => {},
  removeWriterPlan: () => {},
  approveBankReview: () => {},
  rejectBankReview: () => {},
  unblockBankReview: () => {},
};

beforeEach(() => {
  host = document.createElement("div");
  host.className = "ckad";
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("a finance viewer reads without controls", () => {
  it("shows the premium subscriber but offers no way to change them", () => {
    const text = render(<PremiumTable {...base} rows={[USER]} actions={null} />);
    expect(text).toContain("Rhea Kapoor");
    expect(text).toContain("rhea@example.com");
    for (const label of CONTROLS) expect(buttonLabels()).not.toContain(label);
  });

  it("shows writer plans without grant or remove", () => {
    const text = render(<WriterPlansTable {...base} rows={[USER]} actions={null} />);
    expect(text).toContain("gold");
    expect(buttonLabels().some((l) => /grant|remove/i.test(l))).toBe(false);
  });

  it("shows bank reviews without approve, reject or unblock", () => {
    const text = render(<BankReviewsTable {...base} rows={[REVIEW]} actions={null} />);
    expect(text).toContain("Rhea Kapoor");
    expect(buttonLabels().some((l) => /approve|reject|unblock/i.test(l))).toBe(false);
  });
});

describe("an admin gets the same page plus the controls", () => {
  it("offers premium removal", () => {
    render(<PremiumTable {...base} rows={[USER]} actions={ACTIONS} />);
    expect(buttonLabels()).toContain("Remove premium");
  });

  it("offers writer-plan grant and removal", () => {
    render(<WriterPlansTable {...base} rows={[USER]} actions={ACTIONS} />);
    expect(buttonLabels()).toContain("Grant gold");
    expect(buttonLabels()).toContain("Remove");
  });

  it("offers all three bank-review decisions", () => {
    render(<BankReviewsTable {...base} rows={[REVIEW]} actions={ACTIONS} />);
    for (const label of ["Approve", "Reject", "Unblock"]) {
      expect(buttonLabels()).toContain(label);
    }
  });
});

describe("transactions are read-only for everyone", () => {
  it("renders the row and never a control, even for an admin", () => {
    const row = { _id: "t1", user: { name: "Rhea Kapoor" }, type: "credit", amount: 499, currency: "INR", status: "paid", createdAt: "2026-02-02" };
    const text = render(<PaymentsTable {...base} rows={[row]} />);
    expect(text).toContain("Rhea Kapoor");
    expect(buttonLabels().some((l) => CONTROLS.includes(l))).toBe(false);
  });

  it('names a "credit" row as the writer payout it is', () => {
    // The raw enum read like the retired credits feature. It is not: scriptController writes these
    // to credit a writer's wallet on every sale. The misreading nearly got every payout filtered
    // out of the accountant's view, so the label is the guard against repeating that.
    const payout = { _id: "t2", user: { name: "Aarav Sharma" }, type: "credit", amount: 45000, currency: "INR", status: "completed", description: 'Script purchase payout: "The Salt Road"', createdAt: "2026-02-03" };
    const text = render(<PaymentsTable {...base} rows={[payout]} />);
    expect(text).toContain("Writer payout");
    expect(text).not.toMatch(/\bcredit\b/);
  });

  it("still names the types it does not rewrite", () => {
    for (const [type, label] of [["refund", "Refund"], ["commission", "Commission"], ["subscription", "Subscription"]]) {
      const text = render(<PaymentsTable {...base} rows={[{ _id: type, user: { name: "X" }, type, amount: 1, currency: "INR", status: "completed", createdAt: "2026-02-03" }]} />);
      expect(text).toContain(label);
    }
  });

  it("falls back to the raw type rather than blanking an unknown one", () => {
    // A new enum value must still be visible in the books, even before anyone names it here.
    const text = render(<PaymentsTable {...base} rows={[{ _id: "t9", user: { name: "X" }, type: "escrow_hold", amount: 1, currency: "INR", status: "completed", createdAt: "2026-02-03" }]} />);
    expect(text).toContain("escrow_hold");
  });
});

describe("challenge entries come from the ledger, so free entries are visible", () => {
  // The point of sourcing this from LedgerEntry rather than Transaction or Invoice: an entry granted
  // by an admin, or approved from a third-party registration, writes neither of those. Built on
  // payments alone the section would report a competition as emptier than it was.
  const paid = {
    _id: "l1", user: { name: "Aarav Sharma", email: "aarav@example.in" },
    label: "48-Hour Script Challenge", settlement: "paid", provider: "razorpay",
    amountMinor: 9900, listPriceMinor: 9900, currency: "INR", occurredAt: "2026-02-04",
  };
  const granted = {
    _id: "l2", user: { name: "Rhea Kapoor", email: "rhea@example.in" },
    label: "48-Hour Script Challenge", settlement: "granted", provider: "none",
    amountMinor: 0, listPriceMinor: 9900, currency: "INR", occurredAt: "2026-02-05",
  };

  it("shows a paid entry with what was charged", () => {
    const text = render(<ChallengesTable {...base} rows={[paid]} />);
    expect(text).toContain("Aarav Sharma");
    expect(text).toContain("48-Hour Script Challenge");
    expect(text).toContain("paid");
  });

  it("shows a granted entry, and states what it was worth rather than charging nothing", () => {
    const text = render(<ChallengesTable {...base} total={1} rows={[granted]} />);
    expect(text).toContain("Rhea Kapoor");
    expect(text).toContain("granted");
    // Zero charged must not read as a sale of nothing; the list price is what it cost the business.
    expect(text).toMatch(/99/);
  });

  it("offers no controls — an accountant reads challenge entries, never edits them", () => {
    render(<ChallengesTable {...base} rows={[paid, granted]} />);
    expect(buttonLabels().some((l) => CONTROLS.includes(l))).toBe(false);
  });
});

describe("payments have left the admin console", () => {
  const MOVED = ["payments", "invoices", "investor-purchases", "writer-plans", "premium-professionals", "bank-reviews"];

  it("defines no tab for a moved section", () => {
    const keys = TABS.map((tab) => tab.key);
    for (const key of MOVED) expect(keys).not.toContain(key);
  });

  it("routes no sidebar group at a moved section", () => {
    const keys = ADMIN_NAV_GROUPS.flatMap((group) => group.keys);
    for (const key of MOVED) expect(keys).not.toContain(key);
  });

  it("keeps every surviving nav key backed by a real tab", () => {
    const tabKeys = new Set(TABS.map((tab) => tab.key));
    for (const group of ADMIN_NAV_GROUPS) {
      for (const key of group.keys) expect(tabKeys.has(key)).toBe(true);
    }
  });
});
