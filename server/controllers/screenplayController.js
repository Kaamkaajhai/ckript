import Script from "../models/Script.js";
import { generateScreenplayPdf } from "../utils/screenplayPdf.js";
import { formatScreenplayLikeText } from "../utils/screenplayParser.js";

const stripHtml = (value = "") =>
  String(value || "")
    .replace(/<\s*(br|p|div|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const sanitizeFileName = (name = "script") =>
  String(name || "script")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120) || "script";

// Resolve the canonical screenplay text for a script (Fountain preferred, else stripped textContent).
const resolveScreenplayText = (script) => {
  if (script?.fountainContent && String(script.fountainContent).trim()) {
    return String(script.fountainContent);
  }
  return formatScreenplayLikeText(stripHtml(script?.textContent || ""));
};

// Determine whether the requester may read this script's full content.
const canAccessScript = (script, user) => {
  const userId = user._id.toString();
  if (String(script.creator || "") === userId) return { ok: true, isOwner: true };
  if (user.role === "admin") return { ok: true, isOwner: false, isAdmin: true };

  const isCollaborator = (script.collaborators || []).some(
    (c) => String(c.userId) === userId && c.isActive !== false && c.status === "accepted"
  );
  const hasPurchased =
    (script.unlockedBy || []).some((id) => String(id) === userId) ||
    (script.purchasedBy || []).some((id) => String(id) === userId);

  return { ok: isCollaborator || hasPurchased, isOwner: false };
};

const loadScriptForExport = async (req, res) => {
  const script = await Script.findById(req.params.id).select(
    "title creator collaborators unlockedBy purchasedBy fountainContent textContent companyName"
  );
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return null;
  }
  const access = canAccessScript(script, req.user);
  if (!access.ok) {
    res.status(403).json({ message: "Not authorized to export this script." });
    return null;
  }
  return { script, access };
};

// GET /scripts/:id/export/fountain  → download canonical Fountain text
export const exportFountain = async (req, res) => {
  try {
    const loaded = await loadScriptForExport(req, res);
    if (!loaded) return;
    const { script } = loaded;

    const text = resolveScreenplayText(script);
    if (!text.trim()) {
      return res.status(404).json({ message: "This project has no screenplay content to export." });
    }

    const filename = sanitizeFileName(`${script.title || "script"}.fountain`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(text);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to export Fountain." });
  }
};

// GET /scripts/:id/export/pdf  → formatted screenplay PDF (watermarked for non-owners)
export const exportScreenplayPdf = async (req, res) => {
  try {
    const loaded = await loadScriptForExport(req, res);
    if (!loaded) return;
    const { script, access } = loaded;

    const text = resolveScreenplayText(script);
    if (!text.trim()) {
      return res.status(404).json({ message: "This project has no screenplay content to export." });
    }

    // Non-owners always get a watermark stamping their identity for traceable sharing.
    // Owners may opt in via ?watermark=...
    let watermark = "";
    if (!access.isOwner && !access.isAdmin) {
      watermark = req.user.email || req.user.name || req.user._id.toString();
    } else if (req.query.watermark) {
      watermark = String(req.query.watermark).slice(0, 80);
    }

    const author = script.companyName || "";
    const pdfBuffer = await generateScreenplayPdf(text, {
      title: req.query.titlePage === "1" ? script.title : undefined,
      author,
      watermark,
    });

    const shouldDownload = String(req.query.download || "") === "1";
    const disposition = shouldDownload ? "attachment" : "inline";
    const filename = sanitizeFileName(`${script.title || "script"}.pdf`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to export screenplay PDF." });
  }
};

// NOTE: Final Draft (.fdx) import/export now run CLIENT-SIDE (client/src/components/screenplay/
// fdx.js) so they source element types from the editor's one classifier (classifyText) rather
// than the server's separate parser (§0). The old server exportFdx/importFdx were retired.

// POST /scripts/import/fountain  { text }  → normalized Fountain text the editor can load
// (File upload is handled client-side by reading the .fountain/.txt file as text.)
export const importFountain = async (req, res) => {
  try {
    const raw = String(req.body?.text || "");
    if (!raw.trim()) {
      return res.status(400).json({ message: "No Fountain text provided." });
    }
    if (raw.length > 2_000_000) {
      return res.status(413).json({ message: "File is too large to import." });
    }
    const normalized = formatScreenplayLikeText(raw);
    return res.json({ fountainContent: normalized });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to import Fountain." });
  }
};
