import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

/* ═══════════════════════════════════════════════════════════════════════════════
   AI WRITING ASSISTANT — Direct-Apply Flow
   Click action → AI runs → content applied instantly → Undo/Keep bar
   ═══════════════════════════════════════════════════════════════════════════════ */

const AI_ACTIONS = [
  { key: "improve",      label: "Improve",         icon: "✨", desc: "More engaging & compelling",     accent: "#a78bfa" },
  { key: "professional", label: "Professional",     icon: "🎬", desc: "Studio-ready polish",           accent: "#60a5fa" },
  { key: "grammar",      label: "Fix Grammar",      icon: "📝", desc: "Spelling, grammar & flow",      accent: "#34d399" },
  { key: "dialogue",     label: "Better Dialogue",  icon: "💬", desc: "Natural voices & subtext",      accent: "#fbbf24" },
  { key: "emotional",    label: "Add Emotion",      icon: "❤️", desc: "Deeper feelings & arcs",        accent: "#f472b6" },
  { key: "shorten",      label: "Shorten",          icon: "✂️", desc: "Cut filler, tighten prose",     accent: "#fb923c" },
  { key: "expand",       label: "Expand",           icon: "📖", desc: "Richer detail & atmosphere",    accent: "#2dd4bf" },
];

const LOADING_TIPS = [
  "AI is analyzing your screenplay structure...",
  "Checking dialogue rhythm and pacing...",
  "Enhancing character voice consistency...",
  "Polishing scene descriptions...",
  "Refining emotional beats...",
  "Strengthening narrative flow...",
  "Adding professional cinematic detail...",
  "Deepening character subtext...",
];

const GRAMMAR_COST = 5;

const AiWritingAssistant = ({ textContent, onApply, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [history, setHistory] = useState([]); // undo stack: stores previous textContent
  const [loadingTip, setLoadingTip] = useState(0);
  const [appliedChanges, setAppliedChanges] = useState([]); // changes list after auto-apply
  const [showUndoBar, setShowUndoBar] = useState(false); // fixed bottom undo/keep bar
  const [undoTimer, setUndoTimer] = useState(null);
  // Credit / grammar confirm modal
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [creditBalance, setCreditBalance] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const panelRef = useRef(null);
  const tipInterval = useRef(null);

  // Rotate loading tips
  useEffect(() => {
    if (isLoading) {
      tipInterval.current = setInterval(() => {
        setLoadingTip((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2200);
    } else {
      clearInterval(tipInterval.current);
    }
    return () => clearInterval(tipInterval.current);
  }, [isLoading]);

  // Close dropdown on outside click (only when not loading and no undo bar)
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !isLoading && !showUndoBar) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isLoading, showUndoBar]);

  // Auto-dismiss undo bar after 15 seconds (keep changes)
  useEffect(() => {
    if (showUndoBar) {
      const t = setTimeout(() => {
        setShowUndoBar(false);
        setAppliedChanges([]);
      }, 15000);
      setUndoTimer(t);
      return () => clearTimeout(t);
    }
  }, [showUndoBar]);

  // Fetch credit balance for grammar confirm modal
  const fetchCredits = useCallback(async () => {
    setCreditLoading(true);
    try {
      const { data } = await api.get("/credits/balance");
      setCreditBalance(data.balance || 0);
    } catch {
      setCreditBalance(0);
    } finally {
      setCreditLoading(false);
    }
  }, []);

  // When grammar button clicked — show confirmation modal first
  const handleGrammarClick = useCallback(() => {
    const text = textContent?.trim();
    if (!text || text.length < 10) {
      setError("Add some script text before using AI Grammar Fix.");
      return;
    }
    fetchCredits();
    setShowGrammarModal(true);
  }, [textContent, fetchCredits]);

  // Direct-apply: click action → call AI → apply immediately → show undo bar
  const handleAction = useCallback(async (actionKey, custom = null) => {
    const text = textContent?.trim();
    if (!text) {
      setError("Write some script content first before using AI.");
      return;
    }
    if (text.length < 10) {
      setError("Add a bit more text so AI can work with it effectively.");
      return;
    }

    setIsLoading(true);
    setActiveAction(actionKey || "custom");
    setError("");
    setAppliedChanges([]);
    setShowUndoBar(false);
    setLoadingTip(0);

    try {
      const payload = custom
        ? { text, customInstruction: custom }
        : { text, action: actionKey };

      const { data } = await api.post("/ai/writing-assist", payload);

      if (data.usedFallback) {
        const errMsg = data.changes?.[0] || "AI is temporarily busy. Please try again.";
        setError(errMsg);
        setIsLoading(false);
        setActiveAction(null);
        return;
      }

      // DIRECT APPLY: save current text to history, apply AI result immediately
      const aiResult = data.result;
      if (aiResult && aiResult !== text) {
        setHistory((prev) => [...prev.slice(-9), textContent]);
        onApply(aiResult);
        setAppliedChanges(data.changes || []);
        setIsOpen(false);
        // Small delay so the dropdown close animation finishes before showing bar
        setTimeout(() => setShowUndoBar(true), 100);
        // Refresh credit balance if grammar was used
        if (actionKey === "grammar") fetchCredits();
      } else {
        setError("AI returned the same text. Try a different action.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Connection error. Check if the server is running.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  }, [textContent, onApply, fetchCredits]);

  // Confirm grammar payment and run (defined after handleAction so deps work correctly)
  const handleGrammarConfirm = useCallback(() => {
    setShowGrammarModal(false);
    handleAction("grammar");
  }, [handleAction]);

  const handleUndo = () => {
    if (history.length === 0) return;
    onApply(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setShowUndoBar(false);
    setAppliedChanges([]);
    if (undoTimer) clearTimeout(undoTimer);
  };

  const handleKeep = () => {
    setShowUndoBar(false);
    setAppliedChanges([]);
    if (undoTimer) clearTimeout(undoTimer);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    handleAction(null, customPrompt.trim());
    setShowCustom(false);
  };

  const actionLabel = AI_ACTIONS.find((a) => a.key === activeAction)?.label || "Custom AI";
  const wordCount = textContent?.split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className="relative" ref={panelRef}>

      {/* ━━ Grammar Credit Confirmation Modal (portal) ━━━━━━━━━━━━━━━━━━━━ */}
      {showGrammarModal && createPortal(
        <AnimatePresence>
          <motion.div
            key="grammar-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowGrammarModal(false)}
          >
            <motion.div
              key="grammar-modal"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a1120] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-xl">📝</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Grammar Fix</h3>
                    <p className="text-[11px] text-neutral-500">Powered by Gemini AI</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Fix all grammar, spelling, punctuation, and readability issues in your script with professional AI proofreading.
                </p>
              </div>

              {/* Credit info */}
              <div className="px-5 py-4 space-y-3">
                {/* Cost row */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="text-xs text-neutral-300 font-medium">Cost</span>
                  </div>
                  <span className="text-sm font-bold text-amber-300">{GRAMMAR_COST} credits</span>
                </div>

                {/* Balance row */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <span className="text-xs text-neutral-300 font-medium">Your Balance</span>
                  </div>
                  {creditLoading ? (
                    <span className="text-xs text-neutral-500">Loading...</span>
                  ) : (
                    <span className={`text-sm font-bold ${
                      creditBalance >= GRAMMAR_COST ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {creditBalance ?? "—"} credits
                    </span>
                  )}
                </div>

                {/* Insufficient credits warning */}
                {!creditLoading && creditBalance !== null && creditBalance < GRAMMAR_COST && (
                  <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/15 rounded-xl">
                    <p className="text-xs text-red-300 leading-relaxed">
                      Not enough credits. You need {GRAMMAR_COST - creditBalance} more credit{GRAMMAR_COST - creditBalance > 1 ? "s" : ""} to use this feature.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrammarModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] text-neutral-400 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGrammarConfirm}
                  disabled={creditLoading || creditBalance === null || creditBalance < GRAMMAR_COST}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Pay {GRAMMAR_COST} credits & Fix
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* ━━ Undo/Keep Bar — fixed at bottom of screen (always visible) ━━━ */}
      {showUndoBar && createPortal(
        <AnimatePresence>
          <motion.div
            key="undo-bar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2"
          >
            <div className="bg-[#0c1424] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/60 px-4 py-3 flex items-center gap-3 min-w-[320px] max-w-[480px]">
              {/* Status dot + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-400">AI Changes Applied</span>
                </div>
                {appliedChanges.length > 0 && (
                  <p className="text-[10px] text-neutral-500 truncate leading-snug">
                    {appliedChanges[0]}{appliedChanges.length > 1 ? ` +${appliedChanges.length - 1} more` : ""}
                  </p>
                )}
              </div>

              {/* Undo */}
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-400/40 transition-all active:scale-[0.96] shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3M3 10l4-4M3 10l4 4" />
                </svg>
                Undo
              </button>

              {/* Keep */}
              <button
                type="button"
                onClick={handleKeep}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-all active:scale-[0.96] shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Keep
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* ━━ Trigger Bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); setError(""); }}
          className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
            isOpen
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]"
              : "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-300 border border-violet-500/20 hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 hover:scale-[1.01]"
          }`}
        >
          {!isOpen && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          )}
          <span className="text-base">🤖</span>
          <span>AI Assistant</span>
          {isLoading && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-pulse" />
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {history.length > 0 && !showUndoBar && (
          <button
            type="button"
            onClick={handleUndo}
            title="Undo last AI change"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3M3 10l4-4M3 10l4 4" />
            </svg>
            Undo
          </button>
        )}
      </div>

      {/* ━━ AI Panel (dropdown) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute left-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-[#080e1a] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-violet-600/10 via-indigo-600/8 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">AI Writing Assistant</h3>
                    <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Powered by Gemini AI
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isLoading && setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.08] transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Error ───────────────────────────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-4 mt-3 px-3 py-2.5 bg-red-500/10 border border-red-500/15 rounded-xl flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0 text-xs">⚠</span>
                    <div className="flex-1">
                      <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                      <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-[10px] text-red-400/60 hover:text-red-300 mt-1 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Loading State ────────────────────────────────────────────── */}
            {isLoading && (
              <div className="px-5 py-10">
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute inset-1 rounded-full border-2 border-indigo-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
                    <div className="absolute inset-2 rounded-full border-2 border-t-violet-400 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: "1s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg">🤖</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">Applying {actionLabel}...</p>
                  <motion.p
                    key={loadingTip}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-neutral-500 text-center"
                  >
                    {LOADING_TIPS[loadingTip]}
                  </motion.p>
                  <div className="w-full mt-4 h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "90%" }}
                      transition={{ duration: 20, ease: "linear" }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-3">Changes will apply automatically</p>
                </div>
              </div>
            )}

            {/* ── Action Grid (no preview — direct apply) ──────────────────── */}
            {!isLoading && (
              <div className="p-4 space-y-3">
                {/* Word count indicator */}
                {wordCount > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (wordCount / 50) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-600 shrink-0">{wordCount} words</span>
                  </div>
                )}

                {/* Quick action grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {AI_ACTIONS.map((action) => {
                    const isGrammar = action.key === "grammar";
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => isGrammar ? handleGrammarClick() : handleAction(action.key)}
                        disabled={wordCount < 1}
                        className="group relative text-left p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] active:scale-[0.97] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                          style={{ background: `radial-gradient(circle at 30% 30%, ${action.accent}15, transparent 70%)` }}
                        />
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm">{action.icon}</span>
                            <span className="text-xs font-bold text-white/90">{action.label}</span>
                            {isGrammar && (
                              <span className="ml-auto text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">{GRAMMAR_COST}cr</span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 leading-tight group-hover:text-neutral-400 transition-colors">{action.desc}</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom instruction button */}
                  {!showCustom && (
                    <button
                      type="button"
                      onClick={() => setShowCustom(true)}
                      disabled={wordCount < 1}
                      className="group text-left p-3 rounded-xl border border-dashed border-white/[0.06] bg-transparent hover:bg-white/[0.03] hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">🎯</span>
                        <span className="text-xs font-bold text-white/90">Custom</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-tight">Your own instruction</p>
                    </button>
                  )}
                </div>

                {/* Custom instruction form */}
                <AnimatePresence>
                  {showCustom && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleCustomSubmit}
                      className="overflow-hidden space-y-2"
                    >
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder='e.g. "Make the villain more menacing" or "Add a plot twist"'
                        rows={2}
                        maxLength={500}
                        autoFocus
                        className="w-full p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-600 focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/30 resize-none transition"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!customPrompt.trim()}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                          Run Custom AI
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowCustom(false); setCustomPrompt(""); }}
                          className="px-3 py-2 bg-white/[0.04] text-neutral-500 rounded-lg text-xs hover:bg-white/[0.08] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Footer tip */}
                <div className="flex items-center gap-2 pt-1 px-1">
                  <div className="w-4 h-4 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                    <span className="text-[8px]">💡</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 leading-snug">
                    Click any action — AI will apply changes directly. You can always undo.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiWritingAssistant;
