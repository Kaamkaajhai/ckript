import { useCallback, useEffect, useState } from "react";
import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";
import api from "../../services/api";

/*
 * Version history's three server calls and its line diff — extracted from
 * `VersionHistoryModal` so the mobile surface reuses the SERVICE CALLS rather
 * than the desktop DOM (§15), exactly as `useCollaborators` was.
 *
 * The diff is a plain function rather than a hook so a test can call it, and so
 * the mobile screen can memoise it against its own state without inheriting a
 * hook's call-order rules.
 */

/**
 * Fountain LINE-level diff, version → current.
 * `op` is -1 removed, +1 added, 0 unchanged — diff-match-patch's own vocabulary,
 * kept rather than renamed so the two callers cannot disagree about the sign.
 */
export const lineDiff = (versionText, currentText) => {
  if (versionText == null) return null;
  const dmp = new DiffMatchPatch();
  /*
   * DEF-18 — BOTH SIDES ARE TERMINATED BEFORE DIFFING, and without this the
   * diff lies about the commonest edit there is.
   *
   * `diff_linesToChars_` keys a line by its text INCLUDING its newline, so a
   * final line with no terminator is a different line from the same text with
   * one. Appending a single line to a script therefore reported the previous
   * last line as REMOVED and re-added alongside the new one — 2 added, 1
   * removed, two of them visually identical. Live in the desktop modal since it
   * shipped; measured here because the mobile row summarises the counts in
   * words, which is what made a wrong count impossible to miss.
   */
  const terminate = (text) => {
    const value = String(text || "");
    return value === "" || value.endsWith("\n") ? value : `${value}\n`;
  };
  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(terminate(versionText), terminate(currentText));
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_charsToLines_(diffs, lineArray);
  const rows = [];
  for (const [op, text] of diffs) {
    for (const line of text.split("\n")) {
      if (line === "") continue;
      rows.push({ op, line });
    }
  }
  return rows;
};

/** How many lines a version differs from the current draft by, added/removed. */
export const summariseDiff = (rows) => {
  if (!rows) return { added: 0, removed: 0, identical: false };
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.op === 1) added += 1;
    else if (row.op === -1) removed += 1;
  }
  return { added, removed, identical: added === 0 && removed === 0 };
};

export const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function useVersionHistory({ scriptId, open = true, currentText = "", onRestored = null }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/scripts/${scriptId}/versions`);
      setVersions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load versions.");
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    if (!open) return;
    setError("");
    load();
  }, [open, load]);

  const save = useCallback(async (label = "") => {
    if (!scriptId) { setError("Save your project once before versioning."); return false; }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/scripts/${scriptId}/versions`, { label: String(label).trim(), content: currentText });
      setVersions(Array.isArray(data) ? data : []);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not save version.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [scriptId, currentText]);

  /*
   * Restore posts the CURRENT text alongside the version id: the server writes
   * today's draft as a snapshot before overwriting it, which is what makes the
   * action recoverable rather than destructive. Both platforms depend on that,
   * so it is stated here rather than only in a footnote at the bottom of the
   * desktop modal where nobody reads it.
   */
  const restore = useCallback(async (versionId) => {
    setRestoringId(versionId);
    setError("");
    try {
      const { data } = await api.post(`/scripts/${scriptId}/versions/${versionId}/restore`, { content: currentText });
      if (typeof data?.fountainContent === "string") onRestored?.(data.fountainContent);
      setVersions(Array.isArray(data?.versions) ? data.versions : []);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not restore version.");
      return false;
    } finally {
      setRestoringId(null);
    }
  }, [scriptId, currentText, onRestored]);

  return { versions, loading, saving, restoringId, error, setError, reload: load, save, restore };
}
