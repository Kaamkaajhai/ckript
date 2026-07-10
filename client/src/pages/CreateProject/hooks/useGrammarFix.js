import { useState } from "react";
import api from "../../../services/api";

/**
 * Owns the AI grammar-correction flow: run a correction over the script text,
 * then offer an undo/keep bar. Snapshots the pre-correction editor HTML so
 * "undo" can restore it. Reads the editor, the plain-text getter, and the
 * shared textToParagraphHtml helper as args; writes corrected content back
 * into the editor and reports notes via its own state.
 */
export function useGrammarFix({ editor, getEditorPlainText, textToParagraphHtml, setError, setSaved }) {
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarNotes, setGrammarNotes] = useState([]);
  const [preGrammarContent, setPreGrammarContent] = useState(null); // for undo
  const [showUndoBar, setShowUndoBar] = useState(false);

  const handleGrammarClick = () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText || plainText.length < 10) {
      setError("Write some script text before running grammar correction.");
      return;
    }
    handleFixGrammar();
  };

  // Confirmed - actually run grammar fix
  const handleFixGrammar = async () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText) return;

    // Save current content for undo
    setPreGrammarContent(editor.getHTML());
    setGrammarLoading(true);
    setError("");
    setGrammarNotes([]);
    setShowUndoBar(false);

    try {
      const { data } = await api.post("/ai/correct-script-text", { text: plainText });
      const correctedText = data?.correctedText?.trim();

      if (correctedText) {
        editor.commands.setContent(textToParagraphHtml(correctedText));
        setSaved(false);
        // Show undo/keep bar after a small delay
        setTimeout(() => setShowUndoBar(true), 150);
      }

      setGrammarNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to correct script text.";
      setError(msg);
    } finally {
      setGrammarLoading(false);
    }
  };

  // Undo grammar changes
  const handleGrammarUndo = () => {
    if (preGrammarContent && editor) {
      editor.commands.setContent(preGrammarContent);
      setSaved(false);
    }
    setShowUndoBar(false);
    setPreGrammarContent(null);
    setGrammarNotes([]);
  };

  // Keep grammar changes
  const handleGrammarKeep = () => {
    setShowUndoBar(false);
    setPreGrammarContent(null);
  };

  return {
    grammarLoading,
    setGrammarLoading,
    grammarNotes,
    setGrammarNotes,
    preGrammarContent,
    setPreGrammarContent,
    showUndoBar,
    setShowUndoBar,
    handleGrammarClick,
    handleFixGrammar,
    handleGrammarUndo,
    handleGrammarKeep,
  };
}
