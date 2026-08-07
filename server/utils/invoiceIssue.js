import Invoice from "../models/Invoice.js";

/**
 * Issue the tax invoice for a payment — one implementation, every payment surface.
 *
 * Four surfaces took real money and produced no document at all: plan subscriptions (₹1,999 / ₹399 /
 * ₹699), script holds, AI trailers, and free-access script grants. The buyer's only trace was a
 * mutated sub-document and a ledger row visible to nobody but the company. For a paid product in
 * India that is a compliance problem, not a polish one.
 *
 * The two flows that DID issue invoices had a copy of the numbering logic each, differing only in
 * their prefix, so a third and fourth copy was the obvious next step. Everything lives here instead:
 * the kind registry, the number format, idempotency, and the detail panel each kind prints.
 *
 * Two rules this module exists to hold:
 *
 *   1. NEVER FAIL A PAYMENT. The money has already moved by the time we are called. An invoice that
 *      cannot be written is logged and skipped — `null` comes back, and the caller carries on. The
 *      buyer can always be issued one later; a 500 after a successful charge cannot be undone.
 *   2. IDEMPOTENT ON THE PAYMENT REFERENCE. Payment callbacks retry. The unique index on
 *      `paymentReference` is the real guarantee; the pre-check is just the cheap path, and a
 *      duplicate-key error is treated as the success it actually is.
 */

/**
 * The kinds an invoice can have, and how each one describes itself.
 *
 * `detail` builds the right-hand panel of the document. Keeping it here rather than in the PDF route
 * means adding a fifth payment surface needs no change to invoiceController at all.
 */
export const INVOICE_KINDS = {
  script: {
    prefix: "INV-SCP",
    detailTitle: "Project",
  },
  competition_registration: {
    prefix: "CKR-REG",
    detailTitle: "Entry Details",
  },
  plan_subscription: {
    prefix: "CKR-PLN",
    detailTitle: "Subscription",
  },
  script_hold: {
    prefix: "CKR-HLD",
    detailTitle: "Hold",
  },
  ai_trailer: {
    prefix: "CKR-TRL",
    detailTitle: "AI Trailer",
  },
};

/**
 * Invoice number: PREFIX-YYYYMMDD-XXXXXXXX.
 *
 * The suffix is the tail of the gateway payment id, so a number can be traced back to a charge
 * without a lookup. Uniqueness is enforced by the index on the field, not by this function — the
 * timestamp fallback exists only for the free-access case, which has no payment id at all.
 */
export const buildInvoiceNumber = (kind, paymentId = "") => {
  const prefix = INVOICE_KINDS[kind]?.prefix || "CKR-INV";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = String(paymentId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()
    || Date.now().toString().slice(-8);
  return `${prefix}-${stamp}-${suffix}`;
};

const money = (amount, currency = "INR") =>
  `${String(currency || "INR").toUpperCase()} ${Number(amount || 0).toFixed(2)}`;

/**
 * Create the invoice, or return the one a concurrent callback already created.
 *
 * The PDF is deliberately NOT rendered here. Rendering means a PDFKit pass plus a Cloudinary upload,
 * and putting that in the payment path buys a slower checkout and a new way for it to fail; the
 * download route renders on first request and caches the result, which is how competition entry
 * invoices have always worked.
 */
export const issueInvoice = async ({
  kind,
  user,
  paymentReference = "",
  currency = "INR",
  amountCharged = 0,
  accessType = "premium",
  rows = [],
  detailLines = [],
  detailTitle = "",
  script = null,
  scriptSid = "",
  competition = null,
  scriptPrice = 0,
  writerEarnsPerSale = 0,
  source = "",
}) => {
  if (!INVOICE_KINDS[kind]) {
    console.error(`[invoice] refusing to issue an unknown kind "${kind}" from ${source}`);
    return null;
  }
  if (!user?._id && !user) {
    console.error(`[invoice] refusing to issue ${kind} with no user (${source})`);
    return null;
  }

  const creatorId = user?._id || user;
  const reference = String(paymentReference || "").trim();

  try {
    // Cheap path. The unique index below is what actually prevents a double issue.
    if (reference) {
      const existing = await Invoice.findOne({ paymentReference: reference })
        .select("_id invoiceNumber pdfPath");
      if (existing) return existing;
    }

    return await Invoice.create({
      invoiceNumber: buildInvoiceNumber(kind, reference),
      paymentReference: reference || undefined,
      invoiceDate: new Date(),
      kind,
      creator: creatorId,
      creatorSid: user?.sid || "",
      currency: String(currency || "INR").toUpperCase(),
      amountCharged: Number(amountCharged) || 0,
      accessType,
      script: script || undefined,
      scriptSid: scriptSid || "",
      competition: competition || undefined,
      scriptPrice: Number(scriptPrice) || 0,
      writerEarnsPerSale: Number(writerEarnsPerSale) || 0,
      detailTitle: detailTitle || INVOICE_KINDS[kind].detailTitle,
      detailLines: detailLines.filter(Boolean).map(String),
      rows,
    });
  } catch (error) {
    // A duplicate key means a concurrent callback won the race — the desired outcome, not a failure.
    if (error?.code === 11000 && reference) {
      return Invoice.findOne({ paymentReference: reference }).select("_id invoiceNumber pdfPath");
    }
    // Non-fatal by design: see rule 1 above.
    console.error(`[invoice] could not issue ${kind} invoice (${source}):`, error?.message || error);
    return null;
  }
};

/** A single "Total Paid" row, which every non-script invoice ends with. */
export const totalRow = (amount, currency) => ({
  item: "Total Paid",
  type: "Total",
  detail: "Total charged via payment gateway.",
  amountLabel: money(amount, currency),
  amountValue: Number(amount) || 0,
});

/** The gateway reference row — printed under "Reference", never counted as money. */
export const gatewayRow = (paymentId) => ({
  item: "Payment Gateway",
  type: "Reference",
  detail: `Razorpay Payment ID: ${paymentId || "-"}`,
  amountLabel: "Verified",
  amountValue: 0,
});

export { money as formatInvoiceMoney };
export default { INVOICE_KINDS, buildInvoiceNumber, issueInvoice, totalRow, gatewayRow };
