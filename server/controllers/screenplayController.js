import Script from "../models/Script.js";
import { generateScreenplayPdf } from "../utils/screenplayPdf.js";
import { formatScreenplayLikeText } from "../utils/screenplayParser.js";
import { serializeTitlePage, hasTitlePage } from "../utils/classify.js";
import { formatScriptCredit } from "../utils/writerCredits.js";
import { stripPdfPageFurniture } from "../utils/screenplayImportClean.js";

// Map (mongoose) | Map | plain → plain object of title-page fields, or null when empty.
const titlePageToObject = (tp) => {
  if (!tp) return null;
  const obj = typeof tp.toObject === "function" ? tp.toObject() : (tp instanceof Map ? Object.fromEntries(tp) : tp);
  return obj && Object.keys(obj).length ? obj : null;
};

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
    "title creator writers collaborators unlockedBy purchasedBy fountainContent textContent companyName titlePage"
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

    // Prepend the industry title-page block (standard Fountain Key: Value) when configured and the
    // body doesn't already carry one, so the .fountain file opens with a proper title page.
    const tpObj = titlePageToObject(script.titlePage);
    const out = tpObj && !hasTitlePage(text) ? serializeTitlePage(tpObj) + text : text;

    const filename = sanitizeFileName(`${script.title || "script"}.fountain`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(out);
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

    // Every generated copy carries the Ckript mark; non-owners also get their identity stamped
    // for traceable sharing.
    let watermark = "CKRIPT";
    if (!access.isOwner && !access.isAdmin) {
      const identity = req.user.email || req.user.name || req.user._id.toString();
      watermark = `CKRIPT ${identity}`;
    } else if (req.query.watermark) {
      watermark = `CKRIPT ${String(req.query.watermark).slice(0, 80)}`;
    }

    // Title-page author: the credited writers first, so a co-written script is attributed on the
    // exported PDF. `titlePage.author` (writer-configured) still wins downstream; companyName is
    // only the last resort it used to fall back to.
    const author = formatScriptCredit(script) || script.companyName || "";
    // Structured title page (Map → plain object) when present; the writer-configured fields win.
    const titlePageObj = titlePageToObject(script.titlePage);
    const wantTitlePage = req.query.titlePage === "1" || Boolean(titlePageObj);
    const pdfBuffer = await generateScreenplayPdf(text, {
      title: wantTitlePage ? script.title : undefined,
      author,
      titlePage: wantTitlePage ? titlePageObj : null,
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
    // Text pulled out of a PDF carries that PDF's page furniture (running header, page numbers,
    // "(CONTINUED)"). Left in, it becomes script content in the viewable preview and skews
    // pagination, so clean it before the editor ever sees it.
    const cleaned = stripPdfPageFurniture(raw, { title: req.body?.title || "" });
    const normalized = formatScreenplayLikeText(cleaned);
    return res.json({ fountainContent: normalized });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to import Fountain." });
  }
};
