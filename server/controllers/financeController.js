import LedgerEntry from "../models/LedgerEntry.js";

/**
 * The finance panel's API. READ-ONLY, by construction — there is no mutating handler in this file.
 *
 * Every figure comes from the LedgerEntry collection and nowhere else. That matters: the older
 * sources disagree with each other (a granted plan and a paid one are the same row on the user, and
 * plan sales wrote no Transaction or Invoice at all), so a panel that aggregated them would produce
 * numbers that cannot be reconciled against Razorpay.
 *
 * Money is summed in MINOR units and grouped BY CURRENCY. INR and USD are never added together —
 * there is no stored FX rate at capture time, so any single "total revenue" figure would be an
 * invented number. The panel shows one row per currency instead.
 */

const KINDS = [
  "plan_subscription",
  "competition_registration",
  "script_purchase",
  "script_hold",
  "ai_trailer",
  "credits",
  "other",
];

/** Parse a YYYY-MM-DD (or ISO) bound. Returns null for anything unusable rather than Invalid Date. */
const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Shared filter builder, so the summary and the list can never describe different sets of rows. */
const buildMatch = (query = {}) => {
  const match = {};

  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) {
    match.occurredAt = {};
    if (from) match.occurredAt.$gte = from;
    // An inclusive end date: a user asking for "to 31 March" means the whole of the 31st.
    if (to) match.occurredAt.$lte = new Date(to.getTime() + 86_399_999);
  }

  if (query.kind && KINDS.includes(query.kind)) match.kind = query.kind;
  if (["paid", "granted", "reversed"].includes(query.settlement)) match.settlement = query.settlement;
  if (query.currency) match.currency = String(query.currency).toUpperCase();
  if (query.user) match.user = query.user;

  return match;
};

/**
 * Headline figures, by currency and by kind.
 *
 * `paid` and `reversed` are summed together into `net` because a reversal carries a negative amount
 * — so net is what actually landed, after refunds, without needing a second query.
 */
export const getFinanceSummary = async (req, res) => {
  try {
    const match = buildMatch(req.query);

    const [byCurrency, byKind, grants] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { ...match, settlement: { $in: ["paid", "reversed"] } } },
        { $group: {
          _id: "$currency",
          netMinor: { $sum: "$amountMinor" },
          grossMinor: { $sum: { $cond: [{ $eq: ["$settlement", "paid"] }, "$amountMinor", 0] } },
          refundedMinor: { $sum: { $cond: [{ $eq: ["$settlement", "reversed"] }, "$amountMinor", 0] } },
          payments: { $sum: { $cond: [{ $eq: ["$settlement", "paid"] }, 1, 0] } },
          refunds: { $sum: { $cond: [{ $eq: ["$settlement", "reversed"] }, 1, 0] } },
        } },
        { $sort: { netMinor: -1 } },
      ]),

      LedgerEntry.aggregate([
        { $match: { ...match, settlement: { $in: ["paid", "reversed"] } } },
        { $group: {
          _id: { kind: "$kind", currency: "$currency" },
          netMinor: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        } },
        { $sort: { netMinor: -1 } },
      ]),

      // Revenue foregone: what the comps, admin grants and prizes would have been worth.
      LedgerEntry.aggregate([
        { $match: { ...match, settlement: "granted" } },
        { $group: {
          _id: { kind: "$kind", currency: "$currency" },
          forgoneMinor: { $sum: "$listPriceMinor" },
          count: { $sum: 1 },
        } },
        { $sort: { forgoneMinor: -1 } },
      ]),
    ]);

    return res.json({
      currencies: byCurrency.map((r) => ({
        currency: r._id,
        netMinor: r.netMinor,
        grossMinor: r.grossMinor,
        refundedMinor: r.refundedMinor,
        payments: r.payments,
        refunds: r.refunds,
      })),
      byKind: byKind.map((r) => ({
        kind: r._id.kind, currency: r._id.currency, netMinor: r.netMinor, count: r.count,
      })),
      grants: grants.map((r) => ({
        kind: r._id.kind, currency: r._id.currency, forgoneMinor: r.forgoneMinor, count: r.count,
      })),
    });
  } catch (error) {
    console.error("[finance] summary failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load the finance summary." });
  }
};

/** The transaction list, newest first, paginated. */
export const listFinanceEntries = async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const [entries, total] = await Promise.all([
      LedgerEntry.find(match)
        .sort({ occurredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email sid role")
        .lean(),
      LedgerEntry.countDocuments(match),
    ]);

    return res.json({
      entries,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("[finance] list failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load transactions." });
  }
};

/** Quote a CSV field: escape embedded quotes and wrap anything containing a delimiter or newline. */
const csvCell = (value) => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV export — the actual handover format.
 *
 * Streams the whole filtered set with no page limit, because a partial export silently understates
 * the books. Amounts are written in MAJOR units with two decimals, which is what accounting software
 * expects, alongside the currency in its own column so the two are never inferred.
 */
export const exportFinanceCsv = async (req, res) => {
  try {
    const match = buildMatch(req.query);

    const entries = await LedgerEntry.find(match)
      .sort({ occurredAt: -1 })
      .populate("user", "name email sid")
      .lean();

    const header = [
      "Date", "Kind", "Settlement", "Currency", "Amount", "List price",
      "User", "Email", "User SID", "Description",
      "Provider", "Order ID", "Payment ID", "Entry ID",
    ];

    const rows = entries.map((e) => [
      new Date(e.occurredAt).toISOString(),
      e.kind,
      e.settlement,
      e.currency,
      (e.amountMinor / 100).toFixed(2),
      (e.listPriceMinor / 100).toFixed(2),
      e.user?.name || "",
      e.user?.email || "",
      e.user?.sid || "",
      e.label || "",
      e.provider,
      e.providerOrderId || "",
      e.providerPaymentId || "",
      String(e._id),
    ]);

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ckript-transactions-${stamp}.csv"`);
    // A BOM, so Excel opens UTF-8 correctly — without it ₹ and accented names arrive mangled.
    return res.send(`﻿${csv}`);
  } catch (error) {
    console.error("[finance] export failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to export transactions." });
  }
};
