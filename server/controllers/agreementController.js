import Agreement from "../models/Agreement.js";

const normalizeString = (value = "") => String(value || "").trim();

const canAccessAgreement = (agreement, user) => {
  if (!agreement || !user) return false;
  if (user.role === "admin") return true;

  const userId = String(user._id || "");
  return (
    String(agreement.writer_id?._id || agreement.writer_id) === userId ||
    String(agreement.buyer_id?._id || agreement.buyer_id) === userId
  );
};

export const listAgreements = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const query = {};

    const writerId = normalizeString(req.query.writerId);
    const buyerId = normalizeString(req.query.buyerId);
    const scriptId = normalizeString(req.query.scriptId);
    const status = normalizeString(req.query.status);

    if (isAdmin) {
      if (writerId) query.writer_id = writerId;
      if (buyerId) query.buyer_id = buyerId;
      if (scriptId) query.script_id = scriptId;
      if (status) query.status = status;
    } else {
      query.$or = [{ writer_id: req.user._id }, { buyer_id: req.user._id }];
      if (status) query.status = status;
    }

    const agreements = await Agreement.find(query)
      .populate("script_id", "title sid genre")
      .populate("writer_id", "name email sid")
      .populate("buyer_id", "name email sid")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ agreements });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load agreements." });
  }
};

export const getAgreementById = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate("script_id", "title sid genre")
      .populate("writer_id", "name email sid")
      .populate("buyer_id", "name email sid")
      .lean();

    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found." });
    }

    if (!canAccessAgreement(agreement, req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    return res.json(agreement);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load agreement." });
  }
};

export const getAgreementPdf = async (req, res) => {
  try {
    const party = normalizeString(req.query.party || "").toLowerCase();
    if (!["writer", "buyer"].includes(party)) {
      return res.status(400).json({ message: "party query must be writer or buyer." });
    }

    const agreement = await Agreement.findById(req.params.id).lean();
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found." });
    }

    if (!canAccessAgreement(agreement, req.user)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const targetUrl = party === "writer" ? agreement.writer_pdf_url : agreement.buyer_pdf_url;
    if (!targetUrl || !/^https?:\/\//i.test(String(targetUrl))) {
      return res.status(404).json({ message: "Agreement PDF not available." });
    }

    const pdfResponse = await fetch(targetUrl);
    if (!pdfResponse.ok) {
      return res.status(502).json({ message: "Failed to fetch agreement PDF from storage." });
    }

    const fileBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const shouldDownload = String(req.query.download || "") === "1";
    const disposition = shouldDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="agreement-${agreement._id}-${party}.pdf"`
    );
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to open agreement PDF." });
  }
};
