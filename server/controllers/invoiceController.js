import Invoice from "../models/Invoice.js";
import { generateAndSaveInvoicePdf } from "../utils/invoicePdf.js";
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
    const shouldRegenerate = ["1", "true", "yes"].includes(refreshFlag);

    if (!hasRemotePdf || shouldRegenerate) {
      // A competition entry fee has no script, so the project panel is replaced rather than left to
      // render "Script SID: -" against an empty title in the buyer's tax record.
      const isRegistration = invoice.kind === "competition_registration";
      const registrationDetails = isRegistration
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

      const generated = await generateAndSaveInvoicePdf({
        invoice,
        creatorName: invoice.creator?.name,
        creatorEmail: invoice.creator?.email,
        creatorSid: invoice.creatorSid || invoice.creator?.sid,
        scriptTitle: invoice.script?.title,
        scriptSid: invoice.scriptSid || invoice.script?.sid,
        details: registrationDetails,
        summary: isRegistration
          ? { label: "Total Paid", value: invoice.amountCharged || 0 }
          : undefined,
      });

      if (generated.relativePath && invoice.pdfPath !== generated.relativePath) {
        invoice.pdfPath = generated.relativePath;
      }

      invoice.pdfGeneratedAt = new Date();
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
