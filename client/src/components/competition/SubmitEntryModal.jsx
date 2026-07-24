import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useDarkMode } from "../../context/DarkModeContext";
import PhaseTimeline from "./PhaseTimeline";
import { SUBMIT_CHECKLIST } from "../../pages/challenge/constants";

/**
 * The one-way door. Submitting freezes a snapshot server-side and locks the script, so the modal
 * makes the writer tick both statements before the button turns on — and then shows what happens
 * next rather than dumping them back into an editor they can no longer use.
 */
export default function SubmitEntryModal({ competitionId, competitionName, onClose, onSubmitted, serverNow, flushDraft }) {
  const { isDarkMode: dark } = useDarkMode();
  const navigate = useNavigate();

  const [checks, setChecks] = useState({ confirmOriginal: false, confirmFinal: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const allChecked = SUBMIT_CHECKLIST.every((item) => checks[item.key]);

  const card = dark ? "bg-[#141414] border border-[#262626]" : "bg-white border border-gray-200";
  const titleCls = dark ? "text-white" : "text-gray-900";
  const bodyText = dark ? "text-white/60" : "text-gray-600";
  const divider = dark ? "border-[#262626]" : "border-gray-200";

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      // Flush any unsaved keystrokes FIRST. Autosave is throttled, so a writer typing right up to
      // the buzzer can have seconds of work still only in the editor — and the server snapshots
      // whatever is stored, then locks the script. Without this, their last lines are lost for good.
      if (flushDraft) {
        try {
          await flushDraft();
        } catch {
          setError("Could not save your latest changes. Check your connection and try again.");
          setLoading(false);
          return;
        }
      }

      const { data } = await api.post(`/competitions/${competitionId}/submit`, {
        confirmOriginal: true,
        confirmFinal: true,
      });
      setResult(data);
      onSubmitted?.(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={result ? undefined : onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl ${card}`}
      >
        <div className={`border-b px-6 pb-4 pt-5 ${divider}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D14D37]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className={`font-serif text-[19px] font-bold ${titleCls}`}>
                {result ? "Submission successful" : "Submit your script"}
              </h3>
              <p className={`mt-0.5 text-[12.5px] leading-relaxed ${bodyText}`}>
                {result ? competitionName : "Once submitted, your script locks and cannot be edited."}
              </p>
            </div>
            {!result ? (
              <button
                type="button"
                onClick={onClose}
                className={`-mr-1 ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${dark ? "text-white/40 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {result ? (
            <>
              <p className={`text-sm ${bodyText}`}>
                Submitted {new Date(result.entry?.submittedAt || Date.now()).toLocaleString()}.
              </p>
              <div className="mt-5">
                <PhaseTimeline steps={result.timeline || []} serverNow={serverNow} compact />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {SUBMIT_CHECKLIST.map((item) => (
                <label key={item.key} className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    onChange={(e) => setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#D14D37]"
                  />
                  <span className={`text-[13px] leading-relaxed ${dark ? "text-white/80" : "text-gray-700"}`}>{item.label}</span>
                </label>
              ))}
              {error ? <p className="text-sm text-[#D14D37]">{error}</p> : null}
            </div>
          )}
        </div>

        <div className={`flex justify-end gap-3 border-t px-6 py-4 ${divider}`}>
          {result ? (
            <button
              type="button"
              onClick={() => navigate("/challenge/dashboard")}
              className="rounded-lg bg-[#D14D37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8402d]"
            >
              Back to Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${dark ? "text-white/60 hover:bg-white/[0.06]" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Keep writing
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allChecked || loading}
                className="rounded-lg bg-[#D14D37] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b8402d] disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
              >
                {loading ? "Submitting…" : "Submit final script"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
