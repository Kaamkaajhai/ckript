// The invoice as a document: does it come out one page, branded, and saying the right number?
//
// Rendering is separated from uploading precisely so this can run — no Cloudinary, no network, no
// database. What it guards is the class of defect that a human reviewing the code will not see and a
// customer receiving the PDF will: extra blank sheets, a missing logo, the wrong currency, or a
// total that quietly disagrees with the line items.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import PDFDocument from "pdfkit";
import { renderInvoicePdfBuffer } from "./invoicePdf.js";
import { COMPANY } from "./companyContacts.js";
import { LOGO, SIGNATURE, BRAND } from "./brandAssets.js";

const scriptInvoice = () => ({
  _id: "68b3f0a41d2c9e5544a1c7e2",
  invoiceNumber: "CKR-SP-2026-004182",
  invoiceDate: new Date("2026-08-06T11:24:00Z"),
  creator: "68a11c93bb7d4e21f0c5aa19",
  creatorSid: "FIP-2291",
  script: "6890ac5512f7b1d9e3a02b74",
  scriptSid: "SCR-8841",
  accessType: "premium",
  currency: "INR",
  scriptPrice: 45000,
  writerEarnsPerSale: 45000,
  paymentReference: "RZP-pay_Qk8vN2mXfLr4Ta",
  rows: [
    { item: "Script Purchase", type: "Payment", detail: "Full access purchased.", amountLabel: "INR 45,000.00" },
    { item: "Platform Commission (5%)", type: "Tax", detail: "Buyer-side commission.", amountLabel: "INR 2,250.00" },
    { item: "Total Paid", type: "Total", detail: "Total charged via gateway.", amountLabel: "INR 47,250.00" },
    { item: "Payment Gateway", type: "Reference", detail: "Razorpay Payment ID: pay_Qk8vN2mXfLr4Ta", amountLabel: "Verified" },
    { item: "Writer Payout", type: "Settlement", detail: "Credited to writer wallet.", amountLabel: "INR 45,000.00" },
  ],
});

const render = (overrides = {}) => renderInvoicePdfBuffer({
  invoice: scriptInvoice(),
  creatorName: "Rohit Menon",
  creatorEmail: "rohit.menon@example.in",
  creatorSid: "FIP-2291",
  scriptTitle: "The Salt Road",
  scriptSid: "SCR-8841",
  ...overrides,
});

/** Pages, straight from the page tree — PDFKit's own count cannot report pages it appended later. */
const pageCount = (buf) => {
  const match = buf.toString("latin1").match(/\/Count\s+(\d+)/);
  return match ? Number(match[1]) : 0;
};

describe("the brand assets a document depends on", () => {
  test("the trimmed logo ships inside server/, not in the client's public folder", () => {
    // The old candidates lived in client/public, which does not exist on a server-only deploy — so
    // every invoice a customer actually received fell back to plain text.
    assert.equal(LOGO.isTrimmed, true, "server/assets/ckript-logo.png is missing from the deploy");
    assert.ok(fs.existsSync(LOGO.path));
    assert.match(LOGO.path, /assets[\\/]ckript-logo\.png$/);
  });

  test("the logo's aspect is known, so a box can be derived rather than guessed", () => {
    assert.ok(LOGO.ratio > 2.3 && LOGO.ratio < 2.5, `ratio was ${LOGO.ratio}`);
    const [w, h] = LOGO.boxForHeight(46);
    assert.equal(h, 46);
    assert.ok(Math.abs(w / h - LOGO.ratio) < 0.02, "boxForHeight distorts the mark");
  });

  test("the palette carries no blue", () => {
    // The previous invoice was built on navy (#0F2A4A, #0B1D3A and four blue-tinted greys), which
    // belongs to no part of this brand. Every brand colour must be warm or neutral: never more blue
    // than red.
    for (const [name, hex] of Object.entries(BRAND)) {
      const [r, , b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      assert.ok(b <= r, `BRAND.${name} (${hex}) is blue-dominant`);
    }
  });

  test("the accent is the red from the logo itself", () => {
    assert.equal(BRAND.accent.toUpperCase(), "#D14D37");
  });

  test("the authorised signature ships inside server/, like the logo", () => {
    // Same deploy trap the logo hit: an asset that only exists in a monorepo checkout silently
    // degrades on a server-only deploy, and the invoices customers actually receive are the
    // unsigned ones — while the code plainly says a signature is drawn.
    assert.ok(SIGNATURE.path, "no signature asset is readable");
    assert.match(SIGNATURE.path.replace(/\\/g, "/"), /\/server\/assets\//, "signature is not deploy-safe");
  });

  test("the signature's aspect matches the actual file, not a guess", () => {
    // The constant and the asset drift apart the moment someone re-exports the signature. Read the
    // real dimensions out of the PNG header and hold the ratio to them.
    const png = fs.readFileSync(SIGNATURE.path);
    assert.equal(png.subarray(1, 4).toString(), "PNG", "signature asset is not a PNG");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(
      Math.abs(SIGNATURE.ratio - width / height) < 0.01,
      `SIGNATURE.ratio is ${SIGNATURE.ratio} but the asset is ${width}x${height} (${(width / height).toFixed(3)})`,
    );

    const [w, h] = SIGNATURE.boxForWidth(132);
    assert.equal(w, 132);
    assert.ok(Math.abs(w / h - SIGNATURE.ratio) < 0.02, "boxForWidth distorts the signature");
  });
});

describe("the rendered invoice", () => {
  test("is a valid single-page PDF", async () => {
    const buf = await render();
    assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
    // Guards a defect worth the whole file: PDFKit appends a page for any text drawn below the
    // bottom margin, which is where a footer goes. Unfixed, every invoice shipped with four blank
    // sheets behind it and nothing in the code read as wrong.
    assert.equal(pageCount(buf), 1, "the invoice grew extra pages");
  });

  test("embeds the logo rather than falling back to text", async () => {
    const buf = await render();
    // An embedded raster arrives as an image XObject; the text fallback would produce none.
    assert.match(buf.toString("latin1"), /\/Subtype\s*\/Image/, "no image embedded — logo fell back");
  });

  test("embeds the signature as well as the logo", async () => {
    // Both are transparent PNGs, so each contributes an image plus its alpha mask. One image alone
    // means the authorisation block fell back to the typeset name and nobody would notice from the
    // code — which is exactly what this document used to do on purpose.
    const buf = await render();
    const images = (buf.toString("latin1").match(/\/Subtype\s*\/Image/g) || []).length;
    assert.ok(images >= 3, `expected the logo and the signature, found ${images} image XObject(s)`);
  });

  test("the footer states the registered office, not a city the company left", async () => {
    // The default was "Pune, Maharashtra, India" and no environment variable could change it, so
    // every invoice ever issued carried an address the company does not use. Assert the real one.
    assert.match(COMPANY.location, /New Delhi/, "the registered office is not the Delhi one");
    assert.doesNotMatch(COMPANY.location, /Pune/i, "the Pune default is back");
    assert.match(COMPANY.location, /110016/, "the registered office lost its PIN code");
  });

  test("every footer line fits its box instead of being silently clipped", () => {
    // The address used to share a 45%-wide box with the company name under lineBreak:false. That was
    // survivable for a city name and would have cut the Delhi address off mid-street — producing a
    // document that looks complete and states an incomplete address, which is the worst outcome
    // available. Measure the strings against the boxes they are actually drawn into.
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const width = doc.page.width - 96;

    doc.font("Helvetica").fontSize(7);
    const addressLine = `${COMPANY.location}   ·   CIN ${COMPANY.cin}`;
    assert.ok(
      doc.widthOfString(addressLine) <= width,
      `address line is ${doc.widthOfString(addressLine).toFixed(1)}pt in a ${width.toFixed(1)}pt box`,
    );

    doc.font("Helvetica-Bold").fontSize(7.5);
    assert.ok(
      doc.widthOfString(COMPANY.legalName) <= width * 0.45,
      `legal name is ${doc.widthOfString(COMPANY.legalName).toFixed(1)}pt in a ${(width * 0.45).toFixed(1)}pt box`,
    );
  });

  test("the signature does not push the invoice onto a second page", async () => {
    // The signature block is taller than the line of italic text it replaced. If it ever stops
    // fitting, the symptom is a blank-looking second sheet on every invoice.
    const buf = await render();
    assert.equal(pageCount(buf), 1, "the signature block overflowed the page");
  });

  test("a competition entry renders without a script and stays one page", async () => {
    const buf = await renderInvoicePdfBuffer({
      invoice: {
        _id: "68b40b7729ca10bb7712d3f5",
        invoiceNumber: "CKR-REG-2026-000917",
        invoiceDate: new Date("2026-08-02T06:40:00Z"),
        creator: "68a55d17cc8e4f3390bb1204",
        kind: "competition_registration",
        currency: "USD",
        amountCharged: 25,
        // "Registration", matching what competitionController actually emits — every other row type
        // on a real invoice is capitalised, and a fixture that disagrees with production is a
        // fixture that stops catching how production looks.
        rows: [{ item: "Competition Entry Fee", type: "Registration", detail: "Global Script Challenge", amountLabel: "USD 25.00" }],
      },
      creatorName: "Aditi Rao",
      details: { title: "Entry Details", lines: ["Global Script Challenge", "Entry Fee: USD 25.00"] },
      summary: { label: "Total Paid", value: 25 },
    });
    assert.equal(pageCount(buf), 1);
  });

  test("many line items paginate instead of overflowing off the page", async () => {
    const invoice = scriptInvoice();
    invoice.rows = [
      ...Array.from({ length: 40 }, (_, i) => ({
        item: `Service line ${i + 1}`,
        type: "Payment",
        detail: "A detail long enough to wrap across the description column and add height to the row.",
        amountLabel: "INR 1,000.00",
      })),
      { item: "Total Paid", type: "Total", amountLabel: "INR 40,000.00" },
    ];
    const buf = await render({ invoice });
    const pages = pageCount(buf);
    assert.ok(pages > 1, "40 rows should not fit on one page");
    assert.ok(pages <= 4, `40 rows produced ${pages} pages — pagination is leaking blanks`);
  });

  test("refuses to render without the fields an invoice is identified by", async () => {
    await assert.rejects(() => renderInvoicePdfBuffer({ invoice: { _id: "x" } }), /required/i);
    await assert.rejects(() => renderInvoicePdfBuffer({}), /required/i);
  });
});
