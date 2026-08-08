import Invoice from "../models/Invoice.js";
import { generateAndSaveInvoicePdf, INVOICE_DESIGN_VERSION } from "../utils/invoicePdf.js";
import { fetchTrustedPdfAsset } from "../utils/remoteAssetPolicy.js";

const canAccessInvoice = (invoice, user) => {
  if (!invoice || !user) return false;
  if (user.role === "admin") return true;
  return String(invoice.creator?._id || invoice.creator) === String(user._id);
};

export const getInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("creator", "name email sid")
      .populate("script", "title sid")
      .populate("competition", "name shortName");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!canAccessInvoice(invoice, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hasRemotePdf = /^https?:\/\//i.test(String(invoice.pdfPath || ""));
    const refreshFlag = String(req.query.refresh || req.query.regenerate || "").toLowerCase();
    const forcedRefresh = ["1", "true", "yes"].includes(refreshFlag);

    // A cached PDF drawn by an older version of the document is re-rendered exactly once, the next
    // time anyone opens it. Without this, redesigning the invoice only ever affected invoices issued
    // afterwards — every existing one kept serving its stored bytes forever, and the only escape was
    // a query parameter no client passes.
    const isStaleDesign = Number(invoice.pdfDesignVersion || 0) < INVOICE_DESIGN_VERSION;

    if (!hasRemotePdf || forcedRefresh || isStaleDesign) {
      // The panel comes off the invoice itself where the issuer wrote one. The fallbacks below cover
      // documents created before that field existed: a competition entry has no script, and printing
      // "Script SID: -" against an empty title in somebody's tax record reads as a bug.
      const stored = Array.isArray(invoice.detailLines) && invoice.detailLines.length
        ? { title: invoice.detailTitle || "Details", lines: invoice.detailLines }
        : null;

      const isRegistration = invoice.kind === "competition_registration";
      const legacyRegistrationDetails = isRegistration
        ? {
          title: "Entry Details",
          lines: [
            invoice.competition?.name || "Competition entry",
            `Competition ID: ${invoice.competition?._id || invoice.competition || "-"}`,
            `Entry Fee: ${invoice.currency || "INR"} ${Number(invoice.amountCharged || 0).toFixed(2)}`,
            `Payment Ref: ${invoice.paymentReference || "-"}`,
          ],
        }
        : undefined;

      const details = stored || legacyRegistrationDetails;
      // The headline figure. Script invoices carry a "Total" row the document lifts out itself, so
      // they pass nothing; every other kind states what was charged.
      const needsSummary = Boolean(details) && invoice.kind !== "script";

      const generated = await generateAndSaveInvoicePdf({
        invoice,
        creatorName: invoice.creator?.name,
        creatorEmail: invoice.creator?.email,
        creatorSid: invoice.creatorSid || invoice.creator?.sid,
        scriptTitle: invoice.script?.title,
        scriptSid: invoice.scriptSid || invoice.script?.sid,
        details,
        summary: needsSummary
          ? { label: "Total Paid", value: invoice.amountCharged || 0 }
          : undefined,
      });

      if (generated.relativePath && invoice.pdfPath !== generated.relativePath) {
        invoice.pdfPath = generated.relativePath;
      }

      invoice.pdfGeneratedAt = new Date();
      invoice.pdfDesignVersion = INVOICE_DESIGN_VERSION;
      await invoice.save();
    }

    if (!invoice.pdfPath || !/^https?:\/\//i.test(String(invoice.pdfPath))) {
      return res.status(500).json({ message: "Invoice PDF URL is unavailable" });
    }

    const { buffer: pdfBuffer } = await fetchTrustedPdfAsset(invoice.pdfPath);

    const isDownload = String(req.query.download || "").toLowerCase() === "1";
    const disposition = isDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename=\"${invoice.invoiceNumber}.pdf\"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
