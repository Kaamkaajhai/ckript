import Script from "../models/Script.js";

const MAX_VERSIONS = 50;

const resolveScreenplayText = (script) =>
  (script?.fountainContent && String(script.fountainContent).trim())
    ? String(script.fountainContent)
    : String(script?.textContent || "");

// Newest first; omit nothing — snapshots are needed client-side for preview/diff.
const serializeVersions = (versions = []) =>
  [...versions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((v) => ({
      _id: v._id,
      label: v.label || "",
      authorName: v.authorName || "",
      auto: Boolean(v.auto),
      createdAt: v.createdAt,
      fountainSnapshot: v.fountainSnapshot || "",
    }));

const loadOwnedScript = async (req, res) => {
  const script = await Script.findById(req.params.id);
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return null;
  }
  if (String(script.creator || "") !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403).json({ message: "Only the project owner can manage versions." });
    return null;
  }
  return script;
};

const pushVersion = (script, { label, content, req, auto = false }) => {
  script.versions.push({
    label: String(label || "").slice(0, 80),
    fountainSnapshot: content,
    createdBy: req.user._id,
    authorName: req.user.name || "",
    auto,
    createdAt: new Date(),
  });
  if (script.versions.length > MAX_VERSIONS) {
    script.versions = script.versions.slice(-MAX_VERSIONS);
  }
};

// GET /scripts/:id/versions
export const listVersions = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id).select("creator versions");
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (String(script.creator || "") !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the project owner can view versions." });
    }
    return res.json(serializeVersions(script.versions));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load versions." });
  }
};

// POST /scripts/:id/versions  { label?, content? }
export const createVersion = async (req, res) => {
  try {
    const script = await loadOwnedScript(req, res);
    if (!script) return;

    // Prefer client-provided current text (unsaved edits) over the stored snapshot.
    const content = typeof req.body?.content === "string" && req.body.content.trim()
      ? req.body.content
      : resolveScreenplayText(script);

    if (!content.trim()) {
      return res.status(400).json({ message: "Nothing to snapshot yet — write some script first." });
    }

    pushVersion(script, { label: req.body?.label, content, req, auto: false });
    await script.save();
    return res.status(201).json(serializeVersions(script.versions));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save version." });
  }
};

// POST /scripts/:id/versions/:versionId/restore
// Non-destructive: snapshots the current text first, then restores the chosen version.
export const restoreVersion = async (req, res) => {
  try {
    const script = await loadOwnedScript(req, res);
    if (!script) return;

    const version = script.versions.id(req.params.versionId);
    if (!version) return res.status(404).json({ message: "Version not found" });

    const current = typeof req.body?.content === "string" && req.body.content.trim()
      ? req.body.content
      : resolveScreenplayText(script);

    if (current.trim()) {
      pushVersion(script, { label: "Before restore", content: current, req, auto: true });
    }

    script.fountainContent = version.fountainSnapshot;
    script.textContent = version.fountainSnapshot;
    script.projectSource = "editor";
    await script.save();

    return res.json({
      fountainContent: script.fountainContent,
      versions: serializeVersions(script.versions),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to restore version." });
  }
};
